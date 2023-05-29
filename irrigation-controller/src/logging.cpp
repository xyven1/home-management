#include "logging.h"

int debug_printf(const char *format, ...) {
  char loc_buf[64];
  char *temp = loc_buf;
  va_list arg;
  va_list copy;
  va_start(arg, format);
  va_copy(copy, arg);
  int len = vsnprintf(temp, sizeof(loc_buf), format, copy);
  va_end(copy);
  if (len < 0) {
    va_end(arg);
    return 0;
  };
  if (len >= (int)sizeof(loc_buf)) { // comparation of same sign type for the compiler
    temp = (char *)malloc(len + 1);
    if (temp == NULL) {
      va_end(arg);
      return 0;
    }
    len = vsnprintf(temp, len + 1, format, arg);
  }
  va_end(arg);
  auto rLen = Serial.write((uint8_t *)temp, len);
  if (temp != loc_buf)
    free(temp);
  return rLen;
}