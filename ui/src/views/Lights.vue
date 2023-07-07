<template>
  <VAppBar>
    <VAppBarTitle>
      {{ svg?.[layer]?.name ?? "Loading" }}
    </VAppBarTitle>
    <VAppBarNavIcon>
      <ThemeToggle />
    </VAppBarNavIcon>
  </VAppBar>
  <VCarousel
    :items-to-show="1"
    v-model="layer"
    class="carousel"
    show-arrows
    hide-delimiter-background
  >
    <VCarouselItem v-for="layer in svg" :key="layer.name">
      <svg viewBox="0 0 295 515">
        <image
          v-if="layer.background !== undefined"
          width="295"
          height="515"
          x="0"
          y="0"
          :href="backgroundHREF(layer.background.name)"
        />
        <path
          v-for="(region, index) in layer.regions"
          :key="index"
          :d="region.d"
          @click="toggle(region.sn, region.sw)"
          style="cursor: pointer; stroke: transparent"
          :style="{
            fill: selecting
              ? region.sn
                ? '#FC8C00'
                : 'rgb(var(--v-theme-secondary))'
              : {
                  0: '#DDDDDD',
                  1: 'rgb(var(--v-theme-tertiary))',
                  2: 'rgb(var(--v-theme-info))',
                  Error: 'rgb(var(--v-theme-error))',
                }[region.sw?.state ?? 0] || 'rgb(var(--v-theme-secondary))',
            'stroke-width': region.stroke ?? 0,
          }"
        >
          <title>
            {{ region.title }}
          </title>
        </path>
      </svg>
    </VCarouselItem>
  </VCarousel>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import { useAppStore } from "@/store/app";
import { Svg, Region, Switch } from "@/../../types/socket";
import ThemeToggle from "@/components/ThemeToggle.vue";
const layer = ref(0);
const selecting = ref(false);
const { socket } = useAppStore();
const svg = ref<Svg | null>(null);

const getSwitch = async (r: Region) => {
  socket.emit("getSwitch", r.sn, (res) => {
    if (!res.ok) return console.error(res.err);
    r.sw = {
      name: res.value.name,
      serialNumber: res.value.serialNumber,
      state: Number(res.value.state),
    };
  });
};
const toggle = async (sn: string, sw?: Switch) => {
  if (!sw) return;
  sw.state = 2;
  const res = await socket.emitWithAck("toggleSwitch", sn);
  if (res.ok) sw!.state = res.value.BinaryState;
};
const backgroundHREF = (name: string): string => {
  const href = new URL(`../assets/${name}`, import.meta.url).href;
  return href;
};

socket.emit("getSvg", (res: Svg) => {
  svg.value = res;
  svg.value.forEach((l) =>
    l.regions.forEach((r) => {
      if (r.sn) getSwitch(r);
    }),
  );
});
</script>

<style lang="scss">
.carousel {
  height: 100% !important;

  svg {
    touch-action: none;
    height: 100%;
    max-width: 100% !important;
  }
}
</style>
