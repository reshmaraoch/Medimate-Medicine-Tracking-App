// notifications.js
// Runs in GitHub Actions as a cron job (no Firebase Functions needed)

import fetch from 'node-fetch';
import { google } from 'googleapis';
import fs from 'fs';

// Load service account credentials
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Create JWT client to authenticate to Firestore
const jwtClient = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  ["https://www.googleapis.com/auth/datastore"]
);

// FCM server key (from Firebase Console → Cloud Messaging → Legacy server key)
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

/* ----------------------------------------------------------
   HELPERS
---------------------------------------------------------- */

// Send push notification via REST API
async function sendNotification(token, title, body) {
  await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: "key=" + FCM_SERVER_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body }
    }),
  });
}

/* ----------------------------------------------------------
   FIRESTORE HELPERS
---------------------------------------------------------- */

async function getFirestoreDocuments(path) {
  const url = `https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

  const token = await jwtClient.authorize().then(res => res.access_token);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

/* ----------------------------------------------------------
   MEDICATION CHECK LOGIC
---------------------------------------------------------- */
async function runMedicationCheck() {
  console.log("Running medication check...");

  const users = await getFirestoreDocuments("users");

  if (!users.documents) return;

  const now = new Date();

  for (const userDoc of users.documents) {
    const uid = userDoc.name.split("/").pop();
    const fields = userDoc.fields;

    const token = fields.fcmToken?.stringValue;
    if (!token) continue;

    // Fetch preferences
    const prefsRes = await getFirestoreDocuments(`users/${uid}/preferences`);
    const generalPrefDoc = prefsRes.documents?.find(d => d.name.endsWith("general"));

    if (!generalPrefDoc) continue;

    const prefs = generalPrefDoc.fields;
    if (!prefs.enableNotifications?.booleanValue) continue;

    const offset = parseInt(prefs.notificationOffset?.integerValue ?? "10");

    // Fetch medications
    const meds = await getFirestoreDocuments(`users/${uid}/medication`);
    if (!meds.documents) continue;

    for (const medDoc of meds.documents) {
      const med = medDoc.fields;

      if (!med.nextDoseTime) continue;

      const doseTime = new Date(med.nextDoseTime.stringValue);
      const diffMinutes = (doseTime - now) / 60000;

      if (diffMinutes <= offset && diffMinutes > offset - 5) {
        await sendNotification(
          token,
          "Medication Reminder 💊",
          `It's almost time to take ${med.medicineName?.stringValue}.`
        );
      }
    }
  }
}

/* ----------------------------------------------------------
   STOCK CHECK LOGIC
---------------------------------------------------------- */
async function runStockCheck() {
  console.log("Running stock alert...");

  const users = await getFirestoreDocuments("users");
  if (!users.documents) return;

  for (const userDoc of users.documents) {
    const uid = userDoc.name.split("/").pop();
    const fields = userDoc.fields;

    const token = fields.fcmToken?.stringValue;
    if (!token) continue;

    // Preferences
    const prefsRes = await getFirestoreDocuments(`users/${uid}/preferences`);
    const generalPrefDoc = prefsRes.documents?.find(d => d.name.endsWith("general"));
    if (!generalPrefDoc) continue;

    const prefs = generalPrefDoc.fields;
    if (!prefs.enableStockAlerts?.booleanValue) continue;

    const reminderDays = parseInt(prefs.stockReminderDays?.integerValue ?? "2");

    // Medications
    const meds = await getFirestoreDocuments(`users/${uid}/medication`);
    if (!meds.documents) continue;

    for (const medDoc of meds.documents) {
      const med = medDoc.fields;

      const stock = parseInt(med.stock?.integerValue ?? "0");
      const dosesPerDay = parseInt(med.dosesPerDay?.integerValue ?? "1");

      if (!stock || !dosesPerDay) continue;

      const daysLeft = stock / dosesPerDay;

      if (daysLeft <= reminderDays) {
        await sendNotification(
          token,
          "Low Stock Warning ⚠️",
          `${med.medicineName?.stringValue} has only ${Math.floor(daysLeft)} day(s) left.`
        );
      }
    }
  }
}

/* ----------------------------------------------------------
   MAIN ENTRY
---------------------------------------------------------- */
(async () => {
  await runMedicationCheck();
  await runStockCheck();
})();
