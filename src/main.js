import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import { io } from 'socket.io-client'

loadFonts()

const app = createApp(App)

app.use(vuetify)
app.config.globalProperties.$socket = io(`http://10.200.10.23:${process.env.NODE_ENV === 'development' ? '3001' : '43434'}`)

app.mount('#app')