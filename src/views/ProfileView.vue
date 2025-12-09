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

      <div v-if="prefs.enableNotifications" class="nested">
        <label class="nested-label">Notify before (minutes):</label>
        <input
          type="number"
          class="nested-input"
          v-model.number="prefs.notificationOffset"
          min="1"
        />
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
        <div class="map-placeholder">
          📍 Map preview will appear here (coming soon)
        </div>
      </div>

      <!-- Save Button -->
        <button
            @click="savePreferences"
            :class="['save-btn', hasChanges ? 'changed' : '']"
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

const db = getFirestore();
const auth = getAuth();

const prefs = ref({
  enableNotifications: true,
  notificationOffset: 10,
  enableStockAlerts: false,
  stockReminderDays: 2,
  enablePharmacyLocation: false,
});

// Track original prefs
const originalPrefs = ref({});
const hasChanges = ref(false);

onMounted(async () => {
  const user = auth.currentUser;
  if (!user) return;

  const refObj = doc(db, "users", user.uid, "preferences", "general");
  const snap = await getDoc(refObj);

  if (snap.exists()) {
    prefs.value = { ...prefs.value, ...snap.data() };
  }

  originalPrefs.value = JSON.parse(JSON.stringify(prefs.value));
});

// Detect changes
watch(
  prefs,
  (newVal) => {
    hasChanges.value =
      JSON.stringify(newVal) !== JSON.stringify(originalPrefs.value);
  },
  { deep: true }
);

async function savePreferences() {
  const user = auth.currentUser;
  if (!user) return;

  const refObj = doc(db, "users", user.uid, "preferences", "general");
  await setDoc(refObj, prefs.value, { merge: true });

  originalPrefs.value = JSON.parse(JSON.stringify(prefs.value));
  hasChanges.value = false;
  alert("Preferences saved!");
}
</script>

<style scoped>
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

/* Embossed Card */
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

/* Row */
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

/* Nested inputs */
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

  /* Default state (no changes yet) */
  background: var(--color-primary);
  opacity: 0.85;            /* makes it look softer but NOT disabled */
  color: white;

  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;

  transition: background-color 0.25s ease, opacity 0.25s ease;
}

/* ACTIVATED — user changed something */
.save-btn.changed {
  background: var(--color-button-dark);
  opacity: 1;               /* full color */
}


/* Toggle Switch */
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
</style>
