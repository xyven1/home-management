<template>
  <VBottomNavigation
    color="primary" :rounded="30" :height="56 + safeAreaBottom" class="ios" grow
  >
    <VBtn to="/lights">
      <VIcon size="x-large">
        {{ mdiLightbulb }}
      </VIcon>
      <span v-if="!xs">Lights</span>
    </VBtn>
    <VBtn to="/entertainment">
      <VIcon size="x-large">
        {{ mdiSpeaker }}
      </VIcon>
      <span v-if="!xs">Entertainment</span>
    </VBtn>
    <VBtn to="/irrigation">
      <VIcon size="x-large">
        {{ mdiWater }}
      </VIcon>
      <span v-if="!xs">Irrigation</span>
    </VBtn>
    <VBtn to="/settings">
      <VIcon size="x-large">
        {{ mdiCog }}
      </VIcon>
      <span v-if="!xs">Setting</span>
    </VBtn>
  </VBottomNavigation>
</template>
<script lang="ts" setup>
import { mdiCog, mdiLightbulb, mdiSpeaker, mdiWater } from '@mdi/js';
import { useDisplay } from 'vuetify/lib/framework.mjs';
const { platform, xs } = useDisplay();
const safeAreaBottom = platform.value.ios ? 10 : 0;
</script>
<style lang="scss">
.ios {
  .v-btn {
    padding-bottom: v-bind('safeAreaBottom+"px"');
    min-width: 60px !important;
  }
}
</style>