<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { firebaseApp } from "@/firebase_conf";

const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();
const router = useRouter();

const user = ref(null);

// dropdown state
const isMenuOpen = ref(false);
const menuRef = ref(null);

function handleClickOutside(e) {
  if (!menuRef.value) return;
  if (!menuRef.value.contains(e.target)) isMenuOpen.value = false;
}

let unsubscribeAuth = null;

onMounted(() => {
  document.addEventListener("click", handleClickOutside);

  // Keep user info reactive in UI (menu/login button)
  unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
    user.value = firebaseUser;
    if (!firebaseUser) isMenuOpen.value = false;
  });
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
  if (unsubscribeAuth) unsubscribeAuth();
});

async function login() {
  try {
    await signInWithPopup(auth, provider);

    // ✅ instant navigation after login
    router.replace("/dashboard");
  } catch (e) {
    console.error("Login error:", e);
  }
}

async function logout() {
  try {
    await signOut(auth);
    isMenuOpen.value = false;

    // ✅ instant navigation after logout
    router.replace("/");
  } catch (e) {
    console.error("Logout error:", e);
  }
}

function toggleMenu(event) {
  event.stopPropagation();
  isMenuOpen.value = !isMenuOpen.value;
}

function goTo(path) {
  isMenuOpen.value = false;
  router.push(path);
}

function goToSavedPharmacy() {
  isMenuOpen.value = false;
  router.push({
    path: "/settings",
    query: { section: "savedPharmacy" },
  });
}
</script>

<template>
  <div class="auth-bar">
    <!-- NOT LOGGED IN -->
    <button v-if="!user" class="login-btn" @click="login">Log In</button>

    <!-- LOGGED IN -->
    <div v-else class="user-menu" ref="menuRef">
      <button class="avatar-btn" @click="toggleMenu">
        <span class="avatar-icon">👤</span>
      </button>

      <transition name="fade">
        <div v-if="isMenuOpen" class="user-menu-dropdown">
          <div class="menu-header">
            <div class="user-name">{{ user.displayName || "Logged in" }}</div>
            <div class="user-email">{{ user.email }}</div>
          </div>

          <button class="menu-item" @click="goToSavedPharmacy">
            Saved Pharmacy Info
          </button>

          <button class="menu-item" @click="goTo('/stocks')">View Inventory</button>
          <button class="menu-item" @click="goTo('/settings')">Settings</button>

          <button class="menu-item logout" @click="logout">Log Out</button>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.auth-bar {
  display: flex;
  align-items: center;
}

/* login button */
.login-btn {
  background-color: var(--color-card, #ffffff);
  cursor: pointer;
  font-size: 16px;
  color: var(--color-text, #111827);
  border-radius: 2rem;
  padding: 0.5rem 1.2rem;
  border: 1px solid var(--color-border, #e5e7eb);
}
.login-btn:hover {
  color: var(--color-primary, #2563eb);
}

/* avatar + menu */
.user-menu {
  position: relative;
  display: inline-block;
}

.avatar-btn {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: none;
  background: var(--color-card, #ffffff);
  box-shadow: var(--shadow-soft, 0 2px 6px rgba(0, 0, 0, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.avatar-btn:hover {
  box-shadow: var(--shadow-elevated, 0 4px 12px rgba(0, 0, 0, 0.18));
}

.avatar-icon {
  font-size: 18px;
  color: var(--color-text, #111827);
}

/* dropdown */
.user-menu-dropdown {
  position: absolute;
  top: 110%;
  right: 0;
  min-width: 210px;
  max-width: min(260px, 90vw);
  background: var(--color-card, #ffffff);
  border-radius: 10px;
  box-shadow: var(--shadow-elevated, 0 8px 20px rgba(15, 23, 42, 0.25));
  overflow: hidden;
  z-index: 20;
}

.menu-header {
  padding: 8px 14px;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-card-strong, var(--color-card, #ffffff));
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #111827);
  word-break: break-word;
}

.user-email {
  font-size: 12px;
  color: var(--color-text-subtle, #6b7280);
  word-break: break-word;
}

/* menu items */
.menu-item {
  width: 100%;
  padding: 8px 14px;
  text-align: left;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--color-text, #111827);
  cursor: pointer;
  white-space: nowrap;
}

.menu-item + .menu-item {
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.menu-item:hover {
  background: var(--color-primary-hover, #788f7e);
  color: var(--color-on-primary, #ffffff);
}

.logout {
  color: var(--color-danger, #ef4444);
}

/* fade animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 120ms ease-out, transform 120ms ease-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* --- small screen tweaks --- */
@media (max-width: 600px) {
  .avatar-btn {
    width: 40px;
    height: 40px;
  }
  .user-menu-dropdown {
    right: 0;
    max-width: 92vw;
  }
  .menu-item {
    white-space: normal;
  }
}
</style>
