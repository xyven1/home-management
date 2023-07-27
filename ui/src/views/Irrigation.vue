<template>
  <VForm :disabled="saving" class="fill-height" @submit.prevent="saveConfig">
    <VContainer fluid class="pa-1">
      <VRow dense>
        <VCol :cols="cols">
          <VCard title="Events" variant="tonal">
            <VCardText>
              <VExpansionPanels v-model="panel">
                <VExpansionPanel v-for="(event, i) of config.events" :key="i">
                  <VExpansionPanelTitle>
                    Event: {{ event.name }}
                    <VSpacer />
                    <VBtn
                      icon="mdi-delete" color="error" class="expansion-delete" variant="text"
                      @click="config.events.splice(i, 1)"
                    />
                  </VExpansionPanelTitle>
                  <VExpansionPanelText>
                    <VTextField v-model="event.name" label="Name" />
                    <VSelect
                      v-model="event.sequenceID" :items="config.sequences" label="Sequence"
                      :item-value="item => item.id" :item-title="item => item.name"
                      :rules="[v => !!v || 'Required', v => !!config.sequences.find(s => s.id === v) || 'Not a valid sequence id']"
                      validate-on="input"
                    />
                    <VTextField v-model="event.priority" type="number" label="Priority" />
                    <div class="d-flex flex-wrap justify-center">
                      <VDatePicker
                        v-model="getStartingDateComputed(event).value" title="Starting on:" color="primary"
                        show-adjacent-months hide-actions class="mt-1"
                      />
                      <VDatePicker
                        v-model="getEndingDateComputed(event).value" title="Ending on:" color="primary"
                        show-adjacent-months hide-actions class="ma-1"
                      />
                    </div>
                    <VChipGroup v-model="getWeekDayComputed(event).value" multiple filter>
                      <VChip
                        v-for="(day, dayIndex) of daysOfWeek" :key="dayIndex" color="primary"
                        @group:selected="thing => event.days[dayIndex] = thing.value"
                      >
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
          <VCard title="Sequences" variant="tonal">
            <VCardText>
              <VExpansionPanels>
                <VExpansionPanel v-for="(sequence, i) of config.sequences" :key="i">
                  <VExpansionPanelTitle>
                    Sequence: {{ sequence.name }}
                    <VSpacer />
                    <VBtn
                      icon="mdi-delete" color="error" class="expansion-delete" variant="text"
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
                          <VCol :cols="xs ? 12 : 9" class="pa-1">
                            <VSelect
                              v-model="job.valveIDs" density="compact" :items="config.valves" label="Valves"
                              multiple chips closable-chips hide-details="auto" :item-value="item => item.id"
                              :item-title="item => item.name"
                            />
                          </VCol>
                          <VCol :cols="xs ? 12 : 3" class="pa-1">
                            <VTextField
                              v-model="job.duration" density="compact" label="Duration" type="number"
                              hide-details="auto"
                            />
                          </VCol>
                        </VRow>
                      </VCol>
                      <VCol align-self="center" class="flex-grow-0 pa-0">
                        <VSpacer />
                        <VBtn
                          icon="mdi-delete" color="error" class="expansion-delete" variant="text"
                          @click="sequence.jobs.splice(jI, 1)"
                        />
                      </VCol>
                    </VRow>
                    <VRow>
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
              <VExpansionPanels>
                <VExpansionPanel v-for="(valve, i) of config.valves" :key="i">
                  <VExpansionPanelTitle>
                    {{ valve.name }} | Device: {{ config.devices.find(v => v.id ==
                      valve.deviceID)?.name ?? "Unknown" }}, Relay: {{ valve.relay }}
                    <VSpacer />
                    <VBtn
                      icon="mdi-delete" color="error" class="expansion-delete" variant="text"
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
              <VExpansionPanels>
                <VExpansionPanel v-for="(device, i) of config.devices" :key="i">
                  <VExpansionPanelTitle>
                    {{ device.name }} | MAC: {{ device.mac }}
                    <VSpacer />
                    <VBtn
                      icon="mdi-delete" color="error" class="expansion-delete" variant="text"
                      @click="config.devices.splice(i, 1)"
                    />
                  </VExpansionPanelTitle>
                  <VExpansionPanelText>
                    <VTextField
                      v-model="device.name" label="Name"
                      :rules="[(v: string) => (v != null && /\S/.test(v)) || 'Required']" validate-on="input" clearable
                    />
                    <VSelect
                      v-model="device.mac" :items="devices.filter(d => !config.devices.find(d2 => d2.mac == d))"
                      label="Device" :rules="[v => !!v || 'Required']" validate-on="input"
                      no-data-text="No other devices found"
                    />
                  </VExpansionPanelText>
                </VExpansionPanel>
              </VExpansionPanels>
            </VCardText>
            <VCardActions>
              <v-spacer />
              <VBtn icon="mdi-plus" color="primary" variant="flat" @click="createDevice" />
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
import { computed, ref } from "vue";
import { SubmitEventPromise, useDisplay } from "vuetify/lib/framework.mjs";
const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const { socket } = useAppStore();
const devices = ref<string[]>([]);
const config = ref<Irrigation.Config>({
  events: [],
  sequences: [],
  valves: [],
  devices: [],
  timezone: "",
});

const { xs, smAndDown, md, lg, xlAndUp } = useDisplay()
const cols = computed(() => smAndDown.value ? 12 : md.value ? 6 : lg.value ? 4 : xlAndUp.value ? 3 : 12);

socket.on("irrigationConfigChange", (cfg) => {
  config.value = cfg;
});
socket.on("newIrrigationDevice", (mac: string) => {
  devices.value.push(mac);
});
socket.emitWithAck("getIrrigationConfig").then((cfg) => {
  config.value = cfg;
});

socket.emitWithAck("getIrrigationDevices").then((res) => {
  devices.value.push(...res);
})

function createEvent() {
  //find the first unused id starting at 1
  let id = 1;
  while (config.value.events.find((seq) => seq.id === id))
    id++;
  config.value.events.push({
    name: "",
    sequenceID: 0,
    days: [false, false, false, false, false, false, false],
    id,
    priority: 0,
    start: Date.now() / 1000,
    end: Date.now() / 1000,
    startOffset: 0,
  });
}
function createSequence() {
  //find the first unused id starting at 1
  let id = 1;
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
  let id = 1;
  while (config.value.valves.find((seq) => seq.id === id))
    id++;
  config.value.valves.push({
    name: "Valve " + id.toString(),
    id,
    deviceID: 0,
    relay: 0,
  });
}
function createDevice() {
  //find the first unused id starting at 1
  let id = 1;
  while (config.value.devices.find((seq) => seq.id === id))
    id++;
  config.value.devices.push({
    name: "Device " + id.toString(),
    id,
    mac: "",
  });
}
// editing
const saving = ref(false);
const errorSaving = ref(false);
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

//event editing
const panel = ref<number | undefined>();
function getStartingDateComputed(event: Irrigation.Event) {
  return computed({
    get() {
      return [new Date(event.start * 1000)];
    },
    set(value: any[] | undefined) {
      if (value instanceof Date)
        event.start = value.getTime() / 1000;
    }
  })
}
function getEndingDateComputed(event: Irrigation.Event) {
  return computed({
    get() {
      return [new Date(event.end * 1000)];
    },
    set(value: any[] | undefined) {
      if (value instanceof Date)
        event.end = value.getTime() / 1000;
    }
  })
}
function getWeekDayComputed(event: Irrigation.Event) {
  return computed({
    get() {
      return event.days.flatMap((v, i) => v ? [i] : []);
    },
    set(value: number[]) {
      event.days.fill(false);
      for (const day of value)
        event.days[day] = true;
    }
  })
}

</script>

<style scoped>
.expansion-delete {
  margin-top: -3em;
  margin-bottom: -3em;
}

.v-date-picker {
  background-color: color-mix(in oklab, rgb(var(--v-theme-surface)), rgb(var(--v-theme-surface-variant), .1));
}
</style>