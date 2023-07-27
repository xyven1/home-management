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
const hostname = "irrigation-controller";

type IP = string;
type MAC = string;
interface IrrigationController {
  ip: IP;
  mac: MAC;
}

const controllers = new Map<MAC, IrrigationController>();

let config: Irrigation.Config = {
  events: [],
  sequences: [],
  valves: [],
  devices: [],
  timezone: "",
};

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
        controllers.set(macText, { ip: a.data, mac: macText });
        // post to api
        const res = await fetch(`http://${a.data}/config`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        });
        io.emit("newIrrigationDevice", macText);
        console.log("Sent config to", a.data, "and recieved", await res.text());
      })().finally(() => {});
    });
  });

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
      [...controllers.values()].map(async (device) => {
        const res = await fetch(`http://${device.ip}/config`, {
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
        const controller = controllers.get(mac);
        if (controller == null) {
          wsCallback(false);
          return;
        }
        const res = await fetch(
          `http://${controller.ip}/api/relay/${relay}/${state ? "on" : "off"}`
        );
        wsCallback(res.status === 200);
      }
    );
    socket.on("getIrrigationConfig", (wsCallback) => {
      wsCallback(config);
    });
    socket.on("setIrrigationConfig", async (newConfig, wsCallback) => {
      wsCallback(await handleNewConfig(newConfig, socket));
    });
    socket.on("getIrrigationDevices", (wsCallback) => {
      wsCallback([...controllers.values()].map((c) => c.mac));
    });
  });
};
