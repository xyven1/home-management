import { defineStore } from "pinia";
import { ref } from "vue";

export enum View {
  List,
  FloorPlan,
}

export const useLightsStore = defineStore(
  "lights",
  () => {
    return {
      layer: ref(0),
      view: ref(View.FloorPlan),
    };
  },
  {
    persist: true,
  },
);
