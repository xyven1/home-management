<template>
  <VContainer class="fill-height flex-column align-stretch justify-end">
    <VRow class="flex-grow-0" justify="center">
      <VCol style="max-width: 300px">
        <VCard
          title="TV Control"
          :loading="movingTV"
          class=""
          max-width="300px"
        >
          <template #actions>
            <VBtn
              color="primary"
              variant="tonal"
              class="flex-grow-1"
              :disabled="movingTV"
              @click="setTVPosition(TVPosition.Up)"
            >
              Up
            </VBtn>
            <VBtn
              color="primary"
              variant="tonal"
              class="flex-grow-1"
              :disabled="movingTV"
              @click="setTVPosition(TVPosition.Down)"
            >
              Down
            </VBtn>
          </template>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import { useAppStore } from "@/store/app";
import { TVPosition } from "@home-management/lib/types/socket.ts";
import { ref } from "vue";

const { socket } = useAppStore();
const movingTV = ref(false);

const setTVPosition = async (position: TVPosition) => {
  movingTV.value = true;
  await socket.emitWithAck("setTVPosition", position);
  movingTV.value = false;
};
</script>
