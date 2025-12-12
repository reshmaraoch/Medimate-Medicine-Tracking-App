import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import TestView from '../views/TestView.vue'
import FunView from '../views/FunView.vue'
import AddMedicine from '@/views/AddMedicine.vue'
import StocksView from '@/views/StocksView.vue'
import AchievementsView from '@/views/AchievementsView.vue'
import SavedPharmacyInfo from '@/views/SavedPharmacyInfo.vue'
import { getAuth } from "firebase/auth";
import { needsNotificationPrompt } from "@/composables/useNotifications";
import { useNotifications } from "@/composables/useNotifications";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/fun',
      name: 'fun',
      component: FunView,
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/test',
      name: 'test',
      component: TestView,
    },
    {
      path: '/test/:id',
      name: 'test_w_id',
      component: TestView,
    },
    {
      path: "/profile",
      name: "Profile and Preferences",
      component: () => import("../views/ProfileView.vue")
    },    
    {
      path: '/add_medicine',
      name: 'AddMedicine',
      component: AddMedicine,
    },
    {
       path: "/edit-medicine/:id",
       name: "EditMedicine",
       component: () => import("../views/EditMedicine.vue"),
       props: true
    },
    {
      path: "/view-meds",
      name: "ViewMedications",
      component: () => import("../views/ViewMedications.vue")
    },
    {
      path: "/stocks",
      name: "StocksView",
      component: StocksView,
    }, 
    {
      path: "/achievements",
      name: "AchievementsView",
      component: AchievementsView,
    },
    {
      path: "/saved-pharmacy-info",
      name: "SavedPharmacyInfo",
      component: SavedPharmacyInfo,
    }
  ],
})

router.beforeEach((to, from, next) => {
  const user = getAuth().currentUser;

  if (user) {
    const { shouldAskPermission } = useNotifications();

    if (shouldAskPermission()) {
      needsNotificationPrompt.value = true;
    }
  }

  next();
});

export default router
