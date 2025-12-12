<script setup>
import Navbar from "@/components/NavbarComp.vue";
import Footer from "@/components/FooterComp.vue";
import { needsNotificationPrompt } from "@/composables/useNotifications";
import { useNotifications } from "@/composables/useNotifications";

const { askPermission } = useNotifications();

function enableNotifications() {
  askPermission(); // only called by user click
}
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