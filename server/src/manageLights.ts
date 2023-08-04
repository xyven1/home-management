import {
  type Device,
  type DeviceState,
  type SerialNumber,
  type Svg,
  type Switch,
  type WsResponse,
} from "@home-management/lib/types/socket.js";
import debounce from "debounce";
import fs from "fs";
import upath from "upath";
import Wemo from "wemo-client";
import type WemoClient from "wemo-client/lib/client.js";
import { configPath, dataPath } from "./environment.js";
import type { AppServer, DeviceInfo } from "./types.js";

export default (io: AppServer): void => {
  const devicesPath = upath.join(dataPath, "devices.json");
  const svgPath = upath.join(configPath, "svg.json");

  // init devices file
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(upath.join(dataPath), { recursive: true });
    fs.writeFileSync(devicesPath, JSON.stringify([]));
  }
  // init svg file
  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(upath.join(configPath), { recursive: true });
    fs.writeFileSync(svgPath, JSON.stringify([]));
  }

  const devices = new Map<SerialNumber, WemoClient>();

  // configs
  const wemo = new Wemo({
    discover_opts: {
      explicitSocketBind: true,
    },
    // listen_interface: 'eno1'
  });

  // sync devices loaded onto server with devices stored on file
  const sync = debounce(() => {
    fs.readFile(devicesPath, (err, data) => {
      const parsed: Device[] = JSON.parse(data.toString());
      for (const [, client] of Object.entries(devices)) {
        let sw = parsed.find(
          (sw) => sw.serialNumber === client.device.serialNumber
        );
        const device = {
          name: client.device.friendlyName,
          serialNumber: client.device.serialNumber,
          ip: client.device.host,
          port: client.device.port,
        };
        if (sw != null) sw = device;
        else parsed.push(device);
      }
      fs.writeFile(devicesPath, JSON.stringify(parsed, null, 2), (err) => {
        if (err != null) console.error(err);
      });
      // handle err
      if (err != null) console.error(err);
    });
  }, 1000);

  // client managment
  function manageClient(deviceInfo: DeviceInfo): void {
    const client = wemo.client(deviceInfo);
    devices.set(client.device.serialNumber, client);

    client.on("error", (err) => {
      console.error("Client error: %s", err);
    });

    client.on("binaryState", (value) => {
      console.log("statechange", client.device.friendlyName, value);
      io.emit("stateChange", client.device.serialNumber, Number(value));
    });
  }

  // discovers wemo devices connected to network
  function discover(): void {
    console.log("Discovering Wemo Devices");
    wemo.discover((deviceInfo: DeviceInfo) => {
      if (deviceInfo == null) return;
      console.log("Wemo Device Found: %j", deviceInfo.friendlyName);
      manageClient(deviceInfo);
      sync();
    });
  }

  // loads devices from devices.json
  async function loadDevices(): Promise<void> {
    console.log("Loading Devices..");
    try {
      const devices: Device[] = JSON.parse(
        fs.readFileSync(devicesPath).toString()
      );
      console.log(`Loading ${devices.length} devices`);

      await Promise.allSettled(
        devices.map(async (sw) => {
          const deviceInfo = await wemo.load(
            `http://${sw.ip}:${sw.port}/setup.xml`
          );
          console.log("Loaded Device: %j", deviceInfo.friendlyName);
          manageClient(deviceInfo);
        })
      );
    } catch (err) {
      console.error(err);
    }
  }

  // load all stored devices
  loadDevices().catch(console.error);

  // repeated discover run every 10 seconds
  setInterval(discover, 10000);

  io.on("connection", (socket) => {
    // returns switches from devices object to a callback function
    socket.on("getSwitches", (callback = () => {}) => {
      console.log("getting switches");
      callback(
        [...devices.values()].map((device) => ({
          name: device.device.friendlyName,
          serialNumber: device.device.serialNumber,
          state: device.device.binaryState,
          brightness: device.device.brightness,
        }))
      );
    });

    // returns parsed array containing data for svg, containing associations between map regions and serial number of switch
    socket.on("getSvg", (callback = () => {}) => {
      console.log("getting svg");
      fs.readFile(svgPath, (err, data) => {
        if (err != null) {
          console.error(err);
          return;
        }
        callback(JSON.parse(data.toString()));
      });
    });

    // returns the state of a switch given a serial number
    const getSwitch = async (
      serialNumber: SerialNumber,
      wsCallback: (res: WsResponse<Switch>) => void = () => {}
    ): Promise<void> => {
      // console.log('getting switch state:', serialNumber)
      const device = devices.get(serialNumber);
      if (device !== undefined)
        try {
          const state = await device.getBinaryState();
          wsCallback({
            ok: true,
            value: {
              name: device.device.friendlyName,
              serialNumber,
              state: Number(state.BinaryState),
              brightness: Number(state.brightness),
            },
          });
        } catch (err: any) {
          wsCallback({ ok: false, err: err.message ?? err });
        }
      else wsCallback({ ok: false, err: "Device not found" });
    };
    socket.on("getSwitch", getSwitch);

    // allows client to toggle switches using serial number
    socket.on("toggleSwitch", async (serialNumber, wsCallback = () => {}) => {
      console.log("Toggling switch with serial number: " + serialNumber);
      // io.emit("stateChange", serialNumber, 2);
      const device = devices.get(serialNumber);
      if (device !== undefined) {
        try {
          const prevState = (await device.getBinaryState()).BinaryState;
          const state = await device.setBinaryState(+prevState === 1 ? 0 : 1);
          wsCallback({
            ok: true,
            value: {
              BinaryState: Number(state.BinaryState),
              brightness:
                state.brightness != null ? Number(state.brightness) : undefined,
            },
          });
          socket.broadcast.emit("stateChange", serialNumber, state.BinaryState);
          if (state.brightness != null)
            socket.broadcast.emit(
              "brightnessChange",
              serialNumber,
              state.brightness
            );
        } catch (err: any) {
          wsCallback({ ok: false, err: err.message ?? err });
        }
      } else wsCallback({ ok: false, err: "Device not found" });
    });

    // allows client to set switch state using serial number
    socket.on(
      "setSwitch",
      async (serialNumber, state, wsCallback = () => {}) => {
        if (isNaN(state) || state < 0 || state > 1) {
          wsCallback({ ok: false, err: "Requested state invalid" });
          return;
        }
        console.log(
          "Setting switch with serial number: " + serialNumber + " to state: ",
          state
        );
        const device = devices.get(serialNumber);
        if (device !== undefined)
          try {
            const newState = await device.setBinaryState(state);
            wsCallback({
              ok: true,
              value: {
                BinaryState: Number(newState.BinaryState),
                brightness:
                  newState.brightness != null
                    ? Number(newState.brightness)
                    : undefined,
              },
            });
            socket.broadcast.emit(
              "stateChange",
              serialNumber,
              newState.BinaryState
            );
            if (newState.brightness != null)
              socket.broadcast.emit(
                "brightnessChange",
                serialNumber,
                newState.brightness
              );
          } catch (err: any) {
            wsCallback({ ok: false, err: err.message ?? err });
          }
        else wsCallback({ ok: false, err: "Device not found" });
      }
    );

    // allows client to set brightness of a switch using serial number
    socket.on(
      "setBrightness",
      async (serialNumber, brightness, wsCallback = () => {}) => {
        const device = devices.get(serialNumber);
        if (device !== undefined) {
          try {
            const res = (await device.setBrightness(brightness)) as {
              BinaryState: string;
              brightness: string;
            };
            wsCallback({
              ok: true,
              value: {
                BinaryState: Number(res.BinaryState),
                brightness: Number(res.brightness),
              },
            });
            socket.broadcast.emit(
              "brightnessChange",
              serialNumber,
              Number(res.brightness)
            );
          } catch (err: any) {
            wsCallback({ ok: false, err: err.message ?? err });
          }
        } else wsCallback({ ok: false, err: "Device not found" });
      }
    );

    // allows client to turn on or off all switches
    socket.on("setAllSwitches", async (state, wsCallback = () => {}) => {
      if (isNaN(state) || state < 0 || state > 1) {
        wsCallback({ ok: false, err: "Requested state invalid" });
        return;
      }
      console.log("Setting all switches to state: ", state);
      try {
        wsCallback({
          ok: true,
          value: (
            await Promise.allSettled(
              [...devices.values()].map(
                async (d) =>
                  await (d.setBinaryState(state) as Promise<DeviceState>)
              )
            )
          ).flatMap((res) => (res.status === "fulfilled" ? [res.value] : [])),
        });
      } catch (err: any) {
        wsCallback({ ok: false, err: err.message ?? err });
      }
    });

    // allows client to change serial number associated to a region
    socket.on("setSvg", (data, wsCallback = () => {}) => {
      console.log("setting svg");
      try {
        const svg: Svg = JSON.parse(fs.readFileSync(svgPath).toString());
        const region = svg
          .flatMap((r) => r.regions)
          .find((r) => r.d === data.d);
        if (region === undefined) throw new Error("Region not found");
        region.sn = data.sn;
        fs.writeFileSync(svgPath, JSON.stringify(svg, null, 2));
        wsCallback({ ok: true });
      } catch (err: any) {
        console.error(err);
        if (err instanceof Error)
          wsCallback({
            ok: false,
            err: err instanceof Error ? err.message : String(err),
          });
      }
    });
  });
};
