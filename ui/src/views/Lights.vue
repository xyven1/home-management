<template>
  <template v-if="view === View.FloorPlan">
    <VAppBar>
      <VAppBarTitle>
        {{ svg?.[layer]?.name ?? "Loading" }}
      </VAppBarTitle>
      <VAppBarNavIcon v-if="!editing.enabled">
        <VBtn :icon="mdiViewList" @click="() => (view = View.List)" />
      </VAppBarNavIcon>
      <VAppBarNavIcon>
        <VBtn
          v-if="!editing.enabled"
          :icon="mdiLayersEdit"
          @click="startEditing"
        />
        <VBtn v-else :icon="mdiCheckAll" @click="doneEditing" />
      </VAppBarNavIcon>
    </VAppBar>
    <VCarousel
      ref="carousel"
      v-model="layer"
      :items-to-show="1"
      class="carousel"
      :show-arrows="smAndUp"
      hide-delimiter-background
    >
      <VCarouselItem
        v-for="svgLayer in svg"
        :key="svgLayer.name"
        :disabled="!!sliderActiveSwitch || editing.regionSelected"
      >
        <svg viewBox="0 0 295 515" width="100%">
          <image
            v-if="svgLayer.background !== undefined"
            width="295"
            height="515"
            x="0"
            y="0"
            :href="backgroundHREF(svgLayer.background.name)"
          />
          <defs
            v-for="(
              { region: { title }, brightness }, index
            ) in svgLayer.regions
              .map((r) => ({
                region: r,
                brightness: switches.get(r.sn)?.brightness,
              }))
              .filter(
                (r): r is { region: Region; brightness: number } =>
                  r.brightness != undefined && !isNaN(r.brightness),
              )"
            :key="index"
          >
            <linearGradient
              :id="'gradient' + title.replace(' ', '')"
              x1="0%"
              y1="100%"
              x2="0%"
              y2="0%"
            >
              <stop
                :offset="brightness + '%'"
                stop-color="rgb(var(--v-theme-tertiary))"
              />
              <stop
                :offset="brightness + '%'"
                stop-color="color-mix(in oklab, rgb(var(--v-theme-lightOff)), rgb(var(--v-theme-lightOn)) 25%)"
              />
            </linearGradient>
          </defs>
          <path
            v-for="({ region, sw }, index) in svgLayer.regions.map((r) => ({
              region: r,
              sw: switches.get(r.sn),
            }))"
            :key="index"
            :d="region.d"
            style="cursor: pointer; stroke: transparent"
            :style="{
              fill: editing.enabled
                ? region.sn
                  ? 'rgb(var(--v-theme-success))'
                  : 'rgb(var(--v-theme-lightOff))'
                : {
                  [-1]: 'rgb(var(--v-theme-lightNone))',
                  0: 'rgb(var(--v-theme-lightOff))',
                  1:
                    sw?.brightness && !isNaN(sw.brightness)
                      ? `url(#${'gradient' + region.title.replace(' ', '')})`
                      : 'rgb(var(--v-theme-lightOn))',
                  2: 'rgb(var(--v-theme-info))',
                }[sw?.state ?? -1] || 'rgb(var(--v-theme-error))',
              'stroke-width': region.stroke ?? 0,
            }"
            @click="
              editing.enabled ? startEditingRegion(region) : toggle(region.sn)
            "
            @pointermove.passive.capture="
              !editing.enabled && handlePointerMove($event, region.sn)
            "
            @pointerup="!editing.enabled && closeSliderPopUp($event)"
          >
            <title>
              {{ region.title }}
            </title>
          </path>
        </svg>
      </VCarouselItem>
      <VOverlay
        v-model="editing.regionSelected"
        contained
        class="align-end justify-center"
        style="touch-action: none"
      >
        <VContainer>
          <VCard
            :title="`Edit ${editing.selectedRegion?.title ?? 'Unassigned'}`"
            :loading="editing.saving"
          >
            <VForm
              :disabled="editing.saving || editing.saveFailed"
              @submit.prevent
            >
              <VCardText>
                <VChipGroup v-model="switchListFilters" filter>
                  <VChip text="Show only unassigned" color="primary" />
                </VChipGroup>
                <VAutocomplete
                  v-model="editing.selectedSwitch"
                  clearable
                  label="Assigned Switch"
                  :items="
                    switchListFilters === undefined
                      ? [...switches.values()]
                      : unassignedSwitches
                  "
                  :item-title="(item) => item.name"
                  :item-value="(item) => item"
                  hide-details="auto"
                  validate-on="submit"
                  :rules="[(v) => !!v || 'Required']"
                  auto-select-first
                />
              </VCardText>
              <VCardActions class="justify-center">
                <VBtn color="primary" type="submit" @click="saveEdit">
                  Save
                </VBtn>
                <VBtn color="error" @click="doneEditingRegion">
                  Cancel
                </VBtn>
              </VCardActions>
            </VForm>
            <VOverlay
              v-model="editing.saveFailed"
              contained
              persistent
              class="align-center justify-center"
            >
              <VAlert type="error" density="compact" prominent>
                Failed to save
                <VBtn variant="tonal" @click="doneEditingRegion">
                  OK
                </VBtn>
              </VAlert>
            </VOverlay>
          </VCard>
        </VContainer>
      </VOverlay>
    </VCarousel>
    <div
      v-show="sliderActiveSwitch"
      class="slider"
      @pointermove.passive.capture="updateBrightness"
      @pointerup="closeSliderPopUp"
      @pointerleave="closeSliderPopUp"
    >
      <div
        class="innerSlider"
        :style="{
          background: `linear-gradient(to top, rgb(var(--v-theme-tertiary)), rgb(var(--v-theme-tertiary)) ${sliderBrightness}%, rgba(0,0,0,.5) ${sliderBrightness}%)`,
          top: (sliderLocation?.y ?? 0) + 'px',
          left: (sliderLocation?.x ?? 0) + 'px',
        }"
      />
    </div>
  </template>
  <template v-else-if="view === View.List">
    <VAppBar>
      <VAppBarTitle />
      <VAppBarNavIcon v-if="!editing.enabled">
        <VBtn :icon="mdiFloorPlan" @click="view = View.FloorPlan" />
      </VAppBarNavIcon>
    </VAppBar>
    <div class="d-flex flex-column h-100">
      <div
        class="d-flex flex-column flex-grow-1 align-strech"
        style="overflow-y: auto"
      >
        <div class="flex-grow-1" />
        <VBtn
          v-for="s of listViewSwitchFilters === undefined
            ? switches.values()
            : unassignedSwitches"
          :key="s.serialNumber"
          class="ma-1 text-none justify-start"
          size="x-large"
          :color="{ 0: '', 1: 'lightOn', 2: '' }[s.state] ?? 'error'"
          variant="flat"
          style="height: 40px"
          :prepend-icon="
            {
              0: mdiLightSwitchOff,
              1: mdiLightSwitch,
              2: mdiLightSwitchOff,
            }[s.state] ?? mdiAlertCircleOutline
          "
          @click="toggle(s.serialNumber)"
        >
          {{ s.name }}
        </VBtn>
      </div>
      <hr style="border-color: rgb(var(--v-theme-surface))">
      <VChipGroup
        v-model="listViewSwitchFilters"
        filter
        class="flex-shrink-0 justify-center"
      >
        <VChip text="Show only unassigned" color="primary" />
      </VChipGroup>
    </div>
  </template>
</template>
<script lang="ts" setup>
import { useAppStore } from "@/store/app";
import { useLightsStore, View } from "@/store/lights";
import {
Region,
SerialNumber,
Svg,
Switch,
} from "@home-management/lib/types/socket";
import {
mdiAlertCircleOutline,
mdiCheckAll,
mdiFloorPlan,
mdiLayersEdit,
mdiLightSwitch,
mdiLightSwitchOff,
mdiViewList,
} from "@mdi/js";
import { storeToRefs } from "pinia";
import { computed, Ref, ref } from "vue";
import { useDisplay, useTheme } from "vuetify";
import { VCarousel, VOverlay } from "vuetify/lib/components/index.mjs";

const { layer, view } = storeToRefs(useLightsStore());
const { socket } = useAppStore();
const { smAndUp } = useDisplay();
const { themes } = useTheme();
themes.value.dark.colors.lightOn = themes.value.dark.colors.tertiary;
themes.value.dark.colors.lightNone = "#333";
themes.value.dark.colors.lightOff = "ccc";
themes.value.light.colors.lightOn = themes.value.dark.colors.tertiary;
themes.value.light.colors.lightNone = "#ddd";
themes.value.light.colors.lightOff = "#888";

const carousel = ref<VCarousel | undefined>();
const svg = ref<Svg | null>(null);

// Pure helper functions
const backgroundHREF = (name: string): string =>
  new URL(`../assets/${name}`, import.meta.url).href;

// Server interaction
const switches = ref<Map<SerialNumber, Switch>>(new Map());

async function toggle(sn: SerialNumber) {
  const sw = switches.value.get(sn);
  if (!sw) return;
  sw.state = 2;
  const res = await socket.emitWithAck("toggleSwitch", sn);
  if (res.ok) {
    sw.state = res.value.BinaryState;
    sw.brightness = res.value.brightness ?? sw.brightness;
  }
}

// Server events
socket.on("newDevice", (sw) => {
  switches.value.set(sw.serialNumber, sw);
});
socket.on("stateChange", (sn, state) => {
  const sw = switches.value.get(sn);
  if (!sw) return;
  sw.state = state;
});
socket.on("brightnessChange", (sn, brightness) => {
  const sw = switches.value.get(sn);
  if (!sw) return;
  sw.brightness = brightness;
});
socket.on("newSvg", (newSvg) => {
  svg.value = newSvg;
});
socket.on("connect", () => {
  socket.emit("getSvg", (res: Svg) => {
    svg.value = res;
  });
  socket.emit("getSwitches", (res) => {
    res.forEach((s) => {
      switches.value.set(s.serialNumber, s);
      socket.emit("getSwitch", s.serialNumber, (sw) => {
        if (!sw.ok) return;
        const s = switches.value.get(sw.value.serialNumber)!;
        s.state = sw.value.state;
        if (sw.value.brightness) s.brightness = sw.value.brightness;
      });
    });
  });
});

// List View
const listViewSwitchFilters = ref<number | undefined>(0);
const unassignedSwitches = computed(() => {
  const assigned = new Set();
  for (const layer of svg.value ?? [])
    for (const region of layer.regions) assigned.add(region.sn);
  return [...switches.value.values()].filter(
    (s) => !assigned.has(s.serialNumber),
  );
});

// Editing
const editing: Ref<{
  enabled: boolean;
  regionSelected: boolean;
  saving: boolean;
  saveFailed: boolean;
  selectedRegion: Region | undefined;
  selectedSwitch: Switch | undefined;
}> = ref({
  enabled: false,
  regionSelected: false,
  saving: false,
  saveFailed: false,
  selectedRegion: undefined,
  selectedSwitch: undefined,
});
const switchListFilters = ref<number | undefined>();

function startEditing(): void {
  editing.value.enabled = true;
}

function doneEditing(): void {
  editing.value.enabled = false;
  doneEditingRegion();
}

async function startEditingRegion(region: Region): Promise<void> {
  editing.value.selectedRegion = region;
  editing.value.regionSelected = true;
  editing.value.saving = false;
  editing.value.saveFailed = false;
  editing.value.selectedSwitch = switches.value.get(region.sn);
}

function doneEditingRegion(): void {
  editing.value.regionSelected = false;
}

async function saveEdit(): Promise<void> {
  if (!editing.value.selectedSwitch || !editing.value.selectedRegion) return;
  editing.value.saving = true;
  editing.value.selectedRegion.sn = editing.value.selectedSwitch.serialNumber;
  try {
    if (await socket.emitWithAck("setSvg", editing.value.selectedRegion))
      doneEditingRegion();
    else editing.value.saveFailed = true;
  } catch (err) {
    console.error(err);
    editing.value.saveFailed = true;
  } finally {
    editing.value.saving = false;
  }
}

// Brightness slider
const sliderWidth = 32;
const sliderHeight = 160;
const sliderActiveSwitch = ref<Switch | null>(null);
const sliderLocation = ref<{ x: number; y: number } | null>(null);
const originalClientLocation = ref<{ x: number; y: number } | null>(null);
const sliderBrightness = ref(0);
const sliderSendingBrightness = ref(false);

async function closeSliderPopUp(p: PointerEvent): Promise<void> {
  try {
    if (!sliderActiveSwitch.value || sliderSendingBrightness.value) return;
    sliderSendingBrightness.value = true;
    const res = await socket
      .timeout(3000)
      .emitWithAck(
        "setBrightness",
        sliderActiveSwitch.value.serialNumber,
        sliderBrightness.value,
      );
    if (res.ok) {
      sliderActiveSwitch.value.brightness = res.value.brightness;
      sliderActiveSwitch.value.state = res.value.BinaryState;
    }
  } finally {
    sliderActiveSwitch.value = null;
    sliderLocation.value = null;
    originalClientLocation.value = null;
    sliderSendingBrightness.value = false;
  }
}

function updateBrightness(event: PointerEvent): void {
  if (!sliderActiveSwitch.value || sliderSendingBrightness.value) return;
  const slider = document
    .getElementsByClassName("innerSlider")[0]
    .getBoundingClientRect();
  const position = 1 - (event.clientY - slider.top) / slider.height;
  sliderBrightness.value = Math.round(
    Math.max(0, Math.min(100, Math.round(position * 100))),
  );
}

function handlePointerMove(event: PointerEvent, sn: SerialNumber): void {
  const sw = switches.value.get(sn);
  if (
    event.type !== "pointermove" ||
    event.buttons <= 0 ||
    sw === undefined ||
    !sw.brightness ||
    isNaN(sw.brightness)
  )
    return;
  if (sliderActiveSwitch.value) {
    updateBrightness(event);
  } else if (!sliderLocation.value || !originalClientLocation.value) {
    originalClientLocation.value = { x: event.clientX, y: event.clientY };
    sliderLocation.value = {
      x: event.clientX,
      y: event.clientY - sliderHeight * (0.5 - sw.brightness / 100),
    };
    const carouselRect = carousel.value?.$el.getBoundingClientRect();
    sliderLocation.value.y = Math.min(
      Math.max(
        sliderLocation.value.y,
        carouselRect.top + (sliderHeight / 2 + 15),
      ),
      carouselRect.bottom - (sliderHeight / 2 + 15),
    );
    sliderLocation.value.x = Math.min(
      Math.max(
        sliderLocation.value.x,
        carouselRect.left + (sliderWidth / 2 + 15),
      ),
      carouselRect.right - (sliderWidth / 2 + 15),
    );
  } else if (
    Math.abs(originalClientLocation.value.y - event.clientY) > 10 &&
    Math.abs(originalClientLocation.value.x - event.clientX) < 10
  ) {
    sliderBrightness.value = sw.brightness ?? 0;
    sliderActiveSwitch.value = sw;
    sliderSendingBrightness.value = false;
  }
}
</script>

<style lang="scss">
.carousel {
  height: 100% !important;
  touch-action: none;

  svg {
    height: 100%;
    width: 100% !important;
  }

  svg > path {
    touch-action: auto !important;
  }
}

.slider {
  touch-action: auto !important;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.innerSlider {
  position: absolute;
  width: v-bind('sliderWidth + "px"');
  height: v-bind('sliderHeight + "px"');
  margin-top: v-bind('-sliderHeight / 2 + "px"');
  margin-left: v-bind('-sliderWidth / 2 + "px"');
  border-radius: 16px;
  box-shadow: 0px 0px 25px 25px rgba(0, 0, 0, 0.5);
}

.v-carousel__controls {
  pointer-events: none;

  button {
    pointer-events: auto;
  }
}
</style>
