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
    ref="carousel" v-model="layer" :items-to-show="1"
    class="carousel" :show-arrows="smAndUp"
    hide-delimiter-background
  >
    <VCarouselItem v-for="svgLayer in svg " :key="svgLayer.name">
      <svg viewBox="0 0 295 515" width="100%">
        <image
          v-if="svgLayer.background !== undefined" width="295" height="515"
          x="0" y="0"
          :href="backgroundHREF(svgLayer.background.name)"
        />
        <defs
          v-for="(region, index) in svgLayer.regions.filter(r => r.sw?.brightness && !isNaN(r.sw.brightness))"
          :key="index"
        >
          <linearGradient
            :id="'gradient' + region.title.replace(' ', '')" x1="0%" y1="100%"
            x2="0%" y2="0%"
          >
            <stop :offset="region.sw!.brightness! + '%'" stop-color="rgb(var(--v-theme-tertiary))" />
            <stop
              :offset="region.sw!.brightness! + '%'"
              stop-color="color-mix(in oklab, rgb(var(--v-theme-surface-variant)), rgb(var(--v-theme-tertiary)))"
            />
          </linearGradient>
        </defs>
        <path
          v-for="(region, index) in svgLayer.regions " :key="index" :d="region.d"
          style="cursor: pointer; stroke: transparent" :style="{
            fill: selecting
              ? region.sn
                ? '#FC8C00'
                : 'rgb(var(--v-theme-secondary))'
              : {
                0: 'rgb(var(--v-theme-surface-variant))',
                1: region.sw?.brightness && !isNaN(region.sw.brightness) ? `url(#${'gradient' + region.title.replace(' ', '')})` : 'rgb(var(--v-theme-tertiary))',
                // 1: interpolateColor(theme.current.value.colors['surface-variant'],
                // theme.current.value.colors.tertiary, region.sw && region.sw.brightness ? (+region.sw.brightness) / 100 : 1),
                2: 'rgb(var(--v-theme-info))',
                Error: 'rgb(var(--v-theme-error))',
              }[region.sw?.state ?? 0] || 'rgb(var(--v-theme-secondary))'
            , 'stroke-width': region.stroke ?? 0,
          }" @click="toggle(region.sn, region.sw)"
          @pointermove.passive.capture="openSliderPopUp($event, region.sw)"
          @pointerup="closeSliderPopUp"
        >
          <title>
            {{ region.title }}
          </title>
        </path>
      </svg>
    </VCarouselItem>
  </VCarousel>
  <div
    v-show="activeSwitch" class="slider" :style="{
      top: sliderLocation?.y + 'px',
      left: sliderLocation?.x + 'px'
    }"
    @pointermove.passive.capture="updateBrightness" @pointerup="closeSliderPopUp" @pointerleave="closeSliderPopUp"
  >
    <div
      class="innerSlider" :style="{
        background: `linear-gradient(to top, rgb(var(--v-theme-tertiary)), rgb(var(--v-theme-tertiary)) ${sliderBrightness}%, rgba(0,0,0,.5) ${sliderBrightness}%)`
      }"
    />
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import { useAppStore } from "@/store/app";
import ThemeToggle from "@/components/ThemeToggle.vue";
import { Svg, Region, Switch } from "@home-management/lib/types/socket";
import { storeToRefs } from "pinia";
import { useDisplay } from 'vuetify'
import { useLightsStore } from "@/store/lights";
import { VCarousel } from "vuetify/lib/components/index.mjs";

const { layer } = storeToRefs(useLightsStore());
const { socket } = useAppStore();
const { smAndUp } = useDisplay();

const selecting = ref(false);
const carousel = ref<VCarousel | undefined>();
const svg = ref<Svg | null>(null);

// Pure helper functions
function interpolateColor(a: string, b: string, amount: number): string {
  var ah = +a.replace('#', '0x'),
    ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
    bh = +b.replace('#', '0x'),
    br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
    rr = ar + amount * (br - ar),
    rg = ag + amount * (bg - ag),
    rb = ab + amount * (bb - ab);
  return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
}
function backgroundHREF(name: string): string {
  const href = new URL(`../assets/${name}`, import.meta.url).href;
  return href;
}

// Server interaction
async function getSwitch(r: Region) {
  const res = await socket.emitWithAck("getSwitch", r.sn)
  if (!res.ok) return console.error(res.err);
  r.sw = {
    name: res.value.name,
    serialNumber: res.value.serialNumber,
    state: Number(res.value.state),
    brightness: res.value.brightness,
  };
}
async function toggle(sn: string, sw?: Switch) {
  if (!sw) return;
  sw.state = 2;
  const res = await socket.emitWithAck("toggleSwitch", sn);
  if (res.ok) {
    sw.state = res.value.BinaryState;
    sw.brightness = res.value.brightness??sw.brightness;
  }
}

// Server events
socket.emit("getSvg", (res: Svg) => {
  svg.value = res;
  svg.value.forEach((l) =>
    l.regions.forEach((r) => {
      if (r.sn) getSwitch(r);
    }),
  );
});
socket.on('stateChange', (sn, state) => {
  const sw = svg.value?.flatMap(screen => screen.regions).map(region => region.sw).find(s => s?.serialNumber == sn)
  if (sw) sw.state = state
});
socket.on('brightnessChange', (sn, brightness) => {
  const sw = svg.value?.flatMap(screen => screen.regions).map(region => region.sw).find(s => s?.serialNumber == sn)
  if (sw) sw.brightness = brightness
})
socket.on("connect", () => {
  svg.value?.forEach((l) =>
    l.regions.forEach((r) => {
      if (r.sn) getSwitch(r);
    }),
  );
})

// Brightness slider
const activeSwitch = ref<Switch | null>(null);
const sliderLocation = ref<{x:number, y:number} | null>(null);
const sliderBrightness = ref(0);
const sendingBrightness = ref(false);

async function closeSliderPopUp(): Promise<void> {
  if (!activeSwitch.value) return;
  sendingBrightness.value = true;
  const res = await socket.emitWithAck("setBrightness", activeSwitch.value.serialNumber, sliderBrightness.value)
  if (res.ok) {
    activeSwitch.value.brightness = res.value.brightness;
    activeSwitch.value.state = res.value.BinaryState;
  }
  activeSwitch.value = null;
  sliderLocation.value = null;
}

function updateBrightness(event: PointerEvent): void {
  if (!activeSwitch.value || sendingBrightness.value) return;
  const slider = document.getElementsByClassName('innerSlider')[0].getBoundingClientRect()
  const position = 1 - (event.clientY - slider.top) / slider.height;
  sliderBrightness.value = Math.round(Math.max(0, Math.min(100, Math.round(position * 100))));
}

function openSliderPopUp(event: PointerEvent, sw: Switch | undefined): void {
  if (event.type !== "pointermove" || event.pressure <= 0 || sw === undefined || activeSwitch.value) return;
  if (!sliderLocation.value) {
    sliderLocation.value = { x: event.clientX, y: event.clientY };
    const carouselRect = carousel.value?.$el.getBoundingClientRect();
    sliderLocation.value.y = Math.max(sliderLocation.value.y, carouselRect.top + 95);
    sliderLocation.value.y = Math.min(sliderLocation.value.y, carouselRect.bottom - 95);
    sliderLocation.value.x = Math.max(sliderLocation.value.x, carouselRect.left + 31);
    sliderLocation.value.x = Math.min(sliderLocation.value.x, carouselRect.right - 31);
  }
  else if (Math.abs(sliderLocation.value.y - event.offsetY) > 10 && Math.abs(sliderLocation.value.x - event.offsetX) < 10 && sw.brightness && !isNaN(sw.brightness)) {
    sliderBrightness.value = sw.brightness ?? 0;
    activeSwitch.value = sw;
    sendingBrightness.value = false;
  }
  updateBrightness(event);
}

</script>

<style lang="scss">
.carousel {
  height: 100% !important;

  svg {
    touch-action: none;
    height: 100%;
    width: 100% !important;
  }
}

.slider {
  position: absolute;
  width: 200vw;
  height: 200vh;
  margin-left: -100vw;
  margin-top: -100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
}

.innerSlider {
  width: 32px;
  height: 160px;
  border-radius: 16px;
  box-shadow: 0px 0px 25px 25px rgba(0, 0, 0, .5);
}
</style>
