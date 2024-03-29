#include "irrigation.h"
#include "config.h"
#include "esp_time_helpers.h"
#include "logging.h"
#include "state.h"

#include <cstring>
#include <map>
#include <set>

Multi_Channel_Relay relay;

struct valve_state_t {
  event_priority_t priority = 0;
  bool state = false;
};

void init_relay() {
  Wire.setPins(13, 16);
  relay.begin(0x11);
}

std::array<valve_state_t, 8> calculateCurrentValveStates(std::array<char, 18> mac, Config config, IrrigationState state, time_t now) {
  if (state.Disabled)
    return {};
  std::array<valve_state_t, 8> valve_state = {};
  std::set<sequence_id_t> sequences_manual;
  for (auto &[id, sequenceExecution] : state.Sequences) {
    if (std::strcmp(sequenceExecution.startType, "manual"))
      continue;
    auto sequence = config.getSequence(id);
    if (sequence == nullptr || sequence->jobs.size() == 0)
      continue;
    auto job_opt = sequence->getCurrentJob(now - sequenceExecution.startTimestamp);
    if (!job_opt.has_value())
      continue;
    // at this point we know the sequence actively running
    sequences_manual.insert(sequenceExecution.sequenceID);
    auto job = job_opt.value();
    if (job.valveIDs.size() == 0)
      continue;
    for (auto &valveID : job.valveIDs) {
      auto valve = config.getValve(valveID);
      if (valve == nullptr || config.getDevice(valve->deviceID)->mac != mac || valve->relay < 1 ||
          valve->relay > 8)
        continue;
      valve_state[valve->relay - 1].state = true;
      valve_state[valve->relay - 1].priority = std::numeric_limits<event_priority_t>::max();
    }
  }
  for (auto &[id, event] : config.Events) {
    // we shouldn't let sequences overlap
    if (sequences_manual.find(event.sequenceID) != sequences_manual.end())
      continue;
    auto job_opt = event.getCurrentJob(now);
    if (!job_opt.has_value())
      continue;
    auto job = job_opt.value();
    if (job.valveIDs.size() == 0)
      continue;
    for (auto &valveID : job.valveIDs) {
      auto valve = config.getValve(valveID);
      if (valve == nullptr || config.getDevice(valve->deviceID)->mac != mac || valve->relay < 1 ||
          valve->relay > 8)
        continue;
      if (valve_state[valve->relay - 1].priority < event.priority) {
        valve_state[valve->relay - 1].priority = event.priority;
        valve_state[valve->relay - 1].state = true;
      }
    }
  }
  for (auto &[id, valveExecution] : state.Valves) {
    if (now - valveExecution.startTimestamp > valveExecution.duration && valveExecution.duration != -1)
      continue;
    auto valve = config.getValve(id);
    if (valve == nullptr || config.getDevice(valve->deviceID)->mac != mac || valve->relay < 1 ||
        valve->relay > 8)
      continue;
    valve_state[valve->relay - 1].state = true;
  }
  return valve_state;
}

void applyCurrentValveState(std::array<valve_state_t, 8> valveState) {
  uint8_t state;
  for (int i = 0; i < 8; i++)
    state |= valveState[i].state << i;
  relay.channelCtrl(state);
}

// Control the irrigation in a task
void vTaskIrrigationControl(void *pvParameters) {
  TickType_t xLastWakeTime;
  const TickType_t xFrequency = 1000 / portTICK_PERIOD_MS;
  xLastWakeTime = xTaskGetTickCount();
  for (;;) {
    xTaskDelayUntil(&xLastWakeTime, xFrequency);
    time_t now = get_epoch_time();
    if (now == 0)
      continue;
    // keep track of the relays state
    xSemaphoreTake(configMutex, portMAX_DELAY);
    xSemaphoreTake(stateMutex, portMAX_DELAY);
    auto valvesState = calculateCurrentValveStates(mac, config, state, now);
    xSemaphoreGive(stateMutex);
    xSemaphoreGive(configMutex);
    applyCurrentValveState(valvesState);
  }
}