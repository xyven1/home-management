<template>
  <v-app>
    <v-bottom-navigation app>
      <v-btn v-for="route in routes" @click="currentTab = route.name" size="x-large" :color="currentTab == route.name ? 'primary' : ''">
        <v-icon :icon="route.icon"/>
      </v-btn>
    </v-bottom-navigation>
    <v-main fluid style="max-height: 100%">
      <keep-alive>
        <component :is="currentTab"></component>
      </keep-alive>
    </v-main>
  </v-app>
</template>

<script>
import { mdiHome, mdiLightbulb, mdiSpeakerWireless} from '@mdi/js'
import Home from './pages/Home.vue'
import Lights from './pages/Lights.vue';
import Audio from './pages/Audio.vue';

export default {
  name: 'App',
  components: {
    Home,
    Lights,
    Audio
  },
  data () {
    return {
      currentTab: 'Home',
      routes: [
        {
          name: 'Home',
          icon: mdiHome
        },
        {
          name: 'Lights',
          icon: mdiLightbulb
        },
        {
          name: 'Audio',
          icon: mdiSpeakerWireless
        }
      ],
    }
  },
  mounted(){
    var vm = this
    vm.currentTab = localStorage.getItem('currentTab') || 'Home'
  },
  watch: {
    currentTab(tab){
      localStorage.setItem('currentTab', tab)
    }
  }
}
</script>

<style>
html, body, #app{
  overflow: hidden;
  font-family: 'Nunito', sans-serif !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>