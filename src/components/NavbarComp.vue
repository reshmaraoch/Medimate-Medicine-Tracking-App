<script setup>
import { ref } from "vue";
import ProfileComp from "./ProfileComp.vue";

const theme = ref(localStorage.getItem("theme") || "light");

const toggleTheme = () => {
  theme.value = theme.value === "light" ? "dark" : "light";
  localStorage.setItem("theme", theme.value);
  document.documentElement.setAttribute("data-theme", theme.value);
};

// Apply on load
document.documentElement.setAttribute("data-theme", theme.value);
</script>

<template>
  <nav class="navbar">
    <div class="nav-left">
      <img src="../assets/logo3.png" class="logo" alt="MediMate logo">
      <span class="brand">MediMate</span>
    </div>

    <ul class="nav-links">
      
      <li @click="$router.push('/')">Home</li>
      <!-- 
      <li @click="$router.push('/about')">About</li>
      <li @click="$router.push('/contact')">Contact</li>
      --->
      <li @click="$router.push('/profile')">Profile and Preferences</li>
      <li @click="$router.push('/add_medicine')">Add Medicine</li>
      <li @click="$router.push('/view-meds')">Medications</li>


      <!-- <RouterLink to="/">Home</RouterLink> 
      <RouterLink to="/about">About</RouterLink> 
      <RouterLink :to="{ name: 'test_w_id', params: { id: 17 } }">test</RouterLink> 
      <RouterLink to="/fun">FUN</RouterLink> 
      <RouterLink to="/add_medicine">Add Medicine</RouterLink> -->
    </ul>

    <button class="theme-toggle" @click="toggleTheme">
      {{ theme === 'light' ? '🌙' : '☀️' }}
    </button>
    <ProfileComp />
  </nav>
</template>

<style scoped>
.navbar {
  height: 64px;
  padding: 0 30px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--color-card);
  box-shadow: var(--shadow-soft);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  width: 80px;
  height: 80px;
}

.brand {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
}

.nav-links {
  list-style: none;
  display: flex;
  gap: 20px;
}

.nav-links li {
  cursor: pointer;
  font-size: 16px;
  color: var(--color-text);
}
.nav-links li:hover {
  color: var(--color-primary);
}

.theme-toggle {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
}
</style>
