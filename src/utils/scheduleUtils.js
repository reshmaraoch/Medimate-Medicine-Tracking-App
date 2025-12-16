// /**
//  * Calculates the next valid dose timestamp from a given starting point.
//  * @param {Object} med - Medication object with schedule & times
//  * @param {Date} fromDate
//  * @returns {Date|null}
//  */
// export function calculateNextScheduledDose(med, fromDate = new Date()) {
//   const times = med.times || [];
//   if (!times.length) return null;

//   const sortedTimes = [...times].sort();
//   let checkDate = new Date(fromDate);
//   checkDate.setSeconds(0, 0);

//   for (let i = 0; i < 365; i++) {
//     const dateStr = checkDate.toISOString().split("T")[0];
//     const dayOfWeek = checkDate.getDay();

//     let isScheduledDay = false;

//     switch (med.schedule.type) {
//       case "Everyday":
//         isScheduledDay = true;
//         break;

//       case "Specific Days":
//         isScheduledDay = med.schedule.data.daysOfWeek?.includes(dayOfWeek);
//         break;

//       case "Every Few Days": {
//         const start = new Date(med.schedule.data.startDate);
//         start.setHours(0, 0, 0, 0);
//         const diffDays = Math.floor(
//           (checkDate - start) / (1000 * 60 * 60 * 24)
//         );
//         isScheduledDay =
//           diffDays >= 0 && diffDays % med.schedule.data.interval === 0;
//         break;
//       }

//       case "Custom":
//         isScheduledDay = med.schedule.data.dates?.includes(dateStr);
//         break;
//     }

//     if (isScheduledDay) {
//       for (const time of sortedTimes) {
//         const [hh, mm] = time.split(":").map(Number);
//         const candidate = new Date(checkDate);
//         candidate.setHours(hh, mm, 0, 0);

//         if (candidate > fromDate) {
//           return candidate;
//         }
//       }
//     }

//     checkDate.setDate(checkDate.getDate() + 1);
//     checkDate.setHours(0, 0, 0, 0);
//   }

//   return null;
// }

// src/utils/scheduleUtils.js

export function calculateNextScheduledDose({
  schedule,
  times = [],
  fromDateTime = new Date(),
}) {
  const now = new Date(fromDateTime);

  // DEFAULT TIME FALLBACK
  const effectiveTimes = times.length > 0 ? [...times].sort() : ["09:00"];

  // Helper to build Date from day + time
  const buildDateTime = (date, timeStr) => {
    const [hh, mm] = timeStr.split(":").map(Number);
    const d = new Date(date);
    d.setHours(hh, mm, 0, 0);
    return d;
  };

  // Helper: check if a date matches schedule
  const isValidScheduleDay = (date) => {
    switch (schedule?.type) {
      case "Specific Days":
        return schedule.data?.daysOfWeek?.includes(date.getDay());

      case "Every Few Days": {
        const start = new Date(schedule.data.startDate);
        const diffDays = Math.floor((date - start) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays % schedule.data.interval === 0;
      }

      case "Custom":
        return schedule.data?.dates?.includes(date.toISOString().split("T")[0]);

      case "Everyday":
      default:
        return true;
    }
  };

  // Try today first
  for (const time of effectiveTimes) {
    const candidate = buildDateTime(now, time);
    if (candidate > now && isValidScheduleDay(candidate)) {
      return candidate;
    }
  }

  // Otherwise scan future days
  for (let i = 1; i <= 30; i++) {
    const future = new Date(now);
    future.setDate(future.getDate() + i);

    if (!isValidScheduleDay(future)) continue;

    return buildDateTime(future, effectiveTimes[0]);
  }

  return null;
}
