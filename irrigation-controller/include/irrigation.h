#ifndef _IRRIGATION_H
#define _IRRIGATION_H
#include "reed_flow_sensor.h"
#include <multi_channel_relay.h>

extern Multi_Channel_Relay relay;
extern ReedFlowSensor flowSensor;

void init_relay();
void vTaskIrrigationControl(void *pvParameters);

#endif