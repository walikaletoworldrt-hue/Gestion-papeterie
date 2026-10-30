/**
 * Description of the synced tables, shared by the desktop (electron) and the sync engine (renderer).
 *
 * - columns: business columns copied as-is between SQLite and Supabase
 * - references: foreign keys, sent between devices as the parent's uid (local and cloud ids differ)
 * - polymorphic: id columns whose parent table is named in another column (stock_movements.source_id)
 * - naturalKeys: columns that identify the same record created separately on two devices
 *   (two PCs both create the product "Cahier 48 pages" -> one product)
 *
 * Tables are listed parents first: rows are sent and applied in this order.
 * Users are identified by username instead of uid, because their cloud row is tied to the login account.
 */
export type RowSyncTableSchema = {
  table: string;
  columns: string[];
  references: Record<string, string>;
  polymorphic?: Record<string, string>;
  naturalKeys?: string[];
  /** Unique column that may collide for two different records: the local record gets a new value. */
  renameOnConflict?: string;
  /** Stored as 1/0 in SQLite, true/false in Postgres. */
  booleans?: string[];
};

export const ROW_SYNC_SCHEMA: RowSyncTableSchema[] = [
  {
    table: "users",
    columns: ["auth_user_id", "full_name", "username", "email", "password_hash", "role", "active", "created_at", "last_login_at"],
    references: {},
    naturalKeys: ["username"],
    booleans: ["active"],
  },
  // Every PC starts with its own "Cycle 1": same label = same cycle.
  { table: "inventory_cycles", columns: ["label", "started_at"], references: { user_id: "users" }, naturalKeys: ["label"] },
  { table: "clients", columns: ["name", "phone", "address", "email", "created_at"], references: {} },
  {
    table: "products",
    columns: ["code", "name", "category", "purchase_price", "selling_price", "unit", "alert_threshold", "supplier", "created_at", "updated_at"],
    references: {},
    naturalKeys: ["name"],
    renameOnConflict: "code",
  },
  {
    table: "services",
    columns: ["name", "category", "unit_price", "description", "active", "created_at", "updated_at"],
    references: {},
    naturalKeys: ["name"],
    booleans: ["active"],
  },
  {
    table: "cybercafe_tariffs",
    columns: ["name", "unit_price", "active", "created_at", "updated_at"],
    references: {},
    naturalKeys: ["name"],
    booleans: ["active"],
  },
  {
    table: "expenses",
    columns: ["detail", "nature", "amount", "expense_date", "approved_by", "purpose"],
    references: { user_id: "users" },
  },
  {
    table: "initial_stocks",
    columns: ["quantity", "purchase_price", "stock_date", "note"],
    references: { product_id: "products", cycle_id: "inventory_cycles", user_id: "users" },
  },
  {
    table: "replenishments",
    columns: ["quantity", "purchase_price", "supplier", "lot_number", "transport_total", "replenished_at", "note"],
    references: { product_id: "products", cycle_id: "inventory_cycles", user_id: "users" },
  },
  {
    table: "sales",
    columns: ["reference", "sold_at", "total_amount", "payment_method"],
    references: { client_id: "clients", cycle_id: "inventory_cycles", user_id: "users" },
    naturalKeys: ["reference"],
  },
  {
    table: "sale_items",
    columns: ["quantity", "unit_price", "line_total"],
    references: { sale_id: "sales", product_id: "products" },
  },
  {
    table: "sale_service_items",
    columns: ["quantity", "unit_price", "line_total"],
    references: { sale_id: "sales", service_id: "services" },
  },
  {
    table: "cybercafe_sales",
    columns: ["quantity", "unit_price", "total_amount", "sold_at", "payment_method", "note"],
    references: { tariff_id: "cybercafe_tariffs", user_id: "users" },
  },
  {
    table: "mikhmon_sales",
    columns: ["sold_at", "username", "profile", "comment", "amount", "source_key", "source_file", "imported_at"],
    references: { user_id: "users" },
    naturalKeys: ["source_key"],
  },
  {
    table: "stock_movements",
    columns: ["movement_type", "quantity", "source_table", "movement_date"],
    references: { product_id: "products", cycle_id: "inventory_cycles", user_id: "users" },
    polymorphic: { source_id: "source_table" },
  },
  {
    table: "audit_logs",
    columns: ["action", "target_table", "details", "actor_name", "actor_username", "source_device", "source_platform", "created_at"],
    references: { user_id: "users" },
    polymorphic: { target_id: "target_table" },
  },
];

export const ROW_SYNC_TABLE_NAMES = ROW_SYNC_SCHEMA.map((schema) => schema.table);

export function getRowSyncSchema(table: string) {
  return ROW_SYNC_SCHEMA.find((schema) => schema.table === table);
}

/** Reference to a parent record: uid for most tables, username for users. */
export type RowSyncRef = string | null;

/** A row as exchanged between devices: business columns + uid + modification time + references as RowSyncRef. */
export type RowSyncRow = {
  uid: string;
  modified_at: string;
  sync_version?: number;
  [column: string]: unknown;
};

export type RowSyncTombstone = {
  id?: number;
  table_name: string;
  uid: string;
  deleted_at: string;
  sync_version?: number;
  /** Users only: username of the deleted user (uids of users can differ between a PC and the cloud). */
  ref?: string | null;
};

export type RowSyncLocalChanges = {
  deviceCode: string | null;
  deviceId: string;
  deviceLabel: string;
  rows: Record<string, RowSyncRow[]>;
  tombstones: RowSyncTombstone[];
};

export type RowSyncPulledChanges = {
  rows: Record<string, RowSyncRow[]>;
  tombstones: RowSyncTombstone[];
  /** Server time minus local time, in ms: compares local modification times with cloud ones. */
  clockOffsetMs: number;
  nextCursor: number;
  /** Every username in the cloud: users synced before and missing here were deleted in the cloud. */
  cloudUsernames?: string[];
};

export type RowSyncApplyResult = {
  applied: number;
  keptLocal: number;
  merged: number;
  skipped: number;
  deleted: number;
};

export type RowSyncPushedRow = { uid: string; modified_at: string; sync_version: number | null };
