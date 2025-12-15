<template>
  <main class="landing">
    <!-- HERO -->
    <section class="hero">
      <h1 class="hero-title">Track Your Medication Effortlessly</h1>
      <p class="hero-subtitle">Stay on track with doses, refills, and inventory.</p>

      <div class="hero-actions">
        <button class="cta" @click="handleGetStarted" :disabled="loading">
          <span v-if="!loading">Get Started</span>
          <span v-else>Signing in…</span>
        </button>

        <button class="cta ghost" @click="scrollToFeatures">See Features</button>
      </div>
    </section>

    <!-- ✅ FEATURES in gradient container -->
    <section class="features-shell" ref="featuresRef">
      <section class="features">
        <h2 class="section-title">Things you can do with MediMate</h2>
        <p class="section-subtitle">
          Onestop for everything you need to stay consistent without feeling overwhelmed.
        </p>

        <div class="cards">
          <article class="card">
            <div class="icon">🧾</div>
            <h3>Automatic Refill Tracking</h3>
            <p>
              Know exactly when your stock runs out and get refill reminders before its too late.
            </p>
          </article>

          <article class="card">
            <div class="icon">✅</div>
            <h3>Smart Dose Logging</h3>
            <p>
              Mark doses as taken, snoozed, or skipped. Yup, your daily checklist stays clear.
            </p>
          </article>

          <article class="card">
            <div class="icon">📷</div>
            <h3>Prescription Scanner</h3>
            <p>Snap a picture of your prescription and auto-fill medication details.</p>
          </article>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseApp } from "@/firebase_conf";

const router = useRouter();
const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();

const loading = ref(false);
const featuresRef = ref(null);

async function handleGetStarted() {
  if (loading.value) return;

  if (auth.currentUser) {
    router.push("/dashboard");
    return;
  }

  loading.value = true;
  try {
    await signInWithPopup(auth, provider);
    router.replace("/dashboard");
  } catch (e) {
    const code = e?.code || "";
    const silent = new Set([
      "auth/popup-closed-by-user",
      "auth/cancelled-popup-request",
      "auth/popup-blocked",
    ]);
    if (!silent.has(code)) console.error("Login error:", e);
  } finally {
    loading.value = false;
  }
}

function scrollToFeatures() {
  featuresRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<style scoped>
.landing {
  max-width: 1100px; /* ✅ slightly wider so cards can grow */
  margin: 0 auto;
  padding: 52px 18px 80px;
}

/* HERO */
.hero {
  text-align: center;
  padding: 56px 18px 48px;
  border-radius: 22px;
  background: linear-gradient(
    180deg,
    rgba(221, 222, 221, 0.14),
    rgba(120, 143, 126, 0.04)
  );
  border: 1px solid var(--color-border, rgba(229, 231, 235, 0.9));
  box-shadow: var(--shadow-soft);
}

.hero-title {
  margin: 0 0 12px;
  font-size: clamp(32px, 4vw, 46px);
  line-height: 1.1;
  font-weight: 850;
  color: var(--color-text);
}

.hero-subtitle {
  max-width: 680px;
  margin: 0 auto 26px;
  font-size: 16px;
  line-height: 1.65;
  color: var(--color-subtle-text);
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
}

.cta {
  background: var(--color-primary);
  padding: 14px 28px;
  border: 1px solid transparent;
  color: var(--color-on-primary);
  border-radius: 999px;
  font-size: 16px;
  font-weight: 750;
  cursor: pointer;
  box-shadow: var(--shadow-soft);
  min-width: 170px;
}

.cta:hover {
  background: var(--color-primary-hover);
}

.cta:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.cta.ghost {
  background: transparent;
  color: var(--color-text);
  border-color: var(--color-border);
  box-shadow: none;
}

.cta.ghost:hover {
  background: rgba(148, 163, 184, 0.14);
}

/* ✅ FEATURES GRADIENT WRAPPER (same vibe as hero) */
.features-shell {
  margin-top: 40px;
  border-radius: 22px;
  padding: 44px 18px;
  background: linear-gradient(
    180deg,
    rgba(221, 222, 221, 0.14),
    rgba(120, 143, 126, 0.04)
  );
  border: 1px solid var(--color-border, rgba(229, 231, 235, 0.9));
  box-shadow: var(--shadow-soft);
}

/* FEATURES */
.features {
  text-align: center;
}

.section-title {
  margin: 0;
  font-size: 24px; /* ✅ slightly bigger */
  color: var(--color-text);
  font-weight: 850;
}

.section-subtitle {
  margin: 10px auto 26px;
  max-width: 760px;
  color: var(--color-subtle-text);
  line-height: 1.65;
  font-size: 14.5px;
}

/* ✅ more spacing + bigger cards */
.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px; /* ✅ more air */
  align-items: stretch;
}

.card {
  text-align: left;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 20px; /* ✅ slightly rounder */
  padding: 26px; /* ✅ bigger padding */
  box-shadow: var(--shadow-soft);
  min-height: 170px; /* ✅ more presence */
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-elevated);
}

.icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: rgba(120, 143, 126, 0.16);
  margin-bottom: 12px;
  font-size: 20px;
}

.card h3 {
  margin: 0 0 8px;
  color: var(--color-text);
  font-size: 17px;
  font-weight: 850;
}

.card p {
  margin: 0;
  color: var(--color-subtle-text);
  line-height: 1.65;
  font-size: 14.5px;
}

/* Responsive */
@media (max-width: 900px) {
  .cards {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .features-shell {
    padding: 34px 14px;
  }
}
</style>
