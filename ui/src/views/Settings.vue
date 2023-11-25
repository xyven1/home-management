<template>
  <VContainer class="fill-height flex-column align-stretch justify-end">
    <VRow class="flex-grow-0" justify="center">
      <VCol>
        <VCard title="Tools">
          <VCardText align="center">
            <VBtn
              v-for="(tool, i) of externalTools"
              :key="i"
              variant="tonal"
              :to="`/redirect/${tool.host}`"
              size="large"
              class="ma-2"
              color="secondary"
            >
              <template #prepend>
                <VIcon size="x-large">
                  {{ tool.icon }}
                </VIcon>
              </template>
              {{ tool.name }}
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
    <VRow class="flex-grow-0" justify="center">
      <VCol>
        <VCard title="Debug">
          <VCardText>
            <p v-for="(message, i) in debug" :key="i">
              {{ message }}
            </p>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
    <VRow class="flex-grow-0" justify="center">
      <VCol>
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
import {
mdiAlphaUCircle,
mdiMonitorDashboard,
mdiPlex,
mdiRouterNetwork,
} from "@mdi/js";
import { storeToRefs } from "pinia";
import { Ref, ref } from "vue";

const { debug } = storeToRefs(useAppStore());
type ExternalTool = {
  name: string;
  icon: string;
  host: string;
};
const externalTools: Ref<ExternalTool[]> = ref([
  {
    name: "Router",
    icon: mdiRouterNetwork,
    host: "router",
  },
  {
    name: "Plex",
    icon: mdiPlex,
    host: "plex.ockham",
  },
  {
    name: "Unifi",
    icon: mdiAlphaUCircle,
    host: "unifi.ockham",
  },
  {
    name: "Monitor",
    icon: mdiMonitorDashboard,
    host: "monitor.ockham",
  },
]);
</script>
