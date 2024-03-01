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
              :to="`/redirect/${tool.fqdn}`"
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
  fqdn: string;
};

const domain = location.hostname.split(".").slice(-2).join(".");
const externalTools: Ref<ExternalTool[]> = ref([
  {
    name: "Router",
    icon: mdiRouterNetwork,
    fqdn: `router.${domain}`
  },
  {
    name: "Plex",
    icon: mdiPlex,
    fqdn: `plex.ockham.${domain}`
  },
  {
    name: "Unifi",
    icon: mdiAlphaUCircle,
    fqdn: `unifi.ockham.${domain}`
  },
  {
    name: "Monitor",
    icon: mdiMonitorDashboard,
    fqdn: `monitor.ockham.${domain}`
  },
]);
</script>
