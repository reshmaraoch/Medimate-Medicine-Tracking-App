<script setup>
import Navbar from "@/components/NavbarComp.vue";
import Footer from "@/components/FooterComp.vue";
</script>

<template>
  <Navbar />
  <main class="page-wrapper">
    <slot />
  </main>
  <Footer />
</template>

<style>
.page-wrapper {
  min-height: 70vh;
}
</style>
