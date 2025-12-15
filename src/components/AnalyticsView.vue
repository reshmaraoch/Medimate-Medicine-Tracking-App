<template>
  <div class="analytics-container">
    <header class="header-section card">
      <div class="header-top">
        <div>
          <h2 class="page-title">MediMate Check-In</h2>
          <p class="page-subtitle">A quick look at how you’re doing today</p>
          <p class="page-subtitle">{{ todayHeaderLabel }}</p>
        </div>
      </div>
    </header>

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        class="tab"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Main Panel -->
    <section class="panel-shell card">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="toolbar-title">{{ activeTabLabel }}</span>
          <span class="toolbar-subtitle">{{ activeTabSubtitle }}</span>
        </div>

        <div class="toolbar-right">
          <span class="filter-label">Filter</span>

          <!-- ✅ No disabled placeholder option.
               ✅ Today tab: "Today's medicines" (all) + due-today meds
               ✅ Weekly/Monthly: "Active medicines" (all) + active meds -->
          <select class="med-select" v-model="selectedFilter">
            <option v-if="activeTab === 'today'" value="__TODAY__">Today's medicines</option>
            <option v-else value="__ACTIVE__">Active medicines</option>

            <option v-for="opt in medicineOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Summary cards -->
      <div class="summary-row">
        <div class="summary-card">
          <div class="summary-label">Adherence</div>
          <div class="summary-main">{{ summary.percent }}%</div>
          <div class="summary-sub">{{ summary.taken }}/{{ summary.expected }} logged</div>
        </div>

        <div class="summary-card">
          <div class="summary-label">
            {{ activeTab === "today" ? "Remaining" : "Missed" }}
          </div>
          <div class="summary-main">
            {{ activeTab === "today" ? summary.remaining : summary.missed }}
          </div>
          <div class="summary-sub">
            {{ activeTab === "today" ? "still pending today" : "so far" }}
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-label">
            {{
              activeTab === "today"
                ? "Medicines due"
                : activeTab === "weekly"
                ? "Days tracked"
                : "Weeks included"
            }}
          </div>
          <div class="summary-main">
            {{ activeTab === "today" ? summary.medsDue : summary.spanCount }}
          </div>
          <div class="summary-sub">
            {{ activeTab === "today" ? "scheduled today" : "up to today" }}
          </div>
        </div>
      </div>

      <!-- Content -->
      <div v-if="activeTab === 'today'" class="today-grid">
        <div class="chart-wrap chart-today">
          <canvas ref="chartEl"></canvas>
        </div>

        <div class="due-card">
          <div class="due-head">
            <div class="due-title">Due Today</div>
            <div class="due-sub">Quick view by medicine</div>
          </div>

          <div v-if="todayDueList.length === 0" class="due-empty">
            No medicines due today.
          </div>

          <div v-else class="due-list">
            <div v-for="row in todayDueList" :key="row.id" class="due-item">
              <div class="due-left">
                <div class="due-name">{{ row.name }}</div>
                <div class="due-meta">
                  {{ row.taken }}/{{ row.expected }} logged
                  <span class="dot">•</span>
                  <span :class="row.remaining === 0 ? 'ok' : 'warn'">
                    {{ row.remaining === 0 ? "Done" : `${row.remaining} remaining` }}
                  </span>
                </div>
              </div>

              <div class="pill" :class="row.remaining === 0 ? 'pill-ok' : 'pill-warn'">
                {{ row.percent }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="chart-wrap">
        <canvas ref="chartEl"></canvas>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount, nextTick } from "vue";
import Chart from "chart.js/auto";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/firebase_conf";

/* ---------------- CONSTANTS ---------------- */
const LOGS_COL = "logs";
const MEDS_COL = "medications";
const LOGS_CHANGED_EVENT = "medimate:logs-changed";

/* ---------------- UI STATE ---------------- */
const tabs = [
  { key: "today", label: "Today" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

const activeTab = ref("today");
const selectedFilter = ref("__TODAY__"); // default for today
const meds = ref([]);

/* ---------------- CHART ---------------- */
const chartEl = ref(null);
let chartInstance = null;
let chartModel = { type: "doughnut", data: null, options: null };

/* ---------------- THEME WATCH ---------------- */
const themeTick = ref(0);
let themeObserver = null;

/* ---------------- LOGS CHANGE TICK ---------------- */
const logsTick = ref(0);
function onLogsChanged() {
  logsTick.value += 1;
}

/* ---------------- THEME COLORS ---------------- */
function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name)?.trim();
  return v || fallback;
}

const colors = computed(() => {
  void themeTick.value;
  return {
    good: cssVar("--color-primary-dark", "#6f8b74"),
    soft: cssVar("--color-primary", "#8fb29a"),
    missed: cssVar("--color-border", "#e1ddd7"),
    grid: cssVar("--color-border", "#e1ddd7"),
    text: cssVar("--color-text", "#3b3a36"),
    subtle: cssVar("--color-subtle-text", "#6b6a65"),
    card: cssVar("--color-card", "#ffffff"),
  };
});

/* ---------------- DATE HELPERS ---------------- */
function toDateStringLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function clampPct(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
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

const todayHeaderLabel = computed(() => {
  const d = new Date();
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(d);
});

/* ---------------- LABELS ---------------- */
const activeTabLabel = computed(() => {
  if (activeTab.value === "today") return "Today";
  if (activeTab.value === "weekly") return "Weekly";
  return "Monthly";
});

const activeTabSubtitle = computed(() => {
  if (activeTab.value === "today") return "What’s due today, and what you’ve logged";
  if (activeTab.value === "weekly") return "Adherence % trend this week";
  return "Week-by-week adherence this month";
});

/* ---------------- NORMALIZE MED DOC ---------------- */
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

function normalizeMed(docId, raw) {
  return {
    id: docId,
    ...raw,
    status: raw.status ?? "Active",
    times: Array.isArray(raw.times) ? raw.times : raw.time ? [raw.time] : [],
    schedule: raw.schedule ?? normalizeScheduleFromLegacy(raw.scheduleType),
    startDate: raw.startDate ?? null,
    endDate: raw.endDate ?? null,
  };
}

/* ---------------- SCHEDULE LOGIC ---------------- */
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

    const ds = toDateStringLocal(dateObj);
    const normalizedDates = dates.map((x) => {
      const d = toJSDate(x);
      return d ? toDateStringLocal(d) : String(x);
    });
    return normalizedDates.includes(ds);
  }

  return false;
}

function buildExpectedSlotsForDate(med, dateObj) {
  if (!isScheduledOnDate(med, dateObj)) return [];
  const times = Array.isArray(med.times) ? med.times : [];
  const dateString = toDateStringLocal(dateObj);

  if (times.length === 0) {
    return [{ key: `${dateString}_${med.id}_NO_TIME`, time: null }];
  }

  return times.map((t) => ({ key: `${dateString}_${med.id}_${t}`, time: t }));
}

function buildLoggedKeySet(logs) {
  const set = new Set();

  for (const l of logs) {
    if (l?.id && typeof l.id === "string") set.add(l.id);

    if (l.dateString && l.medicationId) {
      const slot =
        l.scheduledTimeSlot === null ||
        l.scheduledTimeSlot === "" ||
        l.scheduledTimeSlot === undefined
          ? "NO_TIME"
          : l.scheduledTimeSlot;

      set.add(`${l.dateString}_${l.medicationId}_${slot}`);
    }
  }

  return set;
}

/* ---------------- FIRESTORE LOADERS ---------------- */
async function loadMeds() {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    meds.value = [];
    return;
  }

  const snap = await getDocs(collection(db, "users", uid, MEDS_COL));
  meds.value = snap.docs.map((d) => normalizeMed(d.id, d.data()));
}

async function fetchLogsByDateStringRange(startStr, endStr, medIdOrAll) {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];

  const constraints = [
    where("dateString", ">=", startStr),
    where("dateString", "<=", endStr),
  ];

  if (medIdOrAll && !medIdOrAll.startsWith("__")) {
    constraints.push(where("medicationId", "==", medIdOrAll));
  }

  const qRef = query(collection(db, "users", uid, LOGS_COL), ...constraints);
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ---------------- OPTIONS (med list under the "all" option) ---------------- */
const medicineOptions = computed(() => {
  const activeMeds = (meds.value || []).filter((m) => (m.status || "Active") === "Active");
  const today = startOfDay(new Date());
  const isTodayTab = activeTab.value === "today";

  const list = isTodayTab
    ? activeMeds.filter((m) => isScheduledOnDate(m, today))
    : activeMeds;

  list.sort((a, b) => (a.medicineName || "").localeCompare(b.medicineName || ""));

  return list.map((m) => ({
    label: m.medicineName || "Unknown Name",
    value: m.id,
  }));
});

/* ---------------- SUMMARY + TODAY LIST ---------------- */
const summary = ref({
  taken: 0,
  expected: 0,
  remaining: 0,
  missed: 0,
  percent: 0,
  medsDue: 0,
  spanCount: 0,
});

const todayDueList = ref([]);

/* ---------------- MEDS TO PROCESS ---------------- */
function getMedsToProcess() {
  const activeMeds = meds.value.filter((m) => (m.status || "Active") === "Active");
  const today = startOfDay(new Date());
  const isTodayTab = activeTab.value === "today";

  const allKey = isTodayTab ? "__TODAY__" : "__ACTIVE__";
  const chosen = selectedFilter.value || allKey;

  if (chosen === "__TODAY__") return activeMeds.filter((m) => isScheduledOnDate(m, today));
  if (chosen === "__ACTIVE__") return activeMeds;

  return activeMeds.filter((m) => m.id === chosen);
}

/* ---------------- CHART OPTIONS ---------------- */
function linePercentOptions(metaCounts) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: (ctx) => {
            const idx = ctx.dataIndex;
            const meta = metaCounts?.[idx];
            if (!meta) return `Adherence: ${ctx.raw}%`;
            return `Adherence: ${ctx.raw}%  (${meta.taken}/${meta.expected})`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: colors.value.text, maxRotation: 0, minRotation: 0 },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: colors.value.text,
          callback: (v) => `${v}%`,
        },
        grid: { color: colors.value.grid },
      },
    },
  };
}

/* ---------------- COMPUTE: TODAY ---------------- */
async function computeToday() {
  const today = startOfDay(new Date());
  const ds = toDateStringLocal(today);

  const medsList = getMedsToProcess();

  const chosen = selectedFilter.value;
  const medQueryId = chosen && !chosen.startsWith("__") ? chosen : null;

  const logs = await fetchLogsByDateStringRange(ds, ds, medQueryId || "__ALL__");
  const loggedKeys = buildLoggedKeySet(logs);

  let totalExpected = 0;
  let totalTaken = 0;
  const dueRows = [];

  for (const m of medsList) {
    const slots = buildExpectedSlotsForDate(m, today);
    if (slots.length === 0) continue;

    totalExpected += slots.length;

    let medTaken = 0;
    for (const slot of slots) if (loggedKeys.has(slot.key)) medTaken += 1;
    totalTaken += medTaken;

    const remaining = Math.max(0, slots.length - medTaken);
    const pct = slots.length ? clampPct((medTaken / slots.length) * 100) : 0;

    dueRows.push({
      id: m.id,
      name: m.medicineName || "Unknown",
      expected: slots.length,
      taken: medTaken,
      remaining,
      percent: pct,
    });
  }

  dueRows.sort((a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name));
  todayDueList.value = dueRows;

  const remaining = Math.max(0, totalExpected - totalTaken);
  const percent = totalExpected ? clampPct((totalTaken / totalExpected) * 100) : 0;

  summary.value = {
    taken: totalTaken,
    expected: totalExpected,
    remaining,
    missed: 0,
    percent,
    medsDue: dueRows.length,
    spanCount: 0,
  };

  chartModel = {
    type: "doughnut",
    data: {
      labels: ["Logged", "Remaining"],
      datasets: [
        {
          data: [totalTaken, remaining],
          backgroundColor: [colors.value.good, colors.value.missed],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { color: colors.value.text },
        },
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}` },
        },
      },
    },
  };
}

/* ---------------- COMPUTE: WEEKLY ---------------- */
async function computeWeekly() {
  todayDueList.value = [];

  const today = startOfDay(new Date());
  const day = today.getDay();
  const diffToMon = day === 0 ? 6 : day - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMon);

  const startStr = toDateStringLocal(monday);
  const endStr = toDateStringLocal(
    new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  );

  const medsList = getMedsToProcess();

  const chosen = selectedFilter.value;
  const medQueryId = chosen && !chosen.startsWith("__") ? chosen : null;

  const logs = await fetchLogsByDateStringRange(startStr, endStr, medQueryId || "__ALL__");
  const loggedKeys = buildLoggedKeySet(logs);

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const pctData = [];
  const metaCounts = [];

  let sumTaken = 0;
  let sumExpected = 0;
  let daysCount = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    if (d > new Date()) {
      pctData.push(0);
      metaCounts.push({ taken: 0, expected: 0 });
      continue;
    }

    daysCount += 1;

    let expected = 0;
    let taken = 0;

    for (const m of medsList) {
      const slots = buildExpectedSlotsForDate(m, d);
      expected += slots.length;
      for (const slot of slots) if (loggedKeys.has(slot.key)) taken += 1;
    }

    sumTaken += taken;
    sumExpected += expected;

    const pct = expected ? clampPct((taken / expected) * 100) : 0;
    pctData.push(pct);
    metaCounts.push({ taken, expected });
  }

  const missed = Math.max(0, sumExpected - sumTaken);
  const percent = sumExpected ? clampPct((sumTaken / sumExpected) * 100) : 0;

  summary.value = {
    taken: sumTaken,
    expected: sumExpected,
    remaining: 0,
    missed,
    percent,
    medsDue: 0,
    spanCount: daysCount,
  };

  chartModel = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Adherence %",
          data: pctData,
          borderColor: colors.value.good,
          backgroundColor: colors.value.soft,
          fill: false,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: linePercentOptions(metaCounts),
  };
}

/* ---------------- COMPUTE: MONTHLY ---------------- */
async function computeMonthly() {
  todayDueList.value = [];

  const today = startOfDay(new Date());
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const startStr = toDateStringLocal(firstDay);
  const endStr = toDateStringLocal(lastDay);

  const medsList = getMedsToProcess();

  const chosen = selectedFilter.value;
  const medQueryId = chosen && !chosen.startsWith("__") ? chosen : null;

  const logs = await fetchLogsByDateStringRange(startStr, endStr, medQueryId || "__ALL__");
  const loggedKeys = buildLoggedKeySet(logs);

  const labels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
  const bucketTaken = [0, 0, 0, 0, 0];
  const bucketExpected = [0, 0, 0, 0, 0];

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    if (d > new Date()) break;

    const bucketIndex = Math.floor((d.getDate() - 1) / 7);
    if (bucketIndex < 0 || bucketIndex > 4) continue;

    for (const m of medsList) {
      const slots = buildExpectedSlotsForDate(m, d);
      const expected = slots.length;

      let taken = 0;
      for (const slot of slots) if (loggedKeys.has(slot.key)) taken += 1;

      bucketTaken[bucketIndex] += taken;
      bucketExpected[bucketIndex] += expected;
    }
  }

  const pctData = bucketExpected.map((exp, i) =>
    exp ? clampPct((bucketTaken[i] / exp) * 100) : 0
  );

  const metaCounts = bucketExpected.map((exp, i) => ({
    taken: bucketTaken[i],
    expected: exp,
  }));

  const sumTaken = bucketTaken.reduce((a, b) => a + b, 0);
  const sumExpected = bucketExpected.reduce((a, b) => a + b, 0);

  const missed = Math.max(0, sumExpected - sumTaken);
  const percent = sumExpected ? clampPct((sumTaken / sumExpected) * 100) : 0;

  const weeksUsed = bucketExpected.filter((x) => x > 0).length;

  summary.value = {
    taken: sumTaken,
    expected: sumExpected,
    remaining: 0,
    missed,
    percent,
    medsDue: 0,
    spanCount: weeksUsed,
  };

  chartModel = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Adherence %",
          data: pctData,
          borderColor: colors.value.good,
          backgroundColor: colors.value.soft,
          fill: false,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: linePercentOptions(metaCounts),
  };
}

/* ---------------- RENDER CHART ---------------- */
function renderChart() {
  if (!chartEl.value) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const ctx = chartEl.value.getContext("2d");
  chartInstance = new Chart(ctx, {
    type: chartModel.type,
    data: chartModel.data,
    options: chartModel.options,
  });
}

/* ---------------- MAIN RECOMPUTE ---------------- */
async function recompute() {
  if (!auth.currentUser?.uid) return;

  if (activeTab.value === "today") await computeToday();
  else if (activeTab.value === "weekly") await computeWeekly();
  else await computeMonthly();

  await nextTick();
  renderChart();
}

/* ---------------- LIFECYCLE ---------------- */
onMounted(() => {
  themeObserver = new MutationObserver(() => (themeTick.value += 1));
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });

  window.addEventListener(LOGS_CHANGED_EVENT, onLogsChanged);

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    await loadMeds();
    // set default filter on initial load
    selectedFilter.value = activeTab.value === "today" ? "__TODAY__" : "__ACTIVE__";
    await recompute();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener(LOGS_CHANGED_EVENT, onLogsChanged);
  if (themeObserver) themeObserver.disconnect();
  if (chartInstance) chartInstance.destroy();
});

/* ---------------- WATCHERS ---------------- */
watch(activeTab, () => {
  selectedFilter.value = activeTab.value === "today" ? "__TODAY__" : "__ACTIVE__";
});

watch([activeTab, selectedFilter, themeTick, logsTick], () => {
  recompute();
});
</script>

<style scoped>
/* Layout */
.analytics-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 18px 18px 40px;
  color: var(--color-text);
}

.header-section {
  padding: 18px 18px 14px;
  margin-bottom: 10px;
}

.header-top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.page-subtitle {
  margin: 6px 0 0;
  color: var(--color-subtle-text);
  font-size: 0.95rem;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 10px;
  padding: 10px 4px 0;
  margin-bottom: 10px;
}

.tab {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 10px 18px;
  font-weight: 900;
  font-size: 1.05rem;
  color: var(--color-subtle-text);
  box-shadow: var(--shadow-soft);
  transition: all 0.18s ease;
  cursor: pointer;
  white-space: nowrap;
}

.tab:hover {
  background: color-mix(in srgb, var(--color-primary) 18%, var(--color-card));
  border-color: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
  color: var(--color-text);
  transform: translateY(-1px);
}

.tab.active {
  background: color-mix(in srgb, var(--color-primary) 30%, var(--color-card));
  border-color: var(--color-primary);
  color: var(--color-text);
  box-shadow: var(--shadow-medium);
  transform: translateY(-1px);
}

/* Panel */
.panel-shell {
  padding: 14px 14px 16px;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 10px 12px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 240px;
}

.toolbar-title {
  font-weight: 900;
  font-size: 1.05rem;
}

.toolbar-subtitle {
  color: var(--color-subtle-text);
  font-size: 0.9rem;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-left: auto;
}

.filter-label {
  font-size: 0.9rem;
  color: var(--color-subtle-text);
  font-weight: 800;
}

.med-select {
  width: 280px;
  min-width: 240px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  color: var(--color-text);
  font-weight: 800;
  outline: none;
}

.med-select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 24%, transparent);
}

/* Summary */
.summary-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 12px 6px 6px;
}

.summary-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px 12px 10px;
  box-shadow: var(--shadow-soft);
}

.summary-label {
  color: var(--color-subtle-text);
  font-weight: 800;
  font-size: 0.9rem;
}

.summary-main {
  margin-top: 6px;
  font-size: 1.6rem;
  font-weight: 950;
  letter-spacing: -0.02em;
}

.summary-sub {
  margin-top: 2px;
  color: var(--color-subtle-text);
  font-size: 0.9rem;
  font-weight: 700;
}

/* Chart */
.chart-wrap {
  height: 380px;
  padding: 8px 10px 4px;
}

.chart-today {
  height: 320px;
}

/* Today */
.today-grid {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 12px;
  padding-top: 8px;
  align-items: start;
}

.due-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
  padding: 12px;
  min-height: 320px;
}

.due-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 10px;
}

.due-title {
  font-weight: 950;
  font-size: 1.05rem;
}

.due-sub {
  color: var(--color-subtle-text);
  font-weight: 700;
  font-size: 0.9rem;
}

.due-empty {
  padding: 14px 6px;
  color: var(--color-subtle-text);
  font-weight: 700;
}

.due-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.due-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 10px 10px;
}

.due-name {
  font-weight: 900;
}

.due-meta {
  margin-top: 2px;
  color: var(--color-subtle-text);
  font-weight: 700;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.dot {
  opacity: 0.6;
}

.ok {
  color: color-mix(in srgb, var(--color-primary-dark) 70%, var(--color-text));
}

.warn {
  color: color-mix(in srgb, #d97706 75%, var(--color-text));
}

.pill {
  font-weight: 950;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  min-width: 64px;
  text-align: center;
}

.pill-ok {
  background: color-mix(in srgb, var(--color-primary) 18%, var(--color-card));
}

.pill-warn {
  background: color-mix(in srgb, #f59e0b 16%, var(--color-card));
}

/* Responsive */
@media (max-width: 920px) {
  .today-grid {
    grid-template-columns: 1fr;
  }
  .chart-today {
    height: 300px;
  }
}

@media (max-width: 720px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .toolbar-left {
    min-width: 0;
  }

  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }

  .med-select {
    width: 100%;
    min-width: 0;
  }

  .chart-wrap {
    height: 320px;
    padding: 6px 6px 2px;
  }

  .summary-row {
    grid-template-columns: 1fr;
  }

  /* mobile: keep tabs in one row */
  .tabs {
    flex-wrap: nowrap;
    gap: 8px;
  }

  .tab {
    flex: 1;
    min-width: 0;
    padding: 10px 10px;
    font-size: 0.98rem;
  }
}

@media (max-width: 480px) {
  .analytics-container {
    padding: 12px 10px 28px;
  }
  .chart-wrap {
    height: 280px;
  }
}
</style>
