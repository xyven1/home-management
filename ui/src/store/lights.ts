import { defineStore } from "pinia";
import { ref } from "vue";

export const useLightsStore = defineStore(
  "lights",
  () => {
    return {
      layer: ref(0),
    };
  },
  {
    persist: true,
  },
);
