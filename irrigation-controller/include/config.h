#ifndef _CONFIG_H
#define _CONFIG_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <vector>

typedef uint valve_id_t;
typedef struct {
  valve_id_t id;
  char mac[18];
  int relay;
  const char *name;
} valve_t;

typedef struct {
  const char *name;
  int duration;
  std::vector<valve_id_t> valveIDs;
} job_t;

typedef uint sequence_id_t;
typedef struct {
  sequence_id_t id;
  const char *name;
  std::vector<job_t> jobs;
} sequence_t;

typedef uint event_id_t;
typedef uint event_priority_t;
typedef struct  {
  event_id_t id;
  const char *name;
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
  std::vector<valve_t> Valves;
  std::vector<sequence_t> Sequences;
  std::vector<irrigation_event_t> Events;
  const char *Timezone;

  valve_t* getValve(valve_id_t id);
  sequence_t* getSequence(sequence_id_t id);
  irrigation_event_t* getEvent(event_id_t id);
  DynamicJsonDocument toJson();
  bool fromJson(JsonVariant &json);
};

extern Config config;
extern char mac[18];

#endif