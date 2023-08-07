<template>
  <VMain :class="$router.currentRoute.value.meta.fixedHeight ? 'fill-height': ''">
    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
    <VSnackbar :model-value="!connected" location="top" color="error" :timeout="0" @update:model-value="() => {}">
      <VIcon :icon="mdiLanDisconnect" />
      Disconnected
    </VSnackbar>
  </VMain>
</template>
<script lang="ts" setup>
import { useAppStore } from '@/store/app';
import { mdiLanDisconnect } from '@mdi/js';
import { storeToRefs } from 'pinia';
const { connected } = storeToRefs(useAppStore());
</script>