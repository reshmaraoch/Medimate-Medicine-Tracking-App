<template>
  <main class="nf">
    <section class="card">
      <div class="badge">404</div>
      <h1>Page not found</h1>
      <p>The page you’re trying to open doesn’t exist or the link is broken.</p>

      <div class="actions">
        <button class="btn" @click="goHome">Go to Home</button>

        <!-- Go Back should ONLY go back (no home fallback) -->
        <button class="btn ghost" :disabled="!canGoBack" @click="goBack">
          Go Back
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const router = useRouter();
const auth = getAuth();

const isLoggedIn = ref(!!auth.currentUser);
const canGoBack = ref(false);

let unsub = null;

onMounted(() => {
  // Keep auth reactive so "Go to Home" always goes to the right place
  unsub = onAuthStateChanged(auth, (u) => {
    isLoggedIn.value = !!u;
  });

  // If user typed URL directly, history might be 1 → disable Go Back
  canGoBack.value = window.history.length > 1;
});

onBeforeUnmount(() => {
  if (unsub) unsub();
});

function goHome() {
  router.push(isLoggedIn.value ? "/dashboard" : "/");
}

function goBack() {
  // Do NOT fallback to home; only go back if possible
  if (canGoBack.value) router.back();
}
</script>

<style scoped>
.nf {
  min-height: calc(100vh - 120px);
  display: grid;
  place-items: center;
  padding: 28px 16px;
}

.card {
  width: min(560px, 100%);
  background: var(--color-card, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 18px;
  box-shadow: var(--shadow-elevated, 0 8px 20px rgba(15, 23, 42, 0.12));
  padding: 26px 22px;
  text-align: left;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--color-primary-hover, rgba(37, 99, 235, 0.12));
  color: var(--color-primary, #2563eb);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.3px;
}

h1 {
  margin: 12px 0 8px;
  font-size: 24px;
  line-height: 1.2;
  color: var(--color-text, #111827);
}

p {
  margin: 0;
  color: var(--color-text-subtle, #6b7280);
  font-size: 14px;
  line-height: 1.55;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
  flex-wrap: wrap;
}

.btn {
  border: 1px solid transparent;
  background: var(--color-primary, #2563eb);
  color: var(--color-on-primary, #ffffff);
  padding: 10px 14px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-soft, 0 2px 6px rgba(0, 0, 0, 0.08));
}

.btn:hover {
  filter: brightness(1.03);
}

.btn.ghost {
  background: transparent;
  border-color: var(--color-border, #e5e7eb);
  color: var(--color-text, #111827);
  box-shadow: none;
}

.btn.ghost:hover {
  background: rgba(148, 163, 184, 0.14);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 420px) {
  .card {
    padding: 22px 18px;
  }
  h1 {
    font-size: 22px;
  }
}
</style>
