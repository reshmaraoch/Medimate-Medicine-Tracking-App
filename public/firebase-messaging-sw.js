// Firebase CDN scripts (compatible with service worker)
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Your Firebase config (must be copied manually — SW cannot import files)
firebase.initializeApp({
  apiKey: "AIzaSyCqZTmlLBWhx7awpLJ1Uuls9pVhRS_tey0",
  authDomain: "project2-e9097.firebaseapp.com",
  projectId: "project2-e9097",
  storageBucket: "project2-e9097.firebasestorage.app",
  messagingSenderId: "356904850",
  appId: "1:356904850:web:b621dc69626ba76cc3db4b"
});

// Initialize Messaging inside the SW
const messaging = firebase.messaging();

// Background handler (when app is closed or not focused)
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message:", payload);

  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icons/icon-192.png"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handles "push" events (covers all message types)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  const title = payload.notification?.title || "New Message";
  const options = {
    body: payload.notification?.body || "",
    icon: "/icons/icon-192.png",
    data: payload.data || {}
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
