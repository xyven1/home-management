import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@home-management/lib/types/socket";
import { defineStore } from "pinia";
import { Socket, io } from "socket.io-client";
import { Ref, computed, ref, watch } from "vue";
import { useTheme } from "vuetify/lib/framework.mjs";

interface AppStore {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  darkMode: Ref<boolean>;
}

export const useAppStore = defineStore(
  "app",
  (): AppStore => {
    const socket = io(
      `http://${
        import.meta.env.DEV
          ? "localhost:3001"
          : "10.200.10.4:43434"
      }`,
    );
    const theme = useTheme();
    const darkMode = ref(false);
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
