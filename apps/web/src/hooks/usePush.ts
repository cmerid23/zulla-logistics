import { useCallback, useEffect, useState } from "react";
import { subscribeToPush, unsubscribeFromPush } from "../pwa/pushManager";

export function usePush() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)));
  }, []);

  const enable = useCallback(async () => {
    if (typeof Notification === "undefined") return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== "granted") return false;
    await subscribeToPush();
    setSubscribed(true);
    return true;
  }, []);

  const disable = useCallback(async () => {
    await unsubscribeFromPush();
    setSubscribed(false);
  }, []);

  return { permission, subscribed, enable, disable };
}
