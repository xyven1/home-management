<template>
  <VContainer class="fill-height flex-column align-stretch justify-end">
    <VRow class="flex-grow-0" justify="center">
      <VCol>
        <VCard title="Debug 2">
          <VCardText>
            <p v-for="(message, i) in debug" :key="i">
              {{ message }}
            </p>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
    <VRow class="flex-grow-0" justify="center">
      <VCol style="max-width: 500px;">
        <VCard title="Appearance">
          <VCardText>
            <ThemeToggle />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
<script setup lang="ts">
import ThemeToggle from "@/components/ThemeToggle.vue";
import { useAppStore } from "@/store/app";
import { storeToRefs } from "pinia";

const { debug } = storeToRefs(useAppStore());
</script>