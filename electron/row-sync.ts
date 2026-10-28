import type Database from "better-sqlite3";

/**
 * Row-level sync foundations for the local SQLite database.
 *
 * Every synced row gets:
 *  - uid          : global identifier shared by all devices and Supabase (local integer ids stay local)
 *  - modified_at  : time of the last local change (used for "last change wins")
 *  - dirty        : 1 when the row still has to be sent to the cloud
 *  - remote_version : last cloud sync_version applied to this row
 *
 * SQLite triggers keep these columns up to date, so the existing write code does not change.
 * Deleting a row records a tombstone so the deletion can be sent to the other devices.
 * While remote changes are applied (applying_remote = 1), the triggers do not track anything.
 */
export const ROW_SYNC_TABLES = [
  "users",
  "clients",
  "expenses",
  "products",
  "services",
  "cybercafe_tariffs",
  "cybercafe_sales",
  "mikhmon_sales",
  "inventory_cycles",
  "initial_stocks",
  "replenishments",
  "sales",
  "sale_items",
  "sale_service_items",
  "stock_movements",
  "audit_logs",
] as const;

export type RowSyncTable = (typeof ROW_SYNC_TABLES)[number];

const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
// Random UUID (version 4 layout), accepted by the Postgres uuid type.
const UUID_SQL = `(
  lower(hex(randomblob(4))) || '-' ||
  lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
  lower(hex(randomblob(6)))
)`;
const TRACKING_ENABLED_SQL = "(SELECT applying_remote FROM row_sync_state WHERE id = 1) = 0";

export function installRowSyncSupport(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS row_sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      applying_remote INTEGER NOT NULL DEFAULT 0,
      device_code TEXT,
      last_pulled_version INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS row_sync_tombstones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      uid TEXT NOT NULL,
      deleted_at TEXT NOT NULL,
      pushed INTEGER NOT NULL DEFAULT 0,
      UNIQUE (table_name, uid)
    );
  `);

  db.prepare(`INSERT OR IGNORE INTO row_sync_state (id, applying_remote, updated_at) VALUES (1, 0, ${NOW_SQL})`).run();
  // A crash while applying remote changes must not leave tracking disabled.
  db.prepare("UPDATE row_sync_state SET applying_remote = 0 WHERE id = 1").run();

  const install = db.transaction(() => {
    ROW_SYNC_TABLES.forEach((table) => installTable(db, table));
  });
  install();
}

function installTable(db: Database.Database, table: RowSyncTable) {
  const columns = new Set(
    (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((column) => column.name)
  );

  if (!columns.has("uid")) db.exec(`ALTER TABLE ${table} ADD COLUMN uid TEXT`);
  if (!columns.has("modified_at")) db.exec(`ALTER TABLE ${table} ADD COLUMN modified_at TEXT`);
  if (!columns.has("dirty")) db.exec(`ALTER TABLE ${table} ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1`);
  if (!columns.has("remote_version")) db.exec(`ALTER TABLE ${table} ADD COLUMN remote_version INTEGER`);

  db.exec(`
    UPDATE ${table} SET uid = ${UUID_SQL} WHERE uid IS NULL;
    UPDATE ${table} SET modified_at = ${NOW_SQL} WHERE modified_at IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_uid ON ${table}(uid);
    CREATE INDEX IF NOT EXISTS idx_${table}_dirty ON ${table}(dirty) WHERE dirty = 1;

    DROP TRIGGER IF EXISTS row_sync_${table}_insert;
    CREATE TRIGGER row_sync_${table}_insert
    AFTER INSERT ON ${table}
    WHEN NEW.uid IS NULL OR NEW.modified_at IS NULL
    BEGIN
      UPDATE ${table}
      SET uid = COALESCE(uid, ${UUID_SQL}),
          modified_at = COALESCE(modified_at, ${NOW_SQL})
      WHERE rowid = NEW.rowid;
    END;

    DROP TRIGGER IF EXISTS row_sync_${table}_update;
    CREATE TRIGGER row_sync_${table}_update
    AFTER UPDATE ON ${table}
    WHEN ${TRACKING_ENABLED_SQL}
    BEGIN
      UPDATE ${table} SET dirty = 1, modified_at = ${NOW_SQL} WHERE rowid = NEW.rowid;
    END;

    DROP TRIGGER IF EXISTS row_sync_${table}_delete;
    CREATE TRIGGER row_sync_${table}_delete
    AFTER DELETE ON ${table}
    WHEN ${TRACKING_ENABLED_SQL} AND OLD.uid IS NOT NULL
    BEGIN
      INSERT INTO row_sync_tombstones (table_name, uid, deleted_at, pushed)
      VALUES ('${table}', OLD.uid, ${NOW_SQL}, 0)
      ON CONFLICT (table_name, uid) DO UPDATE SET deleted_at = excluded.deleted_at, pushed = 0;
    END;
  `);
}

/** Runs `work` with change tracking disabled (used when applying data received from the cloud). */
export function withRemoteChangesApplied<T>(db: Database.Database, work: () => T): T {
  const setApplying = db.prepare("UPDATE row_sync_state SET applying_remote = ? WHERE id = 1");
  setApplying.run(1);
  try {
    return work();
  } finally {
    setApplying.run(0);
  }
}
