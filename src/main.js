import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import './registerServiceWorker'
import { io } from 'socket.io-client';
import { createRouter, createWebHistory  } from 'vue-router';

import Home from './pages/Home.vue'
import Lights from './pages/Lights.vue';
import Audio from './pages/Audio.vue';

loadFonts()
const routes = [
  { path: '/', component: Home },
  { path: '/lights', component: Lights },
  { path: '/audio', component: Audio },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const app = createApp(App)

app.use(vuetify)
app.use(router)
app.config.globalProperties.$socket = io("http://10.200.10.23:3001")

app.mount('#app')
