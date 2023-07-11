import fs from "fs";
import upath from "upath";
import Wemo from "wemo-client";
import debounce from "debounce";
import {
  type Device,
  type SerialNumber,
  type Svg,
  type Switch,
  type WsResponse,
  type DeviceState,
} from "@home-management/lib/types/socket.js";
import type { AppServer, DeviceInfo } from "./types.js";
import type WemoClient from "wemo-client/lib/client.js";

const dataPath =
  process.platform === "win32"
    ? "C:/ProgramData/home-management/"
    : "/var/cache/home-management/";
const configPath =
  process.platform === "win32"
    ? "C:/Program Files/home-management/"
    : "/etc/home-management/";

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
      io.emit("stateChange", {
        name: client.device.friendlyName,
        serialNumber: client.device.serialNumber,
        state: Number(value),
      });
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
  function loadDevices(): void {
    console.log("Loading Devices..");
    try {
      const devices: Device[] = JSON.parse(
        fs.readFileSync(devicesPath).toString()
      );
      console.log(`Loading ${devices.length} devices`);
      devices.forEach((sw) => {
        wemo
          .load(`http://${sw.ip}:${sw.port}/setup.xml`)
          .then((deviceInfo) => {
            console.log("Loaded Device: %j", deviceInfo.friendlyName);
            manageClient(deviceInfo);
          })
          .catch((err) => {
            console.error("Failed to load device: %s", err);
          });
      });
    } catch (err) {
      console.error(err);
    }
  }

  // load all stored devices
  loadDevices();

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
    const getSwitch = (
      serialNumber: SerialNumber,
      wsCallback: (res: WsResponse<Switch>) => void = () => {}
    ): void => {
      // console.log('getting switch state:', serialNumber)
      const device = devices.get(serialNumber);
      if (device !== undefined)
        device
          .getBinaryState()
          .then((res) => {
            const sw = {
              name: device.device.friendlyName,
              serialNumber,
              state: Number(res.BinaryState),
              brightness:
                res.brightness != null ? Number(res.brightness) : undefined,
            };
            wsCallback({ ok: true, value: sw });
          })
          .catch((err) => {
            wsCallback({ ok: false, err });
          });
      else wsCallback({ ok: false, err: "Device not found" });
    };
    socket.on("getSwitch", getSwitch);

    // allows client to toggle switches using serial number
    socket.on("toggleSwitch", (serialNumber, wsCallback = () => {}) => {
      console.log("Toggling switch with serial number: " + serialNumber);
      io.emit("stateChange", { name: "", serialNumber, state: 2 });
      const device = devices.get(serialNumber);
      if (device !== undefined)
        device
          .getBinaryState()
          .then((res) => {
            device
              .setBinaryState(+res.BinaryState === 1 ? 0 : 1)
              .then((result) => {
                wsCallback({ ok: true, value: result });
              })
              .catch((err) => ({ status: "error", err }));
          })
          .catch((err) => ({ status: "error", err }));
      else wsCallback({ ok: false, err: "Device not found" });
    });

    // allows client to set switch state using serial number
    socket.on("setSwitch", (serialNumber, state, wsCallback = () => {}) => {
      if (isNaN(state) || state < 0 || state > 1) {
        wsCallback({ ok: false, err: "Requested state invalid" });
        return;
      }
      console.log(
        "Setting switch with serial number: " + serialNumber + " to state: ",
        state
      );
      const device = devices.get(serialNumber);
      if (device != null)
        device
          .setBinaryState(state)
          .then((res) => {
            wsCallback({ ok: true, value: res });
          })
          .catch((err) => {
            wsCallback({ ok: false, err });
          });
      else wsCallback({ ok: false, err: "Device not found" });
    });

    // allows client to set brightness of a switch using serial number
    socket.on(
      "setBrightness",
      (
        serialNumber,
        brightness,
        wsCallback: (
          res: WsResponse<{ BinaryState: number; brightness?: number }>
        ) => void = () => {}
      ) => {
        const device = devices.get(serialNumber);
        if (device != null)
          device
            .setBrightness(brightness)
            .then((res) => {
              wsCallback({ value: res, ok: true });
            })
            .catch((err) => {
              wsCallback({ ok: false, err });
            });
        else wsCallback({ ok: false, err: "Device not found" });
      }
    );

    // allows client to turn on or off all switches
    socket.on("setAllSwitches", (state, wsCallback = () => {}) => {
      if (isNaN(state) || state < 0 || state > 1) {
        wsCallback({ ok: false, err: "Requested state invalid" });
        return;
      }
      console.log("Setting all switches to state: ", state);
      Promise.all(
        [...devices.values()].map(
          async (d) => await (d.setBinaryState(state) as Promise<DeviceState>)
        )
      )
        .then((res) => {
          wsCallback({ ok: true, value: res });
        })
        .catch((err) => {
          wsCallback({ ok: false, err });
        });
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
        wsCallback(true);
      } catch (err) {
        console.error(err);
        wsCallback(false);
      }
    });
  });
};
