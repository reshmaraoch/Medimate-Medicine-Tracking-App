import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import TestView from '../views/TestView.vue'
import FunView from '../views/FunView.vue'
import AddMedicine from '@/views/AddMedicine.vue'

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
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },    
    {
      path: '/add_medicine',
      name: 'AddMedicine',
      component: AddMedicine,
    },
    {
       path: "/edit-medicine/:id",
       name: "EditMedicine",
       component: () => import("@/views/EditMedicine.vue"),
       props: true
    },
    {
      path: "/view-meds",
      name: "ViewMedications",
      component: () => import("../views/ViewMedications.vue")
    }
  ],
})

export default router
