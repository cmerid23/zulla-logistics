import { api } from "../lib/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getVapidPublicKey(): Promise<string | null> {
  const fromEnv = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (fromEnv) return fromEnv;
  try {
    const data = await api.get<{ key: string | null }>("/push/vapid-public-key");
    return data.key;
  } catch {
    return null;
  }
}

/**
 * Subscribe the current device to push notifications and register the subscription
 * with the API. Call this on shipper/carrier login. Handles permission denied gracefully.
 */
export async function subscribeToPush(): Promise<"subscribed" | "denied" | "unsupported" | "no-key"> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (typeof Notification === "undefined") return "unsupported";

  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "default") {
    const result = await Notification.requestPermission();
    if (result !== "granted") return "denied";
  }

  const reg = await navigator.serviceWorker.ready;
  const key = await getVapidPublicKey();
  if (!key) return "no-key";

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    // TS5.7's generic Uint8Array<ArrayBufferLike> doesn't fit BufferSource directly;
    // cast through BufferSource since the bytes are always backed by ArrayBuffer here.
    const applicationServerKey = urlBase64ToUint8Array(key) as unknown as BufferSource;
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  await api.post("/push/subscribe", sub.toJSON());
  return "subscribed";
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await api.post("/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => undefined);
  await sub.unsubscribe();
}
