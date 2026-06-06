import fs from "node:fs/promises";
import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { LocalDatabase } from "./database";
import { buildInvoiceHtml } from "./invoice-template";
import type { ClientDraft, LoginDraft, PasswordChangeDraft, ProductDraft, SaleDraft, UserDraft, UserRole } from "../src/types";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let database: LocalDatabase;
let mainWindow: BrowserWindow | null = null;

function getAppRoot() {
  return app.isPackaged ? app.getAppPath() : path.join(__dirname, "..");
}

function registerIpc() {
  ipcMain.handle("inventory:list", () => database.listProducts());
  ipcMain.handle("inventory:save", (_event, draft: ProductDraft) => database.saveProduct(draft));
  ipcMain.handle("inventory:delete", (_event, id: number) => database.deleteProduct(id));
  ipcMain.handle("inventory:reset-cycle", () => database.resetInventoryCycle());
  ipcMain.handle("sales:list", () => database.listSales());
  ipcMain.handle("sales:create", (_event, draft: SaleDraft) => database.createSale(draft));
  ipcMain.handle("sales:invoice-series", () => database.getInvoiceSeriesInfo());
  ipcMain.handle("sales:advance-series", () => database.advanceInvoiceSeries());
  ipcMain.handle("sales:detail", (_event, saleId: number) => database.getSaleDetail(saleId));
  ipcMain.handle("sales:print", async (_event, saleId: number) => {
    try {
      const sale = database.getSaleDetail(saleId);
      if (!sale) {
        return false;
      }

      await createDocumentWindow(buildInvoiceHtml(sale, getAppRoot(), { interactive: true }), {
        show: true,
        title: `Facture ${sale.reference}`,
      });
      return true;
    } catch (error) {
      console.error("sales:print failed", error);
      return false;
    }
  });
  ipcMain.handle("sales:export-pdf", async (_event, saleId: number) => {
    try {
      const sale = database.getSaleDetail(saleId);
      if (!sale) {
        return null;
      }

      const downloadsPath = app.getPath("downloads");
      const baseFilePath = path.join(downloadsPath, `${sale.reference}.pdf`);
      const filePath = await getAvailablePdfPath(baseFilePath);

      const win = await createDocumentWindow(buildInvoiceHtml(sale, getAppRoot()));

      try {
        await waitForWindowReady(win);
        const pdf = await win.webContents.printToPDF({
          printBackground: true,
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
          pageSize: "A4",
        });
        await fs.writeFile(filePath, pdf);
        shell.showItemInFolder(filePath);
        return filePath;
      } finally {
        if (!win.isDestroyed()) {
          win.close();
        }
      }
    } catch (error) {
      console.error("sales:export-pdf failed", error);
      return null;
    }
  });
  ipcMain.handle("history:supply", () => database.getSupplyHistory());
  ipcMain.handle("history:activity", () => database.getActivityHistory());
  ipcMain.handle("dashboard:metrics", () => database.getDashboardMetrics());
  ipcMain.handle("clients:list", () => database.listClients());
  ipcMain.handle("clients:save", (_event, draft: ClientDraft) => database.saveClient(draft));
  ipcMain.handle("users:list", () => database.listUsers());
  ipcMain.handle("users:save", (_event, draft: UserDraft) => database.saveUser(draft));
  ipcMain.handle("users:authenticate", (_event, draft: LoginDraft) => database.authenticateUser(draft));
  ipcMain.handle("users:restore-session", (_event, userId: number) => database.restoreUserSession(userId));
  ipcMain.handle("users:logout", () => {
    database.logoutUser();
  });
  ipcMain.handle("users:change-password", (_event, draft: PasswordChangeDraft) => database.changeUserPassword(draft));
  ipcMain.handle("users:set-active", (_event, userId: number, active: boolean) => database.setUserActive(userId, active));
  ipcMain.handle("users:update-role", (_event, userId: number, role: UserRole) =>
    database.updateUserRole(userId, role)
  );
  ipcMain.handle("users:refresh-access", (_event, userId: number) => database.refreshUserAccess(userId));
  ipcMain.handle("users:delete", (_event, userId: number) => database.deleteUser(userId));
  ipcMain.handle("stock:current", () => database.getCurrentStock());
  ipcMain.handle("sync:status", () => database.getSyncStatus());
  ipcMain.handle("sync:snapshot", () => database.exportSyncSnapshot());
  ipcMain.handle("sync:import", (_event, snapshot) => {
    database.importSyncSnapshot(snapshot);
  });
  ipcMain.handle("sync:complete", (_event, syncedAt?: string | null) => {
    database.markSyncComplete(syncedAt ?? undefined);
  });
}

async function createDocumentWindow(
  html: string,
  options?: {
    show?: boolean;
    title?: string;
  }
) {
  const tempFile = path.join(
    app.getPath("temp"),
    `walikale-facture-${Date.now()}-${Math.random().toString(36).slice(2)}.html`
  );

  await fs.writeFile(tempFile, html, "utf-8");

  const win = new BrowserWindow({
    width: 1000,
    height: 1400,
    show: options?.show ?? false,
    title: options?.title ?? "Document",
    autoHideMenuBar: true,
    parent: mainWindow ?? undefined,
    modal: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on("closed", () => {
    void fs.unlink(tempFile).catch(() => {});
  });

  await win.loadFile(tempFile);
  return win;
}

async function waitForWindowReady(win: BrowserWindow) {
  if (win.webContents.isLoading()) {
    await new Promise<void>((resolve) => {
      win.webContents.once("did-finish-load", () => resolve());
    });
  }

  await new Promise<void>((resolve) => setTimeout(resolve, 250));
}

async function getAvailablePdfPath(initialPath: string) {
  const parsed = path.parse(initialPath);
  let candidate = initialPath;
  let counter = 1;

  while (true) {
    try {
      await fs.access(candidate);
      candidate = path.join(parsed.dir, `${parsed.name}-${counter}${parsed.ext}`);
      counter += 1;
    } catch {
      return candidate;
    }
  }
}

function createWindow() {
  const preloadFile = app.isPackaged ? "preload.js" : "preload.cjs";
  mainWindow = new BrowserWindow({
    width: 1460,
    height: 940,
    minWidth: 1140,
    minHeight: 720,
    backgroundColor: "#eef2f7",
    title: "Walikale Papeterie",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, preloadFile),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (isDev) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL as string);
  } else {
    void mainWindow.loadFile(path.join(getAppRoot(), "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  database = new LocalDatabase(path.join(app.getPath("userData"), "storage"));
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
