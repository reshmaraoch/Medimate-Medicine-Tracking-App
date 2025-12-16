import { createRouter, createWebHistory } from "vue-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import HomeView from "../views/HomeView.vue";
import AddMedicine from "@/views/AddMedicine.vue";
import StocksView from "@/views/StocksView.vue";

import { needsNotificationPrompt } from "@/composables/useNotifications";
import { useNotifications } from "@/composables/useNotifications";

const auth = getAuth();

/* -------------------------------
   Wait for Firebase auth restore
-------------------------------- */
let authReady = false;
const waitForAuth = () =>
  new Promise((resolve) => {
    if (authReady) return resolve();
    const unsub = onAuthStateChanged(auth, () => {
      authReady = true;
      unsub();
      resolve();
    });
  });

/* -------------------------------
   Only ask notifications once
-------------------------------- */
let checkedNotificationsThisSession = false;

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Splash (only meaningful for guests; logged-in users get redirected to dashboard)
    {
      path: "/",
      name: "Splash",
      component: HomeView,
      meta: { guestOnly: true },
    },

    // Protected pages
    {
      path: "/dashboard",
      name: "Dashboard",
      component: () => import("@/views/Dashboard.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/add_medicine",
      name: "AddMedicine",
      component: AddMedicine,
      meta: { requiresAuth: true },
    },
    {
      path: "/edit-medicine/:id",
      name: "EditMedicine",
      // component: () => import("@/views/EditMedicine.vue"),
      component: AddMedicine,
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: "/view-meds",
      name: "ViewMedications",
      component: () => import("../views/ViewMedications.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/settings",
      name: "Settings",
      component: () => import("../views/SettingsView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/stocks",
      name: "StocksView",
      component: StocksView,
      meta: { requiresAuth: true },
    },

    // 404 (for everyone)
    {
      path: "/:pathMatch(.*)*",
      name: "NotFound",
      component: () => import("@/views/NotFound.vue"),
    },
  ],
});

router.beforeEach(async (to) => {
  await waitForAuth();

  const isLoggedIn = !!auth.currentUser;

  // ✅ Logged-in users should not be on splash
  // (ONLY redirect from "/"; do NOT redirect unknown routes)
  if (to.path === "/" && isLoggedIn) {
    return "/dashboard";
  }

  // ✅ Logged-out users typing protected routes should see 404 (URL stays as typed)
  if (to.meta.requiresAuth && !isLoggedIn) {
    needsNotificationPrompt.value = false;
    checkedNotificationsThisSession = false;

    return {
      name: "NotFound",
      params: { pathMatch: to.path.slice(1).split("/") },
      query: to.query,
      hash: to.hash,
    };
  }

  // ✅ Notifications prompt logic (once per session, only when logged in)
  if (isLoggedIn && !checkedNotificationsThisSession) {
    checkedNotificationsThisSession = true;
    try {
      const { shouldAskPermission } = useNotifications();
      needsNotificationPrompt.value = !!shouldAskPermission();
    } catch (e) {
      console.warn("Notification prompt check failed:", e);
    }
  }

  return true;
});

export default router;
