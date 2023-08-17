#include <Arduino.h>
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include <ETH.h>

#include "config.h"
#include "esp_time_helpers.h"
#include "irrigation.h"
#include "logging.h"
#include "secrets.h"
#include "server.h"
#include "state.h"

#define HOSTNAME "makeitwet-"

// function headers
void ArduinoEvent(WiFiEvent_t event);
void vTaskUpdater(void *pvParameters);

// Globals
static portMUX_TYPE spinlock = portMUX_INITIALIZER_UNLOCKED;

// globals for ethernet connection
static bool eth_connected = false;
static bool wifi_connected = false;
std::array<char, 18> mac;
String hostname;

// Tasks
TaskHandle_t irrigationControlTask;

void setup() {
  // set mac address
  uint8_t mac_raw[6];
  esp_read_mac(mac_raw, ESP_MAC_WIFI_STA);
  snprintf(mac.data(), mac.size(), "%02X:%02X:%02X:%02X:%02X:%02X", mac_raw[0], mac_raw[1], mac_raw[2], mac_raw[3],
           mac_raw[4], mac_raw[5]);
  configMutex = xSemaphoreCreateMutex();
  stateMutex = xSemaphoreCreateMutex();
  char last3hex[7];
  sprintf(last3hex, "%02X%02X%02X", mac_raw[3], mac_raw[4], mac_raw[5]);
  hostname = HOSTNAME + String(last3hex);

  init_logging();
  logger_printf("%s starting setup.\n", hostname.c_str());
  // start ethernet
  WiFi.setHostname(hostname.c_str());
  WiFi.onEvent(ArduinoEvent);
  ETH.begin();

  // wait for connection
  for (int i = 0; i < 50 && !eth_connected; i++)
    delay(100);
  if (!eth_connected) {
    logger_printf("Ethernet connection failed. Attempting wifi connection\n");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
  while (!eth_connected && !wifi_connected)
    delay(100);

  init_relay();

  xTaskCreate(vTaskIrrigationControl, "IrrigationControl", 10000, NULL, 1, &irrigationControlTask);
  xTaskCreate(vTaskUpdater, "OTA", 10000, NULL, 5, NULL);

  if (!MDNS.begin(hostname.c_str())) {
    logger_printf("Error setting up MDNS responder!\n");
  } else {
    logger_printf("mDNS responder started\n");
    MDNS.addService("http", "tcp", 80);
  }
  start_server();
}

void loop() {}

// Handle ethernet/wifi events
void ArduinoEvent(arduino_event_id_t event) {
  switch (event) {
  // for ethernet
  case ARDUINO_EVENT_ETH_START:
    logger_printf("ETH Started\n");
    ETH.setHostname(hostname.c_str());
    break;
  case ARDUINO_EVENT_ETH_CONNECTED:
    logger_printf("ETH Connected\n");
    break;
  case ARDUINO_EVENT_ETH_GOT_IP:
    eth_connected = true;
    ArduinoOTA.begin();
    initTime("EST5EDT,M3.2.0,M11.1.0");
    break;
  case ARDUINO_EVENT_ETH_DISCONNECTED:
    logger_printf("ETH Disconnected\n");
    eth_connected = false;
    break;
  case ARDUINO_EVENT_ETH_STOP:
    logger_printf("ETH Stopped\n");
    eth_connected = false;
    break;
  // for wifi
  case SYSTEM_EVENT_STA_START:
    logger_printf("WiFi Started\n");
    break;
  case SYSTEM_EVENT_STA_CONNECTED:
    logger_printf("WiFi Connected\n");
    break;
  case SYSTEM_EVENT_STA_GOT_IP:
    logger_printf("WiFi Got IP: %s\n", WiFi.localIP().toString().c_str());
    wifi_connected = true;
    ArduinoOTA.begin();
    initTime("EST5EDT,M3.2.0,M11.1.0");
    break;
  case SYSTEM_EVENT_STA_DISCONNECTED:
    logger_printf("WiFi Disconnected\n");
    break;
  case SYSTEM_EVENT_STA_STOP:
    logger_printf("WiFi Stopped\n");
    break;
  default:
    break;
  }
}

// check for updates at 4 hz
void vTaskUpdater(void *pvParameters) {
  logger_printf("Starting OTA\n");
  ArduinoOTA
      .onStart([]() {
        logger_printf("Recieved updated request");

        vTaskSuspend(irrigationControlTask);
        deviceState = Updating;
        String type;
        if (ArduinoOTA.getCommand() == U_FLASH)
          type = "flash";
        else // U_SPIFFS
          type = "filesystem";
        // NOTE: if updating SPIFFS this would be the place to unmount SPIFFS using SPIFFS.end()
        logger_printf("Starting %s update\n", type);
      })
      .onEnd([]() {
        logger_printf("\nOTA complete\nStack usage by ota: %d bytes\nStack usage by motor control: %d bytes",
                      uxTaskGetStackHighWaterMark(xTaskGetHandle("OTA")),
                      uxTaskGetStackHighWaterMark(xTaskGetHandle("MotorControl")));
      })
      .onProgress([](unsigned int progress, unsigned int total) {
        logger_printf("Progress: %u%%\r", (progress / (total / 100)));
      })
      .onError([](ota_error_t error) {
        logger_printf("Error[%u]: ", error);
        if (error == OTA_AUTH_ERROR)
          logger_printf("Auth Failed\n");
        else if (error == OTA_BEGIN_ERROR)
          logger_printf("Begin Failed\n");
        else if (error == OTA_CONNECT_ERROR)
          logger_printf("Connect Failed\n");
        else if (error == OTA_RECEIVE_ERROR)
          logger_printf("Receive Failed\n");
        else if (error == OTA_END_ERROR)
          logger_printf("End Failed\n");
      });
  TickType_t xLastWakeTime;
  const TickType_t xFrequency = 250 / portTICK_PERIOD_MS;
  xLastWakeTime = xTaskGetTickCount();
  for (;;) {
    xTaskDelayUntil(&xLastWakeTime, xFrequency);
    ArduinoOTA.handle();
  }
}
