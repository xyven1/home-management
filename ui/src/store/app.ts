import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@home-management/lib/types/socket";
import { defineStore } from "pinia";
import { Socket, io } from "socket.io-client";
import { Ref, ref } from "vue";

type AppStore = {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  connected: Ref<boolean>;
  debug: Ref<any[]>;
};

export const useAppStore = defineStore("app", (): AppStore => {
  const debug = ref<any[]>([]);
  let oldLog: (...data: any[]) => void;
  if (typeof console != "undefined")
    if (typeof console.log != "undefined") oldLog = console.log;
    else oldLog = function () {};

  console.log = function (message) {
    oldLog(message);
    debug.value.push(message);
  };
  console.error = console.debug = console.info = console.log;
  const ip = location.hostname;
  const port = import.meta.env.VITE_SERVER_PORT;
  if (import.meta.env.DEV && (port === undefined || isNaN(Number(port))))
    throw new Error("Port is undefined or invalid");
  const socket = io(
    import.meta.env.DEV ? `http://${ip}:${port}` : `https://${ip}`,
  );
  const connected = ref(socket.connected);
  socket.on("disconnect", () => {
    connected.value = false;
  });
  socket.on("connect", () => {
    connected.value = true;
  });
  return {
    socket,
    connected,
    debug,
  };
});
