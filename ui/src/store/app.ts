import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/socket.js";
import { defineStore } from "pinia";
import { Socket, io } from "socket.io-client";

interface AppStore {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
}

export const useAppStore = defineStore("app", (): AppStore => {
  const socket = io(
    `http://${
      import.meta.env.DEV
        ? "localhost:3001"
        : import.meta.env.SERVER_IP + ":" + import.meta.env.SERVER_PORT
    }`
  );
  return {
    socket,
  };
});
