<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { updateMeds, getMedsById } from '@/firebase/firebase_service.js'

const route = useRoute();
const router = useRouter();

const medId = route.params.id;
const form = ref({});
const loaded = ref(false);

onMounted(async () => {
  try {
    const data = await getMedsById(medId);
    form.value = { ...data }; // populate form
    loaded.value = true;
  } catch (err) {
    alert("Error loading medication.", err);
    router.push("/");
  }
});

const saveChanges = async () => {
  try {
    await updateMeds(medId, form.value);
    alert("Medication updated successfully!");
    router.push("/"); // or a medication list page later
  } catch (error) {
    console.error(error);
    alert("Failed to update medication");
  }
};
</script>

<template>
  <div class="edit-medicine-container">
    <section class="form-card">
      <h2>Edit Medication</h2>

      <form @submit.prevent="saveChanges" class="medicine-form" v-if="loaded">
        <div class="form-group">
          <label>Medicine Name <span class="required">*</span></label>
          <input v-model="form.medicineName" type="text" required />
        </div>

        <div class="form-group">
          <label>Description</label>
          <input v-model="form.description" type="text" />
        </div>

        <div class="form-group">
          <label>Dosage</label>
          <input v-model="form.dosageText" type="text" />
        </div>

        <div class="form-group">
          <label>Medicine Type <span class="required">*</span></label>
          <select v-model="form.form" required>
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
          <select v-model="form.scheduleType">
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
            <label>Start Date</label>
            <input v-model="form.startDate" type="date" />
          </div>
          <div class="form-group">
            <label>End Date</label>
            <input v-model="form.endDate" type="date" />
          </div>
        </div>

        <div class="form-group">
          <label>Available Stock</label>
          <input v-model.number="form.stockQuantity" type="number" min="0" />
        </div>

        <div class="form-group">
          <label>Expiry Date</label>
          <input v-model="form.expiryDate" type="date" />
        </div>

        <button type="submit" class="submit-button">
          Save Changes
        </button>
      </form>

      <p v-else class="loading-text">Loading medication data...</p>
    </section>
  </div>
</template>


<style scoped>
.edit-medicine-container {
  max-width: var(--card-width);
  margin: 0 auto;
  padding: 20px;
}

.form-card {
  background: var(--color-card);
  padding: 24px 20px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
}

.form-card h2 {
  text-align: center;
  margin-bottom: 20px;
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
}

.form-group input,
.form-group select {
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  font-size: 14px;
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

.submit-button {
  margin-top: 8px;
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 11px 16px;
  border-radius: var(--radius-pill);
  font-size: 14px;
  cursor: pointer;
}

.submit-button:hover {
  background: var(--color-primary-hover);
}

.loading-text {
  text-align: center;
  color: var(--color-subtle-text);
}
</style>
