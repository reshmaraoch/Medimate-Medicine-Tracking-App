<script setup>
import { ref, onMounted } from "vue";
import { User as UIcon } from "lucide-vue-next";
import authComp from "./authComp.vue";

import {
  getAuth,
  onAuthStateChanged,
} from "firebase/auth";

import { firebaseApp } from "@/firebase_conf";

const auth = getAuth(firebaseApp);

// reactive user
const user = ref(null);
const dropdown = ref(false);

// listen to auth state changes
onMounted(() => {
  onAuthStateChanged(auth, (firebaseUser) => {
    user.value = firebaseUser;
  });
});
</script>

<template>
  <div v-if="user">
    <div class="relative inline-block">
      <!-- Profile icon -->
      <div @click="dropdown = !dropdown">
        <UIcon class="user-icon" />
      </div>

      <ul v-if="dropdown" class="dropdown-card" @click="dropdown = !dropdown">
        <li @click="$router.push('/saved-pharmacy-info')">Saved Pharmacy Info</li>
        <li @click="$router.push('/stocks')">View Stocks</li>
        <li @click="$router.push('/achievements')">View Achievements</li>
        <li @click="$router.push('/profile')">Profile & Preferences</li>

        <authComp />
      </ul>
    </div>
  </div>

  <!-- If LOGGED OUT -->
  <div v-else>
    <authComp />
  </div>
</template>

<style scoped>
.relative {
  position: relative;
}

.dropdown-card {
  cursor: pointer;
  font-size: 16px;
  color: var(--color-text);

  position: absolute;
  top: 38px;
  right: 0;

  display: flex;
  flex-direction: column;

  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);

  padding: 12px;
  width: 190px;
  z-index: 50;
}

li {
  padding: 12px;
  list-style: none;
}

.dropdown-text {
  padding-bottom: 2px;
  font-size: 14px;
  list-style: none;
}

.user-icon{
    color: black;
}

.user-icon:hover {
  cursor: pointer;
}
</style>
