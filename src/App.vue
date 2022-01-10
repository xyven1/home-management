<template>
  <v-app>
    <v-bottom-navigation app absolute>
      <v-btn v-for="route in routes" :to="route.path" size="x-large">
        <v-icon>{{ route.icon }}</v-icon>
      </v-btn>
    </v-bottom-navigation>
    <v-main fluid>
      <router-view/>
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'App',
  data () {
    return {
      routes: [
        {
          path: '/',
          name: 'Home',
          icon: 'mdi-home',
        },
        {
          path: '/lights',
          name: 'Lights',
          icon: 'mdi-lightbulb',
        },
        {
          path: '/audio',
          name: 'Audio',
          icon: 'mdi-speaker-wireless',
        }
      ]
    }
  },
}
</script>

<style>
html, body, #app{
  overflow: hidden;
  font-family: 'Raleway', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>