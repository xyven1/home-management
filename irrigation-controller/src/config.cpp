#include "config.h"
#include "logging.h"
#include <chrono>
#include <optional>

Config config;
SemaphoreHandle_t configMutex;

device_t *Config::getDevice(device_id_t id) {
  try {
    return &Devices.at(id);
  } catch (std::out_of_range &e) {
    return nullptr;
  }
}
valve_t *Config::getValve(valve_id_t id) {
  try {
    return &Valves.at(id);
  } catch (std::out_of_range &e) {
    return nullptr;
  }
}

sequence_t *Config::getSequence(sequence_id_t id) {
  try {
    return &Sequences.at(id);
  } catch (std::out_of_range &e) {
    return nullptr;
  }
}

irrigation_event_t *Config::getEvent(event_id_t id) {
  try {
    return &Events.at(id);
  } catch (std::out_of_range &e) {
    return nullptr;
  }
}

std::optional<job_t> sequence_t::getCurrentJob(int offset) {
  if (offset < 0)
    return {};
  for (auto &job : jobs) {
    offset -= job.duration;
    if (offset < 0)
      return job;
  }
  return {};
}

std::optional<job_t> irrigation_event_t::getCurrentJob(time_t now) {
  // get hour minute and seocond from now
  struct tm timenowinfo;
  localtime_r(&now, &timenowinfo);
  if (now < start || now > end || !days[timenowinfo.tm_wday])
    return {};
  auto nowOffset = timenowinfo.tm_hour * 3600 + timenowinfo.tm_min * 60 + timenowinfo.tm_sec - startOffset;
  auto sequence = config.getSequence(sequenceID);
  if (sequence == nullptr || sequence->jobs.size() == 0)
    return {};
  return sequence->getCurrentJob(nowOffset);
}

DynamicJsonDocument Config::toJson() {
  DynamicJsonDocument doc(1000);
  JsonArray devices = doc.createNestedArray("devices");
  JsonArray valves = doc.createNestedArray("valves");
  JsonArray sequences = doc.createNestedArray("sequences");
  JsonArray events = doc.createNestedArray("events");
  xSemaphoreTake(configMutex, portMAX_DELAY);
  for (auto &[id, device] : Devices) {
    JsonObject deviceObj = devices.createNestedObject();
    deviceObj["id"] = device.id;
    deviceObj["name"] = device.name;
    deviceObj["mac"] = device.mac;
  }
  for (auto &[id, valve] : Valves) {
    JsonObject valveObj = valves.createNestedObject();
    valveObj["id"] = valve.id;
    valveObj["deviceID"] = valve.deviceID;
    valveObj["relay"] = valve.relay;
    valveObj["name"] = valve.name;
  }
  for (auto &[id, sequence] : Sequences) {
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
  for (auto &[id, event] : Events) {
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
  xSemaphoreGive(configMutex);
  return doc;
}

std::optional<String> Config::fromJson(JsonVariant &json) {
  JsonArray devices = json["devices"];
  if (devices == NULL)
    return "No devices";
  JsonArray valves = json["valves"];
  if (valves == NULL)
    return "No valves";
  JsonArray events = json["events"];
  if (events == NULL)
    return "No events";
  JsonArray sequences = json["sequences"];
  if (sequences == NULL)
    return "No sequences";
  Config newConfig;
  for (const auto &device : devices) {
    device_t d;
    d.id = device["id"];
    auto m = device["mac"].as<const char *>();
    if (m == NULL || strlen(m) != 17)
      return "Bad mac";
    strcpy(d.mac, m);
    d.name = device["name"].as<String>();
    newConfig.Devices.emplace(d.id, d);
  }

  for (const auto &valve : valves) {
    valve_t v;
    v.id = valve["id"];
    v.deviceID = valve["deviceID"];
    v.relay = valve["relay"].as<int>();
    v.name = valve["name"].as<String>();
    newConfig.Valves.emplace(v.id, v);
  }
  for (const auto &sequence : sequences) {
    sequence_t s;
    s.id = sequence["id"];
    s.name = sequence["name"].as<String>();
    JsonArray jobs = sequence["jobs"];
    for (const auto &job : jobs) {
      job_t j;
      j.name = job["name"].as<String>();
      j.duration = job["duration"];
      JsonArray valveIDs = job["valveIDs"];
      for (const auto &valveID : valveIDs) {
        j.valveIDs.push_back(valveID);
      }
      s.jobs.push_back(j);
    }
    newConfig.Sequences.emplace(s.id, s);
  }
  for (const auto &event : events) {
    irrigation_event_t e;
    e.id = event["id"];
    e.name = event["name"].as<String>();
    e.priority = event["priority"];
    e.sequenceID = event["sequenceID"];
    e.startOffset = event["startOffset"];
    JsonArray days = event["days"];
    if (days.size() != 7)
      return "Bad days length";
    for (int i = 0; i < 7; i++)
      e.days[i] = days[i];
    e.start = event["start"];
    e.end = event["end"];
    newConfig.Events.emplace(e.id, e);
  }
  newConfig.Timezone = json["timezone"].as<String>();
  // at this point we have a valid config. Assign it to this
  xSemaphoreTake(configMutex, portMAX_DELAY);
  // this->Devices = newConfig.Devices;
  // this->Valves = newConfig.Valves;
  // this->Sequences = newConfig.Sequences;
  // this->Events = newConfig.Events;
  // this->Timezone = newConfig.Timezone;
  *this = newConfig;
  xSemaphoreGive(configMutex);
  return {};
}