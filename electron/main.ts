import fs from "node:fs/promises";
import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { LocalDatabase } from "./database";
import { buildInvoiceHtml } from "./invoice-template";
import type {
  ClientDraft,
  CloudDesktopSessionDraft,
  ExpenseDraft,
  LoginDraft,
  PasswordChangeDraft,
  ProductDraft,
  SaleDraft,
  ServiceDraft,
  UserDraft,
  UserRole,
} from "../src/types";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const RECEIPT_PAGE_WIDTH_MICRONS = 80000;
let database: LocalDatabase;
let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
}

function getAppRoot() {
  return app.isPackaged ? app.getAppPath() : path.join(__dirname, "..");
}

function registerIpc() {
  ipcMain.handle("inventory:list", () => database.listProducts());
  ipcMain.handle("inventory:save", (_event, draft: ProductDraft) => database.saveProduct(draft));
  ipcMain.handle("inventory:delete", (_event, id: number) => database.deleteProduct(id));
  ipcMain.handle("services:list", () => database.listServices());
  ipcMain.handle("services:save", (_event, draft: ServiceDraft) => database.saveService(draft));
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
  ipcMain.handle("sales:print-receipt", async (_event, saleId: number) => {
    try {
      const sale = database.getSaleDetail(saleId);
      if (!sale) {
        return false;
      }

      await createDocumentWindow(buildInvoiceHtml(sale, getAppRoot(), { interactive: true, format: "receipt80mm" }), {
        show: true,
        title: `Ticket ${sale.reference}`,
        width: 420,
        height: 960,
      });
      return true;
    } catch (error) {
      console.error("sales:print-receipt failed", error);
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
  ipcMain.handle("sales:export-receipt-pdf", async (_event, saleId: number) => {
    try {
      const sale = database.getSaleDetail(saleId);
      if (!sale) {
        return null;
      }

      const downloadsPath = app.getPath("downloads");
      const baseFilePath = path.join(downloadsPath, `${sale.reference}-ticket-80mm.pdf`);
      const filePath = await getAvailablePdfPath(baseFilePath);
      const estimatedHeight = Math.max(180000, 115000 + sale.items.length * 14000);
      const win = await createDocumentWindow(buildInvoiceHtml(sale, getAppRoot(), { format: "receipt80mm" }), {
        width: 420,
        height: 960,
      });

      try {
        await waitForWindowReady(win);
        const pdf = await win.webContents.printToPDF({
          printBackground: true,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          pageSize: { width: RECEIPT_PAGE_WIDTH_MICRONS, height: estimatedHeight },
          preferCSSPageSize: true,
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
      console.error("sales:export-receipt-pdf failed", error);
      return null;
    }
  });
  ipcMain.handle("history:supply", () => database.getSupplyHistory());
  ipcMain.handle("history:activity", () => database.getActivityHistory());
  ipcMain.handle("expenses:list", () => database.listExpenses());
  ipcMain.handle("expenses:save", (_event, draft: ExpenseDraft) => database.saveExpense(draft));
  ipcMain.handle("dashboard:metrics", () => database.getDashboardMetrics());
  ipcMain.handle("clients:list", () => database.listClients());
  ipcMain.handle("clients:save", (_event, draft: ClientDraft) => database.saveClient(draft));
  ipcMain.handle("users:list", () => database.listUsers());
  ipcMain.handle("users:save", (_event, draft: UserDraft) => database.saveUser(draft));
  ipcMain.handle("users:authenticate", (_event, draft: LoginDraft) => database.authenticateUser(draft));
  ipcMain.handle("users:cache-cloud-auth", (_event, draft: CloudDesktopSessionDraft) =>
    database.cacheCloudAuthenticatedUser(draft)
  );
  ipcMain.handle("users:get-sync-credentials", () => database.getCurrentSyncCredentials());
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
    width?: number;
    height?: number;
  }
) {
  const tempFile = path.join(
    app.getPath("temp"),
    `walikale-facture-${Date.now()}-${Math.random().toString(36).slice(2)}.html`
  );

  await fs.writeFile(tempFile, html, "utf-8");

  const win = new BrowserWindow({
    width: options?.width ?? 1000,
    height: options?.height ?? 1400,
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

function focusMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.focus();
}

function closeAllWindows() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.close();
    }
  }
}

app.on("second-instance", () => {
  focusMainWindow();
});

app.whenReady()
  .then(() => {
    database = new LocalDatabase(path.join(app.getPath("userData"), "storage"));
    registerIpc();
    createWindow();
  })
  .catch((error) => {
    console.error("Application startup failed", error);
    dialog.showErrorBox(
      "Demarrage impossible",
      error instanceof Error ? error.message : "Une erreur inconnue a empeche le lancement de l'application."
    );
    app.quit();
  });

app.on("before-quit", () => {
  isQuitting = true;
  closeAllWindows();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && !isQuitting) {
    createWindow();
  }
});
