<template>
  <v-app>
    <v-bottom-navigation app absolute>
      <v-btn v-for="route in routes" :to="route.path" size="x-large">
        <v-icon :icon="route.icon"/>
      </v-btn>
    </v-bottom-navigation>
    <v-main fluid>
      <router-view/>
    </v-main>
  </v-app>
</template>

<script>
import { mdiHome, mdiLightbulb, mdiSpeakerWireless} from '@mdi/js'
export default {
  name: 'App',
  data () {
    return {
      routes: [
        {
          path: '/',
          name: 'Home',
          icon: mdiHome,
        },
        {
          path: '/lights',
          name: 'Lights',
          icon: mdiLightbulb,
        },
        {
          path: '/audio',
          name: 'Audio',
          icon: mdiSpeakerWireless,
        }
      ]
    }
  },
}
</script>

<style>
html, body, #app{
  overflow: hidden;
  font-family: 'Nunito', sans-serif !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>