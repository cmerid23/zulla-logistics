import webpushLib from "web-push";

const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const subject = process.env.VAPID_SUBJECT ?? "mailto:ops@zulla.example.com";

if (publicKey && privateKey) {
  webpushLib.setVapidDetails(subject, publicKey, privateKey);
}

export const webpush = {
  enabled: Boolean(publicKey && privateKey),
  async send(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: { title: string; body: string; url?: string },
  ) {
    if (!publicKey || !privateKey) {
      console.warn("[webpush] VAPID keys not configured — push skipped");
      return;
    }
    try {
      await webpushLib.sendNotification(subscription, JSON.stringify(payload));
    } catch (err) {
      console.error("[webpush] send failed", err);
    }
  },
};
