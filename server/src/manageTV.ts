import axios, { AxiosError } from "axios";

enum TVState {
  On = 1,
  Standby = 0,
}

let prevState: TVState = TVState.Standby;
let state: TVState = TVState.Standby;
let task: Promise<void> | null = null;
let cancel: boolean = false;

async function start(): Promise<void> {
  if (task != null) return;
  task = (async function () {
    // eslint-disable-next-line no-unmodified-loop-condition
    while (!cancel) {
      // get current time
      const now = process.hrtime();
      try {
        const res = await axios.get("http://10.200.10.133:8001/api/v2/", {
          timeout: 900,
        });
        prevState = state;
        state = TVState[res.data.device.PowerState as keyof typeof TVState];
        if (state !== prevState) {
          const command = state === TVState.On ? "down" : "up";
          console.log("TV state changed to:", command);
          await axios.post("http://10.200.10.35", command);
        }
      } catch (err: any) {
        if (err instanceof AxiosError) {
          if (err.code === "ECONNABORTED") state = 0;
          if (err.code === "ECONNREFUSED") state = 1;
        }
      }
      const diff = process.hrtime(now);
      const ms = diff[0] * 1000 + diff[1] / 1000000;
      if (ms < 1000)
        await new Promise((resolve) => setTimeout(resolve, 1000 - ms));
    }
  })();
  await task;
}

async function stop(): Promise<void> {
  cancel = true;
  await task;
}

export default {
  start,
  stop,
};
