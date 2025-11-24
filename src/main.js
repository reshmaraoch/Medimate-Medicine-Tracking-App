import "./assets/style/base.css";


import { createApp } from 'vue'
import { VueFire, VueFireAuth } from 'vuefire'
import App from './App.vue'
import router from './router'
import { firebaseApp } from './firebase_conf'

const app = createApp(App)
app.use(VueFire, {
  // imported above but could also just be created here
  firebaseApp,
  modules: [
    // we will see other modules later on
    VueFireAuth(),
  ],
})
app.use(router)

app.mount('#app')
