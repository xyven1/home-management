/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Components
import App from "./App.vue";

// Composables
import { createApp } from "vue";

// Plugins
import { registerPlugins } from "@/plugins";

// Service Worker
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

const app = createApp(App);

registerPlugins(app);

app.mount("#app");
