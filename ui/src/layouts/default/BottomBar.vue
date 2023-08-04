<template>
  <VBottomNavigation
    color="primary" :rounded="30" :height="56 + safeAreaBottom" class="ios" grow
  >
    <VBtn to="/lights">
      <VIcon size="x-large">
        mdi-lightbulb
      </VIcon>
      <span v-if="!xs">Lights</span>
    </VBtn>
    <VBtn to="/entertainment">
      <VIcon size="x-large">
        mdi-speaker
      </VIcon>
      <span v-if="!xs">Entertainment</span>
    </VBtn>
    <VBtn to="/irrigation">
      <VIcon size="x-large">
        mdi-water
      </VIcon>
      <span v-if="!xs">Irrigation</span>
    </VBtn>
    <VBtn to="/settings">
      <VIcon size="x-large">
        mdi-cog
      </VIcon>
      <span v-if="!xs">Setting</span>
    </VBtn>
  </VBottomNavigation>
</template>
<script lang="ts" setup>
import { useDisplay } from 'vuetify/lib/framework.mjs';
const { platform, xs } = useDisplay();
const safeAreaBottom = platform.value.ios ? 10 : 0;
const safeAreaInsertTop = getComputedStyle(document.documentElement).getPropertyValue("--sat");
const safeAreaInsertRight = getComputedStyle(document.documentElement).getPropertyValue("--sar");
const safeAreaInsertBottom = getComputedStyle(document.documentElement).getPropertyValue("--sab");
const safeAreaInsertLeft = getComputedStyle(document.documentElement).getPropertyValue("--sal");
console.log(safeAreaInsertTop, safeAreaInsertRight, safeAreaInsertBottom, safeAreaInsertLeft);
</script>
<style>
.ios {
  .v-btn {
    padding-bottom: v-bind('safeAreaBottom+"px"');
    min-width: 70px !important;
  }
}
</style>