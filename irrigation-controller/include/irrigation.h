#ifndef _IRRIGATION_H
#define _IRRIGATION_H
#include <multi_channel_relay.h>

extern Multi_Channel_Relay relay;

void init_relay();
void vTaskIrrigationControl(void *pvParameters);

#endif