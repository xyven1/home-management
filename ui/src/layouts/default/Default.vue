<template>
  <v-app>
    <bottom-bar />
    <default-view />
  </v-app>
</template>

<script lang="ts" setup>
import BottomBar from "./BottomBar.vue";
import DefaultView from "./View.vue";
</script>

<style>
html {
  overflow: auto;
}
html,
body,
#app {
  height: 100%;
}
</style>
