<script setup>


import { onMounted, ref } from "vue";
import { getAllMeds } from "@/firebase/firebase_service";




const medications = ref([]);
const loadMeds = async () => {
   medications.value = await getAllMeds();
};


onMounted(loadMeds)


</script>


<template>
   <div class="stocks-page">
       <h2 class="page-title">Stocks</h2>
       <div class="stocks-container">
           <h3 class="section-title">Medications</h3>
           <div class="stocks">
                <div v-if="medications.length">
                    <div class="stock" v-for="med in medications" :key="med.id">
                        <div class="stock-card">
                            <div class="stock-title">
                                <div>
                                    <p>{{ med.medicineName }}</p>
                                </div>
                                <div>
                                    <p>Dosage: {{ med.doseQuantity || '—'  }}</p>     
                                </div>
                            </div>
                            
                            <div class="stack-description">
                                <p v-if=" med.currentInventory <= parseInt(med.refillThreshold) " class="low-stock-warning">
                                        ⚠️ Low stock: ({{ med.currentInventory }}
                        {{ med.unit || "" }} remaining)
                                </p>
                                <p v-else>
                                        Stock: {{  med.currentInventory || "-"}}
                                </p>
                                <p>
                                    Expiration Date: {{  med.expiryDate || "-"}}
                                </p>
                                <p>

                                    Refill ETA: {{ med.refillThreshold || "-" }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <p v-else>
                    You have no medications yet.
                </p>
           </div>


          
       </div>
   </div>
</template>


<style scoped>
.stocks-page {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 4rem;
}

.page-title {
  width: 100%;
  max-width: 800px;
  margin-bottom: 1rem;
  font-size: 1.4rem;
  font-weight: 700;
}

.stocks-container {
  width: 100%;
  max-width: 800px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.stocks-container:hover {
  box-shadow: var(--shadow-soft);
  transition: box-shadow 0.25s ease;
}


.stocks {
  display: grid;
  grid-template-columns: 1fr; /* 📱 phones */
  gap: 10px;
}


.stock {
  background-color: #f1f1f1;
  padding: 10px;
  width: 100%;
  min-height: 150px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.stock:hover {
  box-shadow: var(--shadow-soft);
  transition: box-shadow 0.25s ease;
}

.stock-card {
  display: block;
}

.stock-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.stack-description {
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.low-stock-warning {
  margin-top: 4px;
  font-size: 0.7rem;
  color: #f59e0b;
  font-weight: 800;
}

@media (min-width: 768px) {
  .stocks-page {
    padding: 2rem;
  }

  .stocks {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .stocks {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
