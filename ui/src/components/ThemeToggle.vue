<template>
  <v-switch
    v-model="darkMode"
    true-icon="mdi-weather-sunny"
    false-icon="mdi-weather-night"
    inset
  />
</template>
<script lang="ts" setup>
import { usePersistStore } from "@/store/persist";
import { storeToRefs } from "pinia";

const { darkMode } = storeToRefs(usePersistStore());
</script>
