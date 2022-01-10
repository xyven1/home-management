<template>
  <v-app>
    <v-bottom-navigation app absolute>
      <router-link to="/">
        <v-icon>mdi-home</v-icon>
      </router-link>
      <router-link to="/lights">
        <v-icon>mdi-lightbulb</v-icon>
      </router-link>  
      <router-link to="/audio">
        <v-icon>mdi-audio</v-icon>
      </router-link>
    </v-bottom-navigation>
    <v-main fluid>
      <router-view/>
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'App',
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