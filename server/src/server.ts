#!/usr/bin/env node

import compression from "compression";
import cors from "cors";
import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import manageIrrigation from "./irrigation.js";
import manageAudio from "./manageAudio.js";
import manageLights from "./manageLights.js";
import manageTV from "./manageTV.js";
import { type AppServer } from "./types.js";

// catch uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error(err, "Uncaught Exception Thrown");
  console.trace("Uncaught Exception Thrown");
});

const app = express();
const server = http.createServer(app);
const defaultDistPath =
  "../home-management/node_modules/@home-management/ui/dist/";

const io: AppServer = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// middleware
app.use(cors());
app.use(compression());
app.use(express.static(process.env.DIST_PATH ?? defaultDistPath));

// serves static files in dist
app.get(/.*/, (req, res) => {
  res.sendFile(
    path.join(
      process.env.DIST_PATH !== undefined
        ? path.join(path.resolve(), process.env.DIST_PATH)
        : path.join(path.resolve(), defaultDistPath),
      "index.html"
    )
  );
});

// web socket
io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);
  socket.on("disconnect", (reason) => {
    console.log("disconnecting:", socket.id, "because: ", reason);
  });
});

const port = process.env.SERVER_PORT ?? 43434;
// initilize server
server.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
});

manageLights(io);
manageAudio(io);
manageTV(io);
manageIrrigation(io);
