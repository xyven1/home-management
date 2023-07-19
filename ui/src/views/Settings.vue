<template>
  <VContainer class="fill-height flex-column align-stretch justify-end">
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
</script>