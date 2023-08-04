import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@home-management/lib/types/socket";
import { defineStore } from "pinia";
import { Socket, io } from "socket.io-client";
import { Ref, ref, watch } from "vue";
import { useTheme } from "vuetify/lib/framework.mjs";

interface AppStore {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  darkMode: Ref<boolean>;
}

const v4exact = new RegExp(
  `^(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}$`,
);

export const useAppStore = defineStore(
  "app",
  (): AppStore => {
    const ip = v4exact.test(import.meta.env.VITE_SERVER_IP)
      ? import.meta.env.VITE_SERVER_IP
      : undefined;
    const port = !isNaN(Number(import.meta.env.VITE_SERVER_PORT))
      ? Number(import.meta.env.VITE_SERVER_PORT)
      : undefined;
    if (ip === undefined || port === undefined)
      throw new Error("Endpoint is undefined");
    const socket = io(`http://${ip}:${port}`);
    const theme = useTheme();
    const darkMode = ref(true);
    // watches are inplace of a computed property for darkMode, so persisting works
    watch(darkMode, (value) => {
      theme.global.name.value = value ? "dark" : "light";
    });
    watch(theme.global.name, (value) => {
      darkMode.value = value === "dark";
    });
    return {
      socket,
      darkMode,
    };
  },
  {
    persist: true,
  },
);
