const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

exports.medicationReminder = onSchedule(
  {
    schedule: "*/5 * * * *",
    timeZone: "America/Chicago",
  },
  async () => {
    logger.log("⏰ Running medication reminder...");

    const now = new Date();
    
    // 1. QUERY WINDOW: Look ahead 2 hours (120 mins)
    const windowStart = new Date(now.getTime()); 
    const windowEnd = new Date(now.getTime() + 120 * 60000); 

    const snapshot = await db.collectionGroup("medications")
      .where("status", "==", "Active")
      .where("nextScheduledDose", ">=", windowStart)
      .where("nextScheduledDose", "<=", windowEnd)
      .get();

    if (snapshot.empty) {
      logger.log("No active medications found in the 2h window.");
      return;
    }

    const messages = [];

    // 2. PROCESS MEDICATIONS
    for (const medDoc of snapshot.docs) {
      const med = medDoc.data();
      const userRef = medDoc.ref.parent.parent; 
      if (!userRef) continue;

      try {
        const [userSnap, prefSnap] = await Promise.all([
          userRef.get(),
          db.doc(`${userRef.path}/preferences/general`).get()
        ]);

        const userData = userSnap.data();
        const fcmToken = userData?.fcmToken;
        if (!fcmToken) continue;

        const prefs = prefSnap.exists ? prefSnap.data() : {};
        if (prefs.enableNotifications === false) continue;

        const offset = parseInt(prefs.notificationOffset || 10);

        // 3. CALCULATE DIFFERENCE
        const doseTime = med.nextScheduledDose.toDate();
        const diffMs = doseTime.getTime() - now.getTime();
        const diffMinutes = diffMs / 60000;

        // 4. THE 5-MINUTE BUCKET LOGIC
        const lowerBound = offset - 10;
        const upperBound = offset + 10;

        if (diffMinutes >= lowerBound && diffMinutes < upperBound) {
          
          logger.log(`⚡ Triggering ${med.medicineName}: Due in ${diffMinutes.toFixed(1)}m (Offset ${offset})`);

          const timeString = doseTime.toLocaleTimeString("en-US", { 
            hour: 'numeric', minute: '2-digit', hour12: true, timeZone: "America/Chicago"
          });

          // A. Send Notification
          messages.push(
            getMessaging().send({
              token: fcmToken,
              notification: {
                title: `It's time for your meds 💊`,
                body: `Take ${med.medicineName} (${med.form}). Due at ${timeString}.`,
              },
              data: {
                medId: medDoc.id,
                action: "remind"
              }
            })
          );

          // ---------------------------------------------------------
          // B. RESCHEDULE LOGIC (New)
          // ---------------------------------------------------------
          // Calculate the NEXT dose after the one we just notified about
          const nextDoseDate = calculateNextScheduledDose({
             schedule: med.schedule,
             times: med.times,
             fromDateTime: doseTime // Start from the current dose time
          });

          if (nextDoseDate) {
             logger.log(`🔄 Updating ${med.medicineName}: Rescheduled to ${nextDoseDate.toISOString()}`);
             // Update Firestore with the new time
             await medDoc.ref.update({ 
                 nextScheduledDose: nextDoseDate 
             });
          } else {
             logger.warn(`⚠️ Could not calculate next dose for ${med.medicineName}. Check schedule configuration.`);
          }
          // ---------------------------------------------------------
        }
      } catch (error) {
        logger.error(`Error processing med ${medDoc.id}`, error);
      }
    }

    // 5. SEND BATCH
    if (messages.length > 0) {
      const results = await Promise.allSettled(messages);
      logger.log(`✔ Sent ${results.length} notifications.`);
    }
  }
);

/**********************************************
 * STOCK REMINDER 
 **********************************************/
exports.stockReminder = onSchedule(
  {
    schedule: "0 8 * * *", 
    timeZone: "America/Chicago",
  },
  async () => {
    logger.log("📦 Running daily stock reminder...");

    const snapshot = await db.collectionGroup("medications")
      .where("status", "==", "Active")
      .get();

    for (const medDoc of snapshot.docs) {
      const med = medDoc.data();
      const stock = parseFloat(med.currentInventory || 0);
      const threshold = parseFloat(med.refillThreshold || 5);

      if (stock <= threshold) {
        const parentUserRef = medDoc.ref.parent.parent;
        const [userSnap, prefSnap] = await Promise.all([
           parentUserRef.get(),
           parentUserRef.collection("preferences").doc("general").get()
        ]);

        const prefs = prefSnap.exists ? prefSnap.data() : {};
        if (prefs.enableStockAlerts === false) continue;

        const token = userSnap.data()?.fcmToken;
        if (!token) continue;

        await getMessaging().send({
          token,
          notification: {
            title: `Low Stock Warning ⚠️`,
            body: `You only have ${stock} ${med.unit || 'units'} of ${med.medicineName} left.`,
          },
        });
      }
    }
    logger.log("✔ Stock scheduler completed.");
  }
);


function calculateNextScheduledDose({
  schedule,
  times = [],
  fromDateTime = new Date(),
}) {
  const TARGET_TIMEZONE = "America/Chicago";
  
  // 1. Get the current "Chicago Time" parts from the fromDateTime
  // (We use this to ensure we are iterating days relative to Chicago, not UTC)
  const getChicagoDateParts = (date) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: TARGET_TIMEZONE,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    const getPart = (type) => parseInt(parts.find(p => p.type === type).value);
    
    return {
      year: getPart('year'),
      month: getPart('month') - 1, // JS months are 0-11
      day: getPart('day'),
      hour: getPart('hour'),
      minute: getPart('minute')
    };
  };

  // 2. Helper to construct a UTC Timestamp that REPRESENTS a specific Chicago Time
  // "I want 10:25 AM in Chicago. What UTC timestamp is that?"
  const buildChicagoTimestamp = (year, month, day, timeStr) => {
    const [hh, mm] = timeStr.split(":").map(Number);
    
    // Step A: Create a date object assuming the time is UTC first
    const guessDate = new Date(Date.UTC(year, month, day, hh, mm, 0));

    // Step B: Calculate the offset difference
    // What time is this 'guessDate' in Chicago?
    const chicagoParts = getChicagoDateParts(guessDate);
    
    // We treat the parts as if they were UTC to find the shift
    const chicagoAsUtc = new Date(Date.UTC(
      chicagoParts.year, chicagoParts.month, chicagoParts.day, 
      chicagoParts.hour, chicagoParts.minute
    ));

    // Difference between "Real UTC" and "Chicago Time seen as UTC"
    const diff = guessDate.getTime() - chicagoAsUtc.getTime();

    // Step C: Add the difference to the original guess to get the real timestamp
    return new Date(guessDate.getTime() + diff);
  };

  const chicagoNow = getChicagoDateParts(fromDateTime);
  const nowTimestamp = fromDateTime.getTime();

  // Sort times explicitly
  const effectiveTimes = times.length > 0 ? [...times].sort() : ["09:00"];

  // Helper: check if a date (YYYY-MM-DD string) matches schedule
  const isValidScheduleDay = (chicagoDateObj, dateString) => {
    // chicagoDateObj is { year, month, day... }
    // dateString is YYYY-MM-DD
    
    // We need a JS Date object to use .getDay(), but it must be based on Chicago date
    const localDate = new Date(chicagoDateObj.year, chicagoDateObj.month, chicagoDateObj.day);
    const dayOfWeek = localDate.getDay(); 

    switch (schedule?.type) {
      case "Specific Days":
        return schedule.data?.daysOfWeek?.includes(dayOfWeek);

      case "Every Few Days": {
        const start = new Date(schedule.data.startDate);
        // Normalize start date to midnight local to avoid timezone drift in math
        const startLocal = new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
        const checkLocal = new Date(chicagoDateObj.year, chicagoDateObj.month, chicagoDateObj.day);
        
        const diffDays = Math.floor((checkLocal - startLocal) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays % schedule.data.interval === 0;
      }

      case "Custom":
        return schedule.data?.dates?.includes(dateString);

      case "Everyday":
      default:
        return true;
    }
  };

  // 3. Scan next 30 days
  // We start from d=0 (Today) because we might have a later time slot today
  for (let i = 0; i <= 30; i++) {
    // Calculate the target day in Chicago
    const checkDate = new Date(chicagoNow.year, chicagoNow.month, chicagoNow.day + i);
    const year = checkDate.getFullYear();
    const month = checkDate.getMonth();
    const day = checkDate.getDate();
    
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = { year, month, day };

    if (!isValidScheduleDay(dateObj, dateString)) continue;

    // Check times for this valid day
    for (const time of effectiveTimes) {
      const candidateDate = buildChicagoTimestamp(year, month, day, time);
      
      // MUST be strictly in the future relative to the *exact* previous scheduled dose
      if (candidateDate.getTime() > nowTimestamp) {
        return candidateDate;
      }
    }
  }

  return null;
}