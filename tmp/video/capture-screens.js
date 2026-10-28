const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const root = path.resolve(__dirname, "..", "..");
const outputDir = path.join(__dirname, "screens");
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await delay(500);
  await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: false });
}

async function openTab(page, label, outputName) {
  await page.evaluate((text) => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === text);
    if (!button) throw new Error(`Bouton introuvable : ${text}`);
    button.click();
  }, label);
  await delay(700);
  await capture(page, outputName);
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5174/", { waitUntil: "networkidle0" });
  await delay(1200);
  await capture(page, "01-connexion");

  await page.type('input[placeholder="votre@email.com"]', "roberto");
  await page.type('input[placeholder="Votre mot de passe"]', "Walikale123");
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Se connecter");
    if (!button) throw new Error("Bouton de connexion introuvable");
    button.click();
  });
  await page.waitForSelector(".app-shell", { timeout: 10000 });
  await delay(1000);

  await openTab(page, "Tableau de bord", "02-tableau-de-bord");
  await openTab(page, "Produits", "03-produits");
  await openTab(page, "Reapprovisionnement", "04-approvisionnement");
  await openTab(page, "Ventes", "05-ventes");
  await openTab(page, "Depenses", "06-rapports");
  await openTab(page, "Cybercafe", "07-cybercafe");

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
