#include "irrigation.h"
#include "config.h"
#include "logging.h"
#include "esp_time_helpers.h"

#include <map>

Multi_Channel_Relay relay;

struct valve_state_t {
  event_priority_t priority = 0;
  bool state = false;
};

void init_relay() {
  Wire.setPins(13, 16);
  relay.begin(0x11);
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
    valve_state_t valve_state[8];
    // std::map<valve_id_t, valve_state_t> valve_state;
    xSemaphoreTake(configMutex, portMAX_DELAY);
    for (auto &[id, event] : config.Events) {
      auto job_opt = event.getCurrentJob(now);
      if (!job_opt.has_value())
        continue;
      auto job = job_opt.value();
      if (job.valveIDs.size() == 0)
        continue;
      for (auto &valveID : job.valveIDs) {
        auto valve = config.getValve(valveID);
        if (valve == nullptr || strcmp(config.getDevice(valve->deviceID)->mac, mac) || valve->relay < 1 || valve->relay > 8)
          continue;
        logger_printf("Valve %d is valid. Event prio: %d, current prio: %d\n", valveID, event.priority, valve_state[valve->relay - 1].priority);
        if (valve_state[valve->relay - 1].priority < event.priority) {
          valve_state[valve->relay - 1].priority = event.priority;
          valve_state[valve->relay - 1].state = true;
        }
      }
    }
    xSemaphoreGive(configMutex);
    for (int i = 0; i < 8; i++) {
      if (valve_state[i].state)
        relay.turn_on_channel(i + 1);
      else
        relay.turn_off_channel(i + 1);
    }
  }
}