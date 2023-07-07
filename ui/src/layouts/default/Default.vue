<template>
  <v-app style="height: 100%">
    <bottom-bar />
    <default-view />
  </v-app>
</template>

<script lang="ts" setup>
import BottomBar from "./BottomBar.vue";
import DefaultView from "./View.vue";
</script>

<style>
html,
body,
#app {
  overflow: hidden !important;
  height: 100%;
}
</style>
