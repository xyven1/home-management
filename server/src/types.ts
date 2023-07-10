import { type Server } from "socket.io";
import {
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "./socket.js";
export type DeviceInfo = any;

export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, unknown>,
  null
>;
