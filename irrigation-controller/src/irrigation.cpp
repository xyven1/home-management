#include "irrigation.h"
#include "config.h"
#include "esp_time_helpers.h"

#include <map>

Multi_Channel_Relay relay;

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
    if(now == 0)
      continue;
    // keep track of the relays state
    std::vector<bool> valve_state(config.Valves.size(), false);
    for (auto &event : config.Events) {
      auto sequence = config.getSequence(event.sequenceID);
      if (sequence == nullptr)
        continue;
      auto job_opt = event.getCurrentJob(now);
      if(!job_opt.has_value())
        continue;
      auto job = job_opt.value();
      if(job.valveIDs.size() == 0)
        continue;
      for (auto &valveID : job.valveIDs) {
        auto valve = config.getValve(valveID);
        if (valve == nullptr)
          continue;
        valve_state[valve->relay] = true;
      }
    }
    for (int i = 0; i < valve_state.size(); i++) {
      auto valve = config.getValve(i);
      if (valve == nullptr || mac != valve->mac)
        continue;
      if(valve_state[i])
        relay.turn_on_channel(i);
      else
        relay.turn_off_channel(i);
    }
  }
}