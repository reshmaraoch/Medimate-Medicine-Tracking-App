import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "@/firebase_conf";
import { calculateNextScheduledDose } from "@/utils/scheduleUtils";

const getUserID = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("No user logged in");
  }
  return uid;
};

export const getMedsCollectionRef = () => {
  const uid = getUserID();
  return collection(db, "users", uid, "medications");
};

export const saveMeds = async (data) => {
  const uid = getUserID();
  console.log(uid);
  const colRef = collection(db, "users", uid, "medications");

  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  return await addDoc(colRef, payload);
};

export const getAllMeds = async () => {
  const colRef = getMedsCollectionRef();
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
};

export const updateMeds = async (id, data) => {
  const uid = getUserID();
  const docRef = doc(db, "users", uid, "medications", id);
  return await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const getMedsById = async (id) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw Error("User not logged in");

  const docRef = doc(db, "users", uid, "medications", id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) throw Error("Medication not found");

  return { id: snapshot.id, ...snapshot.data() };
};

export const deleteMedById = async (id) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw Error("User is not logged in");

  try {
    const docRef = doc(db, "users", uid, "medications", id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err) {
    console.error("Could not delete medicine", err);
    return { success: false, error: err };
  }
};

function normalizeNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/\D/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// function getAfterSlotDate(slotTime) {
//   const [hh, mm] = slotTime.split(":").map(Number);
//   const d = new Date();
//   d.setHours(hh, mm + 1, 0, 0); // +1 minute to skip logged slot
//   return d;
// }

function buildFromDateTime(slot) {
  const d = new Date();
  let slot_time = "";
  // console.log(typeof slot.time);
  if (slot.time === null || slot.time === undefined || slot.time === "")
    slot_time = "09:00";
  else slot_time = slot.time;
  const [hh, mm] = slot_time.split(":").map(Number);
  d.setHours(hh, mm, 0, 0);

  // move past the logged slot
  d.setSeconds(d.getSeconds() + 1);

  return d;
}

/* -------------------------
   LOG DOSE
------------------------- */
// export async function logDose(slot) {
//   const uid = auth.currentUser?.uid;
//   if (!uid) throw new Error("Not authenticated");

//   const medId = slot.medicationId || slot.medications?.id;
//   if (!medId) throw new Error("Missing medicationId");

//   const dateStr = slot.dateString;
//   if (!dateStr) throw new Error("Missing dateString");

//   const rawSlot = slot.scheduledTimeSlot ?? slot.time ?? "";
//   const slotKey =
//     rawSlot && String(rawSlot).trim() ? String(rawSlot).trim() : "NO_TIME";

//   const logId = `${dateStr}_${medId}_${slotKey}`;

//   const medRef = doc(db, "users", uid, "medications", medId);
//   const logRef = doc(db, "users", uid, "logs", logId);

//   await runTransaction(db, async (tx) => {
//     const medSnap = await tx.get(medRef);
//     if (!medSnap.exists()) throw new Error("Medication not found");

//     const medData = medSnap.data();

//     const currentInventory = normalizeNumber(medData.currentInventory);
//     const doseQuantity = normalizeNumber(medData.doseQuantity);

//     const hasInventory =
//       medData.currentInventory !== null &&
//       medData.currentInventory !== undefined &&
//       !isNaN(medData.currentInventory) &&
//       !isNaN(doseQuantity);

//     if (hasInventory && currentInventory < doseQuantity) {
//       throw new Error("Not enough inventory");
//     }
//     const fromDate = getAfterSlotDate(slot.time);

//     const nextDose = calculateNextScheduledDose(
//       {
//         schedule: medData.schedule,
//         times: medData.times,
//       },
//       fromDate
//     );

//     tx.set(logRef, {
//       medicationId: medId,
//       scheduledTimeSlot: slotKey === "NO_TIME" ? "" : slotKey,
//       dateString: dateStr,
//       action: "TAKEN",
//       takenAt: Timestamp.now(),
//       dosageTaken: doseQuantity,
//     });

//     // const nextDose = calculateNextScheduledDose({
//     //   schedule: medData.schedule,
//     //   times: medData.times,
//     //   fromDateTime: new Date(),
//     // });

//     // if (hasInventory) {
//     //   tx.update(medRef, {
//     //     currentInventory: currentInventory - doseQuantity,
//     //     updatedAt: Timestamp.now(),
//     //   });
//     // }
//     // ---------------
//     // if (hasInventory) {
//     //   tx.update(medRef, {
//     //     ...(medData.currentInventory != null && {
//     //       currentInventory: currentInventory - doseQuantity,
//     //     }),
//     //     nextScheduledDose: nextDose,
//     //     updatedAt: Timestamp.now(),
//     //   });
//     // }
//     // ---------------
//     const updates = {
//       nextScheduledDose: nextDose,
//       updatedAt: Timestamp.now(),
//     };

//     if (hasInventory) {
//       updates.currentInventory = currentInventory - doseQuantity;
//     }

//     tx.update(medRef, updates);
//   });
// }
export async function logDose(slot) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const med = slot.medications;
  const dateStr = slot.dateString;
  console.log(dateStr);
  const logId = `${dateStr}_${med.id}_${slot.time}`;

  const medRef = doc(db, "users", uid, "medications", med.id);
  const logRef = doc(db, "users", uid, "logs", logId);

  await runTransaction(db, async (tx) => {
    const medSnap = await tx.get(medRef);
    if (!medSnap.exists()) throw new Error("Medication not found");

    const medData = medSnap.data();

    const hasInventory =
      medData.currentInventory != null && medData.doseQuantity != null;

    let currentInventory = null;
    let doseQuantity = null;

    if (hasInventory) {
      currentInventory = normalizeNumber(medData.currentInventory);
      doseQuantity = normalizeNumber(medData.doseQuantity);

      if (currentInventory < doseQuantity) {
        throw new Error("Not enough inventory");
      }
    }

    const fromDateTime = buildFromDateTime(slot);
    console.log(fromDateTime);
    const nextDose = calculateNextScheduledDose({
      schedule: medData.schedule,
      times: medData.times,
      fromDateTime,
    });

    // Log entry
    tx.set(logRef, {
      medicationId: med.id,
      scheduledTimeSlot: slot.time,
      dateString: dateStr,
      action: "TAKEN",
      takenAt: Timestamp.now(),
      dosageTaken: doseQuantity ?? null,
    });

    // Medication update (ALWAYS update nextScheduledDose)
    const updates = {
      nextScheduledDose: nextDose,
      updatedAt: Timestamp.now(),
    };

    if (hasInventory) {
      updates.currentInventory = currentInventory - doseQuantity;
    }

    tx.update(medRef, updates);
  });
}

/* -------------------------
   UNDO DOSE 
------------------------- */
// export async function unLogDose(slot) {
//   const uid = auth.currentUser?.uid;
//   if (!uid) throw new Error("Not authenticated");

//   const medId = slot.medicationId || slot.medications?.id;
//   if (!medId) throw new Error("Missing medicationId");

//   const dateStr = slot.dateString;
//   if (!dateStr) throw new Error("Missing dateString");

//   const rawSlot = slot.scheduledTimeSlot ?? slot.time ?? "";
//   const slotKey =
//     rawSlot && String(rawSlot).trim() ? String(rawSlot).trim() : "NO_TIME";

//   const logId = `${dateStr}_${medId}_${slotKey}`;

//   const medRef = doc(db, "users", uid, "medications", medId);
//   const logRef = doc(db, "users", uid, "logs", logId);

//   await runTransaction(db, async (tx) => {
//     const medSnap = await tx.get(medRef);
//     if (!medSnap.exists()) throw new Error("Medication not found");

//     const medData = medSnap.data();
//     const doseQuantity = normalizeNumber(medData.doseQuantity);
//     const currentInventory = normalizeNumber(medData.currentInventory);

//     const hasInventory =
//       medData.currentInventory !== null &&
//       medData.currentInventory !== undefined &&
//       !isNaN(medData.currentInventory) &&
//       !isNaN(doseQuantity);

//     tx.delete(logRef);

//     // const nextDose = calculateNextScheduledDose({
//     //   schedule: medData.schedule,
//     //   times: medData.times,
//     //   fromDateTime: new Date(),
//     // });

//     // if (hasInventory) {
//     //   tx.update(medRef, {
//     //     ...(medData.currentInventory != null && {
//     //       currentInventory: currentInventory + doseQuantity,
//     //     }),
//     //     nextScheduledDose: nextDose,
//     //     updatedAt: Timestamp.now(),
//     //   });
//     // }

//     // Recompute next dose from NOW
//     const nextDose = calculateNextScheduledDose(
//       {
//         schedule: medData.schedule,
//         times: medData.times,
//       },
//       new Date()
//     );

//     const updates = {
//       nextScheduledDose: nextDose,
//       updatedAt: Timestamp.now(),
//     };

//     if (hasInventory) {
//       updates.currentInventory = currentInventory + doseQuantity;
//     }

//     tx.update(medRef, updates);

//     // if (hasInventory) {
//     //   tx.update(medRef, {
//     //     currentInventory: currentInventory + doseQuantity,
//     //     updatedAt: Timestamp.now(),
//     //   });
//     // }
//   });
// }

export async function unLogDose(slot) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const med = slot.medications;
  const dateStr = slot.dateString;
  console.log(dateStr);
  const logId = `${dateStr}_${med.id}_${slot.time}`;

  const medRef = doc(db, "users", uid, "medications", med.id);
  const logRef = doc(db, "users", uid, "logs", logId);

  await runTransaction(db, async (tx) => {
    const medSnap = await tx.get(medRef);
    if (!medSnap.exists()) throw new Error("Medication not found");

    const medData = medSnap.data();

    const hasInventory =
      medData.currentInventory != null && medData.doseQuantity != null;

    let currentInventory = null;
    let doseQuantity = null;

    if (hasInventory) {
      currentInventory = normalizeNumber(medData.currentInventory);
      doseQuantity = normalizeNumber(medData.doseQuantity);
    }

    // Delete log
    tx.delete(logRef);

    // Recompute next dose from NOW
    const nextDose = calculateNextScheduledDose(
      {
        schedule: medData.schedule,
        times: medData.times,
      },
      new Date()
    );

    const updates = {
      nextScheduledDose: nextDose,
      updatedAt: Timestamp.now(),
    };

    if (hasInventory) {
      updates.currentInventory = currentInventory + doseQuantity;
    }

    tx.update(medRef, updates);
  });
}
