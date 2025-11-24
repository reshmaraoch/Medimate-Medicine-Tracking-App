<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getAllMeds } from "@/firebase/firebase_service.js";

const medications = ref([]);
const router = useRouter();

onMounted(async () => {
  medications.value = await getAllMeds();
});

const goToEdit = (id) => {
  router.push(`/edit-medicine/${id}`);
};

const goToAdd = () => {
  router.push("/add_medicine");
};
</script>


<template>
  <div class="view-medications-container">
    <section class="table-card">
      <h2>My Medications</h2>

      <table class="med-table" v-if="medications.length">
        <thead>
          <tr>
            <th>Name</th>
            <th>Dosage</th>
            <th>Type</th>
            <th>Schedule</th>
            <th>Start</th>
            <th>End</th>
            <th>Stock</th>
            <th>Edit</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="med in medications" :key="med.id">
            <td>{{ med.medicineName }}</td>
            <td>{{ med.dosageText || '—' }}</td>
            <td>{{ med.form }}</td>
            <td>{{ med.scheduleType }}</td>
            <td>{{ med.startDate || '—' }}</td>
            <td>{{ med.endDate || '—' }}</td>
            <td>{{ med.stockQuantity ?? '—' }}</td>
            <td>
              <button class="edit-btn" @click="goToEdit(med.id)">
                Edit
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else class="empty-text">
        You have no medications yet.
      </p>

      <button class="add-btn" @click="goToAdd">
        + Add Medication
      </button>
    </section>
  </div>
</template>


<style scoped>
.view-medications-container {
  max-width: var(--card-width);
  margin: 0 auto;
  padding: 20px;
}

.table-card {
  background: var(--color-card);
  padding: 24px 20px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
}

.table-card h2 {
  text-align: center;
  margin-bottom: 20px;
}

.med-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.med-table th,
.med-table td {
  border-bottom: 1px solid var(--color-border);
  padding: 10px 8px;
  text-align: left;
  font-size: 14px;
}

.med-table th {
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-bg);
}

.med-table tr:hover {
  background: rgba(0, 0, 0, 0.03);
}

.edit-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  cursor: pointer;
}
.edit-btn:hover {
  background: var(--color-primary-hover);
}

.add-btn {
  width: 100%;
  padding: 12px 0;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-pill);
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
}
.add-btn:hover {
  background: var(--color-primary-hover);
}

.empty-text {
  text-align: center;
  margin: 20px 0;
  color: var(--color-subtle-text);
}
</style>
