// public/firebase-messaging-sw.js

// 1. Import Firebase scripts (Compat version is correct for SW)
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// 2. Initialize Firebase
// (These keys are safe to be public in a frontend app)
firebase.initializeApp({
  apiKey: "AIzaSyCqZTmlLBWhx7awpLJ1Uuls9pVhRS_tey0",
  authDomain: "project2-e9097.firebaseapp.com",
  projectId: "project2-e9097",
  storageBucket: "project2-e9097.firebasestorage.app",
  messagingSenderId: "356904850",
  appId: "1:356904850:web:b621dc69626ba76cc3db4b"
});

// 3. Initialize Messaging
const messaging = firebase.messaging();

// 4. Handle Background Messages
// This triggers when the browser receives a push while your tab is CLOSED or HIDDEN.
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message received:", payload);

  // Customize the notification here
  const notificationTitle = payload.notification?.title || "Medication Reminder";
  const notificationOptions = {
    body: payload.notification?.body || "It's time for your meds.",
    icon: "/icons/icon-192.png", // Ensure this file exists in /public/icons/
    
    // Optional: Clicking the notification opens your app
    data: payload.data 
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// REMOVED: self.addEventListener("push") 
// Reason: Firebase SDK handles this automatically. Keeping it often causes double notifications.