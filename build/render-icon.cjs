const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

async function main() {
  const source = path.join(__dirname, "icon.svg");
  const output = path.join(__dirname, "icon.png");

  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    resizable: false,
    webPreferences: {
      sandbox: false,
    },
  });

  await win.loadFile(source);
  const image = await win.webContents.capturePage();
  fs.writeFileSync(output, image.toPNG());
  await win.destroy();
  await app.quit();
}

app.whenReady().then(main).catch((error) => {
  console.error(error);
  app.exit(1);
});
