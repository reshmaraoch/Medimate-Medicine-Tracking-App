<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getAllMeds } from "@/firebase/firebase_service.js";
import { deleteMedById } from "@/firebase/firebase_service.js";

const medications = ref([]);
const router = useRouter();


const showConfirm = ref(false);
const medToDeleteId = ref("")
const medToDeleteName = ref("")

const showConfirmation = async (id, name)=> {
  showConfirm.value = !showConfirm.value
  medToDeleteId.value = id
  medToDeleteName.value = name
}

const loadMeds = async () => {
  medications.value = await getAllMeds();
};

const goToEdit = (id) => {
  router.push(`/edit-medicine/${id}`);
};

const goToAdd = () => {
  router.push("/add_medicine");
};

const deleteMedication = async () => {
  try {
    await deleteMedById(medToDeleteId.value)
    await loadMeds()
    showConfirm.value = !showConfirm.value
  } catch (error) {
    console.log(error)
    alert("Deletion Failed")
  }
}

onMounted(loadMeds)
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
            <th>Delete</th>
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
            <td>
              <button class="delete-btn" @click="showConfirmation(med.id, med.medicineName)">
                Delete
              </button>
            </td>
          </tr>
        </tbody>


      </table>

      <div v-if="showConfirm" class="modal-backdrop">
        <div class="modal-card">
          <h2>Are you sure you want to delete "{{ medToDeleteName }}"?</h2>

          <div class="modal-actions">
            <button class="btn-secondary" @click="showConfirm = false">No</button>
            <button class="btn-primary" @click="deleteMedication">
              Yes
            </button>
          </div>
        </div>
      </div>

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

.delete-btn {
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

.delete-btn:hover {
  background: rgb(141, 37, 37);
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

.modal-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: 20px 18px;
  width: 95%;
  max-width: 480px;
  box-shadow: var(--shadow-medium);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
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
