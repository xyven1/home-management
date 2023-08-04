import * as Irrigation from "./irrigationConfig.js";
import { type Branded } from "./brand.js";

export type SerialNumber = Branded<string, "SerialNumber">;

export interface Device {
  name: string;
  serialNumber: SerialNumber;
  ip: string;
  port: number;
}

export interface Switch {
  name: string;
  serialNumber: SerialNumber;
  state: number;
  brightness?: number;
}

export interface Region {
  d: string;
  title: string;
  sn: SerialNumber;
  stroke?: number;
  sw?: Switch;
}
export interface SvgLayer {
  name: string;
  regions: Region[];
  background?: { name: string };
}

export type Svg = SvgLayer[];

export interface DeviceState {
  BinaryState: number;
  brightness?: number;
}

export type WsResponse<T = void> =
  | (T extends void ? { ok: true } : { ok: true; value: T })
  | { ok: false; err: string };

export enum TVPosition {
  Up,
  Down,
}

export interface ClientToServerEvents {
  // for audio
  getAudioInput: (wsCallback: (input: string) => void) => void;
  changeInput: (input: string, wsCallback: (res: string) => void) => void;
  getAudioVolume: (wsCallback: (volume: number) => void) => void;
  changeVolume: (volume: number, wsCallback: (res: string) => void) => void;
  // for tv
  setTVPosition: (position: TVPosition, wsCallback: () => void) => void;
  // for lights
  getSwitches: (wsCallback: (switches: Switch[]) => void) => void;
  getSwitch: (
    sn: SerialNumber,
    wsCallback: (sw: WsResponse<Switch>) => void
  ) => void;
  toggleSwitch: (
    sn: SerialNumber,
    wsCallback: (res: WsResponse<DeviceState>) => void
  ) => void;
  setSwitch: (
    sn: SerialNumber,
    state: number,
    wsCallback: (res: WsResponse<DeviceState>) => void
  ) => void;
  setBrightness: (
    sn: SerialNumber,
    brightness: number,
    wsCallback: (res: WsResponse<DeviceState>) => void
  ) => void;
  setAllSwitches: (
    state: number,
    wsCallback: (res: WsResponse<DeviceState[]>) => void
  ) => void;
  // for svg
  setSvg: (region: Region, wsCallback: (res: WsResponse) => void) => void;
  getSvg: (wsCallback: (svg: Svg) => void) => void;
  // for irrigation
  setIrrigationRelay: (
    mac: string,
    relay: number,
    state: boolean,
    wsCallback: (res: WsResponse) => void
  ) => void;
  setIrrigationValveState: (
    valveID: Irrigation.ValveID,
    state: boolean,
    duration: number,
    wsCallback: (res: WsResponse<Irrigation.ValveExecution | null>) => void
  ) => void;
  setIrrigationSequenceState: (
    sequenceID: Irrigation.SequenceID,
    state: boolean,
    wsCallback: (res: WsResponse<Irrigation.SequenceExecution | null>) => void
  ) => void;
  getIrrigationState: (wsCallback: (state: Irrigation.State) => void) => void;
  getIrrigationConfig: (
    wsCallback: (config: Irrigation.Config) => void
  ) => void;
  setIrrigationConfig: (
    config: Irrigation.Config,
    wsCallback: (res: WsResponse) => void
  ) => void;
}
export interface ServerToClientEvents {
  // for audio
  // for lights
  stateChange: (sn: SerialNumber, state: number) => void;
  brightnessChange: (sn: SerialNumber, brightness: number) => void;
  // for irrigation
  irrigationConfigChange: (config: Irrigation.Config) => void;
  irrigationStateChange: (state: Irrigation.State) => void;
}
