#ifndef _CONFIG_H
#define _CONFIG_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <vector>

typedef uint valve_id_t;
class Valve {
public:
  const valve_id_t id;
  const char mac[18];
  int relay;
  const char *name;
};

class Job {
public:
  const char *name;
  int duration;
  std::vector<valve_id_t> valveIDs;
};

typedef uint sequence_id_t;
class Sequence {
public:
  const sequence_id_t id;
  const char *name;
  std::vector<Job> jobs;
};

typedef uint event_id_t;
typedef uint event_priority_t;
class Event {
public:
  const event_id_t id;
  const char *name;
  event_priority_t priority;
  sequence_id_t sequenceID;
  int startOffset;
  bool days[7];
  time_t start;
  time_t end;

  std::optional<Job> getCurrentJob(time_t now);
};

class Config {
public:
  std::vector<Valve> valves;
  std::vector<Sequence> sequences;
  std::vector<Event> events;
  char *timezone;

  Valve* get_valve(valve_id_t id);
  Sequence* get_sequence(sequence_id_t id);
  Event* get_event(event_id_t id);
  DynamicJsonDocument toJson();
};

extern Config config;
extern char mac[18];

bool load_config();
bool save_config();

#endif