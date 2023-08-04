#ifndef _STATE_H
#define _STATE_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <config.h>
#include <map>

struct device_connection_t {
  char mac[18];
  IPAddress ip;
};

struct valve_execution_t {
  valve_id_t valveID;
  time_t startTimestamp;
  // Duration in seconds. -1 signifies forever
  int duration;
};

struct sequence_execution_t {
  sequence_id_t sequenceID;
  time_t startTimestamp;
  char startType[10];
};

class IrrigationState {
public:
  std::map<valve_id_t, valve_execution_t> Valves;
  std::map<sequence_id_t, sequence_execution_t> Sequences;
  std::map<String, device_connection_t> Devices;

  DynamicJsonDocument toJson();
  std::optional<String> fromJson(JsonVariant &json);
};

extern IrrigationState state;
extern SemaphoreHandle_t stateMutex;

#endif // _STATE_H