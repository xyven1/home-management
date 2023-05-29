#ifndef _ESP_TIME_HELPERS_H
#define _ESP_TIME_HELPERS_H

#include <Arduino.h>

void set_timezone(String timezone);
void initTime(String timezone);
void print_local_time();
time_t get_epoch_time();

#endif