import type { SupabaseClient } from "@supabase/supabase-js";
import type { DesktopApi } from "../types";
import {
  ROW_SYNC_SCHEMA,
  getRowSyncSchema,
  type RowSyncApplyResult,
  type RowSyncPulledChanges,
  type RowSyncPushedRow,
  type RowSyncRow,
  type RowSyncTombstone,
} from "./row-sync-schema";

/**
 * Row-level sync between this PC and Supabase.
 *
 * 1. Pull: fetch only what changed in the cloud since the last sync (sync_version > cursor), apply it locally.
 * 2. Push: send only the rows created/changed/deleted on this PC, upserted by uid.
 * Nothing is ever replaced wholesale, so several PCs and the web can work at the same time.
 * When the same row was changed in two places, the most recent change wins (checked locally and by the server).
 */

const PAGE_SIZE = 1000;
const FILTER_BATCH = 150;
const UPSERT_BATCH = 200;
// Rows written in the last minute are fetched again next time, in case a slower write was still in progress.
const CURSOR_SAFETY_MS = 60_000;

export type RowSyncReport = {
  pulled: RowSyncApplyResult;
  pushed: number;
  deletionsSent: number;
  failures: string[];
};

type CloudRow = Record<string, unknown> & { id: number; uid: string; sync_version: number; server_updated_at: string };

type EngineOptions = {
  /** Sends changed users (Super admin only); they need the login-account flow, not a plain upsert. */
  pushUsers?: (usernames: string[]) => Promise<void>;
  pullOnly?: boolean;
};

export async function runRowSync(client: SupabaseClient, api: DesktopApi, options: EngineOptions = {}): Promise<RowSyncReport> {
  const state = await api.rowSyncGetState();
  if (!state.deviceCode && !options.pullOnly) {
    throw new Error("Ce poste n'a pas de code (P1, P2...). Le super administrateur doit le definir dans Stock initial avant de synchroniser.");
  }

  const clock = await measureClock(client);

  if (state.deviceCode) {
    const claim = await client.rpc("row_sync_claim_device", {
      p_code: state.deviceCode,
      p_device_id: state.deviceId,
      p_device_label: state.deviceLabel,
    });
    if (claim.error) {
      throw new Error(claim.error.message);
    }
  }

  const pulled = await pullChanges(client, state.cursor, clock);
  const pulledResult = await api.rowSyncApply(pulled);

  const report: RowSyncReport = { pulled: pulledResult, pushed: 0, deletionsSent: 0, failures: [] };
  if (!options.pullOnly && state.deviceCode) {
    await pushChanges(client, api, state.deviceCode, clock.offsetMs, report, options);
  }

  await api.rowSyncFinish(new Date().toISOString());
  return report;
}

async function measureClock(client: SupabaseClient) {
  const before = Date.now();
  const result = await client.rpc("row_sync_server_time");
  const after = Date.now();
  if (result.error) {
    throw new Error(
      `La synchronisation ligne par ligne n'est pas installee sur Supabase. Executez database/supabase-row-sync-migration.sql. (${result.error.message})`
    );
  }
  const serverMs = Date.parse(String(result.data));
  const localMidpoint = before + (after - before) / 2;
  return { offsetMs: serverMs - localMidpoint, serverNowMs: serverMs };
}

// ---------------------------------------------------------------------------
// Pull
// ---------------------------------------------------------------------------

async function pullChanges(
  client: SupabaseClient,
  cursor: number,
  clock: { offsetMs: number; serverNowMs: number }
): Promise<RowSyncPulledChanges> {
  const rowsByTable: Record<string, CloudRow[]> = {};
  const versions: Array<{ version: number; at: string }> = [];

  for (const schema of ROW_SYNC_SCHEMA) {
    const columns = new Set([
      "id",
      "uid",
      "modified_at",
      "sync_version",
      "server_updated_at",
      ...schema.columns,
      ...Object.keys(schema.references),
      ...Object.keys(schema.polymorphic ?? {}),
    ]);
    const rows = await fetchSince<CloudRow>(client, schema.table, [...columns].join(", "), cursor);
    rowsByTable[schema.table] = rows;
    rows.forEach((row) => versions.push({ version: Number(row.sync_version), at: row.server_updated_at }));
  }

  const tombstones = await fetchSince<RowSyncTombstone & { sync_version: number }>(
    client,
    "sync_tombstones",
    "table_name, uid, deleted_at, sync_version",
    cursor
  );
  tombstones.forEach((row) => versions.push({ version: Number(row.sync_version), at: row.deleted_at }));

  const refs = await createCloudRefResolver(client);
  const rows: Record<string, RowSyncRow[]> = {};
  for (const schema of ROW_SYNC_SCHEMA) {
    const cloudRows = rowsByTable[schema.table];
    if (cloudRows.length === 0) continue;

    // Remember uids already in hand, then fetch the missing parents.
    for (const [column, parent] of Object.entries(schema.references)) {
      await refs.preloadIds(parent, cloudRows.map((row) => row[column]));
    }
    for (const [column, tableColumn] of Object.entries(schema.polymorphic ?? {})) {
      for (const table of new Set(cloudRows.map((row) => String(row[tableColumn] ?? "")))) {
        await refs.preloadIds(table, cloudRows.filter((row) => row[tableColumn] === table).map((row) => row[column]));
      }
    }

    rows[schema.table] = cloudRows.map((cloudRow) => {
      const out: RowSyncRow = {
        uid: cloudRow.uid,
        modified_at: String(cloudRow.modified_at),
        sync_version: Number(cloudRow.sync_version),
      };
      schema.columns.forEach((column) => {
        out[column] = cloudRow[column] ?? null;
      });
      Object.entries(schema.references).forEach(([column, parent]) => {
        out[column] = refs.idToRef(parent, cloudRow[column]);
      });
      Object.entries(schema.polymorphic ?? {}).forEach(([column, tableColumn]) => {
        out[column] = refs.idToRef(String(cloudRow[tableColumn] ?? ""), cloudRow[column]);
      });
      return out;
    });
  }

  return {
    rows,
    tombstones,
    clockOffsetMs: clock.offsetMs,
    nextCursor: computeNextCursor(cursor, versions, clock.serverNowMs - CURSOR_SAFETY_MS),
    cloudUsernames: refs.usernames(),
  };
}

async function fetchSince<T>(client: SupabaseClient, table: string, columns: string, cursor: number): Promise<T[]> {
  const all: T[] = [];
  let after = cursor;

  for (;;) {
    const result = await client
      .from(table)
      .select(columns)
      .gt("sync_version", after)
      .order("sync_version", { ascending: true })
      .limit(PAGE_SIZE);
    if (result.error) {
      throw new Error(`Lecture de ${table} impossible : ${result.error.message}`);
    }
    const page = (result.data ?? []) as unknown as Array<T & { sync_version: number }>;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    after = Number(page[page.length - 1].sync_version);
  }

  return all;
}

/** Advances only past changes old enough to be sure nothing with a smaller version is still being written. */
export function computeNextCursor(cursor: number, versions: Array<{ version: number; at: string }>, safeBeforeMs: number) {
  let next = cursor;
  for (const entry of [...versions].sort((left, right) => left.version - right.version)) {
    if (Date.parse(entry.at) >= safeBeforeMs) break;
    next = entry.version;
  }
  return next;
}

/** Cloud ids <-> uids (usernames for users). */
async function createCloudRefResolver(client: SupabaseClient) {
  const idToRef = new Map<string, Map<number, string>>();
  const refToId = new Map<string, Map<string, number>>();
  const tableMap = <K, V>(store: Map<string, Map<K, V>>, table: string) => {
    if (!store.has(table)) store.set(table, new Map());
    return store.get(table) as Map<K, V>;
  };
  const remember = (table: string, id: number, ref: string) => {
    tableMap<number, string>(idToRef, table).set(id, ref);
    tableMap<string, number>(refToId, table).set(table === "users" ? ref.toLowerCase() : ref, id);
  };

  const directory = await client.rpc("row_sync_user_directory");
  if (directory.error) {
    throw new Error(`Liste des utilisateurs cloud indisponible : ${directory.error.message}`);
  }
  ((directory.data ?? []) as Array<{ id: number; username: string }>).forEach((user) => remember("users", Number(user.id), user.username));

  const isKnownTable = (table: string) => Boolean(getRowSyncSchema(table)) && table !== "users";

  return {
    async preloadIds(table: string, ids: unknown[]) {
      if (!isKnownTable(table)) return;
      const known = tableMap<number, string>(idToRef, table);
      const missing = [...new Set(ids.filter((id) => id !== null && id !== undefined).map(Number))].filter((id) => !known.has(id));
      for (let index = 0; index < missing.length; index += FILTER_BATCH) {
        const result = await client.from(table).select("id, uid").in("id", missing.slice(index, index + FILTER_BATCH));
        if (result.error) throw new Error(`Lecture de ${table} impossible : ${result.error.message}`);
        ((result.data ?? []) as Array<{ id: number; uid: string }>).forEach((row) => remember(table, Number(row.id), row.uid));
      }
    },
    async preloadRefs(table: string, refs: unknown[]) {
      if (!isKnownTable(table)) return;
      const known = tableMap<string, number>(refToId, table);
      const missing = [...new Set(refs.filter((ref) => typeof ref === "string" && ref !== "").map(String))].filter((ref) => !known.has(ref));
      for (let index = 0; index < missing.length; index += FILTER_BATCH) {
        const result = await client.from(table).select("id, uid").in("uid", missing.slice(index, index + FILTER_BATCH));
        if (result.error) throw new Error(`Lecture de ${table} impossible : ${result.error.message}`);
        ((result.data ?? []) as Array<{ id: number; uid: string }>).forEach((row) => remember(table, Number(row.id), row.uid));
      }
    },
    idToRef(table: string, id: unknown): string | null {
      if (id === null || id === undefined) return null;
      return idToRef.get(table)?.get(Number(id)) ?? null;
    },
    usernames() {
      return [...(refToId.get("users")?.keys() ?? [])];
    },
    refToId(table: string, ref: unknown): number | null {
      if (typeof ref !== "string" || ref === "") return null;
      return refToId.get(table)?.get(table === "users" ? ref.toLowerCase() : ref) ?? null;
    },
    remember,
  };
}

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

async function pushChanges(
  client: SupabaseClient,
  api: DesktopApi,
  deviceCode: string,
  offsetMs: number,
  report: RowSyncReport,
  options: EngineOptions
) {
  const changes = await api.rowSyncCollect();
  const pushed: Record<string, RowSyncPushedRow[]> = {};
  const toServerTime = (value: string) => new Date(Date.parse(value) + offsetMs).toISOString();

  // Rows inserted by the old full-replace sync may have left the id counters behind.
  await client.rpc("sync_identity_sequences");

  const changedUsers = changes.rows.users ?? [];
  if (changedUsers.length > 0 && options.pushUsers) {
    try {
      await options.pushUsers(changedUsers.map((row) => String(row.username)));
      pushed.users = changedUsers.map((row) => ({ uid: row.uid, modified_at: row.modified_at, sync_version: null }));
      report.pushed += changedUsers.length;
    } catch (error) {
      report.failures.push(`Utilisateurs : ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const refs = await createCloudRefResolver(client);

  for (const schema of ROW_SYNC_SCHEMA) {
    if (schema.table === "users") continue;
    const rows = changes.rows[schema.table] ?? [];
    if (rows.length === 0) continue;

    for (const [column, parent] of Object.entries(schema.references)) {
      await refs.preloadRefs(parent, rows.map((row) => row[column]));
    }
    for (const [column, tableColumn] of Object.entries(schema.polymorphic ?? {})) {
      for (const table of new Set(rows.map((row) => String(row[tableColumn] ?? "")))) {
        await refs.preloadRefs(table, rows.filter((row) => row[tableColumn] === table).map((row) => row[column]));
      }
    }

    const payloads: Array<{ row: RowSyncRow; payload: Record<string, unknown> }> = [];
    for (const row of rows) {
      const payload: Record<string, unknown> = { uid: row.uid, modified_at: toServerTime(row.modified_at) };
      schema.columns.forEach((column) => {
        payload[column] = row[column] ?? null;
      });
      (schema.booleans ?? []).forEach((column) => {
        if (payload[column] !== null) payload[column] = Boolean(Number(payload[column]));
      });

      let missingParent: string | null = null;
      Object.entries(schema.references).forEach(([column, parent]) => {
        const cloudId = refs.refToId(parent, row[column]);
        if (row[column] && cloudId === null) missingParent = parent;
        payload[column] = cloudId;
      });
      Object.entries(schema.polymorphic ?? {}).forEach(([column, tableColumn]) => {
        payload[column] = refs.refToId(String(row[tableColumn] ?? ""), row[column]);
      });

      // A parent that is not in the cloud: keep the row for a later sync if the link is required.
      if (missingParent && isRequiredReference(schema.table, missingParent)) {
        report.failures.push(`${schema.table} : element lie (${missingParent}) absent du cloud, ligne gardee pour plus tard.`);
        continue;
      }
      payloads.push({ row, payload });
    }

    const succeeded = await upsertRows(client, schema.table, deviceCode, payloads, report);
    succeeded.forEach((entry) => {
      if (entry.cloudId !== null) refs.remember(schema.table, entry.cloudId, entry.row.uid);
    });
    pushed[schema.table] = succeeded.map((entry) => ({
      uid: entry.row.uid,
      modified_at: entry.row.modified_at,
      sync_version: entry.syncVersion,
    }));
    report.pushed += succeeded.length;
  }

  const userTombstones = changes.tombstones.filter((tombstone) => tombstone.table_name === "users");
  const tombstoneIds = [
    ...(await pushUserDeletions(client, deviceCode, userTombstones, refs, toServerTime, report)),
    ...(await pushDeletions(
      client,
      deviceCode,
      changes.tombstones.filter((tombstone) => tombstone.table_name !== "users"),
      report
    )),
  ];
  await api.rowSyncMarkPushed(pushed, tombstoneIds);
}

const REQUIRED_REFERENCES: Record<string, string[]> = {
  initial_stocks: ["products"],
  replenishments: ["products"],
  sale_items: ["sales", "products"],
  sale_service_items: ["sales", "services"],
  cybercafe_sales: ["cybercafe_tariffs"],
  stock_movements: ["products"],
};

function isRequiredReference(table: string, parent: string) {
  return (REQUIRED_REFERENCES[table] ?? []).includes(parent);
}

async function upsertRows(
  client: SupabaseClient,
  table: string,
  deviceCode: string,
  entries: Array<{ row: RowSyncRow; payload: Record<string, unknown> }>,
  report: RowSyncReport
) {
  const succeeded: Array<{ row: RowSyncRow; syncVersion: number | null; cloudId: number | null }> = [];

  const send = async (batch: typeof entries) => {
    const result = await client
      .from(table)
      .upsert(
        batch.map((entry) => entry.payload),
        { onConflict: "uid" }
      )
      .select("id, uid, sync_version")
      .setHeader("x-origin-device", deviceCode);
    return result;
  };

  for (let index = 0; index < entries.length; index += UPSERT_BATCH) {
    const batch = entries.slice(index, index + UPSERT_BATCH);
    let result = await send(batch);

    if (result.error && batch.length > 1) {
      // One bad row must not block the others: retry one by one.
      for (const entry of batch) {
        result = await send([entry]);
        collect(result, [entry]);
      }
      continue;
    }
    collect(result, batch);
  }

  function collect(result: Awaited<ReturnType<typeof send>>, batch: typeof entries) {
    if (result.error) {
      report.failures.push(`${table} : ${result.error.message}`);
      return;
    }
    const returned = new Map(
      ((result.data ?? []) as Array<{ id: number; uid: string; sync_version: number }>).map((row) => [row.uid, row])
    );
    batch.forEach((entry) => {
      // Not returned = the cloud already had a more recent change (last change wins): nothing more to send.
      const saved = returned.get(entry.row.uid);
      succeeded.push({ row: entry.row, syncVersion: saved ? Number(saved.sync_version) : null, cloudId: saved ? Number(saved.id) : null });
    });
  }

  return succeeded;
}

/**
 * Users deleted on this PC (Super admin only). Found in the cloud by username, because a user created on a PC
 * gets another uid in the cloud. Not deleted if the cloud user was changed after the deletion here.
 */
async function pushUserDeletions(
  client: SupabaseClient,
  deviceCode: string,
  tombstones: RowSyncTombstone[],
  refs: Awaited<ReturnType<typeof createCloudRefResolver>>,
  toServerTime: (value: string) => string,
  report: RowSyncReport
) {
  const done: number[] = [];
  for (const tombstone of tombstones) {
    const cloudId = tombstone.ref ? refs.refToId("users", tombstone.ref) : null;
    const query =
      cloudId !== null
        ? client.from("users").delete().eq("id", cloudId).lt("modified_at", toServerTime(tombstone.deleted_at))
        : // Deletions recorded before this version have no username: try the uid (same in both when the user came from the cloud).
          client.from("users").delete().eq("uid", tombstone.uid);
    const result = await query.setHeader("x-origin-device", deviceCode);
    if (result.error) {
      report.failures.push(`Suppression utilisateur ${tombstone.ref ?? ""} : ${result.error.message}`);
      continue;
    }
    if (tombstone.id !== undefined) done.push(tombstone.id);
    report.deletionsSent += 1;
  }
  return done;
}

async function pushDeletions(client: SupabaseClient, deviceCode: string, tombstones: RowSyncTombstone[], report: RowSyncReport) {
  const done: number[] = [];
  const byTable = new Map<string, RowSyncTombstone[]>();
  tombstones.forEach((tombstone) => {
    const list = byTable.get(tombstone.table_name) ?? [];
    list.push(tombstone);
    byTable.set(tombstone.table_name, list);
  });

  // Children first, like the local deletion order.
  for (const schema of [...ROW_SYNC_SCHEMA].reverse()) {
    const list = byTable.get(schema.table) ?? [];
    for (let index = 0; index < list.length; index += FILTER_BATCH) {
      const batch = list.slice(index, index + FILTER_BATCH);
      const result = await client
        .from(schema.table)
        .delete()
        .in("uid", batch.map((tombstone) => tombstone.uid))
        .setHeader("x-origin-device", deviceCode);
      if (result.error) {
        report.failures.push(`Suppression ${schema.table} : ${result.error.message}`);
        continue;
      }
      batch.forEach((tombstone) => {
        if (tombstone.id !== undefined) done.push(tombstone.id);
      });
      report.deletionsSent += batch.length;
    }
  }

  return done;
}
