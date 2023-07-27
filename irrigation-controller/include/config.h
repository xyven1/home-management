#ifndef _CONFIG_H
#define _CONFIG_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <map>

typedef uint device_id_t;
typedef struct {
  device_id_t id;
  std::string name;
  char mac[18];
} device_t;

typedef uint valve_id_t;
typedef struct {
  valve_id_t id;
  std::string name;
  device_id_t deviceID;
  uint8_t relay;
} valve_t;

typedef struct {
  std::string name;
  int duration;
  std::vector<valve_id_t> valveIDs;
} job_t;

typedef uint sequence_id_t;
typedef struct {
  sequence_id_t id;
  std::string name;
  std::vector<job_t> jobs;
} sequence_t;

typedef uint event_id_t;
typedef uint event_priority_t;
typedef struct {
  event_id_t id;
  std::string name;
  event_priority_t priority;
  sequence_id_t sequenceID;
  int startOffset;
  bool days[7];
  time_t start;
  time_t end;

  std::optional<job_t> getCurrentJob(time_t now);
} irrigation_event_t;

class Config {
public:
  std::map<valve_id_t, valve_t> Valves;
  std::map<sequence_id_t, sequence_t> Sequences;
  std::map<event_id_t, irrigation_event_t> Events;
  std::map<device_id_t, device_t> Devices;
  std::string Timezone;

  device_t *getDevice(device_id_t id);
  valve_t *getValve(valve_id_t id);
  sequence_t *getSequence(sequence_id_t id);
  irrigation_event_t *getEvent(event_id_t id);
  DynamicJsonDocument toJson();
  std::optional<std::string> fromJson(JsonVariant &json);
};

extern Config config;
extern SemaphoreHandle_t configMutex;
extern char mac[18];

#endif