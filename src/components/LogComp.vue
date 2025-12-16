<script setup>
import { ref, computed, onMounted } from "vue";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase_conf";
import { logDose, unLogDose } from "@/firebase/firebase_service.js";

const LOGS_CHANGED_EVENT = "medimate:logs-changed";

const slots = ref([]);
const viewMode = ref("time"); // "time" | "med"

/* ---------- date helpers (LOCAL, not UTC) ---------- */
function todayStringLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function toJSDate(x) {
    if (!x) return null;
    if (typeof x?.toDate === "function") return x.toDate();
    if (x instanceof Date) return x;

    if (typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x)) {
        const [yy, mm, dd] = x.split("-").map(Number);
        return new Date(yy, mm - 1, dd, 0, 0, 0, 0);
    }

    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d;
}

/* ---------- schedule normalization (same as analytics) ---------- */
function normalizeScheduleType(raw) {
    return String(raw || "Everyday").toLowerCase().trim().replace(/\s+|_|-/g, "");
}

function normalizeScheduleFromLegacy(scheduleType) {
    const t = normalizeScheduleType(scheduleType);
    if (t === "asneeded") return { type: "AsNeeded", data: {} };
    if (t === "everyday") return { type: "Everyday", data: {} };
    if (t === "specificdays") return { type: "SpecificDays", data: {} };
    if (t === "everyfewdays") return { type: "EveryFewDays", data: {} };
    if (t === "custom") return { type: "Custom", data: {} };
    return { type: "Everyday", data: {} };
}

function normalizeTimes(med) {
    if (Array.isArray(med.times)) return med.times;
    if (typeof med.times === "string") return [med.times];
    if (typeof med.time === "string") return [med.time];
    return [];
}

function normalizeMed(docId, raw) {
    return {
        id: docId,
        ...raw,
        status: raw.status ?? "Active",
        times: normalizeTimes(raw),
        schedule: raw.schedule ?? normalizeScheduleFromLegacy(raw.scheduleType),
        startDate: raw.startDate ?? null,
        endDate: raw.endDate ?? null,
    };
}

function isActiveInDateRange(med, dateObj) {
    const s = toJSDate(med.startDate);
    if (s) {
        s.setHours(0, 0, 0, 0);
        const t = new Date(dateObj);
        t.setHours(0, 0, 0, 0);
        if (t < s) return false;
    }

    const e = toJSDate(med.endDate);
    if (e) {
        e.setHours(23, 59, 59, 999);
        if (dateObj > e) return false;
    }

    return true;
}

function dowToNum(x) {
    if (typeof x === "number") return x;
    const map = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const key = String(x || "").slice(0, 3).toLowerCase();
    return map[key];
}

function isScheduledOnDate(med, dateObj) {
    if ((med.status || "Active") !== "Active") return false;
    if (!isActiveInDateRange(med, dateObj)) return false;

    const schedule = med.schedule || {};
    const typeNorm = normalizeScheduleType(schedule.type || "Everyday");
    const data = schedule.data || {};

    if (typeNorm === "asneeded") return false;
    if (typeNorm === "everyday") return true;

    if (typeNorm === "specificdays") {
        const raw = Array.isArray(data.daysOfWeek) ? data.daysOfWeek : [];
        if (raw.length === 0) return false;
        const days = raw.map(dowToNum).filter((v) => v !== undefined);
        return days.includes(dateObj.getDay());
    }

    if (typeNorm === "everyfewdays") {
        const interval = Number(data.interval || 0);
        const start = toJSDate(data.startDate);
        if (!interval || !start) return false;

        start.setHours(0, 0, 0, 0);
        const target = new Date(dateObj);
        target.setHours(0, 0, 0, 0);

        const diffDays = Math.round((target - start) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays % interval === 0;
    }

    if (typeNorm === "custom") {
        const dates = Array.isArray(data.dates) ? data.dates : [];
        if (dates.length === 0) return false;

        const ds = todayStringLocal();
        const normalizedDates = dates.map((x) => {
            const d = toJSDate(x);
            if (!d) return String(x);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        });

        return normalizedDates.includes(ds);
    }

    return false;
}

/* ---------- logs taken-set builder (robust) ---------- */
function buildTakenSet(logDocs) {
    const set = new Set();
    for (const doc of logDocs) {
        const d = doc.data ? doc.data() : doc;
        const id = doc.id || d?.id;

        if (id && typeof id === "string") set.add(id);

        if (d?.dateString && d?.medicationId) {
            const slot =
                d.scheduledTimeSlot === null ||
                    d.scheduledTimeSlot === "" ||
                    d.scheduledTimeSlot === undefined
                    ? "NO_TIME"
                    : d.scheduledTimeSlot;

            set.add(`${d.dateString}_${d.medicationId}_${slot}`);
        }
    }
    return set;
}

/* LOAD DAILY DATA */
async function loadTodaySlots() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    slots.value = [];

    const today = startOfDay(new Date());
    const dateStr = todayStringLocal();

    const medsSnap = await getDocs(collection(db, "users", uid, "medications"));

    const meds = medsSnap.docs
        .map((d) => normalizeMed(d.id, d.data()))
        .filter((m) => (m.status || "Active") !== "Deleted" && (m.status || "Active") === "Active")
        .filter((m) => isScheduledOnDate(m, today));

    const logsSnap = await getDocs(
        query(collection(db, "users", uid, "logs"), where("dateString", "==", dateStr))
    );

    const takenSet = buildTakenSet(logsSnap.docs);

    const result = [];

    meds.forEach((med) => {
        const timesArray = normalizeTimes(med);

        if (!timesArray || timesArray.length === 0) {
            const logId = `${dateStr}_${med.id}_NO_TIME`;
            result.push({
                medications: med,
                time: "",
                slotKeyTime: "NO_TIME",
                isTaken: takenSet.has(logId),
            });
            return;
        }

        timesArray.forEach((time) => {
            const logId = `${dateStr}_${med.id}_${time}`;
            result.push({
                medications: med,
                time,
                slotKeyTime: time,
                isTaken: takenSet.has(logId),
            });
        });
    });

    slots.value = result;
}

onMounted(() => {
    onAuthStateChanged(auth, (user) => {
        if (user) loadTodaySlots();
        else slots.value = [];
    });
});

/* GROUPED VIEWS */
const chronological = computed(() =>
    [...slots.value].sort((a, b) => (a.time || "").localeCompare(b.time || ""))
);

const grouped = computed(() => {
    const map = {};
    slots.value.forEach((s) => {
        const id = s.medications.id;
        if (!map[id]) {
            map[id] = { medications: s.medications, items: [] };
        }
        map[id].items.push(s);
    });
    return Object.values(map);
});

/* ACTIONS */
async function handleLog(slot) {
    await logDose({
        ...slot,
        scheduledTimeSlot: slot.slotKeyTime === "NO_TIME" ? "" : slot.slotKeyTime,
        dateString: todayStringLocal(),
        medicationId: slot.medications.id,
    });

    await loadTodaySlots();
    window.dispatchEvent(new CustomEvent(LOGS_CHANGED_EVENT));
}

async function handleUndo(slot) {
    await unLogDose({
        ...slot,
        scheduledTimeSlot: slot.slotKeyTime === "NO_TIME" ? "" : slot.slotKeyTime,
        dateString: todayStringLocal(),
        medicationId: slot.medications.id,
    });

    await loadTodaySlots();
    window.dispatchEvent(new CustomEvent(LOGS_CHANGED_EVENT));
}

function isLowStock(med) {
    if (med.currentInventory === null || med.currentInventory === undefined) return false;
    if (med.refillThreshold === null || med.refillThreshold === undefined) return false;

    const inventory = Number(med.currentInventory);
    const threshold = Number(med.refillThreshold);

    if (isNaN(inventory) || isNaN(threshold)) return false;
    return inventory <= threshold;
}

function displayTime(slot) {
    return slot.time ? slot.time : "Any time";
}
</script>

<template>
    <!-- ✅ same outer width as analytics -->
    <div class="logger-container">
        <section class="panel card">
            <header class="header">
                <div class="header-left">
                    <h2 class="title">Time to Log 💊</h2>
                    <p class="sub">Medicines due today</p>
                </div>

                <div class="header-right">
                    <select class="select" v-model="viewMode">
                        <option value="time">Chronological</option>
                        <option value="med">By Medication</option>
                    </select>
                </div>
            </header>

            <!-- Chronological View -->
            <div v-if="viewMode === 'time'">
                <div v-for="slot in chronological" :key="slot.medications.id + slot.slotKeyTime" class="dose-row">
                    <div class="dose-left">
                        <div class="dose-time">{{ displayTime(slot) }}</div>

                        <div class="dose-main">
                            <div class="dose-name">{{ slot.medications.medicineName }}</div>

                            <div class="dose-meta">
                                {{ slot.medications.doseQuantity || 1 }}
                                {{ slot.medications.unit || "dose" }} •
                                {{ slot.medications.form || "Medication" }}
                            </div>

                            <div v-if="slot.medications.currentInventory !== null && slot.medications.currentInventory !== undefined"
                                class="dose-stock">
                                Remaining: {{ slot.medications.currentInventory }}
                            </div>

                            <div v-if="isLowStock(slot.medications)" class="low-stock-warning">
                                ⚠️ Low stock ({{ slot.medications.currentInventory }}
                                {{ slot.medications.unit || "" }} remaining)
                            </div>
                        </div>
                    </div>

                    <div class="dose-action">
                        <button v-if="!slot.isTaken" class="btn" @click="handleLog(slot)">Log</button>
                        <button v-else class="btn btn-ghost" @click="handleUndo(slot)">Undo</button>
                    </div>
                </div>
            </div>

            <!-- Grouped View -->
            <div v-else>
                <div v-for="group in grouped" :key="group.medications.id" class="group">
                    <h3 class="group-title">{{ group.medications.medicineName }}</h3>

                    <div v-for="dose in group.items" :key="dose.medications.id + dose.slotKeyTime" class="dose-row">
                        <div class="dose-left">
                            <div class="dose-time">{{ displayTime(dose) }}</div>

                            <div class="dose-main">
                                <div class="dose-name">{{ dose.medications.medicineName }}</div>

                                <div class="dose-meta">
                                    {{ dose.medications.doseQuantity || 1 }}
                                    {{ dose.medications.unit || "dose" }} •
                                    {{ dose.medications.form || "Medication" }}
                                </div>

                                <div v-if="dose.medications.currentInventory !== null && dose.medications.currentInventory !== undefined"
                                    class="dose-stock">
                                    Remaining: {{ dose.medications.currentInventory }}
                                </div>

                                <div v-if="isLowStock(dose.medications)" class="low-stock-warning">
                                    ⚠️ Low stock ({{ dose.medications.currentInventory }}
                                    {{ dose.medications.unit || "" }} remaining)
                                </div>
                            </div>
                        </div>

                        <div class="dose-action">
                            <button v-if="!dose.isTaken" class="btn" @click="handleLog(dose)">Log</button>
                            <button v-else class="btn btn-ghost" @click="handleUndo(dose)">Undo</button>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="slots.length === 0" class="empty">
                No medicines due today.
            </div>
        </section>
    </div>
</template>

<style scoped>
/* ✅ Match analytics container width and padding */
.logger-container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 18px 28px;
    color: var(--color-text);
}

/* panel style aligned with analytics cards */
.panel {
    padding: 14px 14px 16px;
}

/* Header */
.header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 12px;
    padding: 10px 10px 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 10px;
    flex-wrap: wrap;
}

.header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.title {
    margin: 0;
    font-weight: 950;
    font-size: 1.25rem;
    letter-spacing: -0.02em;
}

.sub {
    margin: 0;
    color: var(--color-subtle-text);
    font-weight: 700;
    font-size: 0.9rem;
}

.header-right {
    margin-left: auto;
}

/* Select */
.select {
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 10px 12px;
    color: var(--color-text);
    font-weight: 800;
    outline: none;
    min-width: 210px;
}

.select:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 22%, transparent);
}

.group {
    margin-top: 10px;
}

.group-title {
    margin: 12px 0 6px;
    font-weight: 950;
}

/* Rows */
.dose-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 12px 10px;
    border-bottom: 1px solid var(--color-border);
}

.dose-left {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    min-width: 0;
}

.dose-time {
    font-weight: 900;
    min-width: 92px;
    color: var(--color-primary);
    white-space: nowrap;
}

.dose-main {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
}

.dose-name {
    font-size: 1rem;
    font-weight: 900;
}

.dose-meta {
    font-size: 0.85rem;
    color: var(--color-subtle-text);
    font-weight: 700;
}

.dose-stock {
    font-size: 0.82rem;
    color: var(--color-subtle-text);
    font-weight: 700;
}

.dose-action {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}

/* Buttons */
.btn {
    border-radius: 999px;
    padding: 0.55rem 1.05rem;
    border: 1px solid var(--color-border);
    cursor: pointer;
    font-weight: 900;
    background: color-mix(in srgb, var(--color-primary) 18%, var(--color-card));
    color: var(--color-text);
    transition: transform 0.12s ease, background 0.15s ease;
}

.btn:hover {
    background: color-mix(in srgb, var(--color-primary) 28%, var(--color-card));
    transform: translateY(-1px);
}

.btn:active {
    transform: translateY(0px);
}

.btn-ghost {
    background: transparent;
}

.low-stock-warning {
    margin-top: 4px;
    font-size: 0.78rem;
    color: #f59e0b;
    font-weight: 800;
}

.empty {
    padding: 14px 10px 4px;
    color: var(--color-subtle-text);
    font-weight: 800;
}

/* ✅ Mobile friendly */
@media (max-width: 720px) {
    .logger-container {
        padding: 0 10px 24px;
    }

    .header {
        flex-direction: column;
        align-items: stretch;
    }

    .header-right {
        width: 100%;
        margin-left: 0;
    }

    .select {
        width: 100%;
        min-width: 0;
    }

    .dose-row {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 12px 6px;
    }

    .dose-left {
        width: 100%;
    }

    .dose-time {
        min-width: 72px;
    }

    .dose-action {
        width: 100%;
        justify-content: flex-end;
    }
}

/* ✅ Extra small */
@media (max-width: 480px) {
    .dose-left {
        flex-direction: column;
        gap: 6px;
    }

    .dose-time {
        color: var(--color-subtle-text);
        font-weight: 800;
    }

    .dose-action {
        justify-content: stretch;
    }

    .btn {
        width: 100%;
        text-align: center;
    }
}
</style>
