#ifndef _SERVER_H
#define _SERVER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ETH.h>

#define stringify(name) #name

enum DeviceState {
  Running = 0,
  Updating,
};

extern AsyncWebServer server;
extern const char *stateToString[];
extern DeviceState deviceState;

StaticJsonDocument<1000> makeDoc();
void start_server();
bool stop_server();

#endif