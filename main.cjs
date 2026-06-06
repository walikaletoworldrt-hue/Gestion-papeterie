const { app } = require("electron");

if (!app.isPackaged && (process.env.VITE_DEV_SERVER_URL || !process.env.NODE_ENV || process.env.NODE_ENV === "development")) {
  require("tsx/cjs");
  require("./electron/main.ts");
} else {
  require("./dist-electron/electron/main.js");
}
