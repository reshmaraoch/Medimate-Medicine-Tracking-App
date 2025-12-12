<template>
  <div class="profile-page">
    <h2 class="page-title">Your Profile</h2>

    <section class="preferences-card">
      <h3 class="section-title">Preferences</h3>

      <!-- Notifications -->
      <div class="pref-row">
        <div class="text-block">
          <p class="pref-title">Notifications</p>
          <p class="pref-desc">Receive reminders before your medication time.</p>
        </div>

        <label class="switch">
          <input type="checkbox" v-model="prefs.enableNotifications" />
          <span class="slider"></span>
        </label>
      </div>

      <!-- Offset -->
      <div v-if="prefs.enableNotifications" class="nested">
        <label class="nested-label tooltip-container">
          Notify before (minutes)
          <span class="info-icon">ℹ️</span>

          <!-- Real tooltip -->
          <span class="tooltip-box">
            Must be a multiple of 5 minutes (5, 10, 15…)
          </span>
        </label>

        <input
          type="number"
          class="nested-input"
          v-model.number="prefs.notificationOffset"
          min="5"
          step="5"
        />

        <p v-if="offsetError" style="color:red; font-size:0.85rem; margin-top:4px;">
          {{ offsetError }}
        </p>
      </div>

      <hr />

      <!-- Stock Alerts -->
      <div class="pref-row">
        <div class="text-block">
          <p class="pref-title">Stock Alerts</p>
          <p class="pref-desc">Get alerts when medicines are running low.</p>
        </div>

        <label class="switch">
          <input type="checkbox" v-model="prefs.enableStockAlerts" />
          <span class="slider"></span>
        </label>
      </div>

      <div v-if="prefs.enableStockAlerts" class="nested">
        <label class="nested-label">Reminder days before stock runs out:</label>
        <input
          type="number"
          class="nested-input"
          v-model.number="prefs.stockReminderDays"
          min="1"
        />
      </div>

      <hr />

      <!-- Pharmacy Location -->
      <div class="pref-row">
        <div class="text-block">
          <p class="pref-title">Pharmacy Location</p>
          <p class="pref-desc">Choose your preferred pharmacy (coming soon).</p>
        </div>

        <label class="switch">
          <input type="checkbox" v-model="prefs.enablePharmacyLocation" />
          <span class="slider"></span>
        </label>
      </div>

      <div v-if="prefs.enablePharmacyLocation" class="nested">
        <div class="map-placeholder">📍 Map preview will appear here (coming soon)</div>
      </div>

      <!-- Save Button -->
      <button
        @click="savePreferences"
        :class="['save-btn', hasChanges && !offsetError ? 'changed' : '']"
        :disabled="!hasChanges || offsetError"
      >
        Save Preferences
      </button>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { useNotifications } from "@/composables/useNotifications";

const { askPermission } = useNotifications();
const db = getFirestore();
const auth = getAuth();

const prefs = ref({
  enableNotifications: true,
  notificationOffset: 10,
  enableStockAlerts: false,
  stockReminderDays: 2,
  enablePharmacyLocation: false,
});

const originalPrefs = ref({});
const hasChanges = ref(false);
const offsetError = ref("");
const loaded = ref(false); // ← prevents false change detection on load

let updateTimeout = null;

/* -----------------------
   AUTO-SAVE FUNCTION
--------------------------*/
function autoSave() {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    savePreferences(true);
  }, 600);
}

/* -----------------------
   ASK PERMISSION
--------------------------*/
watch(
  () => prefs.value.enableNotifications,
  async (enabled) => {
    if (!loaded.value) return; // ignore during initial load
    if (enabled) await askPermission();
    autoSave();
  }
);

/* -----------------------
   MULTIPLE OF 5 CHECK
--------------------------*/
watch(
  () => prefs.value.notificationOffset,
  (val) => {
    if (!loaded.value) return; // ignore while loading stored prefs

    if (!prefs.value.enableNotifications) {
      offsetError.value = "";
      return;
    }

    if (!val && val !== 0) {
      offsetError.value = "Please enter a value.";
      return;
    }

    if (val < 5) {
      offsetError.value = "Minimum allowed is 5 minutes.";
      return;
    }

    if (val % 5 !== 0) {
      offsetError.value = "Must be a multiple of 5 minutes (5, 10, 15…).";
      return;
    }

    offsetError.value = "";
    autoSave();
  }
);

/* -----------------------
   LOAD PREFS FROM DB
--------------------------*/
onMounted(async () => {
  const user = auth.currentUser;
  if (!user) return;

  const prefRef = doc(db, "users", user.uid, "preferences", "general");
  const snap = await getDoc(prefRef);

  if (snap.exists()) {
    prefs.value = { ...prefs.value, ...snap.data() };
  }

  originalPrefs.value = JSON.parse(JSON.stringify(prefs.value));

  loaded.value = true; // ← allow change detection now
});

/* -----------------------
   DETECT CHANGES
--------------------------*/
watch(
  prefs,
  (newVal) => {
    if (!loaded.value) return; // prevent false positives during load

    const changed =
      JSON.stringify(newVal) !== JSON.stringify(originalPrefs.value);

    hasChanges.value = changed;

    if (changed && !offsetError.value) {
      autoSave();
    }
  },
  { deep: true }
);

/* -----------------------
   SAVE PREFS TO FIRESTORE
--------------------------*/
async function savePreferences(silent = false) {
  if (offsetError.value) return;

  const user = auth.currentUser;
  if (!user) return;

  const prefRef = doc(db, "users", user.uid, "preferences", "general");
  await setDoc(prefRef, prefs.value, { merge: true });

  originalPrefs.value = JSON.parse(JSON.stringify(prefs.value));
  hasChanges.value = false;

  if (!silent) alert("Preferences saved!");
}
</script>


<style scoped>
/* Your full original styles — NOT MODIFIED */

.profile-page {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 4rem;
}

.page-title {
  width: 100%;
  max-width: 600px;
  margin-bottom: 1rem;
  font-size: 1.4rem;
  font-weight: 700;
}

.preferences-card {
  width: 100%;
  max-width: 600px;
  background: var(--color-card);
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  border: 1px solid var(--color-border);
  transition: box-shadow 0.25s ease;
}

.preferences-card:hover {
  box-shadow: var(--shadow-medium);
}

.section-title {
  margin-bottom: 1rem;
  font-size: 1.2rem;
  font-weight: 600;
}

.pref-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.9rem 0;
}

.text-block {
  max-width: 80%;
}

.pref-title {
  margin: 0;
  font-weight: 600;
}

.pref-desc {
  margin: 0;
  margin-top: 4px;
  font-size: 0.85rem;
  color: var(--color-subtle-text);
}

.nested {
  padding-left: 0.6rem;
  margin-bottom: 1rem;
}

.nested-label {
  color: var(--color-text);
}

.nested-input {
  width: 100%;
  padding: 0.6rem;
  margin-top: 0.3rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-card);
  color: var(--color-text);
}

.map-placeholder {
  height: 130px;
  border-radius: var(--radius-md);
  background: var(--color-border);
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--color-subtle-text);
}

.save-btn {
  width: 100%;
  padding: 0.9rem;
  margin-top: 1.2rem;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  opacity: 0.85;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.25s ease, opacity 0.25s ease;
}

.save-btn.changed {
  background: var(--color-button-dark);
  opacity: 1;
}

.switch {
  position: relative;
  width: 46px;
  height: 24px;
}

.switch input {
  opacity: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  border-radius: 50px;
  background: var(--color-border);
  inset: 0;
  transition: 0.3s;
}

.slider:before {
  content: "";
  position: absolute;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  left: 2px;
  top: 2px;
  background: var(--color-card);
  transition: 0.3s;
}

input:checked + .slider {
  background: var(--color-primary);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

/* -----------------------------
   ONLY NEW STYLES BELOW
   (DO NOT MODIFY ORIGINAL)
------------------------------*/

.save-btn:disabled {
  cursor: not-allowed !important;
  opacity: 0.6 !important;
}

.tooltip-container {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.tooltip-box {
  visibility: hidden;
  opacity: 0;
  transition: 0.2s;
  position: absolute;
  top: 110%;
  left: 0;
  background: rgba(0,0,0,0.85);
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  width: max-content;
  max-width: 220px;
  z-index: 99;
}

.tooltip-container:hover .tooltip-box {
  visibility: visible;
  opacity: 1;
}
</style>
