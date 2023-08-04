import { Branded } from "./brand";

function constrain(
  value: number,
  min: number = 0,
  max: number = 2 ** 31 - 1
): number {
  if (isNaN(value)) {
    return 0;
  }
  return Math.floor(Math.max(Math.min(value, max), min));
}

export type DeviceID = Branded<number, "DeviceID">;
export const DeviceID = (id: number | string): DeviceID =>
  constrain(Number(id)) as DeviceID;
export interface Device {
  id: DeviceID;
  name: string;
  mac: string;
}

export type ValveID = Branded<number, "ValveID">;
export const ValveID = (id: number | string): ValveID =>
  constrain(Number(id)) as ValveID;
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

export type SequenceID = Branded<number, "SequenceID">;
export const SequenceID = (id: number | string): SequenceID =>
  constrain(Number(id)) as SequenceID;
export interface Sequence {
  id: SequenceID;
  name: string;
  jobs: Job[];
}

export type EventID = Branded<number, "EventID">;
export const EventID = (id: number): EventID => constrain(id) as EventID;
export type EventPriority = Branded<number, "EventPriority">;
export const toEventPriority = (priority: number | string): EventPriority =>
  constrain(Number(priority)) as EventPriority;

export type TimeT = Branded<number, "TimeT">;
/**
 * @param time Time in seconds since unix epoch
 */
export const TimeT = (time: number): TimeT =>
  constrain(time, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER) as TimeT;
export type Offset = Branded<number, "Offset">;
export const Offset = (offset: number): Offset =>
  constrain(offset, 0, 60 * 60 * 24) as Offset;
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
  start: TimeT;
  end: TimeT;
}

export interface Config {
  devices: Device[];
  valves: Valve[];
  sequences: Sequence[];
  events: Event[];
  timezone: string;
}

export interface DeviceConnection {
  mac: string;
  ip: string;
}

export interface SequenceExecution {
  sequenceID: SequenceID;
  /** Seconds since epoch */
  startTimestamp: number;
  /** How the execution was started */
  startType: "manual" | "scheduled";
}

export interface ValveExecution {
  valveID: ValveID;
  /** Seconds since epoch */
  startTimestamp: number;
  /** Diruation in seconds. -1 signifies forever */
  duration: number;
}

export interface State {
  devices: {
    [mac: string]: DeviceConnection;
  };
  valves: {
    [id: ValveID]: ValveExecution;
  };
  sequences: {
    [id: SequenceID]: SequenceExecution;
  };
}
