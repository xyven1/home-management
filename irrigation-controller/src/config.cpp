#include "config.h"
#include <chrono>
#include <optional>

Config config;

valve_t *Config::getValve(valve_id_t id) {
  for (auto &valve : Valves)
    if (valve.id == id)
      return &valve;
  return NULL;
}

sequence_t *Config::getSequence(sequence_id_t id) {
  for (auto &sequence : Sequences)
    if (sequence.id == id)
      return &sequence;
  return NULL;
}

irrigation_event_t *Config::getEvent(event_id_t id) {
  for (auto &event : Events)
    if (event.id == id)
      return &event;
  return NULL;
}

std::optional<job_t> irrigation_event_t::getCurrentJob(time_t now) {
  // get hour minute and seocond from now
  struct tm timenowinfo;
  localtime_r(&now, &timenowinfo);
  if (now < start || now > end || !days[timenowinfo.tm_wday])
    return {};
  auto nowOffset = timenowinfo.tm_hour * 3600 + timenowinfo.tm_min * 60 + timenowinfo.tm_sec;
  nowOffset -= startOffset;
  if (nowOffset < 0)
    return {};
  auto sequence = config.getSequence(sequenceID);
  if (sequence == nullptr || sequence->jobs.size() == 0)
    return {};
  for (auto &job : sequence->jobs) {
    nowOffset -= job.duration;
    if (nowOffset < 0)
      return job;
  }
  return {};
}

DynamicJsonDocument Config::toJson() {
  DynamicJsonDocument doc(1000);
  JsonArray valves = doc.createNestedArray("valves");
  for (auto &valve : Valves) {
    JsonObject valveObj = valves.createNestedObject();
    valveObj["id"] = valve.id;
    valveObj["mac"] = valve.mac;
    valveObj["relay"] = valve.relay;
    valveObj["name"] = valve.name;
  }
  JsonArray sequences = doc.createNestedArray("sequences");
  for (auto &sequence : Sequences) {
    JsonObject sequenceObj = sequences.createNestedObject();
    sequenceObj["id"] = sequence.id;
    sequenceObj["name"] = sequence.name;
    JsonArray jobs = sequenceObj.createNestedArray("jobs");
    for (auto &job : sequence.jobs) {
      JsonObject jobObj = jobs.createNestedObject();
      jobObj["name"] = job.name;
      jobObj["duration"] = job.duration;
      JsonArray valveIDs = jobObj.createNestedArray("valveIDs");
      for (auto &valveID : job.valveIDs) {
        valveIDs.add(valveID);
      }
    }
  }
  JsonArray events = doc.createNestedArray("events");
  for (auto &event : Events) {
    JsonObject eventObj = events.createNestedObject();
    eventObj["id"] = event.id;
    eventObj["name"] = event.name;
    eventObj["priority"] = event.priority;
    eventObj["sequenceID"] = event.sequenceID;
    eventObj["startOffset"] = event.startOffset;
    JsonArray days = eventObj.createNestedArray("days");
    for (auto &day : event.days) {
      days.add(day);
    }
    eventObj["start"] = event.start;
    eventObj["end"] = event.end;
  }
  doc["Timezone"] = Timezone;
  return doc;
}

bool Config::fromJson(JsonVariant &json) {
  JsonArray valves = json["valves"];
  if (valves == NULL)
    return false;
  for (const auto &valve : valves) {
    valve_t v;
    v.id = valve["id"];
    auto m = valve["mac"];
    if (m == NULL || strlen(m) != 18)
      return false;
    strcpy(v.mac, m);
    v.relay = valve["relay"];
    v.name = valve["name"];
    Valves.push_back(v);
  }
  JsonArray sequences = json["sequences"];
  if (sequences == NULL)
    return false;
  for (const auto &sequence : sequences) {
    sequence_t s;
    s.id = sequence["id"];
    s.name = sequence["name"];
    JsonArray jobs = sequence["jobs"];
    for (const auto &job : jobs) {
      job_t j;
      j.name = job["name"];
      j.duration = job["duration"];
      JsonArray valveIDs = job["valveIDs"];
      for (const auto &valveID : valveIDs) {
        j.valveIDs.push_back(valveID);
      }
      s.jobs.push_back(j);
    }
    Sequences.push_back(s);
  }
  JsonArray events = json["events"];
  if (events == NULL)
    return false;
  for (const auto &event : events) {
    irrigation_event_t e;
    e.id = event["id"];
    e.name = event["name"];
    e.priority = event["priority"];
    e.sequenceID = event["sequenceID"];
    e.startOffset = event["startOffset"];
    JsonArray days = event["days"];
    if (days.size() != 7)
      return false;
    for (int i = 0; i < 7; i++)
      e.days[i] = days[i];
    e.start = event["start"];
    e.end = event["end"];
    Events.push_back(e);
  }
  Timezone = json["Timezone"];
  return true;
}