#include "config.h"
#include "irrigation.h"

Multi_Channel_Relay relay;

void init_relay() {
  Wire.setPins(13, 16);
  relay.begin(0x11);
}

void vTaskIrrigationControl(void *pvParameters) {
  for (;;) {
  }
}