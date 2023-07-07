<template>
  <v-switch
    v-model="darkMode"
    true-icon="mdi-weather-sunny"
    false-icon="mdi-weather-night"
    inset
  />
</template>
<script lang="ts" setup>
import { computed } from "vue";
import { useTheme } from "vuetify";

const theme = useTheme();

const darkMode = computed({
  get() {
    return theme.global.name.value === "dark";
  },
  set(value) {
    theme.global.name.value = value ? "dark" : "light";
  },
});
</script>
