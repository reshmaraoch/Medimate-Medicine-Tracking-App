<script setup>
import { ref, computed } from 'vue'
import { saveMeds } from '@/firebase/firebase_service.js'

const showConfirm = ref(false)

const form = ref({
  medicineName: '',
  description: '',
  dosage: '',
  medicineType: '',
  schedule: '',
  time: '',
  startDate: '',
  endDate: '',
  stock: '',
  expiryDate: '',
})

const triggerOCR = () => {
  alert('OCR trigger placeholder — integrate later.')
}

const openConfirmation = () => {
  showConfirm.value = true
}

const saveMedicationToDB = async () => {
  try {
    await saveMeds(form.value)
    alert('Medication saved!')

    showConfirm.value = false
    Object.keys(form.value).forEach((k) => (form.value[k] = ''))
  } catch (err) {
    console.error(err)
    alert('Error saving medication.')
  }
}

const courseLength = computed(() => {
    if(!form.value.startDate || !form.value.endDate)
        return null;

        const start = new Date(form.value.startDate);
        const end = new Date(form.value.endDate);

        const diff = (end - start) / (1000 * 60 * 60 * 24);

        return diff >= 0 ? diff + 1 : null;
})
const openDatePicker = (event) => {
  event.target.showPicker?.();
};
</script>

<template>
  <div class="add_medicine-container">
    <!-- HEADER -->
    <header class="header-section">
      <h1>Add A Medication to Track</h1>

      <!-- OCR Upload Button -->
      <button class="ocr-button" @click="triggerOCR">
        📷 Upload Prescription to Auto-Fill Details
      </button>
    </header>

    <hr class="divider" />

    <!-- MANUAL FORM -->
    <section class="form-wrapper">
      <h2>Add Details Manually</h2>

      <form @submit.prevent="openConfirmation" class="medicine-form">
        <div class="form-group">
          <label>Medicine Name *</label>
          <input v-model="form.medicineName" type="text" required />
        </div>

        <div class="form-group">
          <label>Description</label>
          <input v-model="form.description" type="text" />
        </div>

        <div class="form-group">
          <label>Dosage</label>
          <input v-model="form.dosage" type="text" />
        </div>

        <div class="form-group">
          <label>Medicine Type *</label>
          <select v-model="form.medicineType" required>
            <option disabled value="">Select type</option>
            <option>Tablet</option>
            <option>Capsule</option>
            <option>Syrup</option>
            <option>Injection</option>
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

        <div class="form-group-row">
          <div class="form-group half">
            <label>Start Date *</label>
            <input v-model="form.startDate" type="date" @click="openDatePicker"/>
          </div>

          <div class="form-group half">
            <label>End Date</label>
            <input v-model="form.endDate" type="date" @click="openDatePicker" />
          </div>
        </div>
        
          <p v-if="courseLength" class="course-info">
            Your course of medication is: <strong>{{ courseLength }}</strong> days
          </p>

        <div class="form-group">
          <label>Available Stock</label>
          <input v-model="form.stock" type="number" min="0" />
        </div>

        <div class="form-group">
          <label>Expiry Date</label>
          <input v-model="form.expiryDate" type="date" @click="openDatePicker" />
        </div>

        <button type="submit" class="submit-button">Add Medication Details</button>
      </form>
    </section>

    <!-- CONFIRMATION MODAL -->
    <div v-if="showConfirm" class="modal-backdrop">
      <div class="modal-box">
        <h2>Confirm Medication Details</h2>

        <ul class="confirm-list">
          <li><strong>Name:</strong> {{ form.medicineName }}</li>
          <li><strong>Description:</strong> {{ form.description || '—' }}</li>
          <li><strong>Dosage:</strong> {{ form.dosage || '—' }}</li>
          <li><strong>Type:</strong> {{ form.medicineType }}</li>
          <li><strong>Schedule:</strong> {{ form.schedule }}</li>
          <li><strong>Time:</strong> {{ form.time || '—' }}</li>
          <li v-if="courseLength"><strong>Duration:</strong> {{ form.startDate }} → {{ form.endDate || '—' }} (<strong>{{ courseLength }}</strong> days)</li>
          <!-- <li v-if="courseLength">Your course of medication is: <strong>{{ courseLength }}</strong> days</li> -->

          <li><strong>Stock:</strong> {{ form.stock || '—' }}</li>
          <li><strong>Expiry:</strong> {{ form.expiryDate || '—' }}</li>
        </ul>

        <div class="modal-buttons">
          <button class="modal-edit" @click="showConfirm = false">Edit</button>
          <button class="modal-save" @click="saveMedicationToDB">Confirm & Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Layout */
.add_medicine-container {
  max-width: 900px;
  margin: auto;
  padding: 20px;
}

/* Header */
.header-section {
  text-align: center;
  margin-bottom: 40px;
}

.header-section h1 {
  font-size: 24px;
  margin-bottom: 10px;
}

/* OCR Button */
.ocr-button {
  background: #e5e5e5;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.ocr-button:hover {
  background: #d4d4d4;
}

/* Divider */
.divider {
  margin: 40px 0;
}

/* Form box */
.form-wrapper {
   background: var(--color-card);
  box-shadow: var(--shadow-soft);
  border-radius: var(--radius-lg);
  padding: 30px;
  border-radius: 10px;
  border: 1px solid #ddd;
}

.form-wrapper h2 {
  text-align: center;
  margin-bottom: 20px;
}

/* Form styling */
.medicine-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group label {
  font-weight: 500;
  margin-bottom: 4px;
  display: block;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #bbb;
  border-radius: 6px;
}

.form-group-row {
  display: flex;
  gap: 16px;
}

.form-group.half input {
  width: 100%;
}

.course-info {
  font-size: 14px;
  margin-top: -6px;
  color: var(--color-subtle-text);
}



.submit-button {
background: var(--color-primary);
  border-radius: var(--radius-pill);  color: white;
  padding: 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.submit-button:hover {
  background: var(--color-primary-hover);
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-box {
  background: white;
  color:  var(--color-text-white-bg);
  padding: 24px;
  width: 90%;
  max-width: 500px;
  border-radius: 10px;
  border: 1px solid #ccc;
}

.confirm-list {
  list-style: none;
  padding: 0;
  margin: 20px 0;
}

.confirm-list li {
  margin-bottom: 6px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.modal-edit,
.modal-save {
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
}

.modal-edit {
  background: #d4d4d4;
}

.modal-edit:hover {
  background: #bfbfbf;
}

.modal-save {
  background: #2563eb;
  color: white;
}

.modal-save:hover {
  background: #1e3fa8;
}

@media (max-width: 480px) {
  .form-group-row {
    flex-direction: column;
  }
}
</style>
