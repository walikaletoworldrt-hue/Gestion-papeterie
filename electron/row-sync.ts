import type Database from "better-sqlite3";
import {
  ROW_SYNC_SCHEMA,
  ROW_SYNC_TABLE_NAMES,
  getRowSyncSchema,
  type RowSyncApplyResult,
  type RowSyncLocalChanges,
  type RowSyncPulledChanges,
  type RowSyncPushedRow,
  type RowSyncRow,
  type RowSyncTableSchema,
} from "../src/lib/row-sync-schema";

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
export const ROW_SYNC_TABLES = ROW_SYNC_TABLE_NAMES;



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
// A login only touches last_login_at / the encrypted sync password: not a change worth sending.
const USER_SYNCED_CHANGE_SQL = ["auth_user_id", "full_name", "username", "email", "password_hash", "role", "active"]
  .map((column) => `NEW.${column} IS NOT OLD.${column}`)
  .join(" OR ");

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

  const stateColumns = new Set(
    (db.prepare("PRAGMA table_info(row_sync_state)").all() as Array<{ name: string }>).map((column) => column.name)
  );
  if (!stateColumns.has("device_id")) db.exec("ALTER TABLE row_sync_state ADD COLUMN device_id TEXT");

  db.prepare(`INSERT OR IGNORE INTO row_sync_state (id, applying_remote, updated_at) VALUES (1, 0, ${NOW_SQL})`).run();
  // A crash while applying remote changes must not leave tracking disabled.
  db.prepare("UPDATE row_sync_state SET applying_remote = 0 WHERE id = 1").run();
  // Random id of this installation: lets the cloud check that a device code (P1...) belongs to one PC only.
  db.prepare(`UPDATE row_sync_state SET device_id = ${UUID_SQL} WHERE id = 1 AND device_id IS NULL`).run();

  const install = db.transaction(() => {
    ROW_SYNC_TABLES.forEach((table) => installTable(db, table));
  });
  install();
}

function installTable(db: Database.Database, table: string) {
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
    WHEN ${TRACKING_ENABLED_SQL}${table === "users" ? ` AND (${USER_SYNCED_CHANGE_SQL})` : ""}
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

// ---------------------------------------------------------------------------
// Exchange with the sync engine
// ---------------------------------------------------------------------------

type LocalRow = Record<string, unknown> & { id: number; uid: string | null; modified_at: string | null; dirty: number };

export type RowSyncDeviceState = {
  deviceCode: string | null;
  deviceId: string;
  cursor: number;
};

export function getRowSyncDeviceState(db: Database.Database): RowSyncDeviceState {
  const row = db.prepare("SELECT device_code, device_id, last_pulled_version FROM row_sync_state WHERE id = 1").get() as {
    device_code: string | null;
    device_id: string;
    last_pulled_version: number;
  };
  return { deviceCode: row.device_code, deviceId: row.device_id, cursor: Number(row.last_pulled_version ?? 0) };
}

/** Parent key exchanged with the cloud: username for users, uid otherwise. */
function createRefResolver(db: Database.Database) {
  const toKey = new Map<string, Map<number, string | null>>();
  const toLocalId = new Map<string, Map<string, number>>();

  const normalize = (table: string, ref: string) => (table === "users" ? ref.toLowerCase() : ref);

  const loadTable = (table: string) => {
    if (toKey.has(table)) return;
    const keyColumn = table === "users" ? "username" : "uid";
    const rows = db.prepare(`SELECT id, ${keyColumn} AS ref FROM ${table}`).all() as Array<{ id: number; ref: string | null }>;
    toKey.set(table, new Map(rows.map((row) => [row.id, row.ref])));
    toLocalId.set(table, new Map(rows.filter((row) => row.ref).map((row) => [normalize(table, String(row.ref)), row.id])));
  };

  return {
    localIdToRef(table: string, id: unknown): string | null {
      if (id === null || id === undefined || !getRowSyncSchema(table)) return null;
      loadTable(table);
      return toKey.get(table)?.get(Number(id)) ?? null;
    },
    refToLocalId(table: string, ref: unknown): number | null {
      if (ref === null || ref === undefined || ref === "" || !getRowSyncSchema(table)) return null;
      loadTable(table);
      return toLocalId.get(table)?.get(normalize(table, String(ref))) ?? null;
    },
    remember(table: string, id: number, ref: string | null) {
      loadTable(table);
      toKey.get(table)?.set(id, ref);
      if (ref) toLocalId.get(table)?.set(normalize(table, ref), id);
    },
  };
}

function toExchangeRow(schema: RowSyncTableSchema, row: LocalRow, refs: ReturnType<typeof createRefResolver>): RowSyncRow {
  const out: RowSyncRow = { uid: String(row.uid), modified_at: String(row.modified_at) };
  schema.columns.forEach((column) => {
    out[column] = row[column] ?? null;
  });
  Object.entries(schema.references).forEach(([column, parent]) => {
    out[column] = refs.localIdToRef(parent, row[column]);
  });
  Object.entries(schema.polymorphic ?? {}).forEach(([column, tableColumn]) => {
    out[column] = refs.localIdToRef(String(row[tableColumn] ?? ""), row[column]);
  });
  return out;
}

/** Rows created/changed/deleted on this PC and not yet sent. Users are only sent by a Super admin. */
export function collectLocalChanges(
  db: Database.Database,
  options: { includeUsers: boolean; deviceLabel: string }
): RowSyncLocalChanges {
  const refs = createRefResolver(db);
  const state = getRowSyncDeviceState(db);
  const rows: Record<string, RowSyncRow[]> = {};

  ROW_SYNC_SCHEMA.forEach((schema) => {
    if (schema.table === "users" && !options.includeUsers) return;
    const dirtyRows = db.prepare(`SELECT * FROM ${schema.table} WHERE dirty = 1 ORDER BY id ASC`).all() as LocalRow[];
    if (dirtyRows.length > 0) {
      rows[schema.table] = dirtyRows.map((row) => toExchangeRow(schema, row, refs));
    }
  });

  const tombstones = db
    .prepare("SELECT id, table_name, uid, deleted_at FROM row_sync_tombstones WHERE pushed = 0 AND table_name <> 'users' ORDER BY id ASC")
    .all() as RowSyncLocalChanges["tombstones"];

  return { deviceCode: state.deviceCode, deviceId: state.deviceId, deviceLabel: options.deviceLabel, rows, tombstones };
}

/** Changes waiting to be sent, per table. History entries are sent too but not counted. */
export function countLocalChanges(db: Database.Database, options: { includeUsers: boolean }) {
  const buckets: Array<{ key: string; label: string; count: number }> = [];

  ROW_SYNC_SCHEMA.forEach((schema) => {
    if (schema.table === "audit_logs" || (schema.table === "users" && !options.includeUsers)) return;
    const { count } = db.prepare(`SELECT COUNT(*) AS count FROM ${schema.table} WHERE dirty = 1`).get() as { count: number };
    if (count > 0) buckets.push({ key: schema.table, label: schema.table, count });
  });

  const deletions = db
    .prepare("SELECT table_name, COUNT(*) AS count FROM row_sync_tombstones WHERE pushed = 0 AND table_name <> 'users' GROUP BY table_name")
    .all() as Array<{ table_name: string; count: number }>;
  deletions.forEach((row) => {
    const existing = buckets.find((bucket) => bucket.key === row.table_name);
    if (existing) existing.count += row.count;
    else buckets.push({ key: row.table_name, label: row.table_name, count: row.count });
  });

  return buckets;
}

/** After a successful push: rows unchanged since they were collected become clean. */
export function markChangesPushed(db: Database.Database, pushed: Record<string, RowSyncPushedRow[]>, tombstoneIds: number[]) {
  withRemoteChangesApplied(db, () => {
    db.transaction(() => {
      Object.entries(pushed).forEach(([table, rows]) => {
        if (!getRowSyncSchema(table)) return;
        const update = db.prepare(
          `UPDATE ${table} SET dirty = 0, remote_version = COALESCE(?, remote_version) WHERE uid = ? AND modified_at = ?`
        );
        rows.forEach((row) => update.run(row.sync_version ?? null, row.uid, row.modified_at));
      });
      const markTombstone = db.prepare("UPDATE row_sync_tombstones SET pushed = 1 WHERE id = ?");
      tombstoneIds.forEach((id) => markTombstone.run(id));
    })();
  });
}

const TIMESTAMP_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}(:?\d{2})?|Z)$/;

/** Cloud values -> values SQLite stores like the rest of the app (ISO dates in UTC, 1/0 booleans). */
function toLocalValue(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && TIMESTAMP_WITH_OFFSET.test(value)) {
    const time = Date.parse(value.replace(" ", "T"));
    return Number.isNaN(time) ? value : new Date(time).toISOString();
  }
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function toTime(value: unknown) {
  const time = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Applies rows and deletions received from the cloud.
 * Rule: the most recent change wins. A local change not sent yet and more recent than the cloud one is kept
 * (it is sent next), otherwise the cloud version replaces the local one.
 */
export function applyRemoteChanges(
  db: Database.Database,
  changes: RowSyncPulledChanges,
  options: { deviceCode: string | null }
): RowSyncApplyResult {
  const result: RowSyncApplyResult = { applied: 0, keptLocal: 0, merged: 0, skipped: 0, deleted: 0 };
  const refs = createRefResolver(db);
  const offset = changes.clockOffsetMs;
  const now = new Date().toISOString();

  const notNullColumns = new Map<string, Set<string>>();
  const getNotNull = (table: string) => {
    if (!notNullColumns.has(table)) {
      const info = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string; notnull: number }>;
      notNullColumns.set(table, new Set(info.filter((column) => column.notnull).map((column) => column.name)));
    }
    return notNullColumns.get(table) as Set<string>;
  };

  const localWins = (local: LocalRow, remoteModifiedAt: unknown) =>
    local.dirty === 1 && toTime(local.modified_at) + offset > toTime(remoteModifiedAt);

  withRemoteChangesApplied(db, () => {
    db.transaction(() => {
      ROW_SYNC_SCHEMA.forEach((schema) => {
        (changes.rows[schema.table] ?? []).forEach((remote) => {
          const values: Record<string, unknown> = {};
          schema.columns.forEach((column) => {
            values[column] = toLocalValue(remote[column]);
          });

          let missingRequiredParent = false;
          Object.entries(schema.references).forEach(([column, parent]) => {
            const localId = refs.refToLocalId(parent, remote[column]);
            if (localId === null && getNotNull(schema.table).has(column)) missingRequiredParent = true;
            values[column] = localId;
          });
          Object.entries(schema.polymorphic ?? {}).forEach(([column, tableColumn]) => {
            values[column] = refs.refToLocalId(String(remote[tableColumn] ?? ""), remote[column]);
          });
          if (missingRequiredParent) {
            result.skipped += 1;
            return;
          }

          // Users: never erase a known password hash with an empty one.
          if (schema.table === "users" && !values.password_hash) delete values.password_hash;

          let local = findLocalRow(db, schema, remote);
          if (local && local.uid !== remote.uid && schema.table !== "users") {
            // Same record created separately on two devices: keep one, with the cloud uid.
            db.prepare(`UPDATE ${schema.table} SET uid = ? WHERE id = ?`).run(remote.uid, local.id);
            refs.remember(schema.table, local.id, remote.uid);
            local = { ...local, uid: remote.uid };
            result.merged += 1;
          }

          if (local && localWins(local, remote.modified_at)) {
            result.keptLocal += 1;
            return;
          }

          if (schema.renameOnConflict) {
            freeUniqueValue(db, schema.table, schema.renameOnConflict, values[schema.renameOnConflict], local?.id ?? null, options.deviceCode, now);
          }

          const syncColumns: Record<string, unknown> = {
            ...values,
            modified_at: toLocalValue(remote.modified_at),
            dirty: 0,
            remote_version: remote.sync_version ?? null,
          };
          if (schema.table !== "users" || !local) syncColumns.uid = local?.uid ?? remote.uid;

          if (local) {
            const names = Object.keys(syncColumns);
            db.prepare(`UPDATE ${schema.table} SET ${names.map((name) => `${name} = @${name}`).join(", ")} WHERE id = @__id`).run({
              ...syncColumns,
              __id: local.id,
            });
          } else {
            const names = Object.keys(syncColumns);
            const inserted = db
              .prepare(`INSERT INTO ${schema.table} (${names.join(", ")}) VALUES (${names.map((name) => `@${name}`).join(", ")})`)
              .run(syncColumns);
            const ref = schema.table === "users" ? String(values.username ?? "") : remote.uid;
            refs.remember(schema.table, Number(inserted.lastInsertRowid), ref);
          }
          result.applied += 1;
        });
      });

      // Deletions: children first.
      [...ROW_SYNC_SCHEMA].reverse().forEach((schema) => {
        if (schema.table === "users") return;
        changes.tombstones
          .filter((tombstone) => tombstone.table_name === schema.table)
          .forEach((tombstone) => {
            const local = db.prepare(`SELECT id, uid, modified_at, dirty FROM ${schema.table} WHERE uid = ?`).get(tombstone.uid) as
              | LocalRow
              | undefined;
            if (!local) return;
            if (localWins(local, tombstone.deleted_at)) {
              result.keptLocal += 1;
              return;
            }
            db.prepare(`DELETE FROM ${schema.table} WHERE id = ?`).run(local.id);
            result.deleted += 1;
          });
      });

      db.prepare("UPDATE row_sync_state SET last_pulled_version = MAX(last_pulled_version, ?), updated_at = ? WHERE id = 1").run(
        changes.nextCursor,
        now
      );
    })();
  });

  return result;
}

function findLocalRow(db: Database.Database, schema: RowSyncTableSchema, remote: RowSyncRow): LocalRow | undefined {
  if (schema.table === "users") {
    return db.prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)").get(String(remote.username ?? "")) as LocalRow | undefined;
  }

  const byUid = db.prepare(`SELECT * FROM ${schema.table} WHERE uid = ?`).get(remote.uid) as LocalRow | undefined;
  if (byUid) return byUid;

  for (const key of schema.naturalKeys ?? []) {
    const value = remote[key];
    if (value === null || value === undefined || value === "") continue;
    const match = db.prepare(`SELECT * FROM ${schema.table} WHERE ${key} = ?`).get(toLocalValue(value)) as LocalRow | undefined;
    if (match) return match;
  }

  return undefined;
}

/** Two different records with the same unique value (e.g. product code): the local one gets a new value. */
function freeUniqueValue(
  db: Database.Database,
  table: string,
  column: string,
  value: unknown,
  keepId: number | null,
  deviceCode: string | null,
  now: string
) {
  if (value === null || value === undefined) return;
  const holder = db.prepare(`SELECT id FROM ${table} WHERE ${column} = ? AND id IS NOT ?`).get(value, keepId) as
    | { id: number }
    | undefined;
  if (!holder) return;

  const base = `${String(value)}-${deviceCode ?? "L"}`;
  let candidate = base;
  for (let index = 2; db.prepare(`SELECT 1 FROM ${table} WHERE ${column} = ?`).get(candidate); index += 1) {
    candidate = `${base}${index}`;
  }
  // This rename is a local change: it has to be sent to the cloud.
  db.prepare(`UPDATE ${table} SET ${column} = ?, dirty = 1, modified_at = ? WHERE id = ?`).run(candidate, now, holder.id);
}
