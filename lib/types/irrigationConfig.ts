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
export type Device = {
  id: DeviceID;
  name: string;
  mac: string;
};

export type ValveID = Branded<number, "ValveID">;
export const ValveID = (id: number | string): ValveID =>
  constrain(Number(id)) as ValveID;
export type Valve = {
  id: ValveID;
  deviceID: DeviceID;
  relay: number;
  name: string;
};

export type Job = {
  name: string;
  duration: number;
  valveIDs: ValveID[];
};

export type SequenceID = Branded<number, "SequenceID">;
export const SequenceID = (id: number | string): SequenceID =>
  constrain(Number(id)) as SequenceID;
export type Sequence = {
  id: SequenceID;
  name: string;
  jobs: Job[];
};

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
export const TimeTNow = (time: TimeT): Date => new Date(time * 1000);
export type Offset = Branded<number, "Offset">;
export const Offset = (offset: number): Offset =>
  constrain(offset, 0, 60 * 60 * 24) as Offset;
export type Event = {
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
};

export type Config = {
  devices: Device[];
  valves: Valve[];
  sequences: Sequence[];
  events: Event[];
  timezone: string;
};

export type DeviceConnection = {
  mac: string;
  ip: string;
};

export type SequenceExecutionType = "manual" | "scheduled";
export type SequenceExecutionBase<T extends SequenceExecutionType> = {
  sequenceID: SequenceID;
  currentJob: number;
  /** How the execution was started */
  startType: T;
};
export type SequenceExecutionManual = SequenceExecutionBase<"manual"> & {
  startTimestamp: TimeT;
};
export type SequenceExecutionScheduled = SequenceExecutionBase<"scheduled"> & {
  /** The event that started the execution */
  eventID: EventID;
};
export type SequenceExecution =
  | SequenceExecutionManual
  | SequenceExecutionScheduled;

export type ValveExecution = {
  valveID: ValveID;
  /** Seconds since epoch */
  startTimestamp: number;
  /** Diruation in seconds. -1 signifies forever */
  duration: number;
};

export type State = {
  devices: {
    [mac: string]: DeviceConnection;
  };
  valves: {
    [id: ValveID]: ValveExecution;
  };
  sequences: {
    [id: SequenceID]: SequenceExecution;
  };
};
