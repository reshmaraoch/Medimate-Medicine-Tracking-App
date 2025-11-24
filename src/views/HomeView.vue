<template>
  <main class="landing-container">
    <!-- Hero -->
    <section class="hero">
      <h1 class="hero-title">Track Your Medication Effortlessly</h1>
      <p class="hero-subtitle">
        Medimate helps you stay on track with doses, refills, and inventory — all in one clean, simple interface.
      </p>

      <button class="cta-button" @click="$router.push('/add_medicine')">
        Get Started
      </button>
    </section>

    <!-- Feature Section -->
    <section class="features">
      <div class="feature-card">
        <h3>Automatic Refill Tracking</h3>
        <p>Know exactly when your stock runs out and get refill reminders before it’s too late.</p>
      </div>

      <div class="feature-card">
        <h3>Smart Dose Logging</h3>
        <p>Easily mark doses as taken, snoozed, or skipped — your daily checklist stays clear.</p>
      </div>

      <div class="feature-card">
        <h3>OCR Prescription Scanner</h3>
        <p>Snap a picture of your prescription and auto-fill your medication details.</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.landing-container {
  padding: 60px 20px;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.hero {
  margin-bottom: 60px;
}

.hero-title {
  font-size: 40px;
  font-weight: 700;
  color: var(--color-text);
}

.hero-subtitle {
  max-width: 600px;
  margin: 15px auto 35px;
  font-size: 18px;
  color: var(--color-subtle-text);
}

.cta-button {
  background: var(--color-primary);
  padding: 14px 32px;
  border: none;
  color: white;
  border-radius: var(--radius-pill);
  font-size: 18px;
  cursor: pointer;
  box-shadow: var(--shadow-soft);
}
.cta-button:hover {
  background: var(--color-primary-hover);
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}

.feature-card {
  background: var(--color-card);
  padding: 24px;
  text-align: left;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.feature-card h3 {
  color: var(--color-text);
  margin-bottom: 8px;
}
.feature-card p {
  color: var(--color-subtle-text);
  font-size: 15px;
}
</style>
