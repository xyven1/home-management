#ifndef _LOGGING_H
#define _LOGGING_H

#include <Arduino.h>

void init_logging();
int logger_printf(const char *format, ...);
int log_time(struct tm *timeinfo, const char *format);

#endif