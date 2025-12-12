<script setup>
import { RouterView } from "vue-router";
import NavbarComp from "@/components/NavbarComp.vue";
import FooterComp from "@/components/FooterComp.vue";

import { useNotifications, needsNotificationPrompt } from "@/composables/useNotifications";
const { askPermission } = useNotifications();

function enableNotifications() {
  needsNotificationPrompt.value = false;
  askPermission();
}
</script>

<template>
  <div>
    <!-- Global Notification Prompt -->
    <div 
      v-if="needsNotificationPrompt" 
      class="notif-banner"
    >
      <p>🔔 Enable notifications to get medication reminders.</p>
      <button @click="enableNotifications">Enable</button>
    </div>

    <NavbarComp />
    <main>
      <RouterView />
    </main>
    <FooterComp />
  </div>
</template>

<style scoped>
.notif-banner {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  z-index: 9999;

  background: #2563eb;
  color: white;
  padding: 14px 18px;

  display: flex;
  justify-content: space-between;
  align-items: center;

  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.notif-banner button {
  background: white;
  color: #2563eb;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
}
</style>
