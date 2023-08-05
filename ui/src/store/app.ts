import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@home-management/lib/types/socket";
import { defineStore } from "pinia";
import { Socket, io } from "socket.io-client";

interface AppStore {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
}

const v4exact =
  /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
const domainexact =
  /^(?:(?!-)[A-Za-z\d-]{1,63}(?<!-)\.)+(?![\d-])[A-Za-z\d-]{2,63}(?<!-)\.?$/;

export const useAppStore = defineStore("app", (): AppStore => {
  const ip = import.meta.env.VITE_SERVER_IP;
  if (ip === undefined || (!v4exact.test(ip) && !domainexact.test(ip)))
    throw new Error("IP is undefined or invalid");
  const port = import.meta.env.VITE_SERVER_PORT;
  if (import.meta.env.DEV && (port === undefined || isNaN(Number(port))))
    throw new Error("Port is undefined or invalid");
  const socket = io(
    import.meta.env.DEV ? `http://${ip}:${port}` : `https://${ip}`,
  );
  return {
    socket,
  };
});
