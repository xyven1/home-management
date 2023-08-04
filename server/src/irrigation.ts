import type * as Irrigation from "@home-management/lib/types/irrigationConfig.js";
import fs from "fs";
import mdnsCreate from "multicast-dns";
import fetch from "node-fetch";
import upath from "upath";
import { configPath } from "./environment.js";
import type { AppServer } from "./types.js";
import {
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@home-management/lib/types/socket.js";
import { type Socket } from "socket.io";

const mdns = mdnsCreate();
const hostname = "makeitwet-";

let config: Irrigation.Config = {
  events: [],
  sequences: [],
  valves: [],
  devices: [],
  timezone: "",
};

const devices = new Map<string, Irrigation.DeviceConnection>();
const valves = new Map<Irrigation.ValveID, Irrigation.ValveExecution>();
const sequences = new Map<
  Irrigation.SequenceID,
  Irrigation.SequenceExecution
>();
function getState(noScheduled: boolean = false): Irrigation.State {
  return {
    devices: Object.fromEntries(devices),
    valves: Object.fromEntries(valves),
    sequences: Object.fromEntries(
      [...sequences.entries()].filter(
        ([_, seq]) => !noScheduled || seq.startType === "manual"
      )
    ),
  };
}

const configJson = upath.join(configPath, "irrigationConfig.json");
// init svg file
if (!fs.existsSync(configPath))
  fs.mkdirSync(upath.join(configPath), { recursive: true });
if (!fs.existsSync(configJson))
  fs.writeFileSync(configJson, JSON.stringify(config, null, 2));
else config = JSON.parse(fs.readFileSync(configJson, "utf-8"));

function query(): void {
  mdns.query({
    questions: [
      {
        name: hostname + ".local",
        type: "A",
      },
    ],
  });
}

setInterval(query, 5000);
query();
export default (io: AppServer): void => {
  mdns.on("response", (response) => {
    response.answers.forEach((a) => {
      (async () => {
        if (a.type !== "A" || !a.name.startsWith(hostname)) return;
        const macRes = await fetch(`http://${a.data}/mac`);
        if (!macRes.ok) return;
        const macText = await macRes.text();
        devices.set(macText, { ip: a.data, mac: macText });
        io.emit("irrigationStateChange", getState());
        console.log("Found irrigation device at", a.data, "with mac", macText);
        // send config
        const configRes = await fetch(`http://${a.data}/api/config`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        });
        if (!configRes.ok)
          console.error(
            "Failed to send config to",
            a.data,
            configRes.status,
            await configRes.text()
          );
        // send state
        const stateRes = await fetch(`http://${a.data}/api/state`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(getState()),
        });
        if (!stateRes.ok)
          console.error(
            "Failed to send state to",
            a.data,
            stateRes.status,
            await stateRes.text()
          );
      })().finally(() => {});
    });
  });
  async function handleManualStatusUpdate(
    socket:
      | Socket<
          ClientToServerEvents,
          ServerToClientEvents,
          Record<string, unknown>,
          null
        >
      | undefined = undefined
  ): Promise<boolean> {
    if (socket != null)
      socket.broadcast.emit("irrigationStateChange", getState());
    else io.emit("irrigationStateChange", getState());
    return (
      await Promise.allSettled(
        [...devices.values()].map(async (device) => {
          const res = await fetch(`http://${device.ip}/api/state`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(getState(true)),
          });
          if (!res.ok) console.error(await res.text());
        })
      )
    ).every((s) => s.status === "fulfilled");
  }

  async function handleNewConfig(
    newConfig: Irrigation.Config,
    socket:
      | Socket<
          ClientToServerEvents,
          ServerToClientEvents,
          Record<string, unknown>,
          null
        >
      | undefined = undefined
  ): Promise<boolean> {
    config = newConfig;
    fs.writeFileSync(configJson, JSON.stringify(config, null, 2));
    if (socket != null) socket.broadcast.emit("irrigationConfigChange", config);
    else io.emit("irrigationConfigChange", config);
    const settled = await Promise.allSettled(
      [...devices.values()].map(async (device) => {
        const res = await fetch(`http://${device.ip}/api/config`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        });
        if (!res.ok) console.error(await res.text());
        console.log(
          "Sent config to",
          device.ip,
          "and recieved",
          await res.text()
        );
      })
    );
    return settled.every((s) => s.status === "fulfilled");
  }
  io.on("connection", (socket) => {
    console.log("a user connected");
    socket.on(
      "setIrrigationRelay",
      async (mac, relay, state, wsCallback = () => {}) => {
        const device = devices.get(mac);
        if (device == null) {
          wsCallback({ ok: false, err: "Device not found" });
          return;
        }
        const res = await fetch(
          `http://${device.ip}/api/relay/${relay}/${state ? "on" : "off"}`
        );
        wsCallback({ ok: res.ok, err: await res.text() });
      }
    );
    socket.on("getIrrigationConfig", (wsCallback) => {
      wsCallback(config);
    });
    socket.on("setIrrigationConfig", async (newConfig, wsCallback) => {
      const ok = await handleNewConfig(newConfig, socket);
      wsCallback({
        ok,
        err: "Failed to send config to all devices",
      });
    });
    socket.on("getIrrigationState", (wsCallback) => {
      wsCallback(getState());
    });
    socket.on(
      "setIrrigationValveState",
      async (valveID, state, duration, wsCallback) => {
        const valve = config.valves.find((v) => v.id === valveID);
        if (valve == null) {
          wsCallback({ ok: false, err: "Valve not found" });
          return;
        }
        const valveExecution = valves.get(valveID);
        if (
          (valveExecution !== undefined && state) ||
          (valveExecution === undefined && !state)
        ) {
          wsCallback({ ok: true, value: valveExecution ?? null });
          return;
        }
        let newValveExecution: Irrigation.ValveExecution | null = null;
        if (state) {
          newValveExecution = {
            valveID,
            startTimestamp: Math.floor(Date.now() / 1000),
            duration,
          };
          valves.set(valveID, newValveExecution);
        } else valves.delete(valveID);
        const ok = await handleManualStatusUpdate(socket);
        if (!ok)
          wsCallback({
            ok: false,
            err: "Failed to send state to all devices",
          });
        else wsCallback({ ok: true, value: newValveExecution ?? null });
      }
    );
    socket.on(
      "setIrrigationSequenceState",
      async (sequenceID, state, wsCallback) => {
        const sequence = config.sequences.find((s) => s.id === sequenceID);
        if (sequence == null) {
          wsCallback({ ok: false, err: "Sequence not found" });
          return;
        }
        const sequenceExecution = sequences.get(sequenceID);
        if (
          (sequenceExecution !== undefined && state) ||
          (sequenceExecution === undefined && !state)
        ) {
          wsCallback({ ok: true, value: sequenceExecution ?? null });
          return;
        }
        let newSequenceExecution: Irrigation.SequenceExecution | null = null;
        if (state) {
          newSequenceExecution = {
            sequenceID,
            startTimestamp: Math.floor(Date.now() / 1000),
            startType: "manual",
          };
          sequences.set(sequenceID, newSequenceExecution);
        } else sequences.delete(sequenceID);
        const ok = await handleManualStatusUpdate(socket);
        if (!ok)
          wsCallback({
            ok: false,
            err: "Failed to send state to all devices",
          });
        else wsCallback({ ok: true, value: newSequenceExecution ?? null });
      }
    );
    function eventIsRunning(event: Irrigation.Event, now: Date): boolean {
      const millis = Math.floor(now.getTime() / 1000);
      if (
        millis < event.start ||
        millis > event.end ||
        !event.days[now.getDay()]
      )
        return false;
      const offset =
        now.getHours() * 3600 +
        now.getMinutes() * 60 +
        now.getSeconds() -
        event.startOffset;
      const sequence = config.sequences.find((s) => s.id === event.sequenceID);
      if (sequence === undefined) return false;
      return sequenceIsRunning(sequence, offset);
    }
    function sequenceIsRunning(
      sequence: Irrigation.Sequence,
      offset: number
    ): boolean {
      if (offset < 0) return false;
      for (const job of sequence.jobs) {
        offset -= job.duration;
        if (offset < 0) return true;
      }
      return false;
    }
    // handle scheduled events
    setInterval(() => {
      const now = new Date();
      let dirty = false;
      for (const event of config.events) {
        if (sequences.get(event.sequenceID)?.startType === "manual") continue;
        const running = eventIsRunning(event, now);
        if (running && sequences.has(event.sequenceID)) continue;
        if (!running && !sequences.has(event.sequenceID)) continue;
        if (running) {
          sequences.set(event.sequenceID, {
            sequenceID: event.sequenceID,
            startTimestamp: Math.floor(now.getTime() / 1000),
            startType: "scheduled",
          });
        } else sequences.delete(event.sequenceID);
        dirty = true;
      }
      if (dirty) io.emit("irrigationStateChange", getState());
    }, 1000);
    // cleanup expired manual events
    setInterval(() => {
      const millis = Math.round(Date.now() / 1000);
      let dirty = false;
      for (const [id, sequenceExecution] of sequences.entries()) {
        if (sequenceExecution.startType !== "manual") continue;
        const sequence = config.sequences.find((s) => s.id === id);
        if (sequence === undefined) continue;
        if (
          sequenceIsRunning(sequence, millis - sequenceExecution.startTimestamp)
        )
          continue;
        sequences.delete(id);
        dirty = true;
      }
      for (const [id, valveExecution] of valves.entries()) {
        if (valveExecution.duration === -1) continue;
        const valve = config.valves.find((v) => v.id === id);
        if (valve === undefined) continue;
        if (valveExecution.startTimestamp + valveExecution.duration > millis)
          continue;
        valves.delete(id);
        dirty = true;
      }
      if (dirty) handleManualStatusUpdate().finally(() => {});
    });
  });
};
