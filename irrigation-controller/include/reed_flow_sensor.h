#ifndef _REED_FLOW_SENSOR_H
#define _REED_FLOW_SENSOR_H

#include <Arduino.h>
#include <FunctionalInterrupt.h>

template <typename T, size_t N> class CircularBuffer {
private:
  T buffer[N];
  size_t start = 0;
  size_t length = 0;

public:
  CircularBuffer() = default;
  size_t wrap(size_t i) { return i % N; }
  size_t inc(size_t i) { return wrap(i + 1); }
  void push(T value) {
    if (full())
      return;
    buffer[wrap(start + length)] = value;
    length++;
  }
  T pop() {
    if (empty())
      return T();
    auto value = buffer[start];
    start = inc(start);
    length--;
    return value;
  }
  T &peek() { return buffer[start]; }
  T &peekEnd() { return buffer[wrap(start + length - 1)]; }
  size_t size() { return length; }
  bool empty() { return length == 0; }
  bool full() { return length == N; }
};

struct pusle_event_t {
  unsigned long time;
  int pulses;
};

class ReedFlowSensor {
public:
  ReedFlowSensor(int pin) : pin(pin){};
  void init() {
    pinMode(pin, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(pin), std::bind(&ReedFlowSensor::interruptHandler, this), FALLING);
  }
  static const int samplesPerSecond = 10;
  static const int oneSecond = 1000000;
  static const int samplesPerMinute = 60;
  static const int oneMinute = 60000000;
  CircularBuffer<pusle_event_t, samplesPerSecond> pulsesInLastSecond;
  int sumPulsesInLastSecond = 0;
  CircularBuffer<pusle_event_t, samplesPerMinute> pulsesInLastMinute;
  int sumPulsesInLastMinute = 0;
  // should be called as often as possible, up to samplesPerSecond times per second
  void update() {
    auto now = micros();
    while (!pulsesInLastSecond.empty() && pulsesInLastSecond.peek().time + oneSecond < now)
      sumPulsesInLastSecond -= pulsesInLastSecond.pop().pulses;
    while (!pulsesInLastMinute.empty() && pulsesInLastMinute.peek().time + oneMinute < now)
      sumPulsesInLastMinute -= pulsesInLastMinute.pop().pulses;
    auto pulsesCopy = pulses;
    pulses = 0;
    if (pulsesCopy == 0)
      return;
    sumPulsesInLastSecond += pulsesCopy;
    sumPulsesInLastMinute += pulsesCopy;
    auto &lastSampleInSecond = pulsesInLastSecond.peekEnd();
    if (lastSampleInSecond.time + oneSecond / samplesPerSecond < now) {
      if (pulsesInLastSecond.full())
        sumPulsesInLastSecond -= pulsesInLastSecond.pop().pulses;
      pulsesInLastSecond.push({now, pulsesCopy});
    } else
      lastSampleInSecond.pulses += pulsesCopy;
    auto &lastSampleInMinute = pulsesInLastMinute.peekEnd();
    if (lastSampleInMinute.time + oneMinute / samplesPerMinute < now) {
      if (pulsesInLastMinute.full())
        sumPulsesInLastMinute -= pulsesInLastMinute.pop().pulses;
      pulsesInLastMinute.push({now, pulsesCopy});
    } else
      lastSampleInMinute.pulses += pulsesCopy;
  }
  bool getPinState() { return digitalRead(pin); }
  int getTotalPulses() { return totalPulses; }
  int getPulsesPerSecond() { return sumPulsesInLastSecond; }
  int getPulsesPerMinute() { return sumPulsesInLastMinute; }

private:
  void interruptHandler() {
    totalPulses++;
    pulses++;
  }
  int pin;
  volatile int totalPulses = 0;
  volatile int pulses = 0;
};

#endif // _REED_FLOW_SENSOR_H