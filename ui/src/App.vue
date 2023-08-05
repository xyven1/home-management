<template>
  <router-view />
</template>

<script lang="ts" setup>
import { useThemeStore } from "@/store/theme";

useThemeStore();
</script>
