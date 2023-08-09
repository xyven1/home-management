<template>
  <VMain :class="$router.currentRoute.value.meta.fixedHeight ? 'fill-height': ''">
    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
    <VSnackbar :model-value="!connected" location="top" color="error" :timeout="0" class="d-flex" @update:model-value="() => {}">
      <VIcon :icon="mdiLanDisconnect" />
      Disconnected
      <template #actions>
        <VBtn @click="refresh">
          Refresh
        </VBtn>
      </template>
    </VSnackbar>
    <VSnackbar :model-value="needRefresh" location="top" color="warning" :timeout="0" class="d-flex" @update:model-value="() => {}">
      <VIcon :icon="mdiLanDisconnect" />
      Please refresh
      <template #actions>
        <VBtn @click="refresh">
          Refresh
        </VBtn>
      </template>
    </VSnackbar>
  </VMain>
</template>
<script lang="ts" setup>
import { useAppStore } from '@/store/app';
import { mdiLanDisconnect } from '@mdi/js';
import { storeToRefs } from 'pinia';
import { useRegisterSW } from 'virtual:pwa-register/vue';
const { connected } = storeToRefs(useAppStore());
const { needRefresh } = useRegisterSW();
const refresh = () => location.reload();
</script>