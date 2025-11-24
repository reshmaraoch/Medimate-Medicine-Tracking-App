<script setup>
import { ref, computed } from "vue";
import Tesseract from "tesseract.js";
import { saveMeds } from "@/firebase/firebase_service.js";
import router from "@/router";

// ---------- FORM STATE ----------
const form = ref({
  medicineName: "",
  description: "",
  dosage: "",
  medicineType: "",
  schedule: "Everyday",
  time: "",
  startDate: "",
  endDate: "",
  stock: "",
  expiryDate: "",
});

const showConfirm = ref(false);

// ---------- OCR STATE ----------
const ocrFileInput = ref(null);
const formSection = ref(null);
const ocrStatus = ref("");

// currentMode from your vanilla code: we'll keep fast vs accurate for future extension
const currentMode = ref("accurate"); // "fast" or "accurate"

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

// ---------- OCR FLOW ----------
const triggerOcrFilePicker = () => {
  ocrFileInput.value?.click();
};

const handleOcrFileChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    ocrStatus.value = "Preparing image for OCR...";
    const objectUrl = URL.createObjectURL(file);

    const img = new Image();
    img.onload = async () => {
      try {
        // mimic your "fast" scaling: ~1200px max dimension
        const maxDimFast = 1200;
        let width = img.width;
        let height = img.height;

        if (currentMode.value === "fast") {
          const scale = Math.min(maxDimFast / width, maxDimFast / height, 1);
          width = Math.floor(width * scale);
          height = Math.floor(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataURL = canvas.toDataURL("image/png");
        URL.revokeObjectURL(objectUrl);

        await performOCR(dataURL);
      } catch (err) {
        console.error(err);
        ocrStatus.value = "Error processing image. Please try another photo.";
      }
    };
    img.onerror = () => {
      ocrStatus.value = "Could not load image. Try another file.";
    };
    img.src = objectUrl;
  } catch (err) {
    console.error(err);
    ocrStatus.value = "Error reading file.";
  } finally {
    // reset input so same file can be re-selected
    e.target.value = "";
  }
};

async function performOCR(dataURL) {
  try {
    const modeLabel = currentMode.value === "fast" ? "Fast" : "Accurate";
    ocrStatus.value = `Running OCR (${modeLabel} mode)...`;

    const result = await Tesseract.recognize(dataURL, "eng");
    const text = result.data.text || "";

    ocrStatus.value = "OCR complete. Parsing prescription text...";

    // Use your original parser
    let parsed = parseUniversalPrescription(text);

    if (!parsed.medications.length && currentMode.value === "fast") {
      parsed = fallbackParseLinesToMeds(text);
    }

    if (!parsed.medications.length) {
      ocrStatus.value =
        "Could not detect clear medication lines. Please edit manually.";
      return;
    }

    const firstMed = parsed.medications[0];

    // Map parsed fields into the form
    form.value.medicineName = firstMed.name || form.value.medicineName;
    form.value.dosage = firstMed.dosage || form.value.dosage;
    // We only have free-text schedule; user can refine it
    if (firstMed.schedule && !form.value.schedule) {
      form.value.schedule = "Custom";
    }

    ocrStatus.value =
      "Prescription scanned. We filled what we could. Scroll down to review and complete the form.";

    // Smooth scroll to the form
    setTimeout(() => {
      formSection.value?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  } catch (err) {
    console.error(err);
    ocrStatus.value = "Error during OCR. Please try again with a clearer image.";
  }
}

// ---------- PARSERS (adapted from your script.js) ----------
function parseUniversalPrescription(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const medications = [];

  const dosageRegex =
    /\b(\d+\s?mg|\d+\s?g|\d+\s?mcg|\d+\s?iu|\d+\s?ml|[1-3]\s?(tablet|tablets|capsule|capsules|cap|caps))\b/i;

  const scheduleRegex =
    /\b(every\s?\d+\s?(hours|hrs|hr)|once (a )?day|twice (a )?day|thrice (a )?day|daily|at bedtime|morning|night)\b/i;

  for (let line of lines) {
    const lowered = line.toLowerCase();

    if (lowered.includes("patient")) continue;
    if (lowered.includes("doctor")) continue;
    if (lowered.includes("physician")) continue;
    if (lowered.includes("address")) continue;
    if (lowered.includes("phone")) continue;
    if (lowered.includes("email")) continue;
    if (lowered.includes("date")) continue;
    if (lowered.includes("signature")) continue;
    if (lowered.startsWith("rx")) continue;

    const dosageMatch = line.match(dosageRegex);
    const scheduleMatch = line.match(scheduleRegex);

    if (dosageMatch && scheduleMatch) {
      const dosage = dosageMatch[1];
      const schedule = scheduleMatch[1];

      const namePart = line.split(dosageMatch[0])[0].trim();
      const name = namePart.replace(/[\d:,|-]/g, "").trim();

      medications.push({
        name,
        dosage,
        schedule,
      });
    }
  }

  return { medications };
}

function fallbackParseLinesToMeds(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const meds = [];

  for (let line of lines) {
    const lowered = line.toLowerCase();

    if (lowered.includes("patient")) continue;
    if (lowered.includes("doctor")) continue;
    if (lowered.includes("physician")) continue;
    if (lowered.includes("address")) continue;
    if (lowered.includes("phone")) continue;
    if (lowered.includes("email")) continue;
    if (lowered.includes("date")) continue;
    if (lowered.includes("signature")) continue;
    if (lowered.startsWith("rx")) continue;

    meds.push({
      name: line,
      dosage: "",
      schedule: "",
    });
  }

  return { medications: meds };
}

// ---------- FORM FLOW ----------
const openConfirmation = () => {
  if (!form.value.medicineName || !form.value.medicineType || !form.value.startDate) {
    alert("Please fill required fields (Name, Type, Start Date).");
    return;
  }
  showConfirm.value = true;
};

const saveMedicationToDB = async () => {
  try {
    const payload = {
      medicineName: form.value.medicineName,
      description: form.value.description,
      dosageText: form.value.dosage,
      form: form.value.medicineType,
      scheduleType: form.value.schedule,
      time: form.value.time || null,
      startDate: form.value.startDate,
      endDate: form.value.endDate || null,
      stockQuantity: form.value.stock ? Number(form.value.stock) : null,
      expiryDate: form.value.expiryDate || null,
    };

    await saveMeds(payload);
    alert("Medication saved successfully!");

    showConfirm.value = false;
    Object.keys(form.value).forEach((k) => (form.value[k] = ""));
    form.value.schedule = "Everyday";
    router.push('/view-meds')
  } catch (err) {
    console.error(err);
    alert("There was an error saving the medication.");
  }
};
</script>



<template>
  <div class="add-medicine-container">
    <!-- HEADER / OCR SECTION -->
    <section class="hero-card">
      <h1>Add a Medication to Track</h1>
      <p class="hero-text">
        You can upload a prescription to auto-fill details, or enter them manually below.
      </p>

      <!-- Hidden file input for OCR -->
      <input
        ref="ocrFileInput"
        type="file"
        accept="image/*"
        capture="environment"
        style="display:none"
        @change="handleOcrFileChange"
      />

      <button class="ocr-button" type="button" @click="triggerOcrFilePicker">
        📷 Upload Prescription to Auto-Fill
      </button>

      <p class="ocr-status" v-if="ocrStatus">
        {{ ocrStatus }}
      </p>
    </section>

    <!-- Divider -->
    <div class="section-divider">
      <span>OR ENTER DETAILS MANUALLY</span>
    </div>

    <!-- MANUAL FORM -->
    <section class="form-card" ref="formSection">
      <h2>Add Details Manually</h2>

      <form @submit.prevent="openConfirmation" class="medicine-form">
        <div class="form-group">
          <label>Medicine Name <span class="required">*</span></label>
          <input v-model="form.medicineName" type="text" required />
        </div>

        <div class="form-group">
          <label>Description</label>
          <input v-model="form.description" type="text" placeholder="What is this for?" />
        </div>

        <div class="form-group">
          <label>Dosage</label>
          <input v-model="form.dosage" type="text" placeholder="e.g., 500mg" />
        </div>

        <div class="form-group">
          <label>Medicine Type <span class="required">*</span></label>
          <select v-model="form.medicineType" required>
            <option disabled value="">Select type</option>
            <option>Tablet</option>
            <option>Capsule</option>
            <option>Syrup</option>
            <option>Injection</option>
            <option>Other</option>
          </select>
        </div>

        <div class="form-group">
          <label>Schedule</label>
          <select v-model="form.schedule">
            <option>Everyday</option>
            <option>As Needed</option>
            <option>Specific Days</option>
            <option>Every Few Days</option>
            <option>Custom</option>
          </select>
        </div>

        <div class="form-group">
          <label>Time</label>
          <input v-model="form.time" type="time" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Start Date <span class="required">*</span></label>
            <input
              v-model="form.startDate"
              type="date"
              required
              @click="openDatePicker"
            />
          </div>

          <div class="form-group">
            <label>End Date</label>
            <input
              v-model="form.endDate"
              type="date"
              @click="openDatePicker"
            />
          </div>
        </div>

        <!-- Course length text -->
        <p v-if="courseLength" class="course-info">
          Your course of meds runs for <strong>{{ courseLength }}</strong> days.
        </p>

        <div class="form-group">
          <label>Available Stock</label>
          <input v-model.number="form.stock" type="number" min="0" placeholder="e.g., 30" />
        </div>

        <div class="form-group">
          <label>Expiry Date</label>
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
          <li><strong>Dosage:</strong> {{ form.dosage || "—" }}</li>
          <li><strong>Type:</strong> {{ form.medicineType }}</li>
          <li><strong>Schedule:</strong> {{ form.schedule || "—" }}</li>
          <li><strong>Time:</strong> {{ form.time || "—" }}</li>
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
  color: #374151;
}

.form-group input,
.form-group select {
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 14px;
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
  background: var(--color-primary);
  color: #fff;
  border: none;
  padding: 11px 16px;
  border-radius: var(--radius-pill);
  font-size: 14px;
  cursor: pointer;
}
.submit-button:hover {
  background: var(--color-primary-hover);
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
  color: #374151;
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
}

.btn-secondary {
  background: #e5e7eb;
  color: #111827;
}
.btn-secondary:hover {
  background: #d1d5db;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}
.btn-primary:hover {
  background: var(--color-primary-hover);
}
</style>
