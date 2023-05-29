#include "config.h"
#include "server.h"
#include "irrigation.h"
#include <AsyncElegantOTA.h>

const char *stateToString[] = {stringify(Running), stringify(Updating)};
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
State state = Running;

StaticJsonDocument<1000> makeDoc() {
  StaticJsonDocument<1000> doc;
  doc["TimeStamp"] = esp_timer_get_time();
  doc["FreeMemory"] = ESP.getFreeHeap();
  doc["State"] = stateToString[state];
  doc["Mac"] = ETH.macAddress();
  doc["Commit"] = COMMIT_HASH;
  doc["CompilationTime"] = COMPILATION_TIME;
  return doc;
}

void start_server(){
  ws.onEvent(onWSEvent);
  server.addHandler(&ws);
  server.onNotFound([](AsyncWebServerRequest *request) { request->send(404); });
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) { request->send(200, "text/plain", "Hello, world"); });
  server.on("/restart", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "text/plain", "Restarting");
    ESP.restart();
  });
  server.on("/state", HTTP_GET, [](AsyncWebServerRequest *request) {
    AsyncResponseStream *response = request->beginResponseStream("application/json");
    serializeJson(makeDoc(), *response);
    request->send(response);
  });
  server.on("^\\/api\\/relay\\/([0-9]+)\\/(on|off)$", HTTP_GET, [](AsyncWebServerRequest *request) {
    int relayNum = request->pathArg(0).toInt();
    bool relayAction = request->pathArg(1).equals("on");
    // set the relay
    if(relayNum < 1 || relayNum > 8){
      request->send(400, "text/plain", "Bad Request. Relay number must be between 1 and 8");
      return;
    }
    if(relayAction)
      relay.turn_on_channel(relayNum);
    else
      relay.turn_off_channel(relayNum);
    request->send(200, "text/plain", "success");
  });

  AsyncElegantOTA.begin(&server);
  server.begin();
}

bool stop_server() {
}

void onWSEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data,
             size_t len) {
  // Handle WebSocket event
}