import fs from "node:fs/promises";
import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { LocalDatabase } from "./database";
import { buildInvoiceHtml } from "./invoice-template";
import type { SyncSnapshot } from "../src/types";
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
const BACKUP_SCHEMA_VERSION = 1;

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
  ipcMain.handle("reports:export-expense-pdf", async (_event, html: string, fileName: string) => {
    try {
      const downloadsPath = app.getPath("downloads");
      const sanitizedName = (fileName || "rapport-financier")
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
        .trim();
      const baseFilePath = path.join(downloadsPath, `${sanitizedName || "rapport-financier"}.pdf`);
      const filePath = await getAvailablePdfPath(baseFilePath);
      const win = await createDocumentWindow(html, {
        width: 1240,
        height: 1600,
        title: "Rapport financier",
      });

      try {
        await waitForWindowReady(win);
        const pdf = await win.webContents.printToPDF({
          printBackground: true,
          margins: { top: 16, bottom: 16, left: 16, right: 16 },
          pageSize: "A4",
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
      console.error("reports:export-expense-pdf failed", error);
      return null;
    }
  });
  ipcMain.handle("history:supply", () => database.getSupplyHistory());
  ipcMain.handle("history:activity", () => database.getActivityHistory());
  ipcMain.handle("history:prune", (_event, months: number) => database.pruneActivityHistory(months));
  ipcMain.handle("expenses:list", () => database.listExpenses());
  ipcMain.handle("expenses:save", (_event, draft: ExpenseDraft) => database.saveExpense(draft));
  ipcMain.handle("dashboard:metrics", () => database.getDashboardMetrics());
  ipcMain.handle("clients:list", () => database.listClients());
  ipcMain.handle("clients:save", (_event, draft: ClientDraft) => database.saveClient(draft));
  ipcMain.handle("clients:delete", (_event, id: number) => database.deleteClient(id));
  ipcMain.handle("users:list", () => database.listUsers());
  ipcMain.handle("users:save", (_event, draft: UserDraft) => database.saveUser(draft));
  ipcMain.handle("users:link-cloud-profile", (_event, draft: CloudDesktopSessionDraft) =>
    database.linkCloudUserProfile(draft)
  );
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
  ipcMain.handle("sync:pending-overview", () => database.getPendingSyncOverview());
  ipcMain.handle("sync:snapshot", () => database.exportSyncSnapshot());
  ipcMain.handle("sync:import", (_event, snapshot) => {
    database.importSyncSnapshot(snapshot);
  });
  ipcMain.handle("sync:complete", (_event, syncedAt?: string | null) => {
    database.markSyncComplete(syncedAt ?? undefined);
  });
  ipcMain.handle("sync:complete-buckets", (_event, tables: string[], syncedAt?: string | null) => {
    database.markSyncBucketsComplete(tables, syncedAt ?? undefined);
  });
  ipcMain.handle("backup:create", async () => createManualBackup());
  ipcMain.handle("backup:restore", async () => restoreBackupFromDialog());
}

type BackupPayload = {
  app: "walikale-papeterie";
  schemaVersion: number;
  createdAt: string;
  appVersion: string;
  lastSyncedAt: string | null;
  snapshot: SyncSnapshot;
};

function getBackupRootDir() {
  return path.join(app.getPath("documents"), "Walikale Papeterie", "Backups");
}

async function ensureBackupDir(type: "Auto" | "Manual") {
  const dir = path.join(getBackupRootDir(), type);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function buildBackupPayload(): BackupPayload {
  const status = database.getSyncStatus();
  return {
    app: "walikale-papeterie",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: app.getVersion(),
    lastSyncedAt: status.lastSyncedAt,
    snapshot: database.exportSyncSnapshot(),
  };
}

async function writeBackupFile(targetPath: string) {
  const payload = buildBackupPayload();
  await fs.writeFile(targetPath, JSON.stringify(payload, null, 2), "utf-8");
  return targetPath;
}

async function pruneOldAutomaticBackups(limit = 15) {
  const autoDir = await ensureBackupDir("Auto");
  const entries = await fs.readdir(autoDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left, "en"));

  const overflow = files.slice(limit);
  await Promise.all(overflow.map((file) => fs.unlink(path.join(autoDir, file)).catch(() => {})));
}

async function createAutomaticBackup(reason: "startup" | "before-update") {
  const autoDir = await ensureBackupDir("Auto");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const targetPath = path.join(autoDir, `walikale-auto-${reason}-${timestamp}.json`);
  await writeBackupFile(targetPath);
  await pruneOldAutomaticBackups();
  return targetPath;
}

async function createManualBackup() {
  const manualDir = await ensureBackupDir("Manual");
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const defaultPath = path.join(manualDir, `walikale-backup-${timestamp}.json`);
  const dialogOwner = mainWindow ?? BrowserWindow.getFocusedWindow() ?? null;
  const result = dialogOwner
    ? await dialog.showSaveDialog(dialogOwner, {
        title: "Sauvegarder les donnees de Walikale Papeterie",
        defaultPath,
        filters: [{ name: "Sauvegarde Walikale", extensions: ["json"] }],
      })
    : await dialog.showSaveDialog({
        title: "Sauvegarder les donnees de Walikale Papeterie",
        defaultPath,
        filters: [{ name: "Sauvegarde Walikale", extensions: ["json"] }],
      });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return writeBackupFile(result.filePath);
}

async function restoreBackupFromDialog() {
  const backupDir = await ensureBackupDir("Manual");
  const dialogOwner = mainWindow ?? BrowserWindow.getFocusedWindow() ?? null;
  const result = dialogOwner
    ? await dialog.showOpenDialog(dialogOwner, {
        title: "Restaurer une sauvegarde Walikale Papeterie",
        defaultPath: backupDir,
        properties: ["openFile"],
        filters: [{ name: "Sauvegarde Walikale", extensions: ["json"] }],
      })
    : await dialog.showOpenDialog({
        title: "Restaurer une sauvegarde Walikale Papeterie",
        defaultPath: backupDir,
        properties: ["openFile"],
        filters: [{ name: "Sauvegarde Walikale", extensions: ["json"] }],
      });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const raw = await fs.readFile(filePath, "utf-8");
  const payload = JSON.parse(raw) as Partial<BackupPayload>;

  if (payload.app !== "walikale-papeterie" || !payload.snapshot) {
    throw new Error("Ce fichier n'est pas une sauvegarde valide de Walikale Papeterie.");
  }

  database.importSyncSnapshot(payload.snapshot);
  database.markSyncComplete(payload.lastSyncedAt ?? undefined);
  return filePath;
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
    width: 1340,
    height: 860,
    minWidth: 980,
    minHeight: 640,
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
    void createAutomaticBackup("startup").catch((error) => {
      console.error("Automatic backup failed", error);
    });
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
