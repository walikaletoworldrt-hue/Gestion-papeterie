// Regenerates the app logo and the .exe icon from img/logo-walikale1.png.
// Run from the project folder: npx electron build/make-logo-assets.cjs . build
// Then copy build/logo-recadre.png to img/logo-walikale-recadre.png.
const { app, nativeImage } = require("electron");
const fs = require("fs");
const path = require("path");

const [root, outDir] = process.argv.slice(-2);

function bbox(img, maxY = Infinity) {
  const { width, height } = img.getSize();
  const buf = img.toBitmap(); // BGRA
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < Math.min(height, maxY); y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = buf[i + 3];
      if (a > 20 && (buf[i] < 225 || buf[i + 1] < 225 || buf[i + 2] < 225)) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

function pad(r, m, size) {
  const x = Math.max(0, r.x - m), y = Math.max(0, r.y - m);
  return { x, y, width: Math.min(size.width - x, r.width + 2 * m), height: Math.min(size.height - y, r.height + 2 * m) };
}

/** Square icon: white rounded square, emblem centred with a margin. */
function makeIcon(emblem, size) {
  const radius = Math.round(size * 0.18);
  const inner = Math.round(size * 0.92);
  const e = emblem.getSize();
  const scale = Math.min(inner / e.width, inner / e.height);
  const w = Math.max(1, Math.round(e.width * scale)), h = Math.max(1, Math.round(e.height * scale));
  const small = emblem.resize({ width: w, height: h, quality: "best" }).toBitmap();
  const out = Buffer.alloc(size * size * 4);
  const ox = Math.round((size - w) / 2), oy = Math.round((size - h) / 2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // rounded-square mask with 1px antialias
      const dx = Math.max(radius - x - 0.5, 0, x + 0.5 - (size - radius));
      const dy = Math.max(radius - y - 0.5, 0, y + 0.5 - (size - radius));
      const d = Math.sqrt(dx * dx + dy * dy) - radius;
      const cover = Math.max(0, Math.min(1, 0.5 - d));
      const i = (y * size + x) * 4;
      let b = 255, g = 255, r = 255;
      const sx = x - ox, sy = y - oy;
      if (sx >= 0 && sy >= 0 && sx < w && sy < h) {
        const j = (sy * w + sx) * 4, a = small[j + 3] / 255;
        b = small[j] * a + 255 * (1 - a); g = small[j + 1] * a + 255 * (1 - a); r = small[j + 2] * a + 255 * (1 - a);
      }
      out[i] = b; out[i + 1] = g; out[i + 2] = r; out[i + 3] = Math.round(255 * cover);
    }
  }
  return nativeImage.createFromBitmap(out, { width: size, height: size });
}

function writeIco(pngs, file) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, k) => {
    const o = 6 + 16 * k;
    header.writeUInt8(size >= 256 ? 0 : size, o); header.writeUInt8(size >= 256 ? 0 : size, o + 1);
    header.writeUInt8(0, o + 2); header.writeUInt8(0, o + 3);
    header.writeUInt16LE(1, o + 4); header.writeUInt16LE(32, o + 6);
    header.writeUInt32LE(data.length, o + 8); header.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  fs.writeFileSync(file, Buffer.concat([header, ...pngs.map((p) => p.data)]));
}

app.whenReady().then(() => {
  const logo = nativeImage.createFromPath(path.join(root, "img", "logo-walikale1.png"));
  const size = logo.getSize();
  const full = pad(bbox(logo), 12, size);
  fs.writeFileSync(path.join(outDir, "logo-recadre.png"), logo.crop(full).toPNG());
  // Emblem only (globe + swoosh + brain): white out the monitors and the lettering, keep the swoosh tail.
  const bmp = Buffer.from(logo.toBitmap());
  for (let y = 0; y < size.height; y++) {
    for (let x = 0; x < size.width; x++) {
      const monitors = x > 1080 && y > 540;
      const i0 = (y * size.width + x) * 4;
      const blueInk = bmp[i0] - bmp[i0 + 2] > 40; // BGRA: blue clearly above red = lettering, the swoosh tail is black
      const lettering = y > 648 && (x > 262 || blueInk);
      if (monitors || lettering) { const i = (y * size.width + x) * 4; bmp[i] = bmp[i + 1] = bmp[i + 2] = 255; bmp[i + 3] = 255; }
    }
  }
  const cleaned = nativeImage.createFromBitmap(bmp, size);
  const emblemBox = pad(bbox(cleaned), 10, size);
  const emblem = cleaned.crop(emblemBox);
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = sizes.map((s) => ({ size: s, data: makeIcon(emblem, s).toPNG() }));
  fs.writeFileSync(path.join(outDir, "icon.png"), makeIcon(emblem, 512).toPNG());
  writeIco(pngs, path.join(outDir, "icon.ico"));
  console.log(JSON.stringify({ size, full, emblemBox }));
  app.quit();
}).catch((e) => { console.error(e); app.exit(1); });
