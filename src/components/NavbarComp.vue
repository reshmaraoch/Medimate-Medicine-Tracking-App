<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import AuthComp from "./authComp.vue";

import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { firebaseApp } from "@/firebase_conf";

const router = useRouter();
const route = useRoute();

const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();

const isLoggedIn = ref(false);
let unsubAuth = null;

onMounted(() => {
  unsubAuth = onAuthStateChanged(auth, (u) => {
    isLoggedIn.value = !!u;
  });
});

onBeforeUnmount(() => {
  if (unsubAuth) unsubAuth();
});

/* ---------------- Theme ---------------- */
const theme = ref(localStorage.getItem("theme") || "light");

const setTheme = (t) => {
  theme.value = t;
  localStorage.setItem("theme", t);
  document.documentElement.setAttribute("data-theme", t);
};
const toggleTheme = () => setTheme(theme.value === "light" ? "dark" : "light");
setTheme(theme.value);

/* ---------------- Mobile menu ---------------- */
const isMobileMenuOpen = ref(false);
const toggleMobileMenu = () => (isMobileMenuOpen.value = !isMobileMenuOpen.value);
const closeMobileMenu = () => (isMobileMenuOpen.value = false);

watch(
  () => route.fullPath,
  () => closeMobileMenu()
);

/* ---------------- Navigation rules ---------------- */
const protectedPaths = new Set(["/dashboard", "/add_medicine", "/view-meds"]);
const homePath = computed(() => (isLoggedIn.value ? "/dashboard" : "/"));

/* ---------------- Login popup guard ---------------- */
const loginLoading = ref(false);

async function loginAndRedirect(targetPath) {
  // prevent spam / double popups
  if (loginLoading.value) return;

  loginLoading.value = true;

  // ✅ watchdog unlock: if popup is closed and Firebase resolves late,
  // allow user to try again quickly
  const watchdog = setTimeout(() => {
    loginLoading.value = false;
  }, 1200);

  try {
    await signInWithPopup(auth, provider);
    router.push(targetPath || "/dashboard");
  } catch (e) {
    const code = e?.code || "";
    const silent = new Set([
      "auth/popup-closed-by-user",
      "auth/cancelled-popup-request",
      "auth/popup-blocked",
    ]);

    // ✅ popup cancelled/closed: unlock immediately, no scary logs
    if (silent.has(code)) {
      loginLoading.value = false;
      return;
    }

    console.error("Login error:", e);
  } finally {
    clearTimeout(watchdog);
    loginLoading.value = false;
  }
}

function go(path) {
  closeMobileMenu();

  // Home behaves like Dashboard when logged in
  if (path === "/") {
    router.push(homePath.value);
    return;
  }

  // Logged out user clicking protected links -> login popup immediately
  if (!isLoggedIn.value && protectedPaths.has(path)) {
    loginAndRedirect(path);
    return;
  }

  router.push(path);
}
</script>

<template>
  <nav class="navbar">
    <!-- Left -->
    <div class="nav-left" @click="go('/')">
      <img src="../assets/logo3.png" class="logo" alt="MediMate logo" />
      <span class="brand">MediMate</span>
    </div>

    <!-- Center -->
    <div class="nav-center" :class="{ 'nav-center--open': isMobileMenuOpen }">
      <ul class="nav-links">
        <li @click="go('/')">Home</li>

        <!-- Optional tease for logged-out users -->
        <li v-if="!isLoggedIn" @click="go('/dashboard')">Dashboard</li>

        <li @click="go('/add_medicine')">Add Medicine</li>
        <li @click="go('/view-meds')">Medications</li>
      </ul>
    </div>

    <!-- Right -->
    <div class="nav-right">
      <button
        class="theme-toggle"
        @click="toggleTheme"
        aria-label="Toggle theme"
      >
        {{ theme === "light" ? "🌙" : "☀️" }}
      </button>

      <AuthComp />

      <button
        class="burger"
        @click="toggleMobileMenu"
        aria-label="Toggle navigation"
      >
        <span :class="{ 'line-open': isMobileMenuOpen }"></span>
        <span :class="{ 'line-open': isMobileMenuOpen }"></span>
        <span :class="{ 'line-open': isMobileMenuOpen }"></span>
      </button>
    </div>
  </nav>

  <!-- Mobile overlay -->
  <div
    v-if="isMobileMenuOpen"
    class="menu-overlay"
    @click="closeMobileMenu"
    aria-hidden="true"
  />
</template>

<style scoped>
.navbar {
  height: 64px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-card);
  box-shadow: var(--shadow-soft);
  position: sticky;
  top: 0;
  z-index: 30;
}

/* Left */
.nav-left {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.logo {
  width: 48px;
  height: 48px;
}
.brand {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
}

/* Center */
.nav-center {
  flex: 1;
  display: flex;
  justify-content: center;
}
.nav-links {
  list-style: none;
  display: flex;
  gap: 20px;
  margin: 0;
  padding: 0;
}
.nav-links li {
  cursor: pointer;
  font-size: 16px;
  color: var(--color-text);
  transition: color 0.15s ease, background 0.15s ease;
  white-space: nowrap;
  padding: 8px 10px;
  border-radius: 10px;
}
.nav-links li:hover {
  color: var(--color-primary);
}

/* Right */
.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.theme-toggle {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: var(--color-text);
}

/* Burger */
.burger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  width: 26px;
  height: 26px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.burger span {
  height: 2px;
  width: 100%;
  background: var(--color-text);
  border-radius: 999px;
  transition: transform 0.18s ease, opacity 0.18s ease;
}

/* Overlay */
.menu-overlay {
  position: fixed;
  inset: 64px 0 0 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 20;
}

/* Mobile menu */
@media (max-width: 768px) {
  .navbar {
    padding: 0 10px;
  }
  .logo {
    width: 40px;
    height: 40px;
  }
  .brand {
    font-size: 18px;
  }
  .burger {
    display: flex;
  }
  .nav-right {
    gap: 8px;
  }
  .nav-center {
    display: none;
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    width: 100vw;
    border-radius: 0;
    background: var(--color-bg, #dff5e1);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.25);
    z-index: 25;
    padding: 10px 0;
  }
  .nav-center--open {
    display: block;
  }
  .nav-links {
    flex-direction: column;
    gap: 6px;
    padding: 6px 12px;
  }
  .nav-links li {
    padding: 12px 12px;
  }
}

/* Burger X */
.burger .line-open:nth-child(1) {
  transform: translateY(5px) rotate(45deg);
}
.burger .line-open:nth-child(2) {
  opacity: 0;
}
.burger .line-open:nth-child(3) {
  transform: translateY(-5px) rotate(-45deg);
}
</style>
