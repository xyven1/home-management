#include <Arduino.h>
#include <ArduinoOTA.h>
#include <ETH.h>

#include "irrigation.h"
#include "logging.h"
#include "secrets.h"
#include "server.h"

#define HOSTNAME "irrigation-controller"
#define IP_ADDR 10, 200, 70, 45

// function headers
void ArduinoEvent(WiFiEvent_t event);
void vTaskUpdater(void *pvParameters);

// Globals
static portMUX_TYPE spinlock = portMUX_INITIALIZER_UNLOCKED;

// globals for ethernet connection
static bool eth_connected = false;
static bool wifi_connected = false;
String mac = "de:ad:be:ef:fe:ed";
IPAddress local_ip(IP_ADDR);
IPAddress gateway(10, 200, 10, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress dns1(10, 200, 10, 1);
IPAddress dns2(1, 1, 1, 1);

// Synchronization objects

// Tasks
TaskHandle_t irrigationControlTask;

void setup() {
  Serial.begin(115200);
  debug_printf("Starting setup\n");
  // start ethernet
  WiFi.setHostname(HOSTNAME);
  WiFi.onEvent(ArduinoEvent);
  // if(!ETH.begin())
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  // Print ESP Local IP Address

  configTime(5 * 3600, 0, "pool.ntp.org");
  
  init_relay(); 

  xTaskCreate(vTaskIrrigationControl, "IrrigationControl", 10000, NULL, 1, &irrigationControlTask);
  xTaskCreate(vTaskUpdater, "OTA", 10000, NULL, 5, NULL);

  start_server();
}

void loop() {}

// Handle ethernet/wifi events
void ArduinoEvent(arduino_event_id_t event) {
  switch (event) {
  // for ethernet
  case ARDUINO_EVENT_ETH_START:
    debug_printf("ETH Started\n");
    ETH.setHostname(HOSTNAME);
    ETH.config(local_ip, gateway, subnet, dns1, dns2);
    break;
  case ARDUINO_EVENT_ETH_CONNECTED:
    debug_printf("ETH Connected\n");
    break;
  case ARDUINO_EVENT_ETH_GOT_IP:
    mac = ETH.macAddress();
    eth_connected = true;
    ArduinoOTA.begin();
    break;
  case ARDUINO_EVENT_ETH_DISCONNECTED:
    debug_printf("ETH Disconnected\n");
    eth_connected = false;
    break;
  case ARDUINO_EVENT_ETH_STOP:
    debug_printf("ETH Stopped\n");
    eth_connected = false;
    break;
  // for wifi
  case SYSTEM_EVENT_STA_START:
    debug_printf("WiFi Started\n");
    break;
  case SYSTEM_EVENT_STA_CONNECTED:
    debug_printf("WiFi Connected\n");
    break;
  case SYSTEM_EVENT_STA_GOT_IP:
    debug_printf("WiFi Got IP: %s\n", WiFi.localIP().toString().c_str());
    mac = WiFi.macAddress();
    wifi_connected = true;
    ArduinoOTA.begin();
    break;
  case SYSTEM_EVENT_STA_DISCONNECTED:
    debug_printf("WiFi Disconnected\n");
    break;
  case SYSTEM_EVENT_STA_STOP:
    debug_printf("WiFi Stopped\n");
    break;
  default:
    break;
  }
}

// check for updates at 4 hz
void vTaskUpdater(void *pvParameters) {
  debug_printf("Starting OTA\n");
  ArduinoOTA
      .onStart([]() {
        debug_printf("Recieved updated request");
        ws.enable(false);
        // Advertise connected clients what's going on'
        ws.textAll("OTA Update Started");
        // Close them
        ws.closeAll();

        vTaskSuspend(irrigationControlTask);
        state = Updating;
        String type;
        if (ArduinoOTA.getCommand() == U_FLASH)
          type = "flash";
        else // U_SPIFFS
          type = "filesystem";
        // NOTE: if updating SPIFFS this would be the place to unmount SPIFFS using SPIFFS.end()
        debug_printf("Starting %s update\n", type);
      })
      .onEnd([]() {
        debug_printf("\nOTA complete\nStack usage by ota: %d bytes\nStack usage by motor control: %d bytes",
                     uxTaskGetStackHighWaterMark(xTaskGetHandle("OTA")),
                     uxTaskGetStackHighWaterMark(xTaskGetHandle("MotorControl")));
      })
      .onProgress([](unsigned int progress, unsigned int total) {
        debug_printf("Progress: %u%%\r", (progress / (total / 100)));
      })
      .onError([](ota_error_t error) {
        debug_printf("Error[%u]: ", error);
        if (error == OTA_AUTH_ERROR)
          debug_printf("Auth Failed\n");
        else if (error == OTA_BEGIN_ERROR)
          debug_printf("Begin Failed\n");
        else if (error == OTA_CONNECT_ERROR)
          debug_printf("Connect Failed\n");
        else if (error == OTA_RECEIVE_ERROR)
          debug_printf("Receive Failed\n");
        else if (error == OTA_END_ERROR)
          debug_printf("End Failed\n");
      });
  TickType_t xLastWakeTime;
  const TickType_t xFrequency = 250 / portTICK_PERIOD_MS;
  xLastWakeTime = xTaskGetTickCount();
  for (;;) {
    xTaskDelayUntil(&xLastWakeTime, xFrequency);
    ArduinoOTA.handle();
  }
}
