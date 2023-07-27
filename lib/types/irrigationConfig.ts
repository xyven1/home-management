export type DeviceID = number;
export interface Device {
  id: DeviceID;
  name: string;
  mac: string;
}

export type ValveID = number;
export interface Valve {
  id: ValveID;
  deviceID: DeviceID;
  relay: number;
  name: string;
}

export interface Job {
  name: string;
  duration: number;
  valveIDs: ValveID[];
}

export type SequenceID = number;
export interface Sequence {
  id: SequenceID;
  name: string;
  jobs: Job[];
}

export type EventID = number;
export type EventPriority = number;
export interface Event {
  id: EventID;
  name: string;
  priority: EventPriority;
  sequenceID: SequenceID;
  startOffset: number;
  days: [
    Sunday: boolean,
    Monday: boolean,
    Tuesday: boolean,
    Wednesday: boolean,
    Thursday: boolean,
    Friday: boolean,
    Saturday: boolean,
  ];
  start: number;
  end: number;
}

export interface Config {
  devices: Device[];
  valves: Valve[];
  sequences: Sequence[];
  events: Event[];
  timezone: string;
}
