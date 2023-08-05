<template>
  <v-switch
    v-model="darkMode"
    true-icon="mdi-weather-sunny"
    false-icon="mdi-weather-night"
    inset
  />
</template>
<script lang="ts" setup>
import { useThemeStore } from "@/store/theme";
import { storeToRefs } from "pinia";

const { darkMode } = storeToRefs(useThemeStore());
</script>
