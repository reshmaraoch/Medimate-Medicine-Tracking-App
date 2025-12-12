const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

/**********************************************
 * MEDICATION REMINDER — EVERY 5 MINUTES
 **********************************************/
exports.medicationReminder = onSchedule(
  {
    schedule: "*/5 * * * *",
    timeZone: "America/Chicago",
  },
  async () => {
    logger.log("⏰ Running medication reminder scheduler...");

    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();
      const token = userData.fcmToken;

      if (!token) continue;

      // Load preferences
      const prefSnap = await db
        .collection("users")
        .doc(uid)
        .collection("preferences")
        .doc("general")
        .get();

      const prefs = prefSnap.exists ? prefSnap.data() : {};
      const remindersEnabled = prefs.enableNotifications;
      const offset = prefs.notificationOffset || 0;

      if (!remindersEnabled) continue;

      // Fetch meds
      const medsSnap = await db
        .collection("users")
        .doc(uid)
        .collection("medication")
        .get();

      for (const medDoc of medsSnap.docs) {
        const med = medDoc.data();

        const name = med.medicineName;
        const medTime = med.time; // "HH:MM"

        if (!medTime) continue;

        // -----------------------------------------------------
        // DETERMINE IF TODAY IS A DOSE DAY
        // -----------------------------------------------------
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0]; // "2025-12-09"
        const dayName = today.toLocaleString("en-US", { weekday: "short" }); // "Mon"

        const scheduleType = med.scheduleType;
        const scheduleData = med.scheduleData || {};

        let isTodayDose = false;

        switch (scheduleType) {
          case "Everyday":
            isTodayDose = true;
            break;

          case "AsNeeded":
            // No auto reminders
            continue;

          case "SpecificDays":
            const days = scheduleData.daysOfWeek || [];
            isTodayDose = days.includes(dayName);
            break;

          case "EveryFewDays":
            const interval = scheduleData.interval || 1;
            const lastTakenDate = new Date(scheduleData.lastTakenDate);

            const diffDays = Math.floor(
              (today - lastTakenDate) / (1000 * 60 * 60 * 24)
            );

            if (diffDays % interval === 0) {
              isTodayDose = true;
            }
            break;

          case "Custom":
            const dates = scheduleData.dates || [];
            isTodayDose = dates.includes(todayStr);
            break;

          default:
            isTodayDose = true; // fallback
        }

        if (!isTodayDose) continue;

        // -----------------------------------------------------
        // TIME CALCULATION (existing logic)
        // -----------------------------------------------------
        const now = new Date();
        const HH = String(now.getHours()).padStart(2, "0");
        const MM = String(now.getMinutes()).padStart(2, "0");
        const currentTime = `${HH}:${MM}`;

        const [h, m] = medTime.split(":").map(Number);
        const doseTime = new Date();
        doseTime.setHours(h, m, 0, 0);

        const reminderDate = new Date(doseTime.getTime() - offset * 60000);
        const rHH = String(reminderDate.getHours()).padStart(2, "0");
        const rMM = String(reminderDate.getMinutes()).padStart(2, "0");
        const reminderTime = `${rHH}:${rMM}`;

        if (currentTime === reminderTime) {
          logger.log(`📩 Reminder → ${name} at ${currentTime}`);

          await getMessaging().send({
            token,
            notification: {
              title: `Reminder: ${name}`,
              body: `This medication is due at ${medTime}.`,
            },
          });
        }
      }
    }

    logger.log("✔ Medication scheduler completed.");
  }
);

/**********************************************
 * STOCK REMINDER (unchanged except schema compatibility)
 **********************************************/
exports.stockReminder = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "America/Chicago",
  },
  async () => {
    logger.log("📦 Running daily stock reminder...");

    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();
      const token = userData.fcmToken;

      if (!token) continue;

      const prefSnap = await db
        .collection("users")
        .doc(uid)
        .collection("preferences")
        .doc("general")
        .get();

      const prefs = prefSnap.exists ? prefSnap.data() : {};

      if (!prefs.enableStockAlerts) continue;

      const thresholdDays = prefs.stockReminderDays || 2;

      const medsSnap = await db
        .collection("users")
        .doc(uid)
        .collection("medication")
        .get();

      for (const medDoc of medsSnap.docs) {
        const med = medDoc.data();

        const name = med.medicineName;
        const form = med.form;
        const stock = med.remainingStock ?? med.stockQuantity;

        if (!stock) continue;

        let dailyUsage = 1;

        if (med.scheduleType === "Everyday") {
          dailyUsage = 1;
        } else if (!med.scheduleType && form === "Syrup") {
          if (stock < 50) {
            await getMessaging().send({
              token,
              notification: {
                title: `Low Stock: ${name}`,
                body: `Your syrup has less than 50ml remaining.`,
              },
            });
            continue;
          }
        }

        const daysLeft = stock / dailyUsage;

        if (daysLeft <= thresholdDays) {
          await getMessaging().send({
            token,
            notification: {
              title: `Running Low: ${name}`,
              body: `${name} will run out in ${Math.floor(daysLeft)} days.`,
            },
          });
        }
      }
    }

    logger.log("✔ Stock scheduler completed.");
  }
);
