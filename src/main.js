import "./assets/style/base.css";
import "leaflet/dist/leaflet.css";
import "primeicons/primeicons.css";

import { createApp } from "vue";
import { VueFire, VueFireAuth } from "vuefire";
import App from "./App.vue";
import router from "./router";
import { firebaseApp } from "./firebase_conf";

import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";
import ToastService from "primevue/toastservice";

const app = createApp(App);

app.use(VueFire, {
  firebaseApp,
  modules: [VueFireAuth()],
});

app.use(router);

app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
  zIndex: {
    modal: 1100,
    overlay: 1000,
    menu: 1000,
    tooltip: 1100,
  },
});

app.use(ToastService);

app.mount("#app");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then(() => console.log("Service Worker registered"))
    .catch((err) => console.error("Service Worker failed", err));
}
