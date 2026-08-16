import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import type {
  ActivityHistoryItem,
  AppUser,
  Client,
  ClientDraft,
  CloudDesktopSessionDraft,
  DesktopSyncCredentials,
  DashboardMetrics,
  ExpenseDraft,
  ExpenseItem,
  InvoiceSeriesInfo,
  LoginDraft,
  PasswordChangeDraft,
  Product,
  ProductDraft,
  Service,
  ServiceDraft,
  SaleDetail,
  SaleDetailItem,
  SaleItemDraft,
  SaleServiceItemDraft,
  SaleDraft,
  SaleRecord,
  SyncConflictBucket,
  SyncPendingOverview,
  SyncSnapshot,
  SyncStatus,
  StockRow,
  SupplyHistoryItem,
  UserDraft,
  UserRole,
} from "../src/types";

type ProductRow = {
  id: number;
  code: string;
  name: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  unit: string;
  alert_threshold: number;
  supplier: string;
  updated_at: string;
};

type ServiceRow = {
  id: number;
  name: string;
  category: string;
  unit_price: number;
  description: string;
  active: number;
  created_at: string;
  updated_at: string;
};

type SupplyHistoryRow = {
  id: number;
  date: string;
  product: string;
  quantity: number;
  supplier: string;
  purchase_price: number;
  selling_price: number;
  amount: number;
  movement_type: "stock_initial" | "reapprovisionnement" | "vente";
};

type ClientRow = {
  id: number;
  name: string;
  phone: string;
  address: string;
  email: string;
  created_at: string;
};

type ExpenseRow = {
  id: number;
  detail: string;
  nature: string;
  amount: number;
  expense_date: string;
  user_id: number | null;
  approved_by: string;
  purpose: string;
  user_name: string | null;
};

type UserRow = {
  id: number;
  auth_user_id?: string | null;
  full_name: string;
  username: string;
  email: string | null;
  password_hash?: string | null;
  auth_sync_password?: string | null;
  role: string;
  active: number;
  created_at: string;
  last_login_at: string | null;
};

type AuditLogRow = {
  id: number;
  action: string;
  target_table: string;
  target_id: number | null;
  details: string | null;
  created_at: string;
  user_name: string | null;
  actor_name: string | null;
  actor_username: string | null;
  source_device: string | null;
  source_platform: string | null;
};

type StockCurrentRow = {
  product_id: number;
  product_name: string;
  quantity_in: number;
  quantity_out: number;
  current_stock: number;
  alert_threshold: number;
};

type SaleRow = {
  id: number;
  reference: string;
  client_name: string | null;
  sold_at: string;
  total_amount: number;
  payment_method: string;
  items_count: number;
};

type SaleItemRow = {
  line_type: "product" | "service";
  product_id: number;
  service_id: number | null;
  product_name: string;
  category: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type InvoiceSequenceRow = {
  current_year: number;
  series_index: number;
  next_number: number;
};

type InventoryCycleRow = {
  id: number;
  label: string;
  started_at: string;
};

const seedProducts: ProductDraft[] = [
  {
    code: "PAP-001",
    name: "Classeur",
    category: "Classement",
    purchasePrice: 4.2,
    sellingPrice: 6.0,
    quantity: 49,
    unit: "piece",
    alertThreshold: 10,
    supplier: "Papeterie Kivu",
  },
  {
    code: "PAP-002",
    name: "Scotch transparent",
    category: "Fourniture",
    purchasePrice: 3.2,
    sellingPrice: 5.0,
    quantity: 20,
    unit: "piece",
    alertThreshold: 8,
    supplier: "Bureau Express",
  },
  {
    code: "PAP-003",
    name: "Ram papier couleur",
    category: "Papier",
    purchasePrice: 0.08,
    sellingPrice: 0.1,
    quantity: 994,
    unit: "rame",
    alertThreshold: 100,
    supplier: "Color Print",
  },
];

const seedClients = [
  { name: "Institut Amani", phone: "+243970000001", address: "Goma", email: "contact@amani.cd" },
  { name: "Groupe Horizon", phone: "+243970000002", address: "Bukavu", email: "admin@horizon.cd" },
];

const seedServices: ServiceDraft[] = [
  { name: "Saisie de documents", category: "Bureautique", unitPrice: 2, description: "Saisie et mise en forme de documents", active: true },
  { name: "Impression couleur", category: "Impression", unitPrice: 1, description: "Impression couleur par page", active: true },
  { name: "Scan", category: "Numerisation", unitPrice: 1.5, description: "Numerisation de documents", active: true },
  { name: "Maintenance informatique", category: "Maintenance", unitPrice: 15, description: "Intervention et maintenance", active: true },
];

const seedUsers = [
  {
    fullName: "Marie Jeanne R.",
    username: "mjr",
    email: "mjr@lacouronne",
    role: "Administrateur",
    active: 1,
    createdAt: "2026-05-02T16:41:00",
    lastLoginAt: "2026-05-08T09:32:00",
  },
  {
    fullName: "Jean R.",
    username: "jr",
    email: "jr@lacouronne",
    role: "Super admin",
    active: 1,
    createdAt: "2026-05-02T16:17:00",
    lastLoginAt: "2026-05-02T16:18:00",
  },
  {
    fullName: "Test Employe",
    username: "test",
    email: "test@lacouronne",
    role: "Employe",
    active: 1,
    createdAt: "2026-05-01T19:50:00",
    lastLoginAt: "2026-05-01T20:00:00",
  },
  {
    fullName: "Roberto M.",
    username: "roberto",
    email: "roberto@lacouronne",
    role: "Super admin",
    active: 1,
    createdAt: "2026-04-29T13:42:00",
    lastLoginAt: "2026-05-16T15:51:00",
  },
  {
    fullName: "Admin Couronne",
    username: "admin",
    email: "admin@lacouronne.fr",
    role: "Super admin",
    active: 1,
    createdAt: "2026-04-29T13:42:00",
    lastLoginAt: "2026-04-29T17:29:00",
  },
];

const DEFAULT_PASSWORD = "Walikale123";

type Permission =
  | "manage_inventory"
  | "manage_clients"
  | "manage_sales"
  | "manage_users";

export class LocalDatabase {
  private db: Database.Database;
  private sessionUserId: number | null = null;

  constructor(storageDir: string) {
    fs.mkdirSync(storageDir, { recursive: true });
    const filePath = path.join(storageDir, "walikale-papeterie.db");
    this.db = new Database(filePath);
    this.initialize();
  }

  private initialize() {
    this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        auth_user_id TEXT,
        full_name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        email TEXT,
        password_hash TEXT,
        auth_sync_password TEXT,
        role TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        last_login_at TEXT
      );

      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        email TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        detail TEXT NOT NULL,
        nature TEXT NOT NULL,
        amount REAL NOT NULL,
        expense_date TEXT NOT NULL,
        user_id INTEGER,
        approved_by TEXT NOT NULL,
        purpose TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL DEFAULT 'General',
        purchase_price REAL NOT NULL,
        selling_price REAL NOT NULL,
        unit TEXT NOT NULL DEFAULT 'piece',
        alert_threshold INTEGER NOT NULL DEFAULT 0,
        supplier TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL DEFAULT 'Service general',
        unit_price REAL NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS initial_stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        purchase_price REAL NOT NULL,
        stock_date TEXT NOT NULL,
        cycle_id INTEGER,
        user_id INTEGER,
        note TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS replenishments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        purchase_price REAL NOT NULL,
        supplier TEXT NOT NULL,
        replenished_at TEXT NOT NULL,
        cycle_id INTEGER,
        user_id INTEGER,
        note TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT NOT NULL UNIQUE,
        client_id INTEGER,
        sold_at TEXT NOT NULL,
        total_amount REAL NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'Especes',
        cycle_id INTEGER,
        user_id INTEGER,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        line_total REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sale_service_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        line_total REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        source_table TEXT NOT NULL,
        source_id INTEGER,
        movement_date TEXT NOT NULL,
        cycle_id INTEGER,
        user_id INTEGER,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        target_table TEXT NOT NULL,
        target_id INTEGER,
        details TEXT,
        actor_name TEXT,
        actor_username TEXT,
        source_device TEXT,
        source_platform TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS invoice_sequence_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_year INTEGER NOT NULL,
        series_index INTEGER NOT NULL DEFAULT 0,
        next_number INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_synced_at TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS inventory_cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        started_at TEXT NOT NULL,
        user_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      DROP VIEW IF EXISTS current_stock_view;
      CREATE VIEW current_stock_view AS
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        COALESCE(SUM(CASE WHEN sm.quantity > 0 THEN sm.quantity ELSE 0 END), 0) AS quantity_in,
        COALESCE(SUM(CASE WHEN sm.quantity < 0 THEN ABS(sm.quantity) ELSE 0 END), 0) AS quantity_out,
        COALESCE(SUM(sm.quantity), 0) AS current_stock,
        p.alert_threshold AS alert_threshold
      FROM products p
      LEFT JOIN stock_movements sm
        ON sm.product_id = p.id
       AND sm.cycle_id = (SELECT COALESCE(MAX(id), 1) FROM inventory_cycles)
      GROUP BY p.id, p.name, p.alert_threshold;
    `);

    this.ensureUserColumns();
    this.ensureCycleColumns();
    this.ensureAuditLogColumns();
    this.ensureInventoryCycleSeed();
    this.ensureInvoiceSequenceSettings();
    this.ensureSyncSettings();
    this.seedIfNeeded();
    this.ensureMissingUserPasswords();
  }

  private ensureUserColumns() {
    const columns = this.db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    const names = new Set(columns.map((column) => column.name));

    if (!names.has("auth_user_id")) {
      this.db.exec("ALTER TABLE users ADD COLUMN auth_user_id TEXT");
    }

    if (!names.has("email")) {
      this.db.exec("ALTER TABLE users ADD COLUMN email TEXT");
    }

    if (!names.has("auth_sync_password")) {
      this.db.exec("ALTER TABLE users ADD COLUMN auth_sync_password TEXT");
    }

    if (!names.has("last_login_at")) {
      this.db.exec("ALTER TABLE users ADD COLUMN last_login_at TEXT");
    }
  }

  private ensureCycleColumns() {
    const initialStockColumns = this.db.prepare("PRAGMA table_info(initial_stocks)").all() as Array<{ name: string }>;
    const replenishmentColumns = this.db.prepare("PRAGMA table_info(replenishments)").all() as Array<{ name: string }>;
    const salesColumns = this.db.prepare("PRAGMA table_info(sales)").all() as Array<{ name: string }>;
    const movementColumns = this.db.prepare("PRAGMA table_info(stock_movements)").all() as Array<{ name: string }>;

    if (!new Set(initialStockColumns.map((column) => column.name)).has("cycle_id")) {
      this.db.exec("ALTER TABLE initial_stocks ADD COLUMN cycle_id INTEGER");
    }

    if (!new Set(replenishmentColumns.map((column) => column.name)).has("cycle_id")) {
      this.db.exec("ALTER TABLE replenishments ADD COLUMN cycle_id INTEGER");
    }

    if (!new Set(salesColumns.map((column) => column.name)).has("cycle_id")) {
      this.db.exec("ALTER TABLE sales ADD COLUMN cycle_id INTEGER");
    }

    if (!new Set(movementColumns.map((column) => column.name)).has("cycle_id")) {
      this.db.exec("ALTER TABLE stock_movements ADD COLUMN cycle_id INTEGER");
    }
  }

  private ensureAuditLogColumns() {
    const columns = this.db.prepare("PRAGMA table_info(audit_logs)").all() as Array<{ name: string }>;
    const names = new Set(columns.map((column) => column.name));

    if (!names.has("actor_name")) {
      this.db.exec("ALTER TABLE audit_logs ADD COLUMN actor_name TEXT");
    }

    if (!names.has("actor_username")) {
      this.db.exec("ALTER TABLE audit_logs ADD COLUMN actor_username TEXT");
    }

    if (!names.has("source_device")) {
      this.db.exec("ALTER TABLE audit_logs ADD COLUMN source_device TEXT");
    }

    if (!names.has("source_platform")) {
      this.db.exec("ALTER TABLE audit_logs ADD COLUMN source_platform TEXT");
    }

    if (!names.has("synced_at")) {
      this.db.exec("ALTER TABLE audit_logs ADD COLUMN synced_at TEXT");
      const syncRow = this.db
        .prepare("SELECT last_synced_at FROM sync_settings WHERE id = 1")
        .get() as { last_synced_at: string | null } | undefined;
      const lastSyncedAt = syncRow?.last_synced_at ?? null;

      if (lastSyncedAt) {
        this.db
          .prepare("UPDATE audit_logs SET synced_at = created_at WHERE synced_at IS NULL AND created_at <= ?")
          .run(lastSyncedAt);
      }
    }
  }

  private ensureInventoryCycleSeed() {
    const count = this.db.prepare("SELECT COUNT(*) AS count FROM inventory_cycles").get() as { count: number };

    if (count.count === 0) {
      this.db
        .prepare("INSERT INTO inventory_cycles (label, started_at, user_id) VALUES (?, ?, ?)")
        .run("Cycle 1", new Date().toISOString(), this.getActorUserId());
    }

    this.db.exec(`
      UPDATE initial_stocks
      SET cycle_id = COALESCE(cycle_id, 1)
      WHERE cycle_id IS NULL;

      UPDATE replenishments
      SET cycle_id = COALESCE(cycle_id, 1)
      WHERE cycle_id IS NULL;

      UPDATE sales
      SET cycle_id = COALESCE(cycle_id, 1)
      WHERE cycle_id IS NULL;

      UPDATE stock_movements
      SET cycle_id = COALESCE(cycle_id, 1)
      WHERE cycle_id IS NULL;
    `);
  }

  private seedIfNeeded() {
    const productCount = this.db.prepare("SELECT COUNT(*) AS count FROM products").get() as { count: number };
    const now = new Date().toISOString();
    const serviceCount = this.db.prepare("SELECT COUNT(*) AS count FROM services").get() as { count: number };
    const previousSessionUserId = this.sessionUserId;
    let seedUserId = previousSessionUserId;

    if (productCount.count === 0) {
      const insertUser = this.db.prepare(`
        INSERT INTO users (full_name, username, email, password_hash, auth_sync_password, role, active, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      seedUsers.forEach((user) => {
        insertUser.run(
          user.fullName,
          user.username,
          user.email,
          this.hashPassword(DEFAULT_PASSWORD),
          DEFAULT_PASSWORD,
          user.role,
          user.active,
          user.createdAt,
          user.lastLoginAt
        );
      });

      const insertClient = this.db.prepare(`
        INSERT INTO clients (name, phone, address, email, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      seedClients.forEach((client) => {
        insertClient.run(client.name, client.phone, client.address, client.email, now);
      });

      const firstSeedUser = this.db.prepare("SELECT id FROM users ORDER BY id ASC LIMIT 1").get() as
        | { id: number }
        | undefined;
      seedUserId = firstSeedUser?.id ?? null;
      this.sessionUserId = seedUserId;
      seedProducts.forEach((product) => this.saveProduct(product));
    } else if (serviceCount.count === 0 && this.sessionUserId == null) {
      const firstExistingUser = this.db.prepare("SELECT id FROM users ORDER BY id ASC LIMIT 1").get() as
        | { id: number }
        | undefined;
      seedUserId = firstExistingUser?.id ?? null;
    }

    if (serviceCount.count === 0) {
      this.sessionUserId = seedUserId;
      seedServices.forEach((service) => this.saveService(service));
    }

    this.sessionUserId = previousSessionUserId;
  }

  private ensureMissingUserPasswords() {
    const usersWithoutPassword = this.db
      .prepare("SELECT id FROM users WHERE password_hash IS NULL OR TRIM(password_hash) = ''")
      .all() as Array<{ id: number }>;

    if (usersWithoutPassword.length === 0) {
      return;
    }

    const passwordHash = this.hashPassword(DEFAULT_PASSWORD);
    const updateUserPassword = this.db.prepare("UPDATE users SET password_hash = ? WHERE id = ?");

    usersWithoutPassword.forEach((user) => {
      updateUserPassword.run(passwordHash, user.id);
    });
  }

  private ensureInvoiceSequenceSettings() {
    const now = new Date().toISOString();
    const currentYear = new Date().getFullYear();
    const existing = this.db
      .prepare("SELECT current_year, series_index, next_number FROM invoice_sequence_settings WHERE id = 1")
      .get() as InvoiceSequenceRow | undefined;

    if (!existing) {
      this.db
        .prepare(`
          INSERT INTO invoice_sequence_settings (id, current_year, series_index, next_number, updated_at)
          VALUES (1, ?, 0, 1, ?)
        `)
        .run(currentYear, now);
      return;
    }

    if (existing.current_year !== currentYear) {
      this.db
        .prepare(`
          UPDATE invoice_sequence_settings
          SET current_year = ?, series_index = 0, next_number = 1, updated_at = ?
          WHERE id = 1
        `)
        .run(currentYear, now);
    }
  }

  private ensureSyncSettings() {
    const existing = this.db.prepare("SELECT id FROM sync_settings WHERE id = 1").get() as { id: number } | undefined;

    if (!existing) {
      this.db
        .prepare("INSERT INTO sync_settings (id, last_synced_at, updated_at) VALUES (1, NULL, ?)")
        .run(new Date().toISOString());
    }
  }

  listProducts(): Product[] {
    const rows = this.db
      .prepare(`
        SELECT
          p.id,
          p.code,
          p.name,
          p.category,
          p.purchase_price,
          p.selling_price,
          COALESCE(csv.current_stock, 0) AS quantity,
          p.unit,
          p.alert_threshold,
          p.supplier,
          p.updated_at
        FROM products p
        LEFT JOIN current_stock_view csv ON csv.product_id = p.id
        ORDER BY p.updated_at DESC
      `)
      .all() as ProductRow[];

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      purchasePrice: row.purchase_price,
      sellingPrice: row.selling_price,
      quantity: row.quantity,
      unit: row.unit,
      alertThreshold: row.alert_threshold,
      supplier: row.supplier,
      updatedAt: row.updated_at,
    }));
  }

  listServices(): Service[] {
    const rows = this.db
      .prepare(`
        SELECT id, name, category, unit_price, description, active, created_at, updated_at
        FROM services
        ORDER BY active DESC, datetime(updated_at) DESC, name ASC
      `)
      .all() as ServiceRow[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      unitPrice: row.unit_price,
      description: row.description,
      active: Boolean(row.active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  saveProduct(draft: ProductDraft): Product[] {
    this.requirePermission("manage_inventory");
    const actor = this.requireAuthenticatedUser();
    const now = new Date().toISOString();
    const userId = this.getActorUserId();
    const cycleId = this.getCurrentInventoryCycleId();
    const normalizedDraft = {
      code: draft.code?.trim() || this.generateCode(draft.name),
      name: draft.name.trim(),
      category: draft.category?.trim() || "General",
      purchasePrice: draft.purchasePrice,
      sellingPrice: draft.sellingPrice,
      quantity: draft.quantity,
      unit: draft.unit?.trim() || "piece",
      alertThreshold: draft.alertThreshold ?? 0,
      supplier: draft.supplier.trim(),
    };

    const existing = this.db
      .prepare("SELECT id, code, name, category, purchase_price, selling_price, unit, alert_threshold, supplier FROM products WHERE LOWER(name) = LOWER(?)")
      .get(normalizedDraft.name) as
      | {
          id: number;
          code: string;
          name: string;
          category: string;
          purchase_price: number;
          selling_price: number;
          unit: string;
          alert_threshold: number;
          supplier: string;
        }
      | undefined;

    if (existing) {
      const isMetadataChanged =
        existing.code !== normalizedDraft.code ||
        existing.name !== normalizedDraft.name ||
        existing.category !== normalizedDraft.category ||
        Number(existing.purchase_price) !== Number(normalizedDraft.purchasePrice) ||
        Number(existing.selling_price) !== Number(normalizedDraft.sellingPrice) ||
        existing.unit !== normalizedDraft.unit ||
        Number(existing.alert_threshold) !== Number(normalizedDraft.alertThreshold) ||
        existing.supplier !== normalizedDraft.supplier;

      if (isMetadataChanged && actor.role !== "Super admin") {
        throw new Error("Seul le super administrateur peut modifier un produit existant.");
      }

      this.db
        .prepare(`
          UPDATE products
          SET code = ?, name = ?, category = ?, purchase_price = ?, selling_price = ?, unit = ?,
              alert_threshold = ?, supplier = ?, updated_at = ?
          WHERE id = ?
        `)
        .run(
          normalizedDraft.code,
          normalizedDraft.name,
          normalizedDraft.category,
          normalizedDraft.purchasePrice,
          normalizedDraft.sellingPrice,
          normalizedDraft.unit,
          normalizedDraft.alertThreshold,
          normalizedDraft.supplier,
          now,
          existing.id
        );

      this.recordReplenishment(existing.id, normalizedDraft.quantity, normalizedDraft.purchasePrice, normalizedDraft.supplier, userId);
      this.logAction(userId, "update", "products", existing.id, `Mise a jour produit ${normalizedDraft.name}`);
    } else {
      const result = this.db
        .prepare(`
          INSERT INTO products
          (code, name, category, purchase_price, selling_price, unit, alert_threshold, supplier, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          normalizedDraft.code,
          normalizedDraft.name,
          normalizedDraft.category,
          normalizedDraft.purchasePrice,
          normalizedDraft.sellingPrice,
          normalizedDraft.unit,
          normalizedDraft.alertThreshold,
          normalizedDraft.supplier,
          now,
          now
        );

      const productId = Number(result.lastInsertRowid);
      this.recordInitialStock(productId, normalizedDraft.quantity, normalizedDraft.purchasePrice, userId);
      this.logAction(userId, "create", "products", productId, `Creation produit ${normalizedDraft.name}`);
    }

    return this.listProducts();
  }

  saveService(draft: ServiceDraft): Service[] {
    this.requirePermission("manage_inventory");
    const now = new Date().toISOString();
    const normalizedName = draft.name.trim();
    const normalizedCategory = draft.category.trim() || "Service general";
    const normalizedDescription = draft.description.trim();
    const unitPrice = Number(draft.unitPrice);

    if (!normalizedName) {
      throw new Error("Le nom du service est obligatoire.");
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error("Le prix du service doit etre superieur a zero.");
    }

    const existing = this.db
      .prepare("SELECT id FROM services WHERE LOWER(name) = LOWER(?) LIMIT 1")
      .get(normalizedName) as { id: number } | undefined;

    if (existing) {
      this.db
        .prepare(`
          UPDATE services
          SET category = ?, unit_price = ?, description = ?, active = ?, updated_at = ?
          WHERE id = ?
        `)
        .run(normalizedCategory, unitPrice, normalizedDescription, draft.active === false ? 0 : 1, now, existing.id);

      this.logAction(this.getActorUserId(), "update", "services", existing.id, `Mise a jour service ${normalizedName}`);
    } else {
      const result = this.db
        .prepare(`
          INSERT INTO services (name, category, unit_price, description, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(normalizedName, normalizedCategory, unitPrice, normalizedDescription, draft.active === false ? 0 : 1, now, now);

      this.logAction(this.getActorUserId(), "create", "services", Number(result.lastInsertRowid), `Creation service ${normalizedName}`);
    }

    return this.listServices();
  }

  deleteProduct(id: number): Product[] {
    this.requireSuperAdminAccess("Seul le super administrateur peut supprimer un produit.");
    this.db.prepare("DELETE FROM products WHERE id = ?").run(id);
    this.logAction(this.getActorUserId(), "delete", "products", id, "Suppression produit");
    return this.listProducts();
  }

  listSales(): SaleRecord[] {
    const rows = this.db
      .prepare(`
        SELECT
          s.id,
          s.reference,
          c.name AS client_name,
          s.sold_at,
          s.total_amount,
          s.payment_method,
          (
            SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id
          ) + (
            SELECT COUNT(*) FROM sale_service_items ssi WHERE ssi.sale_id = s.id
          ) AS items_count
        FROM sales s
        LEFT JOIN clients c ON c.id = s.client_id
        ORDER BY s.id DESC
      `)
      .all() as SaleRow[];

    return rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      clientName: row.client_name ?? "Client comptoir",
      date: this.formatDate(row.sold_at),
      amount: row.total_amount,
      paymentMethod: row.payment_method,
      status: "Payee",
      itemsCount: row.items_count,
    }));
  }

  getInvoiceSeriesInfo(): InvoiceSeriesInfo {
    const sequence = this.getCurrentInvoiceSequence();
    const seriesLabel = this.getInvoiceSeriesLabel(sequence.series_index);
    const yearCode = String(sequence.current_year).slice(-2);
    const nextReference = this.buildInvoiceReference(sequence.current_year, sequence.series_index, sequence.next_number);
    const lastNumber = sequence.next_number > 1 ? sequence.next_number - 1 : null;

    return {
      seriesLabel,
      year: sequence.current_year,
      yearCode,
      nextNumber: sequence.next_number,
      nextReference,
      lastReference:
        lastNumber === null
          ? null
          : this.buildInvoiceReference(sequence.current_year, sequence.series_index, lastNumber),
    };
  }

  resetInventoryCycle() {
    this.requireSuperAdminAccess("Seul le super administrateur peut reinitialiser l'inventaire et demarrer un nouveau cycle.");
    const now = new Date().toISOString();
    const actorUserId = this.getActorUserId();
    const lastCycle = this.db
      .prepare("SELECT id, label, started_at FROM inventory_cycles ORDER BY id DESC LIMIT 1")
      .get() as InventoryCycleRow | undefined;
    const nextCycleNumber = (lastCycle?.id ?? 0) + 1;
    const resetTransaction = this.db.transaction(() => {
      this.db.prepare("DELETE FROM sale_items").run();
      this.db.prepare("DELETE FROM sale_service_items").run();
      this.db.prepare("DELETE FROM stock_movements").run();
      this.db.prepare("DELETE FROM sales").run();
      this.db.prepare("DELETE FROM replenishments").run();
      this.db.prepare("DELETE FROM initial_stocks").run();
      this.db.prepare("INSERT INTO inventory_cycles (label, started_at, user_id) VALUES (?, ?, ?)").run(
        `Cycle ${nextCycleNumber}`,
        now,
        actorUserId
      );
    });

    resetTransaction();

    this.logAction(
      actorUserId,
      "update",
      "inventory_cycles",
      nextCycleNumber,
      "Reinitialisation du cycle de stock apres inventaire"
    );
  }

  getSyncStatus(): SyncStatus {
    this.ensureSyncSettings();
    const row = this.db
      .prepare("SELECT last_synced_at FROM sync_settings WHERE id = 1")
      .get() as { last_synced_at: string | null } | undefined;
    const lastSyncedAt = row?.last_synced_at ?? null;
    const pendingRow = this.db
      .prepare("SELECT COUNT(*) AS count FROM audit_logs WHERE synced_at IS NULL")
      .get() as { count: number };

    return {
      available: true,
      online: true,
      lastSyncedAt,
      pendingChanges: pendingRow.count,
    };
  }

  getPendingSyncOverview(): SyncPendingOverview {
    const rows = this.db
      .prepare(
        `
          SELECT target_table, COUNT(*) AS count, MAX(created_at) AS latest_changed_at
          FROM audit_logs
          WHERE synced_at IS NULL
          GROUP BY target_table
        `
      )
      .all() as Array<{ target_table: string; count: number; latest_changed_at: string | null }>;

    const buckets: SyncConflictBucket[] = rows.map((row) => ({
      key: row.target_table,
      label: row.target_table,
      count: row.count,
    }));

    const latestChangedAt = rows.reduce<string | null>((latest, row) => {
      if (!row.latest_changed_at) {
        return latest;
      }

      if (!latest || new Date(row.latest_changed_at).getTime() > new Date(latest).getTime()) {
        return row.latest_changed_at;
      }

      return latest;
    }, null);

    return {
      buckets,
      latestChangedAt,
    };
  }

  exportSyncSnapshot(): SyncSnapshot {
    return {
      users: this.db.prepare("SELECT id, auth_user_id, full_name, username, email, password_hash, auth_sync_password, role, active, created_at, last_login_at FROM users ORDER BY id ASC").all() as Array<Record<string, unknown>>,
      products: this.db.prepare("SELECT id, code, name, category, purchase_price, selling_price, unit, alert_threshold, supplier, created_at, updated_at FROM products ORDER BY id ASC").all() as Array<Record<string, unknown>>,
      clients: this.db.prepare("SELECT id, name, phone, address, email, created_at FROM clients ORDER BY id ASC").all() as Array<Record<string, unknown>>,
      expenses: this.db.prepare("SELECT id, detail, nature, amount, expense_date, user_id, approved_by, purpose FROM expenses ORDER BY id ASC").all() as Array<Record<string, unknown>>,
      services: this.db.prepare("SELECT id, name, category, unit_price, description, active, created_at, updated_at FROM services ORDER BY id ASC").all() as Array<Record<string, unknown>>,
      initialStocks: this.db.prepare("SELECT id, product_id, quantity, purchase_price, stock_date, cycle_id, NULL as user_id, note FROM initial_stocks ORDER BY id ASC").all() as Array<Record<string, unknown>>,
      replenishments: this.db.prepare("SELECT id, product_id, quantity, purchase_price, supplier, replenished_at, cycle_id, NULL as user_id, note FROM replenishments ORDER BY id ASC").all() as Array<Record<string, unknown>>,
      sales: this.db.prepare("SELECT id, reference, client_id, sold_at, total_amount, payment_method, cycle_id, NULL as user_id FROM sales ORDER BY id ASC").all() as Array<Record<string, unknown>>,
      saleItems: this.db.prepare("SELECT id, sale_id, product_id, quantity, unit_price, line_total FROM sale_items ORDER BY id ASC").all() as Array<Record<string, unknown>>,
      saleServiceItems: this.db.prepare("SELECT id, sale_id, service_id, quantity, unit_price, line_total FROM sale_service_items ORDER BY id ASC").all() as Array<Record<string, unknown>>,
      stockMovements: this.db.prepare("SELECT id, product_id, movement_type, quantity, source_table, source_id, movement_date, cycle_id, NULL as user_id FROM stock_movements ORDER BY id ASC").all() as Array<Record<string, unknown>>,
      auditLogs: this.db.prepare("SELECT id, NULL as user_id, action, target_table, target_id, details, actor_name, actor_username, source_device, source_platform, created_at FROM audit_logs ORDER BY id ASC").all() as Array<Record<string, unknown>>,
      invoiceSequences: this.db.prepare("SELECT id, current_year, series_index, next_number, updated_at FROM invoice_sequence_settings ORDER BY id ASC").all() as Array<Record<string, unknown>>,
      inventoryCycles: this.db.prepare("SELECT id, label, started_at, NULL as user_id FROM inventory_cycles ORDER BY id ASC").all() as Array<Record<string, unknown>>,
    };
  }

  importSyncSnapshot(snapshot: SyncSnapshot) {
    this.ensureSyncSettings();
    const replaceTransaction = this.db.transaction(() => {
      this.db.prepare("DELETE FROM sale_items").run();
      this.db.prepare("DELETE FROM sale_service_items").run();
      this.db.prepare("DELETE FROM stock_movements").run();
      this.db.prepare("DELETE FROM sales").run();
      this.db.prepare("DELETE FROM replenishments").run();
      this.db.prepare("DELETE FROM initial_stocks").run();
      this.db.prepare("DELETE FROM audit_logs").run();
      this.db.prepare("DELETE FROM expenses").run();
      this.db.prepare("DELETE FROM services").run();
      this.db.prepare("DELETE FROM users").run();
      this.db.prepare("DELETE FROM clients").run();
      this.db.prepare("DELETE FROM products").run();
      this.db.prepare("DELETE FROM inventory_cycles").run();
      this.db.prepare("DELETE FROM invoice_sequence_settings").run();

      const insertUsers = this.db.prepare(`
        INSERT INTO users (id, auth_user_id, full_name, username, email, password_hash, auth_sync_password, role, active, created_at, last_login_at)
        VALUES (@id, @auth_user_id, @full_name, @username, @email, @password_hash, @auth_sync_password, @role, @active, @created_at, @last_login_at)
      `);
      const insertProducts = this.db.prepare(`
        INSERT INTO products (id, code, name, category, purchase_price, selling_price, unit, alert_threshold, supplier, created_at, updated_at)
        VALUES (@id, @code, @name, @category, @purchase_price, @selling_price, @unit, @alert_threshold, @supplier, @created_at, @updated_at)
      `);
      const insertClients = this.db.prepare(`
        INSERT INTO clients (id, name, phone, address, email, created_at)
        VALUES (@id, @name, @phone, @address, @email, @created_at)
      `);
      const insertExpenses = this.db.prepare(`
        INSERT INTO expenses (id, detail, nature, amount, expense_date, user_id, approved_by, purpose)
        VALUES (@id, @detail, @nature, @amount, @expense_date, @user_id, @approved_by, @purpose)
      `);
      const insertServices = this.db.prepare(`
        INSERT INTO services (id, name, category, unit_price, description, active, created_at, updated_at)
        VALUES (@id, @name, @category, @unit_price, @description, @active, @created_at, @updated_at)
      `);
      const insertInitialStocks = this.db.prepare(`
        INSERT INTO initial_stocks (id, product_id, quantity, purchase_price, stock_date, cycle_id, user_id, note)
        VALUES (@id, @product_id, @quantity, @purchase_price, @stock_date, @cycle_id, @user_id, @note)
      `);
      const insertReplenishments = this.db.prepare(`
        INSERT INTO replenishments (id, product_id, quantity, purchase_price, supplier, replenished_at, cycle_id, user_id, note)
        VALUES (@id, @product_id, @quantity, @purchase_price, @supplier, @replenished_at, @cycle_id, @user_id, @note)
      `);
      const insertSales = this.db.prepare(`
        INSERT INTO sales (id, reference, client_id, sold_at, total_amount, payment_method, cycle_id, user_id)
        VALUES (@id, @reference, @client_id, @sold_at, @total_amount, @payment_method, @cycle_id, @user_id)
      `);
      const insertSaleItems = this.db.prepare(`
        INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, line_total)
        VALUES (@id, @sale_id, @product_id, @quantity, @unit_price, @line_total)
      `);
      const insertSaleServiceItems = this.db.prepare(`
        INSERT INTO sale_service_items (id, sale_id, service_id, quantity, unit_price, line_total)
        VALUES (@id, @sale_id, @service_id, @quantity, @unit_price, @line_total)
      `);
      const insertStockMovements = this.db.prepare(`
        INSERT INTO stock_movements (id, product_id, movement_type, quantity, source_table, source_id, movement_date, cycle_id, user_id)
        VALUES (@id, @product_id, @movement_type, @quantity, @source_table, @source_id, @movement_date, @cycle_id, @user_id)
      `);
      const insertAuditLogs = this.db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, target_table, target_id, details, actor_name, actor_username, source_device, source_platform, created_at, synced_at)
        VALUES (@id, @user_id, @action, @target_table, @target_id, @details, @actor_name, @actor_username, @source_device, @source_platform, @created_at, @synced_at)
      `);
      const insertInvoiceSequences = this.db.prepare(`
        INSERT INTO invoice_sequence_settings (id, current_year, series_index, next_number, updated_at)
        VALUES (@id, @current_year, @series_index, @next_number, @updated_at)
      `);
      const insertInventoryCycles = this.db.prepare(`
        INSERT INTO inventory_cycles (id, label, started_at, user_id)
        VALUES (@id, @label, @started_at, @user_id)
      `);

      (snapshot.users ?? []).forEach((row) => insertUsers.run(row));
      (snapshot.products ?? []).forEach((row) => insertProducts.run(row));
      (snapshot.clients ?? []).forEach((row) => insertClients.run(row));
      (snapshot.expenses ?? []).forEach((row) => insertExpenses.run(row));
      (snapshot.services ?? []).forEach((row) => insertServices.run(row));
      (snapshot.inventoryCycles ?? []).forEach((row) => insertInventoryCycles.run(row));
      (snapshot.invoiceSequences ?? []).forEach((row) => insertInvoiceSequences.run(row));
      (snapshot.initialStocks ?? []).forEach((row) => insertInitialStocks.run(row));
      (snapshot.replenishments ?? []).forEach((row) => insertReplenishments.run(row));
      (snapshot.sales ?? []).forEach((row) => insertSales.run(row));
      (snapshot.saleItems ?? []).forEach((row) => insertSaleItems.run(row));
      (snapshot.saleServiceItems ?? []).forEach((row) => insertSaleServiceItems.run(row));
      (snapshot.stockMovements ?? []).forEach((row) => insertStockMovements.run(row));
      const importedAt = new Date().toISOString();
      (snapshot.auditLogs ?? []).forEach((row) => insertAuditLogs.run({ ...row, synced_at: importedAt }));
    });

    replaceTransaction();
  }

  markSyncComplete(syncedAt?: string) {
    this.ensureSyncSettings();
    const timestamp = syncedAt ?? new Date().toISOString();
    this.db.prepare("UPDATE audit_logs SET synced_at = ? WHERE synced_at IS NULL").run(timestamp);
    this.db
      .prepare("UPDATE sync_settings SET last_synced_at = ?, updated_at = ? WHERE id = 1")
      .run(timestamp, new Date().toISOString());
  }

  markSyncBucketsComplete(targetTables: string[], syncedAt?: string) {
    this.ensureSyncSettings();
    const timestamp = syncedAt ?? new Date().toISOString();
    const normalizedTables = [...new Set(targetTables.map((table) => table.trim()).filter(Boolean))];

    if (normalizedTables.length > 0) {
      const placeholders = normalizedTables.map(() => "?").join(", ");
      this.db
        .prepare(`UPDATE audit_logs SET synced_at = ? WHERE synced_at IS NULL AND target_table IN (${placeholders})`)
        .run(timestamp, ...normalizedTables);
    }

    this.db
      .prepare("UPDATE sync_settings SET last_synced_at = ?, updated_at = ? WHERE id = 1")
      .run(timestamp, new Date().toISOString());
  }

  private requireSuperAdminAccess(message = "Seul le super administrateur peut effectuer cette action.") {
    const actor = this.requireAuthenticatedUser();
    if (actor.role !== "Super admin") {
      throw new Error(message);
    }
    return actor;
  }

  advanceInvoiceSeries(): InvoiceSeriesInfo {
    this.requireSuperAdminAccess("Seul le super administrateur peut demarrer une nouvelle serie de factures.");
    const sequence = this.getCurrentInvoiceSequence();
    const now = new Date().toISOString();

    this.db
      .prepare(`
        UPDATE invoice_sequence_settings
        SET series_index = ?, next_number = 1, updated_at = ?
        WHERE id = 1
      `)
      .run(sequence.series_index + 1, now);

    const nextInfo = this.getInvoiceSeriesInfo();
    this.logAction(
      this.getActorUserId(),
      "update",
      "invoice_sequence_settings",
      1,
      `Nouvelle serie de facturation ${nextInfo.seriesLabel}${nextInfo.yearCode}`
    );

    return nextInfo;
  }

  createSale(draft: SaleDraft): SaleRecord[] {
    this.requirePermission("manage_sales");
    if (draft.items.length === 0 && draft.serviceItems.length === 0) {
      throw new Error("Ajoutez au moins un produit ou un service a la facture.");
    }

    const now = new Date().toISOString();
    const userId = this.getActorUserId();
    const cycleId = this.getCurrentInventoryCycleId();
    const normalizedItems = this.mergeSaleItems(draft.items);
    const normalizedServiceItems = this.mergeSaleServiceItems(draft.serviceItems);
    let totalAmount = 0;

    const productQuery = this.db.prepare(`
      SELECT
        p.id,
        p.name,
        p.selling_price,
        COALESCE(csv.current_stock, 0) AS quantity
      FROM products p
      LEFT JOIN current_stock_view csv ON csv.product_id = p.id
      WHERE p.id = ?
    `);

    const resolvedItems = normalizedItems.map((item) => {
      const product = productQuery.get(item.productId) as
        | { id: number; name: string; selling_price: number; quantity: number }
        | undefined;

      if (!product) {
        throw new Error("Un produit de la facture est introuvable.");
      }

      if (item.quantity <= 0) {
        throw new Error(`La quantite doit etre superieure a zero pour ${product.name}.`);
      }

      if (product.quantity < item.quantity) {
        throw new Error(`Stock insuffisant pour ${product.name}.`);
      }

      const lineTotal = product.selling_price * item.quantity;
      totalAmount += lineTotal;

      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.selling_price,
        lineTotal,
      };
    });

    const serviceQuery = this.db.prepare(`
      SELECT id, name, category, unit_price, active
      FROM services
      WHERE id = ?
    `);

    const resolvedServiceItems = normalizedServiceItems.map((item) => {
      const service = serviceQuery.get(item.serviceId) as
        | { id: number; name: string; category: string; unit_price: number; active: number }
        | undefined;

      if (!service) {
        throw new Error("Un service de la facture est introuvable.");
      }

      if (!Boolean(service.active)) {
        throw new Error(`Le service ${service.name} est inactif.`);
      }

      if (item.quantity <= 0) {
        throw new Error(`La quantite doit etre superieure a zero pour ${service.name}.`);
      }

      const lineTotal = service.unit_price * item.quantity;
      totalAmount += lineTotal;

      return {
        serviceId: service.id,
        serviceName: service.name,
        category: service.category,
        quantity: item.quantity,
        unitPrice: service.unit_price,
        lineTotal,
      };
    });

    const insertSaleItem = this.db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertSaleServiceItem = this.db.prepare(`
      INSERT INTO sale_service_items (sale_id, service_id, quantity, unit_price, line_total)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMovement = this.db.prepare(`
      INSERT INTO stock_movements (product_id, movement_type, quantity, source_table, source_id, movement_date, cycle_id, user_id)
      VALUES (?, 'vente', ?, 'sales', ?, ?, ?, ?)
    `);

    const createSaleTransaction = this.db.transaction(() => {
      const reference = this.generateSaleReference();
      const saleResult = this.db
        .prepare(`
          INSERT INTO sales (reference, client_id, sold_at, total_amount, payment_method, cycle_id, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(reference, draft.clientId, now, totalAmount, draft.paymentMethod, cycleId, userId);

      const saleId = Number(saleResult.lastInsertRowid);

      resolvedItems.forEach((item) => {
        insertSaleItem.run(saleId, item.productId, item.quantity, item.unitPrice, item.lineTotal);
        insertMovement.run(item.productId, -item.quantity, saleId, now, cycleId, userId);
      });

      resolvedServiceItems.forEach((item) => {
        insertSaleServiceItem.run(saleId, item.serviceId, item.quantity, item.unitPrice, item.lineTotal);
      });

      this.logAction(
        userId,
        "create",
        "sales",
        saleId,
        `Vente ${reference} avec ${resolvedItems.length + resolvedServiceItems.length} ligne(s)`
      );

      return { saleId, reference };
    });

    createSaleTransaction();

    return this.listSales();
  }

  getSupplyHistory(): SupplyHistoryItem[] {
    const rows = this.db
      .prepare(`
        SELECT
          r.id,
          CASE
            WHEN r.movement_type = 'stock_initial' THEN s.stock_date
            WHEN r.movement_type = 'vente' THEN sl.sold_at
            ELSE rp.replenished_at
          END AS date,
          p.name AS product,
          ABS(r.quantity) AS quantity,
          CASE
            WHEN r.movement_type = 'vente' THEN COALESCE(c.name, 'Client comptoir')
            ELSE p.supplier
          END AS supplier,
          p.purchase_price,
          p.selling_price,
          ABS(r.quantity) * CASE WHEN r.movement_type = 'vente' THEN p.selling_price ELSE p.purchase_price END AS amount,
          r.movement_type
        FROM stock_movements r
        INNER JOIN products p ON p.id = r.product_id
        LEFT JOIN initial_stocks s ON s.id = r.source_id AND r.source_table = 'initial_stocks'
        LEFT JOIN replenishments rp ON rp.id = r.source_id AND r.source_table = 'replenishments'
        LEFT JOIN sales sl ON sl.id = r.source_id AND r.source_table = 'sales'
        LEFT JOIN clients c ON c.id = sl.client_id
        WHERE r.movement_type IN ('stock_initial', 'reapprovisionnement', 'vente')
          AND r.cycle_id = ?
        ORDER BY r.id DESC
        LIMIT 100
      `)
      .all(this.getCurrentInventoryCycleId()) as SupplyHistoryRow[];

    return rows.map((row) => ({
      id: row.id,
      date: this.formatDate(row.date),
      product: row.product,
      quantity: row.quantity,
      supplier: row.supplier,
      purchasePrice: row.purchase_price,
      sellingPrice: row.selling_price,
      amount: row.amount,
      movementType: row.movement_type,
    }));
  }

  getActivityHistory(): ActivityHistoryItem[] {
    const rows = this.db
      .prepare(`
        SELECT
          a.id,
          a.action,
          a.target_table,
          a.target_id,
          a.details,
          a.actor_name,
          a.actor_username,
          a.source_device,
          a.source_platform,
          a.created_at,
          u.full_name AS user_name
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.user_id
        ORDER BY datetime(a.created_at) DESC, a.id DESC
        LIMIT 300
      `)
      .all() as AuditLogRow[];

    return rows.map((row) => ({
      id: row.id,
      date: this.formatDateTime(row.created_at),
      action: this.formatActionLabel(row.action),
      target: this.formatTargetLabel(row.target_table, row.target_id),
      details: row.details ?? "",
      user: this.formatAuditActorLabel(row),
    }));
  }

  listExpenses(): ExpenseItem[] {
    const rows = this.db
      .prepare(`
        SELECT
          e.id,
          e.detail,
          e.nature,
          e.amount,
          e.expense_date,
          e.user_id,
          e.approved_by,
          e.purpose,
          u.full_name AS user_name
        FROM expenses e
        LEFT JOIN users u ON u.id = e.user_id
        ORDER BY datetime(e.expense_date) DESC, e.id DESC
      `)
      .all() as ExpenseRow[];

    return rows.map((row) => ({
      id: row.id,
      detail: row.detail,
      nature: row.nature,
      amount: row.amount,
      date: this.formatDateTime(row.expense_date),
      requestedBy: row.user_name ?? "Utilisateur non precise",
      approvedBy: row.approved_by,
      purpose: row.purpose,
    }));
  }

  saveExpense(draft: ExpenseDraft): ExpenseItem[] {
    this.requirePermission("manage_inventory");
    const actorUserId = this.getActorUserId();
    const detail = draft.detail.trim();
    const nature = draft.nature.trim();
    const approvedBy = draft.approvedBy.trim();
    const purpose = draft.purpose.trim();
    const amount = Number(draft.amount);
    const expenseDate = draft.date?.trim() ? new Date(draft.date).toISOString() : new Date().toISOString();

    if (!detail || !nature || !approvedBy || !purpose) {
      throw new Error("Tous les champs de depense sont obligatoires.");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Le montant de la depense doit etre superieur a zero.");
    }

    const result = this.db
      .prepare(`
        INSERT INTO expenses (detail, nature, amount, expense_date, user_id, approved_by, purpose)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(detail, nature, amount, expenseDate, actorUserId, approvedBy, purpose);

    const expenseId = Number(result.lastInsertRowid);
    this.logAction(actorUserId, "create", "expenses", expenseId, `Depense engagee ${nature} - ${amount} FC - ${purpose}`);
    return this.listExpenses();
  }

  getDashboardMetrics(): DashboardMetrics {
    const products = this.listProducts();
    const totalStock = products.reduce((sum, item) => sum + item.quantity, 0);
    const today = new Date().toISOString().slice(0, 10);
    const dailySales = this.db
      .prepare("SELECT COUNT(*) AS count FROM sales WHERE substr(sold_at, 1, 10) = ?")
      .get(today) as { count: number };
    const totalSalesRow = this.db.prepare("SELECT COALESCE(SUM(total_amount), 0) AS total FROM sales").get() as { total: number };
    const totalExpensesRow = this.db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM expenses").get() as { total: number };
    const totalSalesAmount = Number(totalSalesRow.total ?? 0);
    const totalExpenses = Number(totalExpensesRow.total ?? 0);

    return {
      totalStock,
      totalProducts: products.length,
      dailySales: dailySales.count,
      suppliers: new Set(products.map((item) => item.supplier)).size,
      totalSalesAmount,
      totalExpenses,
      netSalesAmount: totalSalesAmount - totalExpenses,
    };
  }

  listClients(): Client[] {
    const rows = this.db
      .prepare("SELECT id, name, phone, address, email, created_at FROM clients ORDER BY name ASC")
      .all() as ClientRow[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      address: row.address,
      email: row.email,
      createdAt: row.created_at,
    }));
  }

  saveClient(draft: ClientDraft): Client[] {
    this.requirePermission("manage_clients");
    const now = new Date().toISOString();
    const trimmedName = draft.name.trim();
    const trimmedPhone = draft.phone.trim();
    const trimmedAddress = draft.address.trim();
    const trimmedEmail = draft.email.trim();

    if (draft.id) {
      this.requireSuperAdminAccess("Seul le super administrateur peut modifier un client.");
      this.db
        .prepare(`
          UPDATE clients
          SET name = ?, phone = ?, address = ?, email = ?
          WHERE id = ?
        `)
        .run(trimmedName, trimmedPhone, trimmedAddress, trimmedEmail, draft.id);

      this.logAction(this.getActorUserId(), "update", "clients", draft.id, `Mise a jour client ${trimmedName}`);
    } else {
      const result = this.db
        .prepare(`
          INSERT INTO clients (name, phone, address, email, created_at)
          VALUES (?, ?, ?, ?, ?)
        `)
        .run(trimmedName, trimmedPhone, trimmedAddress, trimmedEmail, now);

      this.logAction(this.getActorUserId(), "create", "clients", Number(result.lastInsertRowid), `Creation client ${trimmedName}`);
    }

    return this.listClients();
  }

  deleteClient(id: number): Client[] {
    this.requireSuperAdminAccess("Seul le super administrateur peut supprimer un client.");
    this.db.prepare("DELETE FROM clients WHERE id = ?").run(id);
    this.logAction(this.getActorUserId(), "delete", "clients", id, "Suppression client");
    return this.listClients();
  }

  listUsers(): AppUser[] {
    const rows = this.db
      .prepare(`
        SELECT id, full_name, username, email, role, active, created_at, last_login_at
        FROM users
        ORDER BY datetime(created_at) DESC
      `)
      .all() as UserRow[];

    return rows.map((row) => ({
      ...this.mapUserRow(row),
    }));
  }

  saveUser(draft: UserDraft): AppUser[] {
    this.requirePermission("manage_users");
    const now = new Date().toISOString();
    const fullName = draft.fullName.trim();
    const username = draft.username.trim().toLowerCase();
    const email = draft.email.trim().toLowerCase();
    const password = draft.password.trim();

    if (!fullName || !username || !email || !password) {
      throw new Error("Tous les champs utilisateur sont obligatoires.");
    }

    if (password.length < 6) {
      throw new Error("Le mot de passe doit contenir au moins 6 caracteres.");
    }

    const duplicate = this.db
      .prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)")
      .get(username, email) as { id: number } | undefined;

    if (duplicate) {
      throw new Error("Un utilisateur avec ce nom ou cet e-mail existe deja.");
    }

    const result = this.db
      .prepare(`
        INSERT INTO users (full_name, username, email, password_hash, auth_sync_password, role, active, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `)
      .run(fullName, username, email, this.hashPassword(password), password, draft.role, now, now);

    const userId = Number(result.lastInsertRowid);
    this.logAction(this.getActorUserId(userId), "create", "users", userId, `Creation utilisateur ${email}`);
    return this.listUsers();
  }

  authenticateUser(draft: LoginDraft): AppUser | null {
    const identifier = draft.identifier.trim().toLowerCase();
    const password = draft.password.trim();

    if (!identifier || !password) {
      return null;
    }

    const user = this.db
      .prepare(`
        SELECT id, full_name, username, email, password_hash, role, active, created_at, last_login_at
        FROM users
        WHERE LOWER(username) = LOWER(?) OR LOWER(COALESCE(email, '')) = LOWER(?)
        LIMIT 1
      `)
      .get(identifier, identifier) as UserRow | undefined;

    if (!user || !user.password_hash || !Boolean(user.active)) {
      return null;
    }

    if (!this.verifyPassword(password, user.password_hash)) {
      return null;
    }

    const now = new Date().toISOString();
    this.db.prepare("UPDATE users SET active = 1, last_login_at = ? WHERE id = ?").run(now, user.id);
    this.sessionUserId = user.id;
    this.logAction(user.id, "update", "users", user.id, "Connexion utilisateur");

    const refreshed = this.getUserRowById(user.id);
    return refreshed ? this.mapUserRow(refreshed) : null;
  }

  cacheCloudAuthenticatedUser(draft: CloudDesktopSessionDraft): AppUser {
    const now = new Date().toISOString();
    const authUserId = draft.authUserId.trim();
    const fullName = draft.fullName.trim();
    const username = draft.username.trim().toLowerCase();
    const email = draft.email.trim().toLowerCase();
    const password = draft.password.trim();

    if (!authUserId || !fullName || !username || !email || !password) {
      throw new Error("Le compte cloud ne contient pas assez d'informations pour etre memorise localement.");
    }

    const existing = this.db
      .prepare(`
        SELECT id, auth_user_id, full_name, username, email, password_hash, auth_sync_password, role, active, created_at, last_login_at
        FROM users
        WHERE auth_user_id = ?
           OR LOWER(COALESCE(email, '')) = LOWER(?)
           OR LOWER(username) = LOWER(?)
        LIMIT 1
      `)
      .get(authUserId, email, username) as UserRow | undefined;

    if (existing) {
      this.db
        .prepare(`
          UPDATE users
          SET auth_user_id = ?, full_name = ?, username = ?, email = ?, password_hash = ?, auth_sync_password = ?,
              role = ?, active = 1, last_login_at = ?
          WHERE id = ?
        `)
        .run(authUserId, fullName, username, email, this.hashPassword(password), password, draft.role, now, existing.id);
      this.sessionUserId = existing.id;
      this.logAction(existing.id, "update", "users", existing.id, `Connexion cloud synchronisee localement pour ${email}`);
      const refreshed = this.getUserRowById(existing.id);
      if (!refreshed) {
        throw new Error("Impossible de recharger l'utilisateur local apres la synchronisation cloud.");
      }
      return this.mapUserRow(refreshed);
    }

    const result = this.db
      .prepare(`
        INSERT INTO users (auth_user_id, full_name, username, email, password_hash, auth_sync_password, role, active, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `)
      .run(authUserId, fullName, username, email, this.hashPassword(password), password, draft.role, now, now);

    const userId = Number(result.lastInsertRowid);
    this.sessionUserId = userId;
    this.logAction(userId, "create", "users", userId, `Compte cloud memorise localement pour ${email}`);
    const created = this.getUserRowById(userId);
    if (!created) {
      throw new Error("Impossible de charger le compte local cree depuis Supabase.");
    }
    return this.mapUserRow(created);
  }

  linkCloudUserProfile(draft: CloudDesktopSessionDraft): AppUser[] {
    this.requirePermission("manage_users");
    const now = new Date().toISOString();
    const authUserId = draft.authUserId.trim();
    const fullName = draft.fullName.trim();
    const username = draft.username.trim().toLowerCase();
    const email = draft.email.trim().toLowerCase();
    const password = draft.password.trim();

    if (!authUserId || !fullName || !username || !email || !password) {
      throw new Error("Le profil cloud ne contient pas assez d'informations pour etre lie localement.");
    }

    const existing = this.db
      .prepare(`
        SELECT id, auth_user_id, full_name, username, email, password_hash, auth_sync_password, role, active, created_at, last_login_at
        FROM users
        WHERE auth_user_id = ?
           OR LOWER(COALESCE(email, '')) = LOWER(?)
           OR LOWER(username) = LOWER(?)
        LIMIT 1
      `)
      .get(authUserId, email, username) as UserRow | undefined;

    if (existing) {
      this.db
        .prepare(`
          UPDATE users
          SET auth_user_id = ?, full_name = ?, username = ?, email = ?, password_hash = ?, auth_sync_password = ?,
              role = ?, active = 1, last_login_at = ?
          WHERE id = ?
        `)
        .run(authUserId, fullName, username, email, this.hashPassword(password), password, draft.role, now, existing.id);
      this.logAction(this.getActorUserId(existing.id), "update", "users", existing.id, `Compte cloud lie a ${email}`);
      return this.listUsers();
    }

    const result = this.db
      .prepare(`
        INSERT INTO users (auth_user_id, full_name, username, email, password_hash, auth_sync_password, role, active, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `)
      .run(authUserId, fullName, username, email, this.hashPassword(password), password, draft.role, now, now);

    const userId = Number(result.lastInsertRowid);
    this.logAction(this.getActorUserId(userId), "create", "users", userId, `Profil cloud importe pour ${email}`);
    return this.listUsers();
  }

  getCurrentSyncCredentials(): DesktopSyncCredentials {
    const actor = this.requireAuthenticatedUser();
    const email = actor.email?.trim().toLowerCase() ?? "";
    const password = actor.auth_sync_password?.trim() ?? "";

    if (!email) {
      throw new Error("Le compte local connecte n'a pas d'email. Ajoutez un email utilisateur avant de synchroniser.");
    }

    if (!password) {
      throw new Error(
        "Le mot de passe de synchronisation cloud n'est pas disponible pour cet utilisateur. Reinitialisez son mot de passe local puis relancez la synchronisation."
      );
    }

    return {
      userId: actor.id,
      email,
      password,
      role: actor.role as UserRole,
    };
  }

  restoreUserSession(userId: number): AppUser | null {
    const user = this.getUserRowById(userId);

    if (!user || !Boolean(user.active)) {
      this.sessionUserId = null;
      return null;
    }

    this.sessionUserId = user.id;
    return this.mapUserRow(user);
  }

  logoutUser() {
    if (this.sessionUserId) {
      this.logAction(this.sessionUserId, "update", "users", this.sessionUserId, "Deconnexion utilisateur");
    }
    this.sessionUserId = null;
  }

  changeUserPassword(draft: PasswordChangeDraft): AppUser[] {
    const actor = this.requireAuthenticatedUser();
    const targetUser = this.getUserRowById(draft.userId);
    const newPassword = draft.newPassword.trim();

    if (!targetUser) {
      throw new Error("Utilisateur introuvable.");
    }

    if (newPassword.length < 6) {
      throw new Error("Le nouveau mot de passe doit contenir au moins 6 caracteres.");
    }

    const isOwnAccount = actor.id === targetUser.id;
    const isSuperAdmin = actor.role === "Super admin";

    if (!isOwnAccount && !isSuperAdmin) {
      throw new Error("Seul le super administrateur peut reinitialiser le mot de passe d'un autre utilisateur.");
    }

    if (!isSuperAdmin || isOwnAccount) {
      const currentPassword = draft.currentPassword?.trim() ?? "";
      if (!currentPassword || !targetUser.password_hash || !this.verifyPassword(currentPassword, targetUser.password_hash)) {
        throw new Error("Le mot de passe actuel est incorrect.");
      }
    }

    this.db
      .prepare("UPDATE users SET password_hash = ?, auth_sync_password = ? WHERE id = ?")
      .run(this.hashPassword(newPassword), newPassword, targetUser.id);
    this.logAction(actor.id, "update", "users", targetUser.id, `Mot de passe mis a jour pour ${targetUser.email ?? targetUser.username}`);
    return this.listUsers();
  }

  setUserActive(userId: number, active: boolean): AppUser[] {
    this.requirePermission("manage_users");
    const actor = this.requireAuthenticatedUser();
    const targetUser = this.getUserRowById(userId);

    if (!targetUser) {
      throw new Error("Utilisateur introuvable.");
    }

    if (actor.id === targetUser.id && !active) {
      throw new Error("Vous ne pouvez pas desactiver votre propre compte.");
    }

    if (!active && targetUser.role === "Super admin") {
      const superAdminCount = this.db
        .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'Super admin' AND active = 1 AND id != ?")
        .get(userId) as { count: number };

      if (superAdminCount.count === 0) {
        throw new Error("Au moins un super administrateur actif doit rester disponible.");
      }
    }

    const lastLoginAt = active ? new Date().toISOString() : targetUser.last_login_at;
    this.db.prepare("UPDATE users SET active = ?, last_login_at = ? WHERE id = ?").run(active ? 1 : 0, lastLoginAt, userId);
    this.logAction(actor.id, "update", "users", userId, active ? "Activation du compte utilisateur" : "Desactivation du compte utilisateur");
    return this.listUsers();
  }

  updateUserRole(userId: number, role: UserRole): AppUser[] {
    this.requirePermission("manage_users");
    const targetUser = this.getUserRowById(userId);

    if (!targetUser) {
      throw new Error("Utilisateur introuvable.");
    }

    if (targetUser.role === "Super admin" && role !== "Super admin") {
      const superAdminCount = this.db
        .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'Super admin' AND active = 1 AND id != ?")
        .get(userId) as { count: number };

      if (superAdminCount.count === 0) {
        throw new Error("Au moins un super administrateur actif doit rester disponible.");
      }
    }

    this.db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
    this.logAction(this.getActorUserId(userId), "update", "users", userId, `Changement de role vers ${role}`);
    return this.listUsers();
  }

  refreshUserAccess(userId: number): AppUser[] {
    this.requirePermission("manage_users");
    const now = new Date().toISOString();
    this.db.prepare("UPDATE users SET active = 1, last_login_at = ? WHERE id = ?").run(now, userId);
    this.logAction(this.getActorUserId(userId), "update", "users", userId, "Reinitialisation d'acces utilisateur");
    return this.listUsers();
  }

  deleteUser(userId: number): AppUser[] {
    this.requirePermission("manage_users");
    const actorUserId = this.getActorUserId(userId);
    const targetUser = this.getUserRowById(userId);

    if (!targetUser) {
      throw new Error("Utilisateur introuvable.");
    }

    if (actorUserId === userId) {
      throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
    }

    if (targetUser.role === "Super admin") {
      const superAdminCount = this.db
        .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'Super admin' AND active = 1 AND id != ?")
        .get(userId) as { count: number };

      if (superAdminCount.count === 0) {
        throw new Error("Au moins un super administrateur actif doit rester disponible.");
      }
    }

    this.db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    this.logAction(actorUserId, "delete", "users", userId, "Suppression utilisateur");
    return this.listUsers();
  }

  getCurrentStock(): StockRow[] {
    const rows = this.db
      .prepare(`
        SELECT product_id, product_name, quantity_in, quantity_out, current_stock, alert_threshold
        FROM current_stock_view
        ORDER BY product_name ASC
      `)
      .all() as StockCurrentRow[];

    return rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      quantityIn: row.quantity_in,
      quantityOut: row.quantity_out,
      currentStock: row.current_stock,
      alertThreshold: row.alert_threshold,
    }));
  }

  getSaleDetail(saleId: number): SaleDetail | null {
    const sale = this.db
      .prepare(`
        SELECT
          s.id,
          s.reference,
          c.name AS client_name,
          s.sold_at,
          s.total_amount,
          s.payment_method,
          (
            SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id
          ) + (
            SELECT COUNT(*) FROM sale_service_items ssi WHERE ssi.sale_id = s.id
          ) AS items_count
        FROM sales s
        LEFT JOIN clients c ON c.id = s.client_id
        WHERE s.id = ?
      `)
      .get(saleId) as SaleRow | undefined;

    if (!sale) {
      return null;
    }

    const items = this.db
      .prepare(`
        SELECT
          'product' AS line_type,
          si.product_id,
          NULL AS service_id,
          p.name AS product_name,
          p.category AS category,
          si.quantity,
          si.unit_price,
          si.line_total
        FROM sale_items si
        INNER JOIN products p ON p.id = si.product_id
        WHERE si.sale_id = ?
        UNION ALL
        SELECT
          'service' AS line_type,
          NULL AS product_id,
          ssi.service_id,
          sv.name AS product_name,
          sv.category AS category,
          ssi.quantity,
          ssi.unit_price,
          ssi.line_total
        FROM sale_service_items ssi
        INNER JOIN services sv ON sv.id = ssi.service_id
        WHERE ssi.sale_id = ?
        ORDER BY line_type ASC
      `)
      .all(saleId, saleId) as SaleItemRow[];

    const detailItems: SaleDetailItem[] = items.map((item) => ({
      lineType: item.line_type,
      productId: item.product_id ?? undefined,
      serviceId: item.service_id ?? undefined,
      productName: item.product_name,
      category: item.category ?? undefined,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
    }));

    return {
      id: sale.id,
      reference: sale.reference,
      clientName: sale.client_name ?? "Client comptoir",
      date: this.formatDate(sale.sold_at),
      amount: sale.total_amount,
      paymentMethod: sale.payment_method,
      status: "Payee",
      items: detailItems,
    };
  }

  private recordInitialStock(productId: number, quantity: number, purchasePrice: number, userId: number | null) {
    const now = new Date().toISOString();
    const cycleId = this.getCurrentInventoryCycleId();
    const result = this.db
      .prepare(`
        INSERT INTO initial_stocks (product_id, quantity, purchase_price, stock_date, cycle_id, user_id, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(productId, quantity, purchasePrice, now, cycleId, userId, "Stock initial");

    this.db
      .prepare(`
        INSERT INTO stock_movements (product_id, movement_type, quantity, source_table, source_id, movement_date, cycle_id, user_id)
        VALUES (?, 'stock_initial', ?, 'initial_stocks', ?, ?, ?, ?)
      `)
      .run(productId, quantity, Number(result.lastInsertRowid), now, cycleId, userId);
  }

  private recordReplenishment(
    productId: number,
    quantity: number,
    purchasePrice: number,
    supplier: string,
    userId: number | null
  ) {
    const now = new Date().toISOString();
    const cycleId = this.getCurrentInventoryCycleId();
    const result = this.db
      .prepare(`
        INSERT INTO replenishments (product_id, quantity, purchase_price, supplier, replenished_at, cycle_id, user_id, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(productId, quantity, purchasePrice, supplier, now, cycleId, userId, "Reapprovisionnement");

    this.db
      .prepare(`
        INSERT INTO stock_movements (product_id, movement_type, quantity, source_table, source_id, movement_date, cycle_id, user_id)
        VALUES (?, 'reapprovisionnement', ?, 'replenishments', ?, ?, ?, ?)
      `)
      .run(productId, quantity, Number(result.lastInsertRowid), now, cycleId, userId);
  }

  private getActorUserId(preferredUserId?: number): number | null {
    if (this.sessionUserId) {
      const currentSessionUser = this.getUserRowById(this.sessionUserId);

      if (currentSessionUser) {
        return currentSessionUser.id;
      }
    }

    if (preferredUserId) {
      const preferred = this.getUserRowById(preferredUserId);

      if (preferred) {
        return preferred.id;
      }
    }

    const firstUser = this.db.prepare("SELECT id FROM users ORDER BY id ASC LIMIT 1").get() as
      | { id: number }
      | undefined;

    return firstUser?.id ?? null;
  }

  private logAction(userId: number | null, action: string, targetTable: string, targetId: number, details: string) {
    const actor = userId ? this.getUserRowById(userId) : undefined;
    this.db
      .prepare(`
        INSERT INTO audit_logs (user_id, action, target_table, target_id, details, actor_name, actor_username, source_device, source_platform, created_at, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        userId,
        action,
        targetTable,
        targetId,
        details,
        actor?.full_name ?? null,
        actor?.username ?? null,
        this.getSourceDeviceLabel(),
        "desktop",
        new Date().toISOString(),
        null
      );
  }

  private formatAuditActorLabel(row: AuditLogRow) {
    const actorName = row.user_name ?? row.actor_name ?? "Utilisateur non precise";
    const actorUsername = row.actor_username ? ` [${row.actor_username}]` : "";
    const sourcePlatform = row.source_platform ? ` - ${row.source_platform}` : "";
    const sourceDevice = row.source_device ? ` - ${row.source_device}` : "";
    return `${actorName}${actorUsername}${sourcePlatform}${sourceDevice}`;
  }

  private getSourceDeviceLabel() {
    const rawName = process.env.COMPUTERNAME || os.hostname() || "Poste local";
    return rawName.trim() || "Poste local";
  }

  private mapUserRow(row: UserRow): AppUser {
    return {
      id: row.id,
      fullName: row.full_name,
      username: row.username,
      email: row.email ?? `${row.username}@lacouronne`,
      role: row.role as UserRole,
      active: Boolean(row.active),
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at ?? row.created_at,
    };
  }

  private getUserRowById(userId: number) {
    return this.db
      .prepare(`
        SELECT id, auth_user_id, full_name, username, email, password_hash, auth_sync_password, role, active, created_at, last_login_at
        FROM users
        WHERE id = ?
      `)
      .get(userId) as UserRow | undefined;
  }

  private requirePermission(permission: Permission) {
    const actor = this.requireAuthenticatedUser();

    if (actor.role === "Super admin") {
      return;
    }

    if (permission === "manage_users") {
      throw new Error("Seul le super administrateur peut gerer les utilisateurs.");
    }

    if (actor.role === "Administrateur") {
      return;
    }

    if (actor.role === "Employe" && (permission === "manage_clients" || permission === "manage_sales")) {
      return;
    }

    throw new Error("Votre profil ne permet pas cette action.");
  }

  private requireAuthenticatedUser() {
    const actor = this.sessionUserId ? this.getUserRowById(this.sessionUserId) : undefined;

    if (!actor) {
      throw new Error("Veuillez vous connecter pour effectuer cette action.");
    }

    return actor;
  }

  private hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string) {
    const [salt, expectedHash] = storedHash.split(":");

    if (!salt || !expectedHash) {
      return false;
    }

    const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
  }

  private generateCode(name: string) {
    const prefix = name
      .trim()
      .slice(0, 3)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "X")
      .padEnd(3, "X");

    return `PAP-${prefix}-${Date.now().toString().slice(-4)}`;
  }

  private generateSaleReference() {
    const sequence = this.getCurrentInvoiceSequence();
    const reference = this.buildInvoiceReference(sequence.current_year, sequence.series_index, sequence.next_number);

    this.db
      .prepare(`
        UPDATE invoice_sequence_settings
        SET next_number = ?, updated_at = ?
        WHERE id = 1
      `)
      .run(sequence.next_number + 1, new Date().toISOString());

    return reference;
  }

  private getCurrentInvoiceSequence() {
    this.ensureInvoiceSequenceSettings();
    const sequence = this.db
      .prepare("SELECT current_year, series_index, next_number FROM invoice_sequence_settings WHERE id = 1")
      .get() as InvoiceSequenceRow | undefined;

    if (!sequence) {
      throw new Error("La configuration de numerotation des factures est introuvable.");
    }

    return sequence;
  }

  private buildInvoiceReference(year: number, seriesIndex: number, nextNumber: number) {
    const seriesCode = `S${this.getInvoiceSeriesLabel(seriesIndex)}${String(year).slice(-2)}`;
    return `Fact-${seriesCode}-${String(nextNumber).padStart(4, "0")}`;
  }

  private getCurrentInventoryCycleId() {
    this.ensureInventoryCycleSeed();
    const cycle = this.db
      .prepare("SELECT id FROM inventory_cycles ORDER BY id DESC LIMIT 1")
      .get() as { id: number } | undefined;

    if (!cycle) {
      throw new Error("Le cycle d'inventaire courant est introuvable.");
    }

    return cycle.id;
  }

  private getInvoiceSeriesLabel(seriesIndex: number) {
    let index = seriesIndex;
    let label = "";

    do {
      label = String.fromCharCode(65 + (index % 26)) + label;
      index = Math.floor(index / 26) - 1;
    } while (index >= 0);

    return label;
  }

  private mergeSaleItems(items: SaleItemDraft[]) {
    const grouped = new Map<number, number>();

    items.forEach((item) => {
      grouped.set(item.productId, (grouped.get(item.productId) ?? 0) + item.quantity);
    });

    return Array.from(grouped.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
  }

  private mergeSaleServiceItems(items: SaleServiceItemDraft[]) {
    const grouped = new Map<number, number>();

    items.forEach((item) => {
      grouped.set(item.serviceId, (grouped.get(item.serviceId) ?? 0) + item.quantity);
    });

    return Array.from(grouped.entries()).map(([serviceId, quantity]) => ({
      serviceId,
      quantity,
    }));
  }

  private formatDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR");
  }

  private formatDateTime(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  }

  private formatActionLabel(action: string) {
    switch (action) {
      case "create":
        return "Creation";
      case "update":
        return "Mise a jour";
      case "delete":
        return "Suppression";
      default:
        return action;
    }
  }

  private formatTargetLabel(targetTable: string, targetId: number | null) {
    const labelMap: Record<string, string> = {
      products: "Produit",
      clients: "Client",
      users: "Utilisateur",
      sales: "Vente",
      expenses: "Depense",
      initial_stocks: "Stock initial",
      replenishments: "Reapprovisionnement",
    };

    const label = labelMap[targetTable] ?? targetTable;
    return targetId ? `${label} #${targetId}` : label;
  }
}
