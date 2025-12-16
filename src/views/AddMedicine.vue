<!-- eslint-disable no-unused-vars -->
<script setup>
import { ref, onMounted, computed, nextTick } from "vue";
// import Tesseract from "tesseract.js";
import { saveMeds } from "@/firebase/firebase_service.js";
import router from "@/router";
import { usePrescriptionOCR } from "@/composables/usePrescriptionOCR";
import { mapForm, mapOCRScheduleToOption } from "@/ocr/RxParser";
import { calculateNextScheduledDose } from "@/utils/scheduleUtils";
import { useRoute } from "vue-router";
import { updateMeds, getMedsById } from '@/firebase/firebase_service.js'


const route = useRoute();

const isEditMode = computed(() => !!route.params.id);
const editMedId = computed(() => route.params.id || null);

const { ocrResults, loading: ocrLoading, error: ocrError, scanImage } = usePrescriptionOCR();

const fileInput = ref(null);
const cameraInput = ref(null);

const newTime = ref("");

const errors = ref({
  doseQuantity: false,
  currentInventory: false,
  refillThreshold: false,
  take: false,
});

const isInventoryEntered = computed(() => {
  return form.value.currentInventory !== null &&
    form.value.currentInventory !== "" &&
    !errors.value.currentInventory;
});
function openFilePicker() {
  fileInput.value?.click();
}

function openCamera() {
  cameraInput.value?.click();
}

function handleImageSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  // ✅ Reuse your existing OCR composable
  scanImage(file);

  // Reset input so the same file can be selected again
  event.target.value = "";
}


// ---------- FORM STATE ----------
// const form = ref({
//   medicineName: "",
//   description: "",
//   unit: "",
//   status: "",
//   currentInventory: "",
//   refillThreshold: "",
//   doseQuantity: "",
//   take: "",
//   times: "",
//   shedule: {
//     type: "",
//     data: ""
//   },
//   nextScheduledDose: "",
//   startDate: "",
//   endDate: "",
// });

const form = ref({
  medicineName: "",
  description: "",

  // Medication form/type
  form: "", // Tablet | Capsule | Syrup | Injection | Other

  // Inventory & dosage (NUMBERS ONLY)
  doseQuantity: null,
  currentInventory: null,
  refillThreshold: null,
  dosePerDose: null, // renamed from "take"

  // Schedule (structured)
  schedule: {
    type: "Everyday", // default
    data: {}
  },

  // Times per day
  times: [], // ["08:00", "20:00"]

  // Dates
  startDate: "",
  endDate: null,

  // Derived / backend-managed
  status: "Active",
  nextScheduledDose: null,
  expiryDate: null,
});


const showConfirm = ref(false);

const derivedUnit = computed(() => {
  switch (form.value.form) {
    case "Tablet":
      return "Tablet";
    case "Capsule":
      return "Pill";
    case "Syrup":
      return "ml";
    case "Injection":
      return "Unit";
    default:
      return "";
  }
})

// function onImageUpload(e) {
//   const file = e.target.files[0];
//   if (file)
//     scanImage(file);
// }

function selectOCRMedication(med) {
  // Fill form fields
  if (isEditMode.value) return;
  form.value.medicineName = med.name || ''
  form.value.doseQuantity = med.dosage || ''

  const mappedSchedule = mapOCRScheduleToOption(med.schedule)
  form.value.schedule.type = mappedSchedule;

  // Optional: infer form/unit later if you want
  form.value.form = mapForm(med.raw) || '';

  // Scroll to form
  nextTick(() => {
    document.getElementById("add-medicine-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  })
}

// ---------- COURSE LENGTH ----------
const courseLength = computed(() => {
  if (!form.value.startDate || !form.value.endDate) return null;

  const start = new Date(form.value.startDate);
  const end = new Date(form.value.endDate);
  const diff = (end - start) / (1000 * 60 * 60 * 24);
  return diff >= 0 ? diff + 1 : null;
});

// ---------- DATE PICKER ----------
const openDatePicker = (event) => {
  event.target.showPicker?.(); // supported in modern Chrome
};

// ---------- FORM FLOW ----------
const openConfirmation = () => {
  if (isInventoryEntered.value && (form.value.refillThreshold === null || form.value.refillThreshold === "")) {
    alert("Please enter a refill threshold when inventory is provided.");
    return;
  }
  if (!form.value.medicineName || !form.value.form || !form.value.startDate) {
    console.log(form.value.medicineName, form.value.form, form.value.startDate)
    alert("Please fill required fields (Name, Type, Start Date).");
    return;
  }
  showConfirm.value = true;
};


const saveMedicationToDB = async () => {
  try {
    const nextDose = calculateNextScheduledDose({
      schedule: form.value.schedule,
      times: form.value.times,
    });
    const payload = {
      medicineName: form.value.medicineName,
      description: form.value.description,
      form: form.value.form,
      unit: derivedUnit.value || null,
      status: "Active",
      // have to make soft delete
      // currentInventory: form.value.currentInventory,
      // refillThreshold: form.value.refillThreshold,
      // Inventory logic
      currentInventory: isInventoryEntered.value
        ? Number(form.value.currentInventory)
        : null,

      refillThreshold: isInventoryEntered.value
        ? Number(form.value.refillThreshold)
        : null,
      doseQuantity: form.value.doseQuantity,
      // take: form.value.take,
      times: form.value.times,
      // turn this into the object
      schedule: form.value.schedule,
      nextScheduledDose: nextDose,
      startDate: form.value.startDate,
      endDate: form.value.endDate || null,
      expiryDate: form.value.expiryDate || null,
    };

    // await saveMeds(payload);
    if (isEditMode.value) {
      await updateMeds(editMedId.value, payload);
      alert("Medication updated successfully!");
    } else {
      await saveMeds(payload);
      alert("Medication saved successfully!");
    }

    // alert("Medication saved successfully!");

    showConfirm.value = false;
    Object.keys(form.value).forEach((k) => (form.value[k] = ""));
    form.value.schedule = "Everyday";
    router.push('/view-meds')
  } catch (err) {
    console.error(err);
    alert("There was an error saving the medication.");
  }
};

const WEEK_DAYS = [{ label: "Sun", value: 0 }, { label: "Mon", value: 1 }, { label: "Tue", value: 2 }, { label: "Wed", value: 3 }, { label: "Thu", value: 4 }, { label: "Fri", value: 5 }, { label: "Sat", value: 6 }]

function onScheduleChange() {
  switch (form.value.schedule.type) {
    case "Specific Days":
      form.value.schedule.data = { daysOfWeek: [] };
      break;

    case "Every Few Days":
      form.value.schedule.data = { interval: null, startDate: form.value.startDate || null };
      break;

    case "Custom":
      form.value.schedule.data = { dates: [] };
      break;

    default:
      form.value.schedule.data = {};
  }
}
function toggleDay(day) {
  const days = form.value.schedule.data.daysOfWeek;
  const idx = days.indexOf(day);

  if (idx == -1)
    days.push(day);
  else
    days.splice(idx, 1);
}

function addCustomDate(date) {
  if (!date) return;
  const dates = form.value.schedule.data.dates;
  if (!dates.includes(date)) dates.push(date);
}

function removeCustomDate(date) {
  form.value.schedule.data.dates =
    form.value.schedule.data.dates.filter(d => d !== date);
}

function addTime() {
  if (!newTime.value) return;

  const time = newTime.value;

  if (!form.value.times.includes(time)) {
    form.value.times.push(time);
    form.value.times.sort();
  }
  newTime.value = "";
}
function removeTime(time) {
  form.value.times = form.value.times.filter(t => t !== time);
}
function markInvalidIfNonNumeric(field, event) {
  const value = event.target.value;

  if (value === "") {
    errors.value[field] = false;
    return;
  }

  const isValid = /^\d+(\.\d+)?$/.test(value);

  errors.value[field] = !isValid;
}

function editMedication(dbMed) {
  console.log(dbMed.form);
  return {

    medicineName: dbMed.medicineName ?? "",

    description: dbMed.description ?? "",

    form: dbMed.form ?? "",

    // numeric fields (null-safe)
    doseQuantity: dbMed.doseQuantity ?? null,
    currentInventory: dbMed.currentInventory ?? null,
    refillThreshold: dbMed.refillThreshold ?? null,
    // take: dbMed.take ?? null,

    // schedule (normalized)
    schedule: {
      type: dbMed.schedule?.type ?? "Everyday",
      data: dbMed.schedule?.data ?? {},
    },

    // times normalization
    times: Array.isArray(dbMed.times)
      ? [...dbMed.times]
      : dbMed.time
        ? [dbMed.time]
        : [],

    startDate: dbMed.startDate ?? "",
    endDate: dbMed.endDate ?? null,

    status: dbMed.status ?? "Active",
    nextScheduledDose: dbMed.nextScheduledDose ?? null,
    expiryDate: dbMed.expiryDate ?? null,
  };
}
onMounted(async () => {
  if (!isEditMode.value) return;

  try {
    const dbMed = await getMedsById(editMedId.value);
    form.value = editMedication(dbMed);
  } catch (err) {
    console.error("Failed to hydrate medication", err);
    alert("Failed to load medication for editing.");
    router.push("/view-meds");
  }
});
function goBack() {
  router.push("/view-meds");
}

const scheduleDisplay = computed(() => {
  const schedule = form.value.schedule;
  if (!schedule || !schedule.type) return "—";

  switch (schedule.type) {
    case "Everyday":
      return "Everyday";

    case "Specific Days":
      if (!schedule.data?.daysOfWeek?.length) return "Specific days";
      return `Specific days (${schedule.data.daysOfWeek
        .map(d => WEEK_DAYS.find(w => w.value === d)?.label)
        .join(", ")})`;

    case "Every Few Days":
      return schedule.data?.interval
        ? `Every ${schedule.data.interval} days`
        : "Every few days";

    case "Custom":
      return schedule.data?.dates?.length
        ? `Custom (${schedule.data.dates.join(", ")})`
        : "Custom dates";

    default:
      return schedule.type;
  }
});
const timeDisplay = computed(() => {
  if (!form.value.times || form.value.times.length === 0) {
    return "-";
  }

  return form.value.times
    .map(t => {
      const [h, m] = t.split(":").map(Number);
      const hour = h % 12 || 12;
      const suffix = h >= 12 ? "PM" : "AM";
      return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
    })
    .join(", ");
});

</script>



<template>
  <div class="add-medicine-container">
    <!-- HEADER / OCR SECTION -->
    <section class="hero-card">
      <!-- <h1>Add a Medication to Track</h1> -->
      <h1>
        {{ isEditMode ? "Edit Medication" : "Add a Medication to Track" }}
      </h1>
      <section v-if="!isEditMode">
        <p class="hero-text">
          You can upload a prescription to auto-fill details, or enter them manually below.
        </p>

        <!-- OCR Upload -->
        <!-- <div class="ocr-section">
        <input type="file" accept="image/*" @change="onImageUpload" />
      </div> -->

        <div class="ocr-actions">
          <!-- Upload button -->
          <button class="icon-btn" title="Upload prescription" @click="openFilePicker">
            ⬆️
          </button>

          <!-- Camera button -->
          <button class="icon-btn" title="Scan using camera" @click="openCamera">
            📷
          </button>

          <!-- Hidden upload input -->
          <input ref="fileInput" type="file" accept="image/*" hidden @change="handleImageSelected" />

          <!-- Hidden camera input -->
          <input ref="cameraInput" type="file" accept="image/*" capture="environment" hidden
            @change="handleImageSelected" />
        </div>


        <p v-if="ocrLoading">Scanning prescription…</p>
        <p v-if="ocrError" class="error">{{ ocrError }}</p>

        <!-- OCR Cards -->
        <section v-if="ocrResults.length" class="ocr-results">
          <h3>Select a medication</h3>

          <div class="ocr-grid">
            <div v-for="med in ocrResults" :key="med.id" class="ocr-card" @click="selectOCRMedication(med)">
              <h4 class="ocr-title">{{ med.name || 'Unnamed medication' }}</h4>

              <p><strong>Dosage:</strong> {{ med.dosage || '—' }}</p>
              <p><strong>Schedule:</strong> {{ med.schedule || '—' }}</p>
            </div>
          </div>
        </section>

      </section>
    </section>
    <!-- Divider -->
    <div class="section-divider" v-if="!isEditMode">
      <span>OR ENTER DETAILS MANUALLY</span>
    </div>

    <!-- MANUAL FORM -->
    <section class="form-card" ref="formSection" id="add-medicine-form">
      <div class="form-header">
        <button v-if="isEditMode" type="button" class="back-btn" @click="goBack">
          ← Back
        </button>
      </div>

      <h2>{{ isEditMode ? "Update Details" : "Add Details Manually" }}</h2>

      <form @submit.prevent="openConfirmation" class="medicine-form">
        <h4>Medicine Details</h4>
        <div class="form-group">
          <label>Medicine Name <span class="required">*</span></label>
          <input v-model="form.medicineName" type="text" required />
        </div>

        <div class="form-group">
          <label>Medicine Type<span class="required">*</span></label>
          <select v-model="form.form" required>
            <option disabled value="">Select type</option>
            <option>Tablet</option>
            <option>Capsule</option>
            <option>Syrup</option>
            <option>Injection</option>
            <option>Other</option>
          </select>
        </div>

        <h4>Dosage & Schedule</h4>
        <div class="form-group">
          <label>Dosage<span class="required">*</span></label>
          <div class="dose-input-wrapper">
            <input v-model="form.doseQuantity" type="text" required placeholder="e.g.: 1"
              :class="{ 'input-error': errors.doseQuantity }"
              @input="markInvalidIfNonNumeric('doseQuantity', $event)" />
            <span v-if="derivedUnit" class="doseUnit">{{ derivedUnit }}</span>
            <small v-if="errors.doseQuantity" class="error-text">
              Please enter Numbers >= 0 only
            </small>
          </div>
        </div>
        <!-- <div class="form-group"> -->
        <!-- <label>What dose will you take?</label> -->
        <!-- <div class="dose-input-wrapper"> -->
        <!-- <input v-model="form.take" type="text" :class="{ 'input-error': errors.take }" -->
        <!-- @input="markInvalidIfNonNumeric('take', $event)" /> -->
        <!-- <span v-if="derivedUnit" class="doseUnit">{{ derivedUnit }}</span> -->
        <!-- <small v-if="errors.take" class="error-text"> -->
        <!-- Please enter Numbers >= 0 only -->
        <!-- </small> -->
        <!-- </div> -->
        <!-- </div> -->

        <div class="form-group">
          <label>Schedule</label>
          <select v-model="form.schedule.type" @change="onScheduleChange">
            <option>Everyday</option>
            <option>Specific Days</option>
            <option>Every Few Days</option>
            <option>Custom</option>
          </select>

          <div v-if="form.schedule.type === 'Specific Days'" class="form-group">
            <label>Select days of the week</label>

            <div class="weekday-grid">
              <button v-for="day in WEEK_DAYS" :key="day.value" type="button" class="weekday-btn"
                :class="{ active: form.schedule.data.daysOfWeek.includes(day.value) }" @click="toggleDay(day.value)">
                {{ day.label }}
              </button>
            </div>
          </div>

          <div v-if="form.schedule.type === 'Every Few Days'" class="form-group">
            <label>Every how many days?</label>
            <input type="number" min="1" v-model.number="form.schedule.data.interval" placeholder="e.g. 2" />
          </div>


          <div v-if="form.schedule.type === 'Custom'" class="form-group">
            <label>Add custom dates</label>

            <input type="date" @change="e => addCustomDate(e.target.value)" />

            <ul class="custom-date-list">
              <li v-for="date in form.schedule.data.dates" :key="date">
                {{ date }}
                <button type="button" @click="removeCustomDate(date)">✕</button>
              </li>
            </ul>
          </div>

        </div>

        <!-- Course length text -->
        <p v-if="courseLength" class="course-info">
          Your course of meds runs for <strong>{{ courseLength }}</strong> days.
        </p>

        <div class="form-group">
          <label>What time(s) do you take the medication?</label>

          <div class="time-input-row">
            <input type="time" v-model="newTime" />
            <button type="button" class="add-time-btn" @click="addTime">
              + Add
            </button>
          </div>

          <ul v-if="form.times.length" class="time-list">
            <li v-for="time in form.times" :key="time">
              {{ time }}
              <button type="button" @click="removeTime(time)">✕</button>
            </li>
          </ul>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Start Date <span class="required">*</span></label>
            <input v-model="form.startDate" type="date" required @click="openDatePicker" />
          </div>

          <div class="form-group">
            <label>End Date</label>
            <input v-model="form.endDate" type="date" @click="openDatePicker" />
          </div>
        </div>

        <h4>Additional Details</h4>
        <div class="form-group">
          <label>Description</label>
          <input v-model="form.description" type="text" placeholder="What is this for?" />
        </div>
        <div class="form-group">
          <label>Inventory</label>
          <!-- <input v-model="form.currentInventory" type="text" placeholder="e.g., 150 ml bottle or 150 pills" /> -->
          <div class="dose-input-wrapper">
            <input v-model="form.currentInventory" type="text" :class="{ 'input-error': errors.currentInventory }"
              @input="markInvalidIfNonNumeric('currentInventory', $event)" />
            <span v-if="derivedUnit" class="doseUnit">{{ derivedUnit }}</span>
            <small v-if="errors.currentInventory" class="error-text">
              Please enter Numbers >= 0 only
            </small>
          </div>
        </div>

        <div class="form-group">
          <label>
            Refill Alert
            <span v-if="isInventoryEntered" class="required">*</span>
          </label>

          <div class="dose-input-wrapper">
            <input v-model="form.refillThreshold" type="text" :disabled="!isInventoryEntered"
              :class="{ 'input-error': errors.refillThreshold }"
              @input="markInvalidIfNonNumeric('refillThreshold', $event)" />
            <span v-if="derivedUnit" class="doseUnit">{{ derivedUnit }}</span>
          </div>

          <small v-if="isInventoryEntered" class="helper-text">
            Required when inventory is provided
          </small>
        </div>


        <div class="form-group">
          <label>Inventory Expiry Date</label>
          <input v-model="form.expiryDate" type="date" @click="openDatePicker" />
        </div>

        <button type="submit" class="submit-button">
          Review Medication Details
        </button>
      </form>
    </section>

    <!-- CONFIRMATION MODAL -->
    <div v-if="showConfirm" class="modal-backdrop">
      <div class="modal-card">
        <h2>Confirm Medication Details</h2>

        <ul class="confirm-list">
          <li><strong>Name:</strong> {{ form.medicineName }}</li>
          <li><strong>Description:</strong> {{ form.description || "—" }}</li>
          <li><strong>Dosage:</strong> {{ form.doseQuantity || "—" }}</li>
          <!-- <li><strong>What dose will you take: </strong> {{ form.take || "—" }}</li> -->
          <li><strong>Type:</strong> {{ form.form }}</li>
          <li><strong>Schedule:</strong> {{ scheduleDisplay }}</li>
          <li><strong>Time:</strong> {{ timeDisplay }}</li>

          <li>
            <strong>Duration:</strong>
            {{ form.startDate || "—" }} → {{ form.endDate || "—" }}
          </li>
          <li><strong>Stock:</strong> {{ form.stock || "—" }}</li>
          <li><strong>Expiry:</strong> {{ form.expiryDate || "—" }}</li>
        </ul>

        <div class="modal-actions">
          <button class="btn-secondary" @click="showConfirm = false">Edit</button>
          <button class="btn-primary" @click="saveMedicationToDB">
            Confirm & Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.add-medicine-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.form-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.back-btn {
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 6px;
}

.back-btn:hover {
  text-decoration: underline;
}


/* Hero / OCR */
.hero-card {
  background: var(--color-card);
  border-bottom-left-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-lg);
  padding: 24px 20px;
  box-shadow: var(--shadow-soft);
  text-align: center;
}

.hero-card h1 {
  margin: 0 0 8px;
  font-size: 24px;
  color: var(--color-text);
}

.hero-text {
  margin: 0 0 16px;
  color: var(--color-subtle-text);
  font-size: 14px;
}

.ocr-button {
  border: none;
  background: var(--color-primary);
  color: #fff;
  padding: 10px 20px;
  border-radius: var(--radius-pill);
  font-size: 14px;
  cursor: pointer;
}

.ocr-button:hover {
  background: var(--color-primary-hover);
}

.ocr-status {
  margin-top: 10px;
  font-size: 13px;
  color: var(--color-subtle-text);
}

/* Divider */
.section-divider {
  display: flex;
  align-items: center;
  color: var(--color-subtle-text);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.section-divider::before,
.section-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: #d1d5db;
}

.section-divider span {
  margin: 0 12px;
}

/* Form card */
.form-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  padding: 24px 20px;
  max-width: var(--card-width);
  width: 100%;
  margin: 0 auto;
}

.form-card h2 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
}

.medicine-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--color-primary);
}

.form-group input,
.form-group select {
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  background: var(--color-bg);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.2);
}

.form-row {
  display: flex;
  gap: 12px;
}

.dose-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dose-unit {
  font-size: 14px;
  color: var(--color-subtle-text);
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
  }
}

.required {
  color: #dc2626;
}

.course-info {
  width: 100%;
  display: block;
  margin-top: 4px;
  font-size: 14px;
  color: var(--color-subtle-text);
}

/* Time input */
input[type="time"] {
  cursor: pointer;
}

input[type="time"]::-webkit-calendar-picker-indicator {
  display: block;
}

/* Button */
.submit-button {
  margin-top: 8px;
  background: var(--color-bg);
  color: var(--color-primary);
  border: none;
  padding: 11px 16px;
  border-radius: var(--radius-pill);
  font-size: 14px;
  cursor: pointer;
}

.submit-button:hover {
  /* background: var(--color-primary-hover); */
  background: var(--color-primary);
  color: var(--color-border);
  border-color: var(--color-primary);
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
}

.modal-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: 20px 18px;
  width: 95%;
  max-width: 480px;
  box-shadow: var(--shadow-medium);
}

.modal-card h2 {
  margin-top: 0;
  margin-bottom: 12px;
  text-align: center;
  font-size: 18px;
}

.confirm-list {
  list-style: none;
  padding: 0;
  margin: 10px 0 18px;
  font-size: 14px;
  color: var(--color-primary);
}

.confirm-list li {
  margin-bottom: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-secondary,
.btn-primary {
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  border: none;
  font-size: 14px;
  cursor: pointer;
  margin: 2px;
}

.btn-secondary {
  background: var(--color-bg);
  color: var(--color-primary);
}

.btn-secondary:hover {
  background: var(--color-text);
  ;
}

.btn-primary {
  background: var(--color-bg);
  color: var(--color-primary);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.info-icon {
  margin-left: 5px;
  cursor: help;
  font-size: 14px;
  color: var(--color-primary);
}

.ocr-results {
  max-width: 900px;
  margin: 2rem auto;
}

.ocr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
}

.ocr-card {
  background: var(--color-card);
  border-radius: 14px;
  padding: 1.25rem;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.ocr-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.ocr-title {
  margin-bottom: 0.5rem;
  font-size: 1.05rem;
}

.ocr-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin: 1.5rem 0;
}

.icon-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: var(--color-card);
  color: var(--color-text);
  font-size: 1.2rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background 0.2s ease, transform 0.1s ease;
}

.icon-btn:hover {
  background: var(--color-primary);
  color: var(--color-on-primary);
  transform: translateY(-1px);
}

.icon-btn:active {
  transform: translateY(0);
}

.weekday-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-top: 6px;
}

.weekday-btn {
  width: 100%;
  height: 36px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 8px;
  border: 2px solid var(--color-border);
  color: var(--color-text);
  background: transparent;

  font-size: 13px;
  font-weight: 500;
  cursor: pointer;

  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}


.weekday-btn.active {
  background: var(--color-primary);
  color: var(--color-border);
  border-color: var(--color-primary);
}

.custom-date-list {
  margin-top: 8px;
  padding-left: 0;
  list-style: none;
}

.custom-date-list li {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.time-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.add-time-btn {
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  border: none;
  background: var(--color-primary);
  color: var(--color-border);
  border-color: var(--color-primary);
  cursor: pointer;
  font-size: 13px;
}

.add-time-btn:hover {
  background: var(--color-primary-hover);
}

.time-list {
  margin-top: 8px;
  padding-left: 0;
  list-style: none;
}

.time-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  padding: 4px 0;
}

.time-list button {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #dc2626;
}

.input-error {
  border-color: #dc2626 !important;
  background-color: rgba(220, 38, 38, 0.05);
}

.error-text {
  color: #dc2626;
  font-size: 12px;
  margin-top: 2px;
}
</style>
