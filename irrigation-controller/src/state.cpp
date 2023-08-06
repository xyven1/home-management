#include "state.h"
IrrigationState state;
SemaphoreHandle_t stateMutex;

DynamicJsonDocument IrrigationState::toJson() {
  DynamicJsonDocument doc(10000);
  JsonObject devices = doc.createNestedObject("devices");
  JsonObject valves = doc.createNestedObject("valves");
  JsonObject sequences = doc.createNestedObject("sequences");
  xSemaphoreTake(stateMutex, portMAX_DELAY);
  for (const auto &[id, device] : Devices) {
    JsonObject d = devices.createNestedObject(String(device.mac));
    d["ip"] = device.ip.toString();
    d["mac"] = device.mac;
  }
  for (const auto &[id, valve] : Valves) {
    JsonObject v = valves.createNestedObject(String(id));
    v["valveID"] = valve.valveID;
    v["startTimestamp"] = valve.startTimestamp;
    v["duration"] = valve.duration;
  }
  for (const auto &[id, sequence] : Sequences) {
    JsonObject s = sequences.createNestedObject(String(id));
    s["sequenceID"] = sequence.sequenceID;
    s["startTimestamp"] = sequence.startTimestamp;
    s["startType"] = sequence.startType;
  }
  xSemaphoreGive(stateMutex);
  return doc;
}

bool canConvertFromJson(JsonVariantConst src, const IPAddress &) {
  IPAddress ip;
  return ip.fromString(src.as<const char *>());
}
void convertFromJson(JsonVariantConst src, IPAddress &dst) { dst.fromString(src.as<const char *>()); }

std::optional<String> IrrigationState::fromJson(JsonVariant &json) {
  JsonObject devices = json["devices"].as<JsonObject>();
  if (devices == NULL)
    return "No devices";
  JsonObject valves = json["valves"].as<JsonObject>();
  if (valves == NULL)
    return "No valves";
  JsonObject sequences = json["sequences"].as<JsonObject>();
  if (sequences == NULL)
    return "No sequences";
  IrrigationState newState;
  for (auto kv : devices) {
    JsonObject device = kv.value().as<JsonObject>();
    if (device == NULL)
      return "Device not an object";
    device_connection_t d;
    JsonVariantConst ip = device["ip"];
    if (!ip.is<IPAddress>())
      return "Bad ip";
    d.ip = ip.as<IPAddress>();
    auto m = device["mac"].as<const char *>();
    if (m == NULL || strlen(m) != 17)
      return "Bad mac";
    strcpy(d.mac, m);
    newState.Devices.emplace(String(d.mac), d);
  }
  for (auto kv : valves) {
    JsonObject valve = kv.value().as<JsonObject>();
    if (valve == NULL)
      return "Valve not an object";
    valve_execution_t v;
    JsonVariant valveID = valve["valveID"];
    if (!valveID.is<uint>())
      return "Bad valveID";
    v.valveID = valveID;
    JsonVariant startTimestamp = valve["startTimestamp"];
    if (!startTimestamp.is<uint>())
      return "Bad startTimestamp";
    v.startTimestamp = startTimestamp;
    JsonVariant duration = valve["duration"];
    if (!duration.is<int>())
      return "Bad duration";
    v.duration = duration;
    newState.Valves.emplace(v.valveID, v);
  }
  for (auto kv : sequences) {
    JsonObject sequence = kv.value().as<JsonObject>();
    if (sequence == NULL)
      return "Sequence not an object";
    sequence_execution_t s;
    JsonVariant sequenceID = sequence["sequenceID"];
    if (!sequenceID.is<uint>())
      return "Bad sequenceID";
    s.sequenceID = sequenceID;
    JsonVariant startTimestamp = sequence["startTimestamp"];
    if (!startTimestamp.is<uint>())
      return "Bad startTimestamp";
    s.startTimestamp = startTimestamp;
    auto startType = sequence["startType"].as<const char *>();
    if (startType == NULL || (strcmp(startType, "manual") != 0 && strcmp(startType, "scheduled") != 0))
      return "Bad startType";
    strcpy(s.startType, startType);
    newState.Sequences.emplace(s.sequenceID, s);
  }
  xSemaphoreTake(stateMutex, portMAX_DELAY);
  *this = newState;
  xSemaphoreGive(stateMutex);
  return {};
}