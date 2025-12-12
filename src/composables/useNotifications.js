import { ref } from "vue";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/**
 * Global flag used by router + DefaultLayout
 * When TRUE → UI shows "Enable Notifications" banner/modal
 */
export const needsNotificationPrompt = ref(false);

/**
 * Main notifications composable
 */
export function useNotifications() {
  const permission = ref(Notification.permission);
  const messaging = getMessaging();
  const db = getFirestore();

  /**
   * Ask user for notification permission (must be triggered by user action)
   */
  const askPermission = async () => {
    console.log("🔔 Asking for notification permission...");

    const status = await Notification.requestPermission();
    permission.value = status;

    if (status !== "granted") {
      console.warn("Notification permission denied.");
      return null;
    }

    // Generate FCM token
    const vapidKey =
      "BFuddni8Ho8BGympjTzzVgDuNs2qYC9f3b8rSATk94sY077I9Kf0pkucBgDr4a9ka9BqGHmrrf0n1CwM_va-MEg";

    const fcmToken = await getToken(messaging, { vapidKey });

    if (!fcmToken) {
      console.warn("⚠️ No FCM token received");
      return null;
    }

    // Save token to Firestore
    const user = getAuth().currentUser;
    if (user) {
      await setDoc(
        doc(db, "users", user.uid),
        { fcmToken },
        { merge: true }
      );
      console.log("💾 Token saved to Firestore:", fcmToken);
    }

    // Permission granted → stop showing the banner
    needsNotificationPrompt.value = false;

    return fcmToken;
  };

  /**
   * Foreground notifications handler
   */
  onMessage(messaging, (payload) => {
    console.log("📩 Foreground notification:", payload);
  });

  /**
   * Returns TRUE if permission not granted and user logged in
   */
  const shouldAskPermission = () => {
    return Notification.permission === "default";
  };

  return { permission, askPermission, shouldAskPermission };
}
