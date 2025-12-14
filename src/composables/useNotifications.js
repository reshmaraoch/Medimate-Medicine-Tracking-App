import { ref } from "vue";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { showToast } from "@/services/toastBus";

export const needsNotificationPrompt = ref(false);

export function useNotifications() {
  const permission = ref(Notification.permission);
  const messaging = getMessaging();
  const db = getFirestore();
  const auth = getAuth();

  /**
   * DELETE TOKEN HELPER
   */
  const removeFCMToken = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      // Check if token exists before trying to delete (optional optimization)
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { fcmToken: deleteField() });
      console.log("🗑️ FCM Token deleted because notifications were blocked/disabled.");
    } catch (e) {
      console.error("Error deleting FCM token:", e);
    }
  };

  /**
   * 1. CHECK STATUS (Runs on Load)
   */
  const checkTokenStatus = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const browserPerm = Notification.permission;
    permission.value = browserPerm;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const hasToken = !!userData.fcmToken;

      // ----------------------------------------------------------------
      // CRITICAL FIX: If Browser Blocked it, DESTROY the token immediately
      // ----------------------------------------------------------------
      if (browserPerm === "denied" && hasToken) {
        console.log("🚫 Detected 'Denied' permission with active token. Deleting...");
        await removeFCMToken();
        needsNotificationPrompt.value = true; // Show banner so they know why
        return;
      }

      // Check User Preferences
      const prefRef = doc(db, "users", user.uid, "preferences", "general");
      const prefSnap = await getDoc(prefRef);
      const prefData = prefSnap.exists() ? prefSnap.data() : {};
      
      const isAnyEnabled = (prefData.enableNotifications !== false) || (prefData.enableStockAlerts === true);

      if (!isAnyEnabled) {
        if (hasToken) await removeFCMToken(); // Cleanup if they disabled in settings
        needsNotificationPrompt.value = false;
        return;
      }

      // If Granted -> Ensure Token Exists
      if (browserPerm === "granted") {
        if (!hasToken) {
          console.log("ℹ️ Permission granted but Token missing. Fetching silently...");
          await askPermission();
        }
        needsNotificationPrompt.value = false;
      } 
      // If Default (Ask) or Denied -> Show Banner
      else {
        needsNotificationPrompt.value = true;
      }

    } catch (e) {
      console.error("Error checking token status:", e);
    }
  };

  /**
   * 2. LIVE LISTENER (Runs constantly)
   * Detects if user changes settings via the Lock Icon while on the page
   */
  const initPermissionListener = async () => {
    if (!('permissions' in navigator)) return;

    try {
      const status = await navigator.permissions.query({ name: 'notifications' });
      
      status.onchange = async () => {
        console.log("🔄 Browser Permission Changed to:", status.state);
        permission.value = status.state; // 'granted', 'denied', 'prompt'

        // If user manually turns it off (Denied) or resets it (Prompt/Default)
        if (status.state !== 'granted') {
          console.log("🛑 User revoked permission. Deleting token...");
          await removeFCMToken();
          needsNotificationPrompt.value = true;
        } else {
          // If they turned it ON manually, we might want to generate a token
          checkTokenStatus(); 
        }
      };
    } catch (e) {
      console.error("Permission listener error:", e);
    }
  };

  /**
   * ASK PERMISSION (Button Click)
   */
  const askPermission = async () => {
    console.log("🔔 Asking Permission...");
    try {
      const status = await Notification.requestPermission();
      permission.value = status;

      if (status === "denied") {
        showToast({
          severity: "error",
          summary: "Notifications Blocked",
          detail: "Click the Lock icon 🔒 -> Reset permissions -> Reload page.",
          life: 8000
        });
        // We also ensure token is gone if they just clicked Block
        await removeFCMToken(); 
        return null;
      }

      if (status !== "granted") return null;

      if (!('serviceWorker' in navigator)) throw new Error("No SW support.");
      const registration = await navigator.serviceWorker.ready;

      const vapidKey = "BFuddni8Ho8BGympjTzzVgDuNs2qYC9f3b8rSATk94sY077I9Kf0pkucBgDr4a9ka9BqGHmrrf0n1CwM_va-MEg";
      const fcmToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

      if (fcmToken) {
        const user = auth.currentUser;
        if (user) {
          await setDoc(doc(db, "users", user.uid), { fcmToken }, { merge: true });
          console.log("💾 Token saved.");
        }
        needsNotificationPrompt.value = false;
        return fcmToken;
      }

    } catch (err) {
      console.error("❌ Token Error:", err);
      return null;
    }
  };

  onMessage(messaging, (payload) => {
    const { title, body } = payload.notification || {};
    showToast({ severity: "success", summary: title, detail: body, life: 6000 });
    if (Notification.permission === "granted") {
      new Notification(title || "Medication Reminder", { body, icon: "/icons/icon-192.png" });
    }
  });

  return { 
    permission, 
    askPermission, 
    removeFCMToken, 
    checkTokenStatus,
    initPermissionListener // Exported so App.vue can start it
  };
}