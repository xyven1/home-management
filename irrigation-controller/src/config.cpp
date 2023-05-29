#include "config.h"
#include <chrono>
#include <optional>

Config config;

Valve *Config::get_valve(valve_id_t id) {
  for (auto &valve : valves) {
    if (valve.id == id) {
      return &valve;
    }
  }
  return nullptr;
}

Sequence *Config::get_sequence(sequence_id_t id) {
  for (auto &sequence : sequences) {
    if (sequence.id == id) {
      return &sequence;
    }
  }
  return nullptr;
}

Event *Config::get_event(event_id_t id) {
  for (auto &event : events) {
    if (event.id == id) {
      return &event;
    }
  }
  return nullptr;
}

bool load_config() { return true; }

bool save_config() { return true; }

std::optional<Job> Event::getCurrentJob(time_t now) {
  //get hour minute and seocond from now
  struct tm timenowinfo;
  localtime_r(&now, &timenowinfo);
  if(now < start || now > end || !days[timenowinfo.tm_wday])
    return {};
  auto nowOffset = timenowinfo.tm_hour * 3600 + timenowinfo.tm_min * 60 + timenowinfo.tm_sec;
  nowOffset -= startOffset;
  if(nowOffset < 0)
    return {};
  auto sequence = config.get_sequence(sequenceID);
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
  for (auto &valve : this->valves) {
    JsonObject valveObj = valves.createNestedObject();
    valveObj["id"] = valve.id;
    valveObj["mac"] = valve.mac;
    valveObj["relay"] = valve.relay;
    valveObj["name"] = valve.name;
  }
  JsonArray sequences = doc.createNestedArray("sequences");
  for (auto &sequence : this->sequences) {
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
  for (auto &event : this->events) {
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
  return doc;
}