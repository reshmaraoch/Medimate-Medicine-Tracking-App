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
            <td>{{ med.doseQuantity || '—' }}</td>
            <td>{{ med.form }}</td>
            <td>{{ med.scheduleType }}</td>
            <td>{{ med.startDate || '—' }}</td>
            <td>{{ med.endDate || '—' }}</td>
            <td>{{ med.currentInventory ?? '—' }}</td>
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

      <p v-else class="empty-text">
          You have no medications yet.
      </p>

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
  padding: 1rem;
}

.table-card {
  background: var(--color-card);
  padding: 1.25rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
}

.table-card h2 {
  text-align: center;
  margin-bottom: 1rem;
}


.med-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
  overflow-x: auto;
  display: block;
  -webkit-overflow-scrolling: touch;
}

.med-table th,
.med-table td {
  border-bottom: 1px solid var(--color-border);
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  white-space: nowrap;
}

.med-table th {
  font-weight: 600;
  background: var(--color-bg);
  position: sticky;
  top: 0;
  z-index: 1;
}

.med-table tr:hover {
  background: rgba(0, 0, 0, 0.03);
}


.edit-btn,
.delete-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font-size: 0.8rem;
}

.edit-btn:hover {
  background: var(--color-primary-hover);
}

.delete-btn:hover {
  background: rgb(141, 37, 37);
}

.add-btn {
  width: 100%;
  padding: 0.75rem 0;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-pill);
  font-size: 1rem;
  cursor: pointer;
}

.add-btn:hover {
  background: var(--color-primary-hover);
}


.empty-text {
  text-align: center;
  margin: 1rem 0;
  color: var(--color-subtle-text);
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

.modal-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  width: 95%;
  max-width: 480px;
  box-shadow: var(--shadow-medium);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.btn-secondary,
.btn-primary {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-pill);
  border: none;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-secondary {
  background: #e5e7eb;
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

@media (max-width: 767px) {
  .view-medications-container {
    padding: 0.75rem;
  }

  .table-card {
    padding: 1rem;
  }

  .med-table th,
  .med-table td {
    font-size: 0.8rem;
  }
}

@media (min-width: 768px) {
  .view-medications-container {
    padding: 1.5rem;
  }
}
</style>

