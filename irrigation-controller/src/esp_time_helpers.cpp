#include "esp_time_helpers.h"

#include <Arduino.h>
#include "time.h"
#include "logging.h"

void set_timezone(String timezone){
  logger_printf("  Setting Timezone to %s\n",timezone.c_str());
  setenv("TZ",timezone.c_str(),1);  //  Now adjust the TZ.  Clock settings are adjusted to show the new local time
  tzset();
}

void initTime(String timezone){
  struct tm timeinfo;

  logger_printf("Setting up time\n");
  configTime(0, 0, "pool.ntp.org");    // First connect to NTP server, with 0 TZ offset
  if(!getLocalTime(&timeinfo)){
    logger_printf("  Failed to obtain time\n");
    return;
  }
  logger_printf("  Got the time from NTP\n");
  // Now we can set the real timezone
  set_timezone(timezone);
  print_local_time();
}

void print_local_time(){
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)){
    logger_printf("Failed to obtain time 1\n");
    return;
  }
  time_t now;
  time(&now);
  logger_printf("Local time: %ld", now);
  log_time(&timeinfo, "%A, %B %d %Y %H:%M:%S zone %Z %z \n");
}

time_t get_epoch_time() {
  time_t now;
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo))
    return(0);
  time(&now);
  return now;
}
