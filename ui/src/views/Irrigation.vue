<template>
  <VForm :disabled="saving" class="fill-height" @submit.prevent="saveConfig">
    <VContainer fluid class="pa-1">
      <VRow dense>
        <VCol :cols="cols">
          <VCard title="Events" variant="tonal">
            <VCardText>
              <VExpansionPanels v-model="selectedEvent">
                <VExpansionPanel v-for="(event, i) of config.events" :key="i" eager>
                  <VExpansionPanelTitle>
                    <div class="text-body-1">
                      {{ event.name }}
                    </div>
                    <VSpacer />
                    <VBtn
                      icon="mdi-delete" color="error" class="ma-n3" variant="text"
                      @click="config.events.splice(i, 1)"
                    />
                  </VExpansionPanelTitle>
                  <VExpansionPanelText>
                    <VRow>
                      <VCol class="pa-2">
                        <VTextField v-model="event.name" label="Name" hide-details="auto" />
                      </VCol>
                    </VRow>
                    <VRow>
                      <VCol class="pa-2" :cols="cardWidth < 550 ? 12 : 9">
                        <VSelect
                          v-model="event.sequenceID" :items="config.sequences" label="Sequence" hide-details="auto"
                          :item-value="item => item.id" :item-title="item => item.name"
                          :rules="[v => !!v || 'Required', v => !!config.sequences.find(s => s.id === v) || 'Not a valid sequence id']"
                          validate-on="input"
                        />
                      </VCol>
                      <VCol class="pa-2" :cols="cardWidth < 550 ? 12 : 3">
                        <VTextField
                          :model-value="event.priority" type="number" hide-details="auto" validate-on="input"
                          label="Priority" :min="Irrigation.toEventPriority(-Infinity)" :max="1000000"
                          @update:model-value="v => Irrigation.toEventPriority(v)"
                        />
                      </VCol>
                    </VRow>
                    <VRow>
                      <VCol class="pa-2">
                        <VTextField
                          :model-value="Math.floor(event.startOffset / 60)" type="number" hide-details="auto"
                          validate-on="input" label="Start Offset (m)" :min="Irrigation.Offset(Infinity)"
                          :max="Irrigation.Offset(-Infinity)"
                          @update:model-value="v => event.startOffset = Irrigation.Offset(60 * Number(v))"
                        />
                      </VCol>
                    </VRow>
                    <VRow>
                      <VCol align="center">
                        <VDatePicker
                          :model-value="[new Date(event.start * 1000)]" title="Starting on:" color="primary"
                          show-adjacent-months hide-actions class="mt-1" @update:model-value="(value) => {
                            if (value instanceof Date)
                              event.start = Irrigation.TimeT(value.getTime() / 1000);
                          }"
                        />
                      </VCol>
                      <VCol align="center">
                        <VDatePicker
                          :model-value="[new Date(event.end * 1000)]" title="Ending on:" color="primary"
                          show-adjacent-months hide-actions class="ma-1 " @update:model-value="(value) => {
                            if (value instanceof Date)
                              event.end = Irrigation.TimeT(value.getTime() / 1000);
                          }"
                        />
                      </VCol>
                    </VRow>
                    <VChipGroup
                      :model-value="event.days.flatMap((v, i) => v ? [i] : [])" multiple filter
                      @update:model-value="(value: number[]) => {
                        event.days.fill(false);
                        value.filter(v => v >= 0 && v < 7).forEach(v => event.days[v] = true);
                      }"
                    >
                      <VChip v-for="(day, dayIndex) of daysOfWeek" :key="dayIndex" color="primary">
                        {{ day }}
                      </VChip>
                    </VChipGroup>
                  </VExpansionPanelText>
                </VExpansionPanel>
              </VExpansionPanels>
            </VCardText>
            <VCardActions>
              <v-spacer />
              <VBtn icon="mdi-plus" color="primary" variant="flat" @click="createEvent" />
            </VCardActions>
          </VCard>
        </VCol>
        <VCol :cols="cols">
          <VCard
            ref="sequences" v-resize="() => cardWidth = sequences?.$el.offsetWidth" title="Sequences"
            variant="tonal"
          >
            <VCardText>
              <VExpansionPanels v-model="selectedSequence">
                <VExpansionPanel v-for="(sequence, i) of config.sequences" :key="i" eager>
                  <VExpansionPanelTitle>
                    <VSwitch
                      density="compact" color="primary" hide-details="auto" class="ma-n3 flex-grow-0" inset
                      style="min-width: 48px" :model-value="stateSequences.has(sequence.id)" @click.stop
                      @update:model-value="v => {
                        if (v) startSequence(sequence.id);
                        else stopSequence(sequence.id);
                      }"
                    />
                    <div class="pl-6 text-body-1">
                      {{ sequence.name }}
                    </div>
                    <VSpacer />
                    <VBtn
                      icon="mdi-delete" color="error" class="ma-n3" variant="text"
                      @click="config.sequences.splice(i, 1)"
                    />
                  </VExpansionPanelTitle>
                  <VExpansionPanelText class="pt-2">
                    <VRow class="pb-1">
                      <VTextField v-model="sequence.name" label="Name" hide-details="auto" />
                    </VRow>
                    <VRow v-for="(job, jI) of sequence.jobs" :key="jI">
                      <VCol>
                        <VRow>
                          <VCol class="pa-1" :cols="cardWidth < 525 ? 12 : 9">
                            <VSelect
                              v-model="job.valveIDs" density="compact" :items="config.valves" label="Valves"
                              multiple chips closable-chips hide-details="auto" :item-value="item => item.id"
                              :item-title="item => item.name"
                            />
                          </VCol>
                          <VCol class="pa-1" :cols="cardWidth < 525 ? 12 : 3">
                            <VTextField
                              :model-value="Math.floor(job.duration / 60)" density="compact"
                              label="Duration (m)" type="number" hide-details="auto" :min="1" :max="60 * 24"
                              validate-on="input"
                              @update:model-value="v => job.duration = 60 * Math.max(1, Math.min(1440, Number(v)))"
                            />
                          </VCol>
                        </VRow>
                      </VCol>
                      <VCol align-self="center" class="flex-grow-0 pa-0">
                        <VBtn
                          icon="mdi-delete" color="error" class="ma-n1" variant="text"
                          @click="sequence.jobs.splice(jI, 1)"
                        />
                      </VCol>
                    </VRow>
                    <VRow align="center">
                      <span class="text-center text-body-1 px-2">
                        {{ (() => {
                          let state = stateSequences.get(sequence.id);
                          if (!state) return 'Stopped';
                          else return state.startType === 'manual' ? 'Manually Started: ' + new Date(state.startTimestamp *
                            1000).toLocaleString() : 'Scheduled';
                        })() }}
                      </span>
                      <VSpacer />
                      <VBtn
                        icon="mdi-plus" color="primary" variant="flat"
                        @click="sequence.jobs.push({ name: '', valveIDs: [], duration: 0 })"
                      />
                    </VRow>
                  </VExpansionPanelText>
                </VExpansionPanel>
              </VExpansionPanels>
            </VCardText>
            <VCardActions>
              <v-spacer />
              <VBtn icon="mdi-plus" color="primary" variant="flat" @click="createSequence" />
            </VCardActions>
          </VCard>
        </VCol>
        <VCol :cols="cols">
          <VCard title="Valves" variant="tonal">
            <VCardText>
              <VExpansionPanels v-model="selectedValve">
                <VExpansionPanel v-for="(valve, i) of config.valves" :key="i" eager>
                  <VExpansionPanelTitle>
                    <VSwitch
                      density="compact" color="primary" hide-details class="ma-n3 flex-grow-0" inset
                      style="min-width: 48px" :model-value="stateValves.has(valve.id)" @click.stop @update:model-value="v => {
                        if (v) startValve(valve.id);
                        else stopValve(valve.id);
                      }"
                    />
                    <div class="pl-6 text-body-1">
                      {{ valve.name }}
                    </div>
                    <VSpacer />
                    <VBtn
                      icon="mdi-delete" color="error" class="ma-n3" variant="text"
                      @click="config.valves.splice(i, 1)"
                    />
                  </VExpansionPanelTitle>
                  <VExpansionPanelText>
                    <VTextField
                      v-model="valve.name" label="Name"
                      :rules="[(v: string) => (v != null && /\S/.test(v)) || 'Required']" validate-on="input" clearable
                    />
                    <VSelect
                      v-model="valve.deviceID" :items="config.devices" label="Device" :item-value="item => item.id"
                      :item-title="item => item.name"
                      :rules="[v => v != null || 'Required', v => !!config.devices.find(d => d.id === v) || 'Not a valid device id']"
                      validate-on="input"
                    />
                    <VSelect
                      v-model="valve.relay" :items="[1, 2, 3, 4, 5, 6, 7, 8]" label="Relay"
                      :rules="[v => v != null || 'Required', v => v > 0 || 'Must be greater than 0', v => v < 9 || 'Must be less than 9']"
                      validate-on="input"
                    />
                  </VExpansionPanelText>
                </VExpansionPanel>
              </VExpansionPanels>
            </VCardText>
            <VCardActions>
              <v-spacer />
              <VBtn icon="mdi-plus" color="primary" variant="flat" @click="createValve" />
            </VCardActions>
          </VCard>
        </VCol>
        <VCol :cols="cols">
          <VCard title="Devices" variant="tonal">
            <VCardText>
              <VExpansionPanels v-model="selectedDevice">
                <VExpansionPanel v-for="(device, i) of config.devices" :key="i" eager>
                  <VExpansionPanelTitle>
                    <div class="text-center">
                      {{ device.name }}
                    </div>
                    <span v-if="stateDevices.has(device.mac)">
                      <VBtn
                        class="text-decoration-underline px-2 my-n2" color="primary" variant="text"
                        :href="`http://${stateDevices.get(device.mac)?.ip}`" @click.stop
                      >{{
                        stateDevices.get(device.mac)?.ip }}</VBtn>
                    </span>
                    <template v-else>
                      <div class="px-2 my-n2 py-0 text-center">
                        Not Connected
                      </div>
                    </template>
                    <VSpacer />
                    <VBtn
                      icon="mdi-delete" color="error" class="ma-n3" variant="text"
                      @click="config.devices.splice(i, 1)"
                    />
                  </VExpansionPanelTitle>
                  <VExpansionPanelText>
                    <VTextField
                      v-model="device.name" label="Name"
                      :rules="[(v: string) => (v != null && /\S/.test(v)) || 'Required']" validate-on="input" clearable
                    />
                    <VSelect
                      v-model="device.mac"
                      :items="[...stateDevices.values()].filter(d => !config.devices.find(d2 => d2.mac === d.mac))"
                      label="Device" :rules="[v => !!v || 'Required']" validate-on="input"
                      no-data-text="No other devices found"
                    />
                  </VExpansionPanelText>
                </VExpansionPanel>
              </VExpansionPanels>
            </VCardText>
            <VCardActions class="d-flex flex-wrap justify-center">
              <VChip
                v-for="([id, device]) of [...stateDevices].filter(([_, d]) => !config.devices.find(d2 => d2.mac === d.mac))"
                :key="id" append-icon="mdi-plus" color="primary" variant="flat" class="ma-1" @click="() => {
                  createDevice(device.mac);
                  selectedDevice = config.devices.length - 1;
                }"
              >
                {{ device.ip }}
              </VChip>
            </VCardActions>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
    <VAppBar location="bottom" density="compact" elevation="0">
      <VSpacer />
      <VBtn
        type="submit" text="Submit" color="primary" variant="flat" block rounded="0"
        size="large" :loading="saving"
      />
    </VAppBar>
    <VOverlay v-model="errorSaving" contained class="justify-center align-center">
      <VAlert text="Failed to Save" type="error" />
    </VOverlay>
  </VForm>
</template>
<script setup lang="ts">
import { useAppStore } from "@/store/app";
import * as Irrigation from "@home-management/lib/types/irrigationConfig.ts";
import { Ref, computed, ref } from "vue";
import { VCard } from "vuetify/lib/components/index.mjs";
import { SubmitEventPromise, useDisplay } from "vuetify/lib/framework.mjs";

// Layout
const { smAndDown, md, lg, xlAndUp } = useDisplay()
const cols = computed(() => smAndDown.value ? 12 : md.value ? 6 : lg.value ? 4 : xlAndUp.value ? 3 : 12);
const sequences = ref<VCard | undefined>();
const cardWidth = ref(0);
const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Config syncing
const { socket } = useAppStore();
const config = ref<Irrigation.Config>({
  events: [],
  sequences: [],
  valves: [],
  devices: [],
  timezone: "",
});
const updateConfig = (cfg: Irrigation.Config) => {
  config.value = cfg;
};
socket.on("irrigationConfigChange", updateConfig);
socket.emitWithAck("getIrrigationConfig").then(updateConfig);

// State syncing
const stateSequences = ref<Map<Irrigation.SequenceID, Irrigation.SequenceExecution>>(new Map());
const stateValves = ref<Map<Irrigation.ValveID, Irrigation.ValveExecution>>(new Map());
const stateDevices = ref<Map<string, Irrigation.DeviceConnection>>(new Map());
const updateState = (state: Irrigation.State) => {
  stateSequences.value = new Map(Object.entries(state.sequences).map(([k, v]) => [Irrigation.SequenceID(k), v]));
  stateValves.value = new Map(Object.entries(state.valves).map(([k, v]) => [Irrigation.ValveID(k), v]));
  stateDevices.value = new Map(Object.entries(state.devices));
};
socket.on("irrigationStateChange", updateState);
socket.emitWithAck("getIrrigationState").then(updateState)

// State actions
async function startSequence(id: Irrigation.SequenceID) {
  const res = await socket.emitWithAck("setIrrigationSequenceState", id, true);
  if (res.ok)
    stateSequences.value.set(id, res.value!);
}
async function stopSequence(id: Irrigation.SequenceID) {
  const res = await socket.emitWithAck("setIrrigationSequenceState", id, false);
  if (res)
    stateSequences.value.delete(id);
}
async function startValve(id: Irrigation.ValveID) {
  const res = await socket.emitWithAck("setIrrigationValveState", id, true, -1);
  if (res.ok)
    stateValves.value.set(id, res.value!);
}
async function stopValve(id: Irrigation.ValveID) {
  const res = await socket.emitWithAck("setIrrigationValveState", id, false, -1);
  if (res.ok)
    stateValves.value.delete(id);
}

// Config editing
const saving = ref(false);
const errorSaving = ref(false);
const selectedEvent: Ref<number | undefined> = ref(undefined);
const selectedSequence: Ref<number | undefined> = ref(undefined);
const selectedValve: Ref<number | undefined> = ref(undefined);
const selectedDevice: Ref<number | undefined> = ref(undefined);

function createEvent() {
  //find the first unused id starting at 1
  let id = Irrigation.EventID(1);
  while (config.value.events.find((seq) => seq.id === id))
    id++;
  config.value.events.push({
    name: "",
    sequenceID: Irrigation.SequenceID(0),
    days: [false, false, false, false, false, false, false],
    id,
    priority: Irrigation.toEventPriority(0),
    start: Irrigation.TimeT(Date.now() / 1000),
    end: Irrigation.TimeT(Date.now() / 1000),
    startOffset: 0,
  });
}
function createSequence() {
  //find the first unused id starting at 1
  let id = Irrigation.SequenceID(1);
  while (config.value.sequences.find((seq) => seq.id === id))
    id++;
  config.value.sequences.push({
    name: "Sequence " + id.toString(),
    id,
    jobs: [],
  });
}
function createValve() {
  //find the first unused id starting at 1
  let id = Irrigation.ValveID(1);
  while (config.value.valves.find((seq) => seq.id === id))
    id++;
  config.value.valves.push({
    name: "Valve " + id.toString(),
    id,
    deviceID: Irrigation.DeviceID(0),
    relay: 0,
  });
}
function createDevice(mac: string = "") {
  //find the first unused id starting at 1
  let id = Irrigation.DeviceID(1);
  while (config.value.devices.find((seq) => seq.id === id))
    id++;
  config.value.devices.push({
    name: "Device " + id.toString(),
    id,
    mac,
  });
}
async function saveConfig(event: SubmitEventPromise) {
  saving.value = true;
  const res = await event;

  if (res.valid) {
    errorSaving.value = !await socket.emitWithAck("setIrrigationConfig", config.value);
  } else {
    // focus the first invalid input
    const id = res.errors[0].id;
    const el = document.getElementById(id.toString());
    if (el)
      el.focus();
  }
  saving.value = false;
}
</script>

<style scoped>
.v-date-picker {
  background-color: color-mix(in oklab, rgb(var(--v-theme-surface)), rgb(var(--v-theme-surface-variant), .1));
}
</style>