<script setup>
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import NavbarComp from "@/components/NavbarComp.vue";
import FooterComp from "@/components/FooterComp.vue";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import { registerToast } from "@/services/toastBus";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNotifications, needsNotificationPrompt } from "@/composables/useNotifications";

const { askPermission, checkTokenStatus, initPermissionListener } = useNotifications();
const auth = getAuth();
const toast = useToast();

onMounted(() => {
  registerToast(toast);

  // 1. Start listening for manual browser setting changes (Lock Icon)
  initPermissionListener(); 

  // 2. Initial Status Check
  if (auth.currentUser) checkTokenStatus();

  // 3. Re-check on login
  onAuthStateChanged(auth, (user) => {
    if (user) checkTokenStatus();
  });
});

// --- BUTTONS ---
function enableNotifications() {
  askPermission();
}

function ignoreNotifications() {
  needsNotificationPrompt.value = false;
}
</script>

<template>
  <div class="app-container">
    <Toast position="top-right" :baseZIndex="30000" class="app-toast" />
    
    <div v-if="needsNotificationPrompt" class="notif-banner">
      <div class="notif-content">
        <span class="notif-icon">🔔</span>
        <p>Enable notifications to get medication reminders?</p>
      </div>
      
      <div class="notif-actions">
        <button @click="ignoreNotifications" class="btn-ignore">Ignore</button>
        <button @click="enableNotifications" class="btn-enable">Enable</button>
      </div>
    </div>

    <NavbarComp />
    <main>
      <RouterView />
    </main>
    <FooterComp />
  </div>
</template>

<style scoped>
/* Same styles as before */
.app-container { display: flex; flex-direction: column; min-height: 100vh; }
main { flex: 1; }
.notif-banner {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 9999;
  width: 90%; max-width: 450px; background-color: #1e293b; color: #f8fafc;
  padding: 16px 20px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);
  border: 1px solid #334155; display: flex; flex-direction: column; gap: 12px;
  animation: slideUp 0.4s ease-out;
}
.notif-content { display: flex; align-items: center; gap: 12px; }
.notif-icon { font-size: 1.2rem; }
.notif-content p { margin: 0; font-size: 0.95rem; font-weight: 500; }
.notif-actions { display: flex; justify-content: flex-end; gap: 10px; }
button { padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; }
.btn-ignore { background: transparent; color: #94a3b8; }
.btn-enable { background: #6f8b74; color: white; }
@keyframes slideUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
@media (min-width: 640px) { .notif-banner { flex-direction: row; justify-content: space-between; } }
</style>