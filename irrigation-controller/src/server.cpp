#include "server.h"
#include "config.h"
#include "irrigation.h"
#include "logging.h"
#include "state.h"

#include "html_begin.pp"
#include "index.html"
#include "html_end.pp"

// #include <AsyncElegantOTA.h>
#include <AsyncJson.h>

const char *stateToString[] = {stringify(Running), stringify(Updating)};
AsyncWebServer server(80);
DeviceState deviceState = Running;

StaticJsonDocument<1000> makeDoc() {
  StaticJsonDocument<1000> doc;
  doc["TimeStamp"] = esp_timer_get_time();
  doc["FreeMemory"] = ESP.getFreeHeap();
  doc["State"] = stateToString[deviceState];
  doc["Mac"] = ETH.macAddress();
  doc["Commit"] = COMMIT_HASH;
  doc["CompilationTime"] = COMPILATION_TIME;
  return doc;
}

void start_server() {
  server.onNotFound([](AsyncWebServerRequest *request) { request->send(404); });
  // server index html
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) { request->send(200, "text/html", html_page); });
  server.on("/restart", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "text/plain", "Restarting");
    ESP.restart();
  });
  server.on("/mac", HTTP_GET, [](AsyncWebServerRequest *request) { request->send(200, "text/plain", mac); });
  server.on("/state", HTTP_GET, [](AsyncWebServerRequest *request) {
    AsyncResponseStream *response = request->beginResponseStream("application/json");
    serializeJson(makeDoc(), *response);
    request->send(response);
  });
  server.on("/api/config", HTTP_GET, [](AsyncWebServerRequest *request) {
    AsyncResponseStream *response = request->beginResponseStream("application/json");
    serializeJson(config.toJson(), *response);
    request->send(response);
  });
  auto configHandler = new AsyncCallbackJsonWebHandler(
      "/api/config",
      [](AsyncWebServerRequest *request, JsonVariant &json) {
        logger_printf("Got config update from %s\n", request->client()->remoteIP().toString().c_str());
        auto res = config.fromJson(json);
        if (!res.has_value())
          request->send(200, "text/plain", "success");
        else
          request->send(400, "text/plain", res.value().c_str());
      },
      10000);
  configHandler->setMethod(HTTP_POST);
  server.addHandler(configHandler);
  server.on("/api/state", HTTP_GET, [](AsyncWebServerRequest *request) {
    AsyncResponseStream *response = request->beginResponseStream("application/json");
    serializeJson(state.toJson(), *response);
    request->send(response);
  });
  auto stateHandler = new AsyncCallbackJsonWebHandler(
      "/api/state",
      [](AsyncWebServerRequest *request, JsonVariant &json) {
        logger_printf("Got state update from %s\n", request->client()->remoteIP().toString().c_str());
        auto res = state.fromJson(json);
        if (!res.has_value())
          request->send(200, "text/plain", "success");
        else
          request->send(400, "text/plain", res.value().c_str());
      },
      10000);
  stateHandler->setMethod(HTTP_POST);
  server.addHandler(stateHandler);
  server.on("^\\/api\\/relay\\/([0-9]+)\\/(on|off)$", HTTP_GET, [](AsyncWebServerRequest *request) {
    int relayNum = request->pathArg(0).toInt();
    bool relayAction = request->pathArg(1).equals("on");
    // set the relay
    if (relayNum < 1 || relayNum > 8) {
      request->send(400, "text/plain", "Bad Request. Relay number must be between 1 and 8");
      return;
    }
    if (relayAction)
      relay.turn_on_channel(relayNum);
    else
      relay.turn_off_channel(relayNum);
    request->send(200, "text/plain", "success");
  });
  server.on("^\\/api\\/valve\\/([0-9]+)\\/(on|off)$", HTTP_GET, [](AsyncWebServerRequest *request) {
    int valveID = request->pathArg(0).toInt();
    bool valveAction = request->pathArg(1).equals("on");
    // set the relay
    valve_t *valve = config.getValve(valveID);
    if (valve == NULL) {
      request->send(400, "text/plain", "No such valve");
      return;
    }
    if (config.getDevice(valve->deviceID)->mac != mac) {
      request->send(200, "text/plain");
      return;
    }
    if (valveAction)
      relay.turn_on_channel(valve->relay);
    else
      relay.turn_off_channel(valve->relay);
    request->send(200, "text/plain", "success");
  });

  // AsyncElegantOTA.begin(&server);
  server.begin();
}

bool stop_server() {
  server.end();
  return true;
}