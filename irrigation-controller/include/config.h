#ifndef _CONFIG_H
#define _CONFIG_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <map>

typedef uint device_id_t;
typedef struct {
  device_id_t id;
  String name;
  std::array<char, 18> mac;
} device_t;

typedef uint valve_id_t;
typedef struct {
  valve_id_t id;
  String name;
  device_id_t deviceID;
  uint8_t relay;
} valve_t;

typedef struct {
  String name;
  int duration;
  std::vector<valve_id_t> valveIDs;
} job_t;

typedef uint sequence_id_t;
typedef struct {
  sequence_id_t id;
  String name;
  std::vector<job_t> jobs;

  std::optional<job_t> getCurrentJob(int offset);
} sequence_t;

typedef uint event_id_t;
typedef uint event_priority_t;
typedef struct {
  event_id_t id;
  String name;
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
  String Timezone;

  device_t *getDevice(device_id_t id);
  valve_t *getValve(valve_id_t id);
  sequence_t *getSequence(sequence_id_t id);
  irrigation_event_t *getEvent(event_id_t id);
  DynamicJsonDocument toJson();
  std::optional<String> fromJson(JsonVariant &json);
};

extern Config config;
extern SemaphoreHandle_t configMutex;
extern std::array<char, 18> mac;

#endif