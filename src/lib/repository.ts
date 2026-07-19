import { createClient } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "./supabase";
import type {
  ActivityHistoryItem,
  AppUser,
  Client,
  ClientDraft,
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
  SaleItemDraft,
  SaleServiceItemDraft,
  SaleDraft,
  SaleRecord,
  SyncConflictPreview,
  SyncSnapshot,
  SyncStatus,
  StockRow,
  SupplyHistoryItem,
  UserDraft,
  UserRole,
} from "../types";

const now = new Date().toISOString();
const webSessionStorageKey = "walikale-web-active-user-id";
const webDefaultPassword = "Walikale123";

const webSeedProducts: Product[] = [
  {
    id: 1,
    code: "PAP-001",
    name: "Classeur",
    category: "Classement",
    purchasePrice: 4.2,
    sellingPrice: 6,
    quantity: 49,
    unit: "piece",
    alertThreshold: 10,
    supplier: "Papeterie Kivu",
    updatedAt: now,
  },
  {
    id: 2,
    code: "PAP-002",
    name: "Scotch transparent",
    category: "Fourniture",
    purchasePrice: 3.2,
    sellingPrice: 5,
    quantity: 20,
    unit: "piece",
    alertThreshold: 8,
    supplier: "Bureau Express",
    updatedAt: now,
  },
];

const webSeedServices: Service[] = [
  {
    id: 1,
    name: "Saisie de documents",
    category: "Bureautique",
    unitPrice: 2,
    description: "Saisie et mise en forme de documents",
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    name: "Impression couleur",
    category: "Impression",
    unitPrice: 1,
    description: "Impression couleur par page",
    active: true,
    createdAt: now,
    updatedAt: now,
  },
];

const webSeedHistory: SupplyHistoryItem[] = [
  {
    id: 1,
    date: "18/05/2026",
    product: "Classeur",
    quantity: 20,
    supplier: "Papeterie Kivu",
    purchasePrice: 4.2,
    sellingPrice: 6,
    amount: 84,
    movementType: "stock_initial",
  },
];

const webSeedActivityHistory: ActivityHistoryItem[] = [
  {
    id: 1,
    date: "18/05/2026 09:30",
    action: "Creation",
    target: "Produit #1",
    details: "Creation produit Classeur",
    user: "Marie Jeanne R.",
  },
  {
    id: 2,
    date: "18/05/2026 10:15",
    action: "Creation",
    target: "Client",
    details: "Creation client Institut Amani",
    user: "Marie Jeanne R.",
  },
  {
    id: 3,
    date: "18/05/2026 11:20",
    action: "Creation",
    target: "Vente #1",
    details: "Vente Fact-SA26-0001 avec 1 ligne(s)",
    user: "Marie Jeanne R.",
  },
];

const webSeedSales: SaleRecord[] = [
  {
    id: 1,
    reference: "Fact-SA26-0001",
    clientName: "Institut Amani",
    date: "18/05/2026",
    amount: 24,
    paymentMethod: "Especes",
    status: "Payee",
    itemsCount: 1,
  },
];

const webSeedSaleDetails: SaleDetail[] = [
  {
    id: 1,
    reference: "Fact-SA26-0001",
    clientName: "Institut Amani",
    date: "18/05/2026",
    amount: 24,
    paymentMethod: "Especes",
    status: "Payee",
    items: [
      {
        lineType: "product",
        productId: 1,
        productName: "Classeur",
        category: "Classement",
        quantity: 4,
        unitPrice: 6,
        lineTotal: 24,
      },
    ],
  },
];

const webSeedClients: Client[] = [
  { id: 1, name: "Institut Amani", phone: "+243970000001", address: "Goma", email: "contact@amani.cd", createdAt: now },
  { id: 2, name: "Groupe Horizon", phone: "+243970000002", address: "Bukavu", email: "admin@horizon.cd", createdAt: now },
];

const webSeedExpenses: ExpenseItem[] = [];

const webSeedUsers: AppUser[] = [
  {
    id: 1,
    fullName: "Marie Jeanne R.",
    username: "mjr",
    email: "mjr@lacouronne",
    role: "Administrateur",
    active: true,
    createdAt: "2026-05-02T16:41:00",
    lastLoginAt: "2026-05-08T09:32:00",
  },
  {
    id: 2,
    fullName: "Jean R.",
    username: "jr",
    email: "jr@lacouronne",
    role: "Super admin",
    active: true,
    createdAt: "2026-05-02T16:17:00",
    lastLoginAt: "2026-05-02T16:18:00",
  },
  {
    id: 3,
    fullName: "Test Employe",
    username: "test",
    email: "test@lacouronne",
    role: "Employe",
    active: true,
    createdAt: "2026-05-01T19:50:00",
    lastLoginAt: "2026-05-01T20:00:00",
  },
  {
    id: 4,
    fullName: "Roberto M.",
    username: "roberto",
    email: "roberto@lacouronne",
    role: "Super admin",
    active: true,
    createdAt: "2026-04-29T13:42:00",
    lastLoginAt: "2026-05-16T15:51:00",
  },
  {
    id: 5,
    fullName: "Admin Couronne",
    username: "admin",
    email: "admin@lacouronne.fr",
    role: "Super admin",
    active: true,
    createdAt: "2026-04-29T13:42:00",
    lastLoginAt: "2026-04-29T17:29:00",
  },
];

const webUserPasswords: Record<number, string> = {
  1: webDefaultPassword,
  2: webDefaultPassword,
  3: webDefaultPassword,
  4: webDefaultPassword,
  5: webDefaultPassword,
};

type SupabaseProductRow = {
  id: number;
  code: string;
  name: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  unit: string;
  alert_threshold: number;
  supplier: string;
  updated_at: string;
};

type SupabaseServiceRow = {
  id: number;
  name: string;
  category: string;
  unit_price: number;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type SupabaseClientRow = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  created_at: string;
};

type SupabaseExpenseRow = {
  id: number;
  detail: string;
  nature: string;
  amount: number;
  expense_date: string;
  approved_by: string;
  purpose: string;
  user_id: number | null;
  user?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};

type SupabaseSaleRow = {
  id: number;
  reference: string;
  sold_at: string;
  total_amount: number;
  payment_method: string;
  client_id: number | null;
  client?: { name: string | null } | Array<{ name: string | null }> | null;
};

type SupabaseSaleItemRow = {
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  product?: { name: string | null } | Array<{ name: string | null }> | null;
};

type SupabaseSaleServiceItemRow = {
  sale_id: number;
  service_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  service?: { name: string | null; category: string | null } | Array<{ name: string | null; category: string | null }> | null;
};

type SupabaseStockRow = {
  product_id: number;
  product_name: string;
  quantity_in: number;
  quantity_out: number;
  current_stock: number;
  alert_threshold: number;
};

type SupabaseHistoryRow = {
  id: number;
  movement_type: "stock_initial" | "reapprovisionnement" | "vente";
  quantity: number;
  movement_date: string;
  source_table: string;
  source_id: number | null;
  product_id: number;
  product?:
    | { name: string | null; supplier: string | null; selling_price: number | null; purchase_price: number | null }
    | Array<{ name: string | null; supplier: string | null; selling_price: number | null; purchase_price: number | null }>
    | null;
  user_id?: number | null;
};

type SupabaseAuditLogRow = {
  id: number;
  action: string;
  target_table: string;
  target_id: number | null;
  details: string | null;
  created_at: string;
  user_id: number | null;
  actor_name: string | null;
  actor_username: string | null;
  source_device: string | null;
  source_platform: string | null;
  user?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};

type SupabaseUserRow = {
  id: number;
  auth_user_id: string | null;
  full_name: string;
  username: string;
  email: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
};

type SupabaseInvoiceSequenceRow = {
  current_year: number;
  series_index: number;
  next_number: number;
};

type SupabaseInventoryCycleRow = {
  id: number;
};

const webSeedInvoiceSeries: InvoiceSeriesInfo = {
  seriesLabel: "A",
  year: 2026,
  yearCode: "26",
  nextNumber: 2,
  nextReference: "Fact-SA26-0002",
  lastReference: "Fact-SA26-0001",
};

function persistWebUsers(users: AppUser[]) {
  localStorage.setItem("walikale-web-users", JSON.stringify(users));
}

function getCurrentInvoiceYear() {
  return new Date().getFullYear();
}

function getInvoiceSeriesLabel(seriesIndex: number) {
  let index = seriesIndex;
  let label = "";

  do {
    label = String.fromCharCode(65 + (index % 26)) + label;
    index = Math.floor(index / 26) - 1;
  } while (index >= 0);

  return label;
}

function getInvoiceSeriesIndex(label: string) {
  return label
    .toUpperCase()
    .split("")
    .reduce((accumulator, character) => accumulator * 26 + (character.charCodeAt(0) - 64), 0) - 1;
}

function buildInvoiceReference(year: number, seriesIndex: number, number: number) {
  const yearCode = String(year).slice(-2);
  return `Fact-S${getInvoiceSeriesLabel(seriesIndex)}${yearCode}-${String(number).padStart(4, "0")}`;
}

function buildInvoiceSeriesInfo(year: number, seriesIndex: number, nextNumber: number): InvoiceSeriesInfo {
  return {
    seriesLabel: getInvoiceSeriesLabel(seriesIndex),
    year,
    yearCode: String(year).slice(-2),
    nextNumber,
    nextReference: buildInvoiceReference(year, seriesIndex, nextNumber),
    lastReference: nextNumber > 1 ? buildInvoiceReference(year, seriesIndex, nextNumber - 1) : null,
  };
}

function loadWebInvoiceSeries() {
  const stored = loadJson("walikale-web-invoice-series", webSeedInvoiceSeries);
  const currentYear = getCurrentInvoiceYear();

  if (stored.year !== currentYear) {
    const resetInfo = buildInvoiceSeriesInfo(currentYear, 0, 1);
    localStorage.setItem("walikale-web-invoice-series", JSON.stringify(resetInfo));
    return resetInfo;
  }

  return stored;
}

function persistWebInvoiceSeries(info: InvoiceSeriesInfo) {
  localStorage.setItem("walikale-web-invoice-series", JSON.stringify(info));
}

function createIsolatedSupabaseClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase n'est pas configure sur cette application.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function getCurrentSupabaseInventoryCycleId() {
  const client = getSupabaseClient();
  const cycleResult = await client
    .from("inventory_cycles")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  let cycle = ensureOptionalData(cycleResult.data, cycleResult.error) as SupabaseInventoryCycleRow | null;

  if (!cycle) {
    const insertResult = await client
      .from("inventory_cycles")
      .insert({
        label: "Cycle 1",
      })
      .select("id")
      .single();
    cycle = ensureData(insertResult.data, insertResult.error) as SupabaseInventoryCycleRow;
  }

  return cycle.id;
}

function computeMetrics(products: Product[]): DashboardMetrics {
  const sales = loadJson("walikale-web-sales", webSeedSales);
  const expenses = loadJson("walikale-web-expenses", webSeedExpenses);
  const totalSalesAmount = sales.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  return {
    totalStock: products.reduce((sum, item) => sum + item.quantity, 0),
    totalProducts: products.length,
    dailySales: sales.length,
    suppliers: new Set(products.map((item) => item.supplier)).size,
    totalSalesAmount,
    totalExpenses,
    netSalesAmount: totalSalesAmount - totalExpenses,
  };
}

function computeCurrentStock(products: Product[]): StockRow[] {
  return products.map((item) => ({
    productId: item.id,
    productName: item.name,
    quantityIn: item.quantity,
    quantityOut: 0,
    currentStock: item.quantity,
    alertThreshold: item.alertThreshold,
  }));
}

function loadJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function persistWeb(products: Product[], history: SupplyHistoryItem[], sales?: SaleRecord[], saleDetails?: SaleDetail[]) {
  localStorage.setItem("walikale-web-products", JSON.stringify(products));
  localStorage.setItem("walikale-web-history", JSON.stringify(history));
  if (!localStorage.getItem("walikale-web-clients")) {
    localStorage.setItem("walikale-web-clients", JSON.stringify(webSeedClients));
  }
  if (!localStorage.getItem("walikale-web-users")) {
    localStorage.setItem("walikale-web-users", JSON.stringify(webSeedUsers));
  }
  if (sales) {
    localStorage.setItem("walikale-web-sales", JSON.stringify(sales));
  }
  if (saleDetails) {
    localStorage.setItem("walikale-web-sale-details", JSON.stringify(saleDetails));
  }
}

function persistWebServices(services: Service[]) {
  localStorage.setItem("walikale-web-services", JSON.stringify(services));
}

function persistWebActivityHistory(history: ActivityHistoryItem[]) {
  localStorage.setItem("walikale-web-activity-history", JSON.stringify(history));
}

function persistWebExpenses(expenses: ExpenseItem[]) {
  localStorage.setItem("walikale-web-expenses", JSON.stringify(expenses));
}

function mergeSaleItems(items: SaleItemDraft[]) {
  const grouped = new Map<number, number>();

  items.forEach((item) => {
    grouped.set(item.productId, (grouped.get(item.productId) ?? 0) + item.quantity);
  });

  return Array.from(grouped.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function mergeSaleServiceItems(items: SaleServiceItemDraft[]) {
  const grouped = new Map<number, number>();

  items.forEach((item) => {
    grouped.set(item.serviceId, (grouped.get(item.serviceId) ?? 0) + item.quantity);
  });

  return Array.from(grouped.entries()).map(([serviceId, quantity]) => ({
    serviceId,
    quantity,
  }));
}

function isSupabaseEnabled() {
  return !window.desktopApi && Boolean(supabase);
}

function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase n'est pas configure.");
  }

  return supabase;
}

function getWebSourceDeviceLabel() {
  if (typeof navigator === "undefined") {
    return "Navigateur web";
  }

  const platform = navigator.platform?.trim() || "web";
  return `Navigateur ${platform}`;
}

async function insertSupabaseAuditLog(
  client: ReturnType<typeof getSupabaseClient>,
  entry: {
    action: string;
    target_table: string;
    target_id?: number | null;
    details?: string | null;
  }
) {
  let actor: AppUser | null = null;

  try {
    actor = await getSupabaseSessionProfile();
  } catch {
    actor = null;
  }

  const result = await client.from("audit_logs").insert({
    user_id: actor?.id ?? null,
    action: entry.action,
    target_table: entry.target_table,
    target_id: entry.target_id ?? null,
    details: entry.details ?? null,
    actor_name: actor?.fullName ?? null,
    actor_username: actor?.username ?? null,
    source_device: getWebSourceDeviceLabel(),
    source_platform: "web",
  });

  ensureData(result.data ?? [], result.error);
}

function formatAuditActorLabel(row: SupabaseAuditLogRow) {
  const actorName = relationFirst(row.user)?.full_name ?? row.actor_name ?? "Utilisateur non precise";
  const actorUsername = row.actor_username ? ` [${row.actor_username}]` : "";
  const sourcePlatform = row.source_platform ? ` - ${row.source_platform}` : "";
  const sourceDevice = row.source_device ? ` - ${row.source_device}` : "";
  return `${actorName}${actorUsername}${sourcePlatform}${sourceDevice}`;
}

function ensureData<T>(data: T | null, error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(error.message || "Erreur Supabase.");
  }

  if (data === null) {
    throw new Error("Aucune donnee recue depuis Supabase.");
  }

  return data;
}

function ensureOptionalData<T>(data: T | null, error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(error.message || "Erreur Supabase.");
  }

  return data;
}

function mapSupabaseProduct(row: SupabaseProductRow, currentStock = 0): Product {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    quantity: currentStock,
    unit: row.unit,
    alertThreshold: row.alert_threshold,
    supplier: row.supplier,
    updatedAt: row.updated_at,
  };
}

function mapSupabaseClient(row: SupabaseClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    address: row.address ?? "",
    email: row.email ?? "",
    createdAt: row.created_at,
  };
}

function formatFrenchDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR");
}

function formatFrenchDateTime(value: string) {
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

function relationFirst<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function deleteSupabaseRows(table: string) {
  const client = getSupabaseClient();
  const result = await client.from(table).delete().gte("id", 0);
  ensureData(result.data ?? [], result.error);
}

async function insertSupabaseRows(table: string, rows: Array<Record<string, unknown>>, chunkSize = 200) {
  if (rows.length === 0) {
    return;
  }

  const client = getSupabaseClient();

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const result = await client.from(table).insert(chunk);
    ensureData(result.data ?? [], result.error);
  }
}

async function getCloudLastChangeAt() {
  const client = getSupabaseClient();
  const result = await client
    .from("audit_logs")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = ensureOptionalData(result.data, result.error) as { created_at: string } | null;
  return row?.created_at ?? null;
}

function extractMissingSupabaseRelation(message: string) {
  const schemaCacheMatch = message.match(/table 'public\.([^']+)'/i);
  if (schemaCacheMatch?.[1]) {
    return schemaCacheMatch[1];
  }

  const relationMatch = message.match(/relation ["']?public\.([^"'\s]+)["']?/i);
  if (relationMatch?.[1]) {
    return relationMatch[1];
  }

  return null;
}

function normalizeSupabaseSyncError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const missingRelation = extractMissingSupabaseRelation(message);

  if (missingRelation) {
    return new Error(
      `Le schema Supabase est incomplet. La table ou vue '${missingRelation}' est absente. Executez database/supabase-schema.sql puis database/supabase-auth-migration.sql dans Supabase, puis relancez la synchronisation.`
    );
  }

  return error instanceof Error ? error : new Error(message);
}

async function assertSupabaseSyncSchema() {
  const client = getSupabaseClient();
  const checks: Array<{ relation: string; column: string }> = [
    { relation: "users", column: "id" },
    { relation: "products", column: "id" },
    { relation: "services", column: "id" },
    { relation: "clients", column: "id" },
    { relation: "expenses", column: "id" },
    { relation: "initial_stocks", column: "id" },
    { relation: "replenishments", column: "id" },
    { relation: "sales", column: "id" },
    { relation: "sale_items", column: "id" },
    { relation: "sale_service_items", column: "id" },
    { relation: "stock_movements", column: "id" },
    { relation: "audit_logs", column: "id" },
    { relation: "invoice_sequences", column: "id" },
    { relation: "inventory_cycles", column: "id" },
    { relation: "current_stock_view", column: "product_id" },
  ];

  for (const check of checks) {
    const result = await client.from(check.relation).select(check.column).limit(1);

    if (result.error) {
      throw normalizeSupabaseSyncError(result.error);
    }
  }
}

const syncBucketLabels: Record<string, string> = {
  products: "Produits",
  services: "Services",
  clients: "Clients",
  expenses: "Depenses",
  sales: "Ventes",
  sale_service_items: "Services vendus",
  replenishments: "Reapprovisionnements",
  initial_stocks: "Stock initial",
  stock_movements: "Mouvements de stock",
  users: "Utilisateurs",
  invoice_sequences: "Facturation",
  inventory_cycles: "Inventaire",
};

function getSyncBucketLabel(key: string) {
  return syncBucketLabels[key] ?? key.split("_").join(" ");
}

function buildSyncBucketsFromAuditLogs(
  rows: Array<{ target_table?: string | null; created_at?: string | null }>,
  since: string | null
) {
  const counts = new Map<string, number>();
  let latestChangedAt: string | null = null;
  const sinceTime = since ? new Date(since).getTime() : null;

  rows.forEach((row) => {
    const createdAt = row.created_at ?? null;
    const createdTime = createdAt ? new Date(createdAt).getTime() : null;

    if (sinceTime !== null && createdTime !== null && createdTime <= sinceTime) {
      return;
    }

    const key = row.target_table ?? "autre";
    counts.set(key, (counts.get(key) ?? 0) + 1);

    if (createdAt && (!latestChangedAt || new Date(createdAt).getTime() > new Date(latestChangedAt).getTime())) {
      latestChangedAt = createdAt;
    }
  });

  const buckets = [...counts.entries()]
    .map(([key, count]) => ({
      key,
      label: getSyncBucketLabel(key),
      count,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "fr", { sensitivity: "base" }));

  return {
    buckets,
    latestChangedAt,
  };
}

async function getCloudSnapshot(): Promise<SyncSnapshot> {
  const client = getSupabaseClient();
  const [
    users,
    products,
    services,
    clients,
    expenses,
    initialStocks,
    replenishments,
    sales,
    saleItems,
    saleServiceItems,
    stockMovements,
    auditLogs,
    invoiceSequences,
    inventoryCycles,
  ] = await Promise.all([
    client.from("users").select("id, auth_user_id, full_name, username, email, password_hash, role, active, created_at, last_login_at").order("id", { ascending: true }),
    client.from("products").select("id, code, name, category, purchase_price, selling_price, unit, alert_threshold, supplier, created_at, updated_at").order("id", { ascending: true }),
    client.from("services").select("id, name, category, unit_price, description, active, created_at, updated_at").order("id", { ascending: true }),
    client.from("clients").select("id, name, phone, address, email, created_at").order("id", { ascending: true }),
    client.from("expenses").select("id, detail, nature, amount, expense_date, user_id, approved_by, purpose").order("id", { ascending: true }),
    client.from("initial_stocks").select("id, product_id, quantity, purchase_price, stock_date, cycle_id, user_id, note").order("id", { ascending: true }),
    client.from("replenishments").select("id, product_id, quantity, purchase_price, supplier, replenished_at, cycle_id, user_id, note").order("id", { ascending: true }),
    client.from("sales").select("id, reference, client_id, sold_at, total_amount, payment_method, cycle_id, user_id").order("id", { ascending: true }),
    client.from("sale_items").select("id, sale_id, product_id, quantity, unit_price, line_total").order("id", { ascending: true }),
    client.from("sale_service_items").select("id, sale_id, service_id, quantity, unit_price, line_total").order("id", { ascending: true }),
    client.from("stock_movements").select("id, product_id, movement_type, quantity, source_table, source_id, movement_date, cycle_id, user_id").order("id", { ascending: true }),
    client.from("audit_logs").select("id, user_id, action, target_table, target_id, details, actor_name, actor_username, source_device, source_platform, created_at").order("id", { ascending: true }),
    client.from("invoice_sequences").select("id, current_year, series_index, next_number, updated_at").order("id", { ascending: true }),
    client.from("inventory_cycles").select("id, label, started_at, user_id").order("id", { ascending: true }),
  ]);

  return {
    users: ensureData(users.data, users.error) as Array<Record<string, unknown>>,
    products: ensureData(products.data, products.error) as Array<Record<string, unknown>>,
    services: ensureData(services.data, services.error) as Array<Record<string, unknown>>,
    clients: ensureData(clients.data, clients.error) as Array<Record<string, unknown>>,
    expenses: ensureData(expenses.data, expenses.error) as Array<Record<string, unknown>>,
    initialStocks: ensureData(initialStocks.data, initialStocks.error) as Array<Record<string, unknown>>,
    replenishments: ensureData(replenishments.data, replenishments.error) as Array<Record<string, unknown>>,
    sales: ensureData(sales.data, sales.error) as Array<Record<string, unknown>>,
    saleItems: ensureData(saleItems.data, saleItems.error) as Array<Record<string, unknown>>,
    saleServiceItems: ensureData(saleServiceItems.data, saleServiceItems.error) as Array<Record<string, unknown>>,
    stockMovements: ensureData(stockMovements.data, stockMovements.error) as Array<Record<string, unknown>>,
    auditLogs: ensureData(auditLogs.data, auditLogs.error) as Array<Record<string, unknown>>,
    invoiceSequences: ensureData(invoiceSequences.data, invoiceSequences.error) as Array<Record<string, unknown>>,
    inventoryCycles: ensureData(inventoryCycles.data, inventoryCycles.error) as Array<Record<string, unknown>>,
  };
}

async function getSyncConflictPreviewFromSupabaseAndDesktop(
  localStatus: SyncStatus,
  cloudLastChangeAt: string | null
): Promise<SyncConflictPreview> {
  if (!window.desktopApi) {
    throw new Error("Apercu de conflit reserve a l'application desktop.");
  }

  const [localSnapshot, cloudAuditLogsResult] = await Promise.all([
    window.desktopApi.exportSyncSnapshot(),
    getSupabaseClient()
      .from("audit_logs")
      .select("target_table, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const localAuditLogs = (localSnapshot as SyncSnapshot).auditLogs as Array<{ target_table?: string | null; created_at?: string | null }>;
  const cloudAuditLogs = ensureData(cloudAuditLogsResult.data, cloudAuditLogsResult.error) as Array<{
    target_table?: string | null;
    created_at?: string | null;
  }>;

  const localSummary = buildSyncBucketsFromAuditLogs(localAuditLogs, localStatus.lastSyncedAt);
  const cloudSummary = buildSyncBucketsFromAuditLogs(cloudAuditLogs, localStatus.lastSyncedAt);

  return {
    localPendingChanges: localStatus.pendingChanges,
    localLastChangeAt: localSummary.latestChangedAt,
    cloudLastChangeAt: cloudSummary.latestChangedAt ?? cloudLastChangeAt,
    localBuckets: localSummary.buckets,
    cloudBuckets: cloudSummary.buckets,
  };
}

async function syncUsersToSupabase(snapshotUsers: Array<Record<string, unknown>>) {
  const client = getSupabaseClient();
  const authClient = createIsolatedSupabaseClient();
  const existingResult = await client
    .from("users")
    .select("id, auth_user_id, full_name, username, email, password_hash, role, active, created_at, last_login_at");
  const existingUsers = ensureData(existingResult.data, existingResult.error) as Array<{
    id: number;
    auth_user_id: string | null;
    full_name: string;
    username: string;
    email: string | null;
    password_hash: string | null;
    role: string;
    active: boolean;
    created_at: string;
    last_login_at: string | null;
  }>;

  const existingByUsername = new Map(existingUsers.map((user) => [user.username.toLowerCase(), user]));
  const existingByEmail = new Map(
    existingUsers.filter((user) => user.email).map((user) => [String(user.email).toLowerCase(), user])
  );

  const payload = snapshotUsers.map((rawUser) => {
    const username = String(rawUser.username ?? "").trim().toLowerCase();
    const email = rawUser.email ? String(rawUser.email).trim().toLowerCase() : null;
    const existingUser = (email ? existingByEmail.get(email) : undefined) ?? existingByUsername.get(username);

    return {
      auth_user_id: existingUser?.auth_user_id ?? null,
      full_name: String(rawUser.full_name ?? ""),
      username,
      email,
      password_hash: String(rawUser.password_hash ?? existingUser?.password_hash ?? "") || null,
      role: String(rawUser.role ?? "Employe"),
      active: Boolean(rawUser.active),
      created_at: String(rawUser.created_at ?? new Date().toISOString()),
      last_login_at: rawUser.last_login_at ? String(rawUser.last_login_at) : existingUser?.last_login_at ?? null,
    };
  });

  if (payload.length === 0) {
    return;
  }

  for (let index = 0; index < payload.length; index += 1) {
    const currentPayload = payload[index];
    const existingUser = (currentPayload.email ? existingByEmail.get(currentPayload.email) : undefined) ?? existingByUsername.get(currentPayload.username);
    if (currentPayload.auth_user_id || !currentPayload.email) {
      continue;
    }

    const rawUser = snapshotUsers[index];
    const candidatePassword =
      typeof rawUser.auth_sync_password === "string" ? rawUser.auth_sync_password.trim() : "";

    if (!candidatePassword) {
      throw new Error(
        `Le compte web de ${currentPayload.email} ne peut pas etre cree automatiquement car son mot de passe initial n'est plus disponible. Reinitialisez d'abord son mot de passe localement, puis relancez la synchronisation.`
      );
    }

    const signUpResult = await authClient.auth.signUp({
      email: currentPayload.email,
      password: candidatePassword,
      options: {
        data: {
          full_name: currentPayload.full_name,
          username: currentPayload.username,
          role: currentPayload.role,
        },
      },
    });

    if (signUpResult.error && !isRecoverableSupabaseSignUpError(signUpResult.error.message)) {
      throw new Error(`Impossible de creer le compte web pour ${currentPayload.email}: ${signUpResult.error.message}`);
    }

    currentPayload.auth_user_id = signUpResult.data.user?.id ?? existingUser?.auth_user_id ?? null;
  }

  const upsertResult = await client.from("users").upsert(payload, {
    onConflict: "username",
    ignoreDuplicates: false,
  });
  ensureData(upsertResult.data ?? [], upsertResult.error);
}

function mapSupabaseUser(row: SupabaseUserRow): AppUser {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    email: row.email ?? "",
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at ?? row.created_at,
  };
}

function isRecoverableSupabaseSignUpError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already") ||
    normalized.includes("registered") ||
    normalized.includes("security purposes") ||
    normalized.includes("after ") ||
    normalized.includes("too many requests")
  );
}

async function authenticateWithSupabase(draft: LoginDraft): Promise<{ profile: AppUser; authUserId: string } | null> {
  const client = getSupabaseClient();
  const identifier = draft.identifier.trim().toLowerCase();
  const password = draft.password.trim();

  if (!identifier || !password) {
    return null;
  }

  let loginEmail = identifier;

  if (!identifier.includes("@")) {
    const lookupResult = await client.rpc("find_login_user", { p_identifier: identifier });
    const lookupRows = ensureData(lookupResult.data, lookupResult.error) as Array<{ email: string | null; active: boolean }>;
    const lookupUser = lookupRows[0];

    if (!lookupUser?.email || !lookupUser.active) {
      return null;
    }

    loginEmail = lookupUser.email.toLowerCase();
  }

  const signInResult = await client.auth.signInWithPassword({
    email: loginEmail,
    password,
  });

  if (signInResult.error || !signInResult.data.user?.id) {
    return null;
  }

  const profile = await getSupabaseSessionProfile();
  if (!profile) {
    return null;
  }

  return {
    profile,
    authUserId: signInResult.data.user.id,
  };
}

async function getSupabaseSessionProfile() {
  const client = getSupabaseClient();
  const sessionResult = await client.auth.getSession();
  const session = sessionResult.data.session;

  if (!session?.user) {
    return null;
  }

  const authUser = session.user;
  let profileResult = await client
    .from("users")
    .select("id, auth_user_id, full_name, username, email, role, active, created_at, last_login_at")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  let profile = profileResult.data as SupabaseUserRow | null;

  if (profileResult.error) {
    throw new Error(profileResult.error.message || "Impossible de recuperer le profil utilisateur.");
  }

  if (!profile && authUser.email) {
    const linkResult = await client.rpc("link_authenticated_user", { p_email: authUser.email.toLowerCase() });
    const linkedRows = ensureData(linkResult.data, linkResult.error) as SupabaseUserRow[];
    profile = linkedRows[0] ?? null;
  }

  if (!profile) {
    await client.auth.signOut();
    throw new Error("Aucun profil applicatif n'est lie a ce compte Supabase.");
  }

  if (!profile.active) {
    await client.auth.signOut();
    throw new Error("Ce compte utilisateur est desactive.");
  }

  const touchResult = await client.rpc("touch_last_login");
  const touchedRows = ensureData(touchResult.data, touchResult.error) as SupabaseUserRow[];

  if (touchedRows[0]) {
    profile = touchedRows[0];
  }

  return mapSupabaseUser(profile);
}

export const repository = {
  isDesktop: Boolean(window.desktopApi),
  hasSupabaseConfig,

  async getSyncStatus(): Promise<SyncStatus> {
    if (!window.desktopApi) {
      return {
        available: false,
        online: typeof navigator !== "undefined" ? navigator.onLine : true,
        lastSyncedAt: null,
        pendingChanges: 0,
        cloudHasChanges: false,
      };
    }

    const localStatus = await window.desktopApi.getSyncStatus();
    let cloudHasChanges = false;

    if (supabase && (typeof navigator === "undefined" || navigator.onLine)) {
      try {
        const cloudLastChangeAt = await getCloudLastChangeAt();
        cloudHasChanges = Boolean(
          cloudLastChangeAt &&
            (!localStatus.lastSyncedAt || new Date(cloudLastChangeAt).getTime() > new Date(localStatus.lastSyncedAt).getTime())
        );
      } catch (error) {
        console.error("Etat de synchronisation cloud indisponible:", normalizeSupabaseSyncError(error));
      }
    }

    return {
      ...localStatus,
      available: Boolean(supabase),
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
      cloudHasChanges,
    };
  },

  async getSyncConflictPreview(): Promise<SyncConflictPreview> {
    try {
      if (!window.desktopApi) {
        throw new Error("Apercu de conflit reserve a l'application desktop.");
      }

      if (!supabase) {
        throw new Error("Supabase n'est pas configure sur cette application.");
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("Connexion internet indisponible pour analyser le conflit.");
      }

      await assertSupabaseSyncSchema();
      const localStatus = await window.desktopApi.getSyncStatus();
      const cloudLastChangeAt = await getCloudLastChangeAt();
      return getSyncConflictPreviewFromSupabaseAndDesktop(localStatus, cloudLastChangeAt);
    } catch (error) {
      throw normalizeSupabaseSyncError(error);
    }
  },

  async syncDesktopToCloud(forcePush = false): Promise<SyncStatus> {
    try {
      if (!window.desktopApi) {
        throw new Error("La synchronisation locale est reservee a l'application desktop.");
      }

      if (!supabase) {
        throw new Error("Supabase n'est pas configure sur cette application.");
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("Aucune connexion internet disponible pour la synchronisation.");
      }

      await assertSupabaseSyncSchema();
      const localStatus = await window.desktopApi.getSyncStatus();
      const cloudLastChangeAt = await getCloudLastChangeAt();
      const cloudHasChanges = Boolean(
        cloudLastChangeAt &&
          (!localStatus.lastSyncedAt || new Date(cloudLastChangeAt).getTime() > new Date(localStatus.lastSyncedAt).getTime())
      );

      if (!forcePush && localStatus.pendingChanges > 0 && cloudHasChanges) {
        throw new Error("Conflit detecte : le cloud et ce poste ont tous les deux des changements non synchronises.");
      }

      if (!forcePush && localStatus.pendingChanges === 0 && cloudHasChanges) {
        const cloudSnapshot = await getCloudSnapshot();
        await window.desktopApi.importSyncSnapshot(cloudSnapshot);
        await window.desktopApi.markSyncComplete(cloudLastChangeAt);
        return this.getSyncStatus();
      }

      const snapshot = await window.desktopApi.exportSyncSnapshot();
      const syncSnapshot = snapshot as SyncSnapshot;

      await deleteSupabaseRows("sale_items");
      await deleteSupabaseRows("sale_service_items");
      await deleteSupabaseRows("stock_movements");
      await deleteSupabaseRows("sales");
      await deleteSupabaseRows("replenishments");
      await deleteSupabaseRows("initial_stocks");
      await deleteSupabaseRows("audit_logs");
      await deleteSupabaseRows("expenses");
      await deleteSupabaseRows("services");
      await deleteSupabaseRows("clients");
      await deleteSupabaseRows("products");
      await deleteSupabaseRows("inventory_cycles");
      await deleteSupabaseRows("invoice_sequences");
      await syncUsersToSupabase(syncSnapshot.users ?? []);

      await insertSupabaseRows("products", syncSnapshot.products);
      await insertSupabaseRows("services", syncSnapshot.services);
      await insertSupabaseRows("clients", syncSnapshot.clients);
      await insertSupabaseRows("expenses", syncSnapshot.expenses ?? []);
      await insertSupabaseRows("inventory_cycles", syncSnapshot.inventoryCycles);
      await insertSupabaseRows("invoice_sequences", syncSnapshot.invoiceSequences);
      await insertSupabaseRows("initial_stocks", syncSnapshot.initialStocks);
      await insertSupabaseRows("replenishments", syncSnapshot.replenishments);
      await insertSupabaseRows("sales", syncSnapshot.sales);
      await insertSupabaseRows("sale_items", syncSnapshot.saleItems);
      await insertSupabaseRows("sale_service_items", syncSnapshot.saleServiceItems);
      await insertSupabaseRows("stock_movements", syncSnapshot.stockMovements);
      await insertSupabaseRows("audit_logs", syncSnapshot.auditLogs);

      const syncedAt = new Date().toISOString();
      await window.desktopApi.markSyncComplete(syncedAt);
      return this.getSyncStatus();
    } catch (error) {
      throw normalizeSupabaseSyncError(error);
    }
  },

  async pullCloudToDesktop(): Promise<SyncStatus> {
    try {
      if (!window.desktopApi) {
        throw new Error("La synchronisation cloud vers local est reservee a l'application desktop.");
      }

      if (!supabase) {
        throw new Error("Supabase n'est pas configure sur cette application.");
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("Aucune connexion internet disponible pour recuperer les donnees du cloud.");
      }

      await assertSupabaseSyncSchema();
      const cloudSnapshot = await getCloudSnapshot();
      const cloudLastChangeAt = await getCloudLastChangeAt();
      await window.desktopApi.importSyncSnapshot(cloudSnapshot);
      await window.desktopApi.markSyncComplete(cloudLastChangeAt ?? new Date().toISOString());
      return this.getSyncStatus();
    } catch (error) {
      throw normalizeSupabaseSyncError(error);
    }
  },

  async listProducts(): Promise<Product[]> {
    if (window.desktopApi) {
      return window.desktopApi.listProducts();
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const productsResult = await client
        .from("products")
        .select("id, code, name, category, purchase_price, selling_price, unit, alert_threshold, supplier, updated_at")
        .order("updated_at", { ascending: false });
      const stockResult = await client
        .from("current_stock_view")
        .select("product_id, current_stock");

      const products = ensureData(productsResult.data, productsResult.error) as SupabaseProductRow[];
      const stocks = ensureData(stockResult.data, stockResult.error) as Array<{ product_id: number; current_stock: number }>;
      const stockMap = new Map(stocks.map((row) => [row.product_id, Number(row.current_stock)]));

      return products.map((row) => mapSupabaseProduct(row, stockMap.get(row.id) ?? 0));
    }

    return loadJson("walikale-web-products", webSeedProducts);
  },

  async saveProduct(draft: ProductDraft): Promise<Product[]> {
    if (window.desktopApi) {
      return window.desktopApi.saveProduct(draft);
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const cycleId = await getCurrentSupabaseInventoryCycleId();
      const trimmedName = draft.name.trim();
      const trimmedSupplier = draft.supplier.trim();
      const normalizedProduct = {
        code: draft.code?.trim() || `PAP-${Date.now().toString().slice(-4)}`,
        name: trimmedName,
        category: draft.category?.trim() || "General",
        purchase_price: Number(draft.purchasePrice),
        selling_price: Number(draft.sellingPrice),
        unit: draft.unit?.trim() || "piece",
        alert_threshold: Number(draft.alertThreshold ?? 0),
        supplier: trimmedSupplier,
      };

      const existingResult = await client
        .from("products")
        .select("id, name")
        .ilike("name", trimmedName)
        .limit(1)
        .maybeSingle();
      if (existingResult.error) {
        throw new Error(existingResult.error.message || "Impossible de verifier le produit existant.");
      }
      const existing = existingResult.data as { id: number; name: string } | null;

      if (existing) {
        const updateResult = await client
          .from("products")
          .update(normalizedProduct)
          .eq("id", existing.id);
        ensureData(updateResult.data ?? [], updateResult.error);

        const replenishmentResult = await client
          .from("replenishments")
          .insert({
            product_id: existing.id,
            quantity: Number(draft.quantity),
            purchase_price: Number(draft.purchasePrice),
            supplier: trimmedSupplier,
            cycle_id: cycleId,
            note: "Reapprovisionnement",
          })
          .select("id")
          .single();
        const replenishment = ensureData(replenishmentResult.data, replenishmentResult.error) as { id: number };

        const stockMovementResult = await client.from("stock_movements").insert({
          product_id: existing.id,
          movement_type: "reapprovisionnement",
          quantity: Number(draft.quantity),
          source_table: "replenishments",
          source_id: replenishment.id,
          cycle_id: cycleId,
        });
        ensureData(stockMovementResult.data ?? [], stockMovementResult.error);

        await insertSupabaseAuditLog(client, {
          action: "update",
          target_table: "products",
          target_id: existing.id,
          details: `Mise a jour produit ${trimmedName}`,
        });
      } else {
        const insertResult = await client
          .from("products")
          .insert(normalizedProduct)
          .select("id")
          .single();
        const insertedProduct = ensureData(insertResult.data, insertResult.error) as { id: number };

        const initialStockResult = await client
          .from("initial_stocks")
          .insert({
            product_id: insertedProduct.id,
            quantity: Number(draft.quantity),
            purchase_price: Number(draft.purchasePrice),
            cycle_id: cycleId,
            note: "Stock initial",
          })
          .select("id")
          .single();
        const initialStock = ensureData(initialStockResult.data, initialStockResult.error) as { id: number };

        const stockMovementResult = await client.from("stock_movements").insert({
          product_id: insertedProduct.id,
          movement_type: "stock_initial",
          quantity: Number(draft.quantity),
          source_table: "initial_stocks",
          source_id: initialStock.id,
          cycle_id: cycleId,
        });
        ensureData(stockMovementResult.data ?? [], stockMovementResult.error);

        await insertSupabaseAuditLog(client, {
          action: "create",
          target_table: "products",
          target_id: insertedProduct.id,
          details: `Creation produit ${trimmedName}`,
        });
      }

      return this.listProducts();
    }

    const products = loadJson("walikale-web-products", webSeedProducts);
    const history = loadJson("walikale-web-history", webSeedHistory);
    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    const existing = products.find((item) => item.name.toLowerCase() === draft.name.toLowerCase());

    if (existing) {
      existing.code = draft.code || existing.code;
      existing.category = draft.category || existing.category;
      existing.purchasePrice = draft.purchasePrice;
      existing.sellingPrice = draft.sellingPrice;
      existing.quantity = draft.quantity;
      existing.unit = draft.unit || existing.unit;
      existing.alertThreshold = draft.alertThreshold ?? existing.alertThreshold;
      existing.supplier = draft.supplier;
      existing.updatedAt = new Date().toISOString();
    } else {
      products.unshift({
        id: Date.now(),
        code: draft.code || `PAP-${Date.now().toString().slice(-4)}`,
        name: draft.name,
        category: draft.category || "General",
        purchasePrice: draft.purchasePrice,
        sellingPrice: draft.sellingPrice,
        quantity: draft.quantity,
        unit: draft.unit || "piece",
        alertThreshold: draft.alertThreshold ?? 0,
        supplier: draft.supplier,
        updatedAt: new Date().toISOString(),
      });
    }

    history.unshift({
      id: Date.now(),
      date: new Date().toLocaleDateString("fr-FR"),
      product: draft.name,
      quantity: draft.quantity,
      supplier: draft.supplier,
      purchasePrice: draft.purchasePrice,
      sellingPrice: draft.sellingPrice,
      amount: draft.purchasePrice * draft.quantity,
      movementType: existing ? "reapprovisionnement" : "stock_initial",
    });

    persistWeb(products, history);
    activityHistory.unshift({
      id: Date.now() + 1,
      date: new Date().toLocaleString("fr-FR"),
      action: existing ? "Mise a jour" : "Creation",
      target: existing ? `Produit #${existing.id}` : "Produit",
      details: `${existing ? "Mise a jour" : "Creation"} produit ${draft.name}`,
      user: "Utilisateur web",
    });
    persistWebActivityHistory(activityHistory);
    return products;
  },

  async deleteProduct(id: number): Promise<Product[]> {
    if (window.desktopApi) {
      return window.desktopApi.deleteProduct(id);
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      await insertSupabaseAuditLog(client, {
        action: "delete",
        target_table: "products",
        target_id: id,
        details: "Suppression produit",
      });

      const deleteResult = await client.from("products").delete().eq("id", id);
      ensureData(deleteResult.data ?? [], deleteResult.error);
      return this.listProducts();
    }

    const products = loadJson("walikale-web-products", webSeedProducts).filter((item) => item.id !== id);
    const history = loadJson("walikale-web-history", webSeedHistory);
    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    persistWeb(products, history);
    activityHistory.unshift({
      id: Date.now(),
      date: new Date().toLocaleString("fr-FR"),
      action: "Suppression",
      target: `Produit #${id}`,
      details: "Suppression produit",
      user: "Utilisateur web",
    });
    persistWebActivityHistory(activityHistory);
    return products;
  },

  async listServices(): Promise<Service[]> {
    if (window.desktopApi) {
      return window.desktopApi.listServices();
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const result = await client
        .from("services")
        .select("id, name, category, unit_price, description, active, created_at, updated_at")
        .order("updated_at", { ascending: false });
      const rows = ensureData(result.data, result.error) as SupabaseServiceRow[];
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        unitPrice: Number(row.unit_price),
        description: row.description,
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }

    return loadJson("walikale-web-services", webSeedServices);
  },

  async saveService(draft: ServiceDraft): Promise<Service[]> {
    if (window.desktopApi) {
      return window.desktopApi.saveService(draft);
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
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

      const existingResult = await client.from("services").select("id").ilike("name", normalizedName).limit(1).maybeSingle();
      const existing = ensureOptionalData(existingResult.data, existingResult.error) as { id: number } | null;

      if (existing) {
        const updateResult = await client
          .from("services")
          .update({
            category: normalizedCategory,
            unit_price: unitPrice,
            description: normalizedDescription,
            active: draft.active !== false,
          })
          .eq("id", existing.id);
        ensureData(updateResult.data ?? [], updateResult.error);

        await insertSupabaseAuditLog(client, {
          action: "update",
          target_table: "services",
          target_id: existing.id,
          details: `Mise a jour service ${normalizedName}`,
        });
      } else {
        const insertResult = await client
          .from("services")
          .insert({
            name: normalizedName,
            category: normalizedCategory,
            unit_price: unitPrice,
            description: normalizedDescription,
            active: draft.active !== false,
          })
          .select("id")
          .single();
        const inserted = ensureData(insertResult.data, insertResult.error) as { id: number };

        await insertSupabaseAuditLog(client, {
          action: "create",
          target_table: "services",
          target_id: inserted.id,
          details: `Creation service ${normalizedName}`,
        });
      }

      return this.listServices();
    }

    const services = loadJson("walikale-web-services", webSeedServices);
    const normalizedName = draft.name.trim();
    const existing = services.find((item) => item.name.toLowerCase() === normalizedName.toLowerCase());

    if (existing) {
      existing.category = draft.category.trim() || "Service general";
      existing.unitPrice = Number(draft.unitPrice);
      existing.description = draft.description.trim();
      existing.active = draft.active !== false;
      existing.updatedAt = new Date().toISOString();
    } else {
      services.unshift({
        id: Date.now(),
        name: normalizedName,
        category: draft.category.trim() || "Service general",
        unitPrice: Number(draft.unitPrice),
        description: draft.description.trim(),
        active: draft.active !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    persistWebServices(services);
    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    activityHistory.unshift({
      id: Date.now(),
      date: new Date().toLocaleString("fr-FR"),
      action: existing ? "Mise a jour" : "Creation",
      target: "Service",
      details: `${existing ? "Mise a jour" : "Creation"} service ${normalizedName}`,
      user: "Utilisateur web",
    });
    persistWebActivityHistory(activityHistory);
    return services;
  },

  async listSales(): Promise<SaleRecord[]> {
    if (window.desktopApi) {
      return window.desktopApi.listSales();
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const salesResult = await client
        .from("sales")
        .select("id, reference, sold_at, total_amount, payment_method, client_id, client:clients(name)")
        .order("id", { ascending: false });
      const [itemsResult, serviceItemsResult] = await Promise.all([
        client.from("sale_items").select("sale_id"),
        client.from("sale_service_items").select("sale_id"),
      ]);

      const salesRows = ensureData(salesResult.data, salesResult.error) as SupabaseSaleRow[];
      const itemsRows = ensureData(itemsResult.data, itemsResult.error) as Array<{ sale_id: number }>;
      const serviceItemsRows = ensureData(serviceItemsResult.data, serviceItemsResult.error) as Array<{ sale_id: number }>;
      const itemsCountMap = itemsRows.reduce((map, row) => {
        map.set(row.sale_id, (map.get(row.sale_id) ?? 0) + 1);
        return map;
      }, new Map<number, number>());
      serviceItemsRows.forEach((row) => {
        itemsCountMap.set(row.sale_id, (itemsCountMap.get(row.sale_id) ?? 0) + 1);
      });

      return salesRows.map((row) => ({
        id: row.id,
        reference: row.reference,
        clientName: relationFirst(row.client)?.name ?? "Client comptoir",
        date: formatFrenchDate(row.sold_at),
        amount: Number(row.total_amount),
        paymentMethod: row.payment_method,
        status: "Payee",
        itemsCount: itemsCountMap.get(row.id) ?? 0,
      }));
    }

    return loadJson("walikale-web-sales", webSeedSales);
  },

  async getSaleDetail(saleId: number): Promise<SaleDetail | null> {
    if (window.desktopApi) {
      return window.desktopApi.getSaleDetail(saleId);
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const saleResult = await client
        .from("sales")
        .select("id, reference, sold_at, total_amount, payment_method, client_id, client:clients(name)")
        .eq("id", saleId)
        .maybeSingle();
      const sale = ensureOptionalData(saleResult.data, saleResult.error) as SupabaseSaleRow | null;

      if (!sale) {
        return null;
      }

      const itemsResult = await client
        .from("sale_items")
        .select("sale_id, product_id, quantity, unit_price, line_total, product:products(name)")
        .eq("sale_id", saleId)
        .order("id", { ascending: true });
      const serviceItemsResult = await client
        .from("sale_service_items")
        .select("sale_id, service_id, quantity, unit_price, line_total, service:services(name, category)")
        .eq("sale_id", saleId)
        .order("id", { ascending: true });
      const items = ensureData(itemsResult.data, itemsResult.error) as SupabaseSaleItemRow[];
      const serviceItems = ensureData(serviceItemsResult.data, serviceItemsResult.error) as SupabaseSaleServiceItemRow[];

      return {
        id: sale.id,
        reference: sale.reference,
        clientName: relationFirst(sale.client)?.name ?? "Client comptoir",
        date: formatFrenchDate(sale.sold_at),
        amount: Number(sale.total_amount),
        paymentMethod: sale.payment_method,
        status: "Payee",
        items: [
          ...items.map((item) => ({
            lineType: "product" as const,
            productId: item.product_id,
            productName: relationFirst(item.product)?.name ?? "Produit",
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            lineTotal: Number(item.line_total),
          })),
          ...serviceItems.map((item) => ({
            lineType: "service" as const,
            serviceId: item.service_id,
            productName: relationFirst(item.service)?.name ?? "Service",
            category: relationFirst(item.service)?.category ?? "Service",
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            lineTotal: Number(item.line_total),
          })),
        ],
      };
    }

    const details = loadJson("walikale-web-sale-details", webSeedSaleDetails);
    return details.find((item) => item.id === saleId) ?? null;
  },

  async printSaleInvoice(saleId: number): Promise<boolean> {
    if (window.desktopApi) {
      return window.desktopApi.printSaleInvoice(saleId);
    }

    const detail = await this.getSaleDetail(saleId);
    if (!detail) {
      return false;
    }

    window.print();
    return true;
  },

  async exportSalePdf(saleId: number): Promise<string | null> {
    if (window.desktopApi) {
      return window.desktopApi.exportSalePdf(saleId);
    }

    const detail = await this.getSaleDetail(saleId);
    if (!detail) {
      return null;
    }

    window.print();
    return "Utilisez le dialogue d'impression du navigateur pour enregistrer en PDF.";
  },

  async printSaleReceipt(saleId: number): Promise<boolean> {
    if (window.desktopApi) {
      return window.desktopApi.printSaleReceipt(saleId);
    }

    const detail = await this.getSaleDetail(saleId);
    if (!detail) {
      return false;
    }

    window.print();
    return true;
  },

  async exportSaleReceiptPdf(saleId: number): Promise<string | null> {
    if (window.desktopApi) {
      return window.desktopApi.exportSaleReceiptPdf(saleId);
    }

    const detail = await this.getSaleDetail(saleId);
    if (!detail) {
      return null;
    }

    window.print();
    return "Utilisez le dialogue d'impression du navigateur pour enregistrer le ticket en PDF.";
  },

  async createSale(draft: SaleDraft): Promise<SaleRecord[]> {
    if (window.desktopApi) {
      return window.desktopApi.createSale(draft);
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const cycleId = await getCurrentSupabaseInventoryCycleId();

      if (draft.items.length === 0 && draft.serviceItems.length === 0) {
        throw new Error("Ajoutez au moins un produit ou un service a la facture.");
      }

      const mergedItems = mergeSaleItems(draft.items);
      const mergedServiceItems = mergeSaleServiceItems(draft.serviceItems);
      const productIds = mergedItems.map((item) => item.productId);
      const serviceIds = mergedServiceItems.map((item) => item.serviceId);
      const [productsResult, stockResult, servicesResult] = await Promise.all([
        productIds.length > 0
          ? client.from("products").select("id, name, selling_price, unit").in("id", productIds)
          : Promise.resolve({ data: [], error: null }),
        productIds.length > 0
          ? client.from("current_stock_view").select("product_id, current_stock").in("product_id", productIds)
          : Promise.resolve({ data: [], error: null }),
        serviceIds.length > 0
          ? client.from("services").select("id, name, category, unit_price, active").in("id", serviceIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const productRows = ensureData(productsResult.data, productsResult.error) as Array<{ id: number; name: string; selling_price: number; unit: string }>;
      const stockRows = ensureData(stockResult.data, stockResult.error) as Array<{ product_id: number; current_stock: number }>;
      const serviceRows = ensureData(servicesResult.data, servicesResult.error) as Array<{ id: number; name: string; category: string; unit_price: number; active: boolean }>;
      const productMap = new Map(productRows.map((row) => [row.id, row]));
      const stockMap = new Map(stockRows.map((row) => [row.product_id, Number(row.current_stock)]));
      const serviceMap = new Map(serviceRows.map((row) => [row.id, row]));

      let totalAmount = 0;
      const saleItemsPayload = mergedItems.map((item) => {
        const product = productMap.get(item.productId);
        const availableStock = stockMap.get(item.productId) ?? 0;

        if (!product) {
          throw new Error("Un produit de la facture est introuvable.");
        }

        if (availableStock < item.quantity) {
          throw new Error(`Stock insuffisant pour ${product.name}.`);
        }

        const unitPrice = Number(product.selling_price);
        const lineTotal = unitPrice * item.quantity;
        totalAmount += lineTotal;

        return {
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: unitPrice,
          line_total: lineTotal,
        };
      });
      const saleServiceItemsPayload = mergedServiceItems.map((item) => {
        const service = serviceMap.get(item.serviceId);

        if (!service) {
          throw new Error("Un service de la facture est introuvable.");
        }

        if (!service.active) {
          throw new Error(`Le service ${service.name} est inactif.`);
        }

        const unitPrice = Number(service.unit_price);
        const lineTotal = unitPrice * item.quantity;
        totalAmount += lineTotal;

        return {
          service_id: item.serviceId,
          quantity: item.quantity,
          unit_price: unitPrice,
          line_total: lineTotal,
        };
      });

      const currentYear = getCurrentInvoiceYear();
      const sequenceResult = await client
        .from("invoice_sequences")
        .select("current_year, series_index, next_number")
        .eq("id", 1)
        .maybeSingle();
      let sequence = ensureOptionalData(sequenceResult.data, sequenceResult.error) as SupabaseInvoiceSequenceRow | null;

      if (!sequence) {
        const insertSequenceResult = await client
          .from("invoice_sequences")
          .insert({
            id: 1,
            current_year: currentYear,
            series_index: 0,
            next_number: 1,
          })
          .select("current_year, series_index, next_number")
          .single();
        sequence = ensureData(insertSequenceResult.data, insertSequenceResult.error) as SupabaseInvoiceSequenceRow;
      } else if (sequence.current_year !== currentYear) {
        const resetSequenceResult = await client
          .from("invoice_sequences")
          .update({
            current_year: currentYear,
            series_index: 0,
            next_number: 1,
          })
          .eq("id", 1)
          .select("current_year, series_index, next_number")
          .single();
        sequence = ensureData(resetSequenceResult.data, resetSequenceResult.error) as SupabaseInvoiceSequenceRow;
      }

      const reference = buildInvoiceReference(sequence.current_year, sequence.series_index, sequence.next_number);
      const saleInsertResult = await client
        .from("sales")
        .insert({
          reference,
          client_id: draft.clientId,
          total_amount: totalAmount,
          payment_method: draft.paymentMethod,
          cycle_id: cycleId,
        })
        .select("id")
        .single();
      const insertedSale = ensureData(saleInsertResult.data, saleInsertResult.error) as { id: number };

      const advanceSequenceResult = await client
        .from("invoice_sequences")
        .update({
          next_number: sequence.next_number + 1,
        })
        .eq("id", 1);
      ensureData(advanceSequenceResult.data ?? [], advanceSequenceResult.error);

      const saleItemsResult = await client.from("sale_items").insert(
        saleItemsPayload.map((item) => ({
          sale_id: insertedSale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
        }))
      );
      ensureData(saleItemsResult.data ?? [], saleItemsResult.error);

      if (saleServiceItemsPayload.length > 0) {
        const saleServiceItemsResult = await client.from("sale_service_items").insert(
          saleServiceItemsPayload.map((item) => ({
            sale_id: insertedSale.id,
            service_id: item.service_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total,
          }))
        );
        ensureData(saleServiceItemsResult.data ?? [], saleServiceItemsResult.error);
      }

      if (saleItemsPayload.length > 0) {
        const movementsResult = await client.from("stock_movements").insert(
          saleItemsPayload.map((item) => ({
            product_id: item.product_id,
            movement_type: "vente",
            quantity: -item.quantity,
            source_table: "sales",
            source_id: insertedSale.id,
            cycle_id: cycleId,
          }))
        );
        ensureData(movementsResult.data ?? [], movementsResult.error);
      }

      await insertSupabaseAuditLog(client, {
        action: "create",
        target_table: "sales",
        target_id: insertedSale.id,
        details: `Vente ${reference} avec ${saleItemsPayload.length + saleServiceItemsPayload.length} ligne(s)`,
      });

      return this.listSales();
    }

    if (draft.items.length === 0 && draft.serviceItems.length === 0) {
      throw new Error("Ajoutez au moins un produit ou un service a la facture.");
    }

    const products = loadJson("walikale-web-products", webSeedProducts);
    const services = loadJson("walikale-web-services", webSeedServices);
    const history = loadJson("walikale-web-history", webSeedHistory);
    const sales = loadJson("walikale-web-sales", webSeedSales);
    const saleDetails = loadJson("walikale-web-sale-details", webSeedSaleDetails);
    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    const clients = loadJson("walikale-web-clients", webSeedClients);
    const invoiceSeries = loadWebInvoiceSeries();
    const client = clients.find((item) => item.id === draft.clientId);
    const mergedItems = mergeSaleItems(draft.items);
    const mergedServiceItems = mergeSaleServiceItems(draft.serviceItems);
    let amount = 0;
    const detailItems: SaleDetail["items"] = [];

    mergedItems.forEach((line) => {
      const product = products.find((item) => item.id === line.productId);
      if (!product) {
        throw new Error("Un produit de la facture est introuvable.");
      }

      if (product.quantity < line.quantity) {
        throw new Error(`Stock insuffisant pour ${product.name}.`);
      }

      product.quantity -= line.quantity;
      const lineTotal = product.sellingPrice * line.quantity;
      amount += lineTotal;
      detailItems.push({
        lineType: "product",
        productId: product.id,
        productName: product.name,
        category: product.category,
        quantity: line.quantity,
        unitPrice: product.sellingPrice,
        lineTotal,
      });

      history.unshift({
        id: Date.now() + line.productId,
        date: new Date().toLocaleDateString("fr-FR"),
        product: product.name,
        quantity: line.quantity,
        supplier: client?.name || "Client comptoir",
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        amount: lineTotal,
        movementType: "vente",
      });
    });

    mergedServiceItems.forEach((line) => {
      const service = services.find((item) => item.id === line.serviceId);
      if (!service) {
        throw new Error("Un service de la facture est introuvable.");
      }

      if (!service.active) {
        throw new Error(`Le service ${service.name} est inactif.`);
      }

      const lineTotal = service.unitPrice * line.quantity;
      amount += lineTotal;
      detailItems.push({
        lineType: "service",
        serviceId: service.id,
        productName: service.name,
        category: service.category,
        quantity: line.quantity,
        unitPrice: service.unitPrice,
        lineTotal,
      });
    });

    const saleId = Date.now();
    const reference = invoiceSeries.nextReference;

    sales.unshift({
      id: saleId,
      reference,
      clientName: client?.name || "Client comptoir",
      date: new Date().toLocaleDateString("fr-FR"),
      amount,
      paymentMethod: draft.paymentMethod,
      status: "Payee",
      itemsCount: mergedItems.length + mergedServiceItems.length,
    });

    saleDetails.unshift({
      id: saleId,
      reference,
      clientName: client?.name || "Client comptoir",
      date: new Date().toLocaleDateString("fr-FR"),
      amount,
      paymentMethod: draft.paymentMethod,
      status: "Payee",
      items: detailItems,
    });

    persistWeb(products, history, sales, saleDetails);
    persistWebServices(services);
    persistWebInvoiceSeries(buildInvoiceSeriesInfo(invoiceSeries.year, getInvoiceSeriesIndex(invoiceSeries.seriesLabel), invoiceSeries.nextNumber + 1));
    activityHistory.unshift({
      id: Date.now() + 2,
      date: new Date().toLocaleString("fr-FR"),
      action: "Creation",
      target: `Vente #${saleId}`,
      details: `Vente ${reference} avec ${detailItems.length} ligne(s)`,
      user: "Utilisateur web",
    });
    persistWebActivityHistory(activityHistory);
    return sales;
  },

  async getSupplyHistory(): Promise<SupplyHistoryItem[]> {
    if (window.desktopApi) {
      return window.desktopApi.getSupplyHistory();
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const cycleId = await getCurrentSupabaseInventoryCycleId();
      const movementsResult = await client
        .from("stock_movements")
        .select("id, movement_type, quantity, movement_date, source_table, source_id, product_id, product:products(name, supplier, selling_price, purchase_price)")
        .eq("cycle_id", cycleId)
        .order("id", { ascending: false })
        .limit(100);
      const salesResult = await client
        .from("sales")
        .select("id, client_id, client:clients(name)");
      const rows = ensureData(movementsResult.data, movementsResult.error) as SupabaseHistoryRow[];
      const salesRows = ensureData(salesResult.data, salesResult.error) as Array<{
        id: number;
        client_id: number | null;
        client?: { name: string | null } | Array<{ name: string | null }> | null;
      }>;
      const salesMap = new Map(salesRows.map((row) => [row.id, row]));

      return rows.map((row) => {
        const sale = row.source_table === "sales" && row.source_id ? salesMap.get(row.source_id) : null;
        const isSale = row.movement_type === "vente";
        const product = relationFirst(row.product);
        const saleClient = relationFirst(sale?.client);
        const price = isSale ? Number(product?.selling_price ?? 0) : Number(product?.purchase_price ?? 0);

        return {
          id: row.id,
          date: formatFrenchDate(row.movement_date),
          product: product?.name ?? "Produit",
          quantity: Math.abs(row.quantity),
          supplier: isSale ? saleClient?.name ?? "Client comptoir" : product?.supplier ?? "",
          purchasePrice: Number(product?.purchase_price ?? 0),
          sellingPrice: Number(product?.selling_price ?? 0),
          amount: Math.abs(row.quantity) * price,
          movementType: row.movement_type,
        };
      });
    }

    return loadJson("walikale-web-history", webSeedHistory);
  },

  async getActivityHistory(): Promise<ActivityHistoryItem[]> {
    if (window.desktopApi) {
      return window.desktopApi.getActivityHistory();
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const result = await client
        .from("audit_logs")
        .select("id, action, target_table, target_id, details, created_at, user_id, actor_name, actor_username, source_device, source_platform, user:users(full_name)")
        .order("created_at", { ascending: false })
        .limit(300);
      const rows = ensureData(result.data, result.error) as SupabaseAuditLogRow[];

      return rows.map((row) => ({
        id: row.id,
        date: formatFrenchDateTime(row.created_at),
        action:
          row.action === "create" ? "Creation" : row.action === "update" ? "Mise a jour" : row.action === "delete" ? "Suppression" : row.action,
        target: row.target_id ? `${row.target_table} #${row.target_id}` : row.target_table,
        details: row.details ?? "",
        user: formatAuditActorLabel(row),
      }));
    }

    return loadJson("walikale-web-activity-history", webSeedActivityHistory);
  },

  async listExpenses(): Promise<ExpenseItem[]> {
    if (window.desktopApi) {
      return window.desktopApi.listExpenses();
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const result = await client
        .from("expenses")
        .select("id, detail, nature, amount, expense_date, approved_by, purpose, user_id, user:users(full_name)")
        .order("expense_date", { ascending: false });
      const rows = ensureData(result.data, result.error) as SupabaseExpenseRow[];

      return rows.map((row) => ({
        id: row.id,
        detail: row.detail,
        nature: row.nature,
        amount: Number(row.amount),
        date: formatFrenchDateTime(row.expense_date),
        requestedBy: relationFirst(row.user)?.full_name ?? "Utilisateur non precise",
        approvedBy: row.approved_by,
        purpose: row.purpose,
      }));
    }

    return loadJson("walikale-web-expenses", webSeedExpenses);
  },

  async saveExpense(draft: ExpenseDraft): Promise<ExpenseItem[]> {
    if (window.desktopApi) {
      return window.desktopApi.saveExpense(draft);
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const currentProfile = await getSupabaseSessionProfile();

      if (!currentProfile) {
        throw new Error("Aucune session utilisateur active.");
      }

      const amount = Number(draft.amount);
      if (!draft.detail.trim() || !draft.nature.trim() || !draft.approvedBy.trim() || !draft.purpose.trim()) {
        throw new Error("Tous les champs de depense sont obligatoires.");
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Le montant de la depense doit etre superieur a zero.");
      }

      const insertResult = await client.from("expenses").insert({
        detail: draft.detail.trim(),
        nature: draft.nature.trim(),
        amount,
        expense_date: draft.date?.trim() ? new Date(draft.date).toISOString() : new Date().toISOString(),
        user_id: currentProfile.id,
        approved_by: draft.approvedBy.trim(),
        purpose: draft.purpose.trim(),
      });
      ensureData(insertResult.data ?? [], insertResult.error);

      await insertSupabaseAuditLog(client, {
        action: "create",
        target_table: "expenses",
        details: `Depense engagee ${draft.nature.trim()} - ${amount} FC - ${draft.purpose.trim()}`,
      });

      return this.listExpenses();
    }

    const expenses = loadJson("walikale-web-expenses", webSeedExpenses);
    expenses.unshift({
      id: Date.now(),
      detail: draft.detail.trim(),
      nature: draft.nature.trim(),
      amount: Number(draft.amount),
      date: formatFrenchDateTime(draft.date?.trim() ? new Date(draft.date).toISOString() : new Date().toISOString()),
      requestedBy: "Utilisateur web",
      approvedBy: draft.approvedBy.trim(),
      purpose: draft.purpose.trim(),
    });
    persistWebExpenses(expenses);
    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    activityHistory.unshift({
      id: Date.now() + 4,
      date: new Date().toLocaleString("fr-FR"),
      action: "Creation",
      target: "Depense",
      details: `Depense engagee ${draft.nature.trim()} - ${Number(draft.amount)} FC - ${draft.purpose.trim()}`,
      user: "Utilisateur web",
    });
    persistWebActivityHistory(activityHistory);
    return expenses;
  },

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    if (window.desktopApi) {
      return window.desktopApi.getDashboardMetrics();
    }

    if (isSupabaseEnabled()) {
      const [products, sales, expenses] = await Promise.all([this.listProducts(), this.listSales(), this.listExpenses()]);
      const totalSalesAmount = sales.reduce((sum, item) => sum + item.amount, 0);
      const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
      return {
        totalStock: products.reduce((sum, item) => sum + item.quantity, 0),
        totalProducts: products.length,
        dailySales: sales.length,
        suppliers: new Set(products.map((item) => item.supplier)).size,
        totalSalesAmount,
        totalExpenses,
        netSalesAmount: totalSalesAmount - totalExpenses,
      };
    }

    return computeMetrics(loadJson("walikale-web-products", webSeedProducts));
  },

  async listClients(): Promise<Client[]> {
    if (window.desktopApi) {
      return window.desktopApi.listClients();
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const result = await client
        .from("clients")
        .select("id, name, phone, address, email, created_at")
        .order("name", { ascending: true });
      const rows = ensureData(result.data, result.error) as SupabaseClientRow[];
      return rows.map(mapSupabaseClient);
    }

    return loadJson("walikale-web-clients", webSeedClients);
  },

  async saveClient(draft: ClientDraft): Promise<Client[]> {
    if (window.desktopApi) {
      return window.desktopApi.saveClient(draft);
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const insertResult = await client.from("clients").insert({
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        address: draft.address.trim(),
        email: draft.email.trim(),
      });
      ensureData(insertResult.data ?? [], insertResult.error);

      await insertSupabaseAuditLog(client, {
        action: "create",
        target_table: "clients",
        details: `Creation client ${draft.name.trim()}`,
      });

      return this.listClients();
    }

    const clients = loadJson("walikale-web-clients", webSeedClients);
    clients.unshift({
      id: Date.now(),
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      email: draft.email.trim(),
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("walikale-web-clients", JSON.stringify(clients));
    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    activityHistory.unshift({
      id: Date.now(),
      date: new Date().toLocaleString("fr-FR"),
      action: "Creation",
      target: "Client",
      details: `Creation client ${draft.name.trim()}`,
      user: "Utilisateur web",
    });
    persistWebActivityHistory(activityHistory);
    return clients;
  },

  async listUsers(): Promise<AppUser[]> {
    if (window.desktopApi) {
      return window.desktopApi.listUsers();
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const result = await client
        .from("users")
        .select("id, auth_user_id, full_name, username, email, role, active, created_at, last_login_at")
        .order("created_at", { ascending: false });
      const rows = ensureData(result.data, result.error) as SupabaseUserRow[];
      return rows.map(mapSupabaseUser);
    }

    return loadJson("walikale-web-users", webSeedUsers);
  },

  async saveUser(draft: UserDraft): Promise<AppUser[]> {
    if (window.desktopApi) {
      return window.desktopApi.saveUser(draft);
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const fullName = draft.fullName.trim();
      const normalizedEmail = draft.email.trim().toLowerCase();
      const normalizedUsername = draft.username.trim().toLowerCase();
      const password = draft.password.trim();

      if (!fullName || !normalizedEmail || !normalizedUsername || !password) {
        throw new Error("Tous les champs utilisateur sont obligatoires.");
      }

      if (password.length < 6) {
        throw new Error("Le mot de passe doit contenir au moins 6 caracteres.");
      }

      const previousSessionResult = await client.auth.getSession();
      const previousSession = previousSessionResult.data.session;
      const signUpResult = await client.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            username: normalizedUsername,
            role: draft.role,
          },
        },
      });

      if (signUpResult.error) {
        throw new Error(signUpResult.error.message || "Impossible de creer le compte Supabase.");
      }

      const authUserId = signUpResult.data.user?.id;

      if (!authUserId) {
        throw new Error("Le compte Supabase n'a pas renvoye d'identifiant utilisateur.");
      }

      if (previousSession && signUpResult.data.session) {
        const restoreResult = await client.auth.setSession({
          access_token: previousSession.access_token,
          refresh_token: previousSession.refresh_token,
        });

        if (restoreResult.error) {
          throw new Error("Le compte a ete cree, mais la session administrateur n'a pas pu etre restauree.");
        }
      }

      const insertResult = await client
        .from("users")
        .insert({
          auth_user_id: authUserId,
          full_name: fullName,
          username: normalizedUsername,
          email: normalizedEmail,
          role: draft.role,
          active: true,
          created_at: new Date().toISOString(),
        });

      if (insertResult.error) {
        throw new Error(insertResult.error.message || "Le profil utilisateur n'a pas pu etre cree.");
      }

      await insertSupabaseAuditLog(client, {
        action: "create",
        target_table: "users",
        details: `Creation utilisateur ${normalizedEmail}`,
      });

      return this.listUsers();
    }

    const users = loadJson("walikale-web-users", webSeedUsers);
    const normalizedEmail = draft.email.trim().toLowerCase();
    const normalizedUsername = draft.username.trim().toLowerCase();

    if (!draft.fullName.trim() || !normalizedEmail || !normalizedUsername || !draft.password.trim()) {
      throw new Error("Tous les champs utilisateur sont obligatoires.");
    }

    if (draft.password.trim().length < 6) {
      throw new Error("Le mot de passe doit contenir au moins 6 caracteres.");
    }

    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      throw new Error("Cette adresse e-mail existe deja.");
    }

    if (users.some((user) => user.username.toLowerCase() === normalizedUsername)) {
      throw new Error("Ce nom d'utilisateur existe deja.");
    }

    const userId = Date.now();

    users.unshift({
      id: userId,
      fullName: draft.fullName.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      role: draft.role,
      active: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });

    persistWebUsers(users);
    const storedPasswords = loadJson("walikale-web-user-passwords", webUserPasswords);
    storedPasswords[userId] = draft.password.trim();
    localStorage.setItem("walikale-web-user-passwords", JSON.stringify(storedPasswords));
    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    activityHistory.unshift({
      id: Date.now(),
      date: new Date().toLocaleString("fr-FR"),
      action: "Creation",
      target: "Utilisateur",
      details: `Creation utilisateur ${normalizedEmail}`,
      user: "Utilisateur web",
    });
    persistWebActivityHistory(activityHistory);
    return users;
  },

  async authenticateUser(draft: LoginDraft): Promise<AppUser | null> {
    if (window.desktopApi) {
      const localUser = await window.desktopApi.authenticateUser(draft);
      if (localUser) {
        return localUser;
      }

      if (!supabase || (typeof navigator !== "undefined" && !navigator.onLine)) {
        return null;
      }

      const cloudSession = await authenticateWithSupabase(draft);
      if (!cloudSession) {
        return null;
      }

      return window.desktopApi.cacheCloudAuthenticatedUser({
        authUserId: cloudSession.authUserId,
        fullName: cloudSession.profile.fullName,
        username: cloudSession.profile.username,
        email: cloudSession.profile.email,
        role: cloudSession.profile.role,
        password: draft.password.trim(),
      });
    }

    if (isSupabaseEnabled()) {
      const cloudSession = await authenticateWithSupabase(draft);
      return cloudSession?.profile ?? null;
    }

    const identifier = draft.identifier.trim().toLowerCase();
    const password = draft.password.trim();
    const users = loadJson("walikale-web-users", webSeedUsers);
    const userPasswords = loadJson("walikale-web-user-passwords", webUserPasswords);
    const matchedUser = users.find(
      (user) => user.username.toLowerCase() === identifier || user.email.toLowerCase() === identifier
    );

    if (!matchedUser || userPasswords[matchedUser.id] !== password) {
      return null;
    }

    const updatedUser = { ...matchedUser, lastLoginAt: new Date().toISOString(), active: true };
    const nextUsers = users.map((user) => (user.id === updatedUser.id ? updatedUser : user));
    persistWebUsers(nextUsers);
    window.sessionStorage.setItem(webSessionStorageKey, String(updatedUser.id));
    return updatedUser;
  },

  async restoreUserSession(userId: number): Promise<AppUser | null> {
    if (window.desktopApi) {
      return window.desktopApi.restoreUserSession(userId);
    }

    if (isSupabaseEnabled()) {
      return getSupabaseSessionProfile();
    }

    const users = loadJson("walikale-web-users", webSeedUsers);
    const matchedUser = users.find((user) => user.id === userId) ?? null;

    if (matchedUser) {
      window.sessionStorage.setItem(webSessionStorageKey, String(matchedUser.id));
    }

    return matchedUser;
  },

  async logoutUser(): Promise<void> {
    if (window.desktopApi) {
      await window.desktopApi.logoutUser();
      return;
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const result = await client.auth.signOut();

      if (result.error) {
        throw new Error(result.error.message || "Deconnexion impossible.");
      }

      return;
    }

    window.sessionStorage.removeItem(webSessionStorageKey);
  },

  async changeUserPassword(draft: PasswordChangeDraft): Promise<AppUser[]> {
    if (window.desktopApi) {
      return window.desktopApi.changeUserPassword(draft);
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const currentProfile = await getSupabaseSessionProfile();

      if (!currentProfile) {
        throw new Error("Aucune session utilisateur active.");
      }

      if (draft.newPassword.trim().length < 6) {
        throw new Error("Le nouveau mot de passe doit contenir au moins 6 caracteres.");
      }

      if (draft.userId === currentProfile.id) {
        const result = await client.auth.updateUser({ password: draft.newPassword.trim() });

        if (result.error) {
          throw new Error(result.error.message || "Impossible de modifier le mot de passe.");
        }

        return this.listUsers();
      }

      const users = await this.listUsers();
      const targetUser = users.find((user) => user.id === draft.userId);

      if (!targetUser?.email) {
        throw new Error("Cet utilisateur n'a pas d'adresse e-mail valide pour la recuperation.");
      }

      const resetResult = await client.auth.resetPasswordForEmail(targetUser.email, {
        redirectTo: window.location.origin,
      });

      if (resetResult.error) {
        throw new Error(resetResult.error.message || "Impossible d'envoyer l'e-mail de reinitialisation.");
      }

      return users;
    }

    const users = loadJson("walikale-web-users", webSeedUsers);
    const userPasswords = loadJson("walikale-web-user-passwords", webUserPasswords);
    const targetUser = users.find((user) => user.id === draft.userId);

    if (!targetUser) {
      throw new Error("Utilisateur introuvable.");
    }

    if (draft.newPassword.trim().length < 6) {
      throw new Error("Le nouveau mot de passe doit contenir au moins 6 caracteres.");
    }

    userPasswords[draft.userId] = draft.newPassword.trim();
    localStorage.setItem("walikale-web-user-passwords", JSON.stringify(userPasswords));
    return users;
  },

  async setUserActive(userId: number, active: boolean): Promise<AppUser[]> {
    if (window.desktopApi) {
      return window.desktopApi.setUserActive(userId, active);
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const result = await client.from("users").update({ active }).eq("id", userId);

      if (result.error) {
        throw new Error(result.error.message || "Impossible de mettre a jour l'etat du compte.");
      }

      await insertSupabaseAuditLog(client, {
        action: "update",
        target_table: "users",
        target_id: userId,
        details: active ? "Reactivation du compte utilisateur" : "Desactivation du compte utilisateur",
      });

      return this.listUsers();
    }

    const users = loadJson("walikale-web-users", webSeedUsers).map((user) =>
      user.id === userId ? { ...user, active, lastLoginAt: active ? new Date().toISOString() : user.lastLoginAt } : user
    );
    persistWebUsers(users);
    return users;
  },

  async updateUserRole(userId: number, role: UserRole): Promise<AppUser[]> {
    if (window.desktopApi) {
      return window.desktopApi.updateUserRole(userId, role);
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const result = await client.from("users").update({ role }).eq("id", userId);

      if (result.error) {
        throw new Error(result.error.message || "Impossible de mettre a jour le role.");
      }

      await insertSupabaseAuditLog(client, {
        action: "update",
        target_table: "users",
        target_id: userId,
        details: `Changement de role vers ${role}`,
      });

      return this.listUsers();
    }

    const users = loadJson("walikale-web-users", webSeedUsers).map((user) =>
      user.id === userId ? { ...user, role } : user
    );

    persistWebUsers(users);
    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    activityHistory.unshift({
      id: Date.now(),
      date: new Date().toLocaleString("fr-FR"),
      action: "Mise a jour",
      target: `Utilisateur #${userId}`,
      details: `Changement de role vers ${role}`,
      user: "Utilisateur web",
    });
    persistWebActivityHistory(activityHistory);
    return users;
  },

  async refreshUserAccess(userId: number): Promise<AppUser[]> {
    if (window.desktopApi) {
      return window.desktopApi.refreshUserAccess(userId);
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const result = await client.from("users").update({ active: true }).eq("id", userId);

      if (result.error) {
        throw new Error(result.error.message || "Impossible de reactiver l'acces utilisateur.");
      }

      await insertSupabaseAuditLog(client, {
        action: "update",
        target_table: "users",
        target_id: userId,
        details: "Reinitialisation d'acces utilisateur",
      });

      return this.listUsers();
    }

    const users = loadJson("walikale-web-users", webSeedUsers).map((user) =>
      user.id === userId ? { ...user, active: true, lastLoginAt: new Date().toISOString() } : user
    );

    persistWebUsers(users);
    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    activityHistory.unshift({
      id: Date.now(),
      date: new Date().toLocaleString("fr-FR"),
      action: "Mise a jour",
      target: `Utilisateur #${userId}`,
      details: "Reinitialisation d'acces utilisateur",
      user: "Utilisateur web",
    });
    persistWebActivityHistory(activityHistory);
    return users;
  },

  async deleteUser(userId: number): Promise<AppUser[]> {
    if (window.desktopApi) {
      return window.desktopApi.deleteUser(userId);
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const result = await client.from("users").delete().eq("id", userId);

      if (result.error) {
        throw new Error(result.error.message || "Impossible de supprimer le profil utilisateur.");
      }

      await insertSupabaseAuditLog(client, {
        action: "delete",
        target_table: "users",
        target_id: userId,
        details: "Suppression utilisateur",
      });

      return this.listUsers();
    }

    const users = loadJson("walikale-web-users", webSeedUsers).filter((user) => user.id !== userId);
    persistWebUsers(users);
    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    activityHistory.unshift({
      id: Date.now(),
      date: new Date().toLocaleString("fr-FR"),
      action: "Suppression",
      target: `Utilisateur #${userId}`,
      details: "Suppression utilisateur",
      user: "Utilisateur web",
    });
    persistWebActivityHistory(activityHistory);
    return users;
  },

  async getInvoiceSeriesInfo(): Promise<InvoiceSeriesInfo> {
    if (window.desktopApi) {
      return window.desktopApi.getInvoiceSeriesInfo();
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const currentYear = getCurrentInvoiceYear();
      const sequenceResult = await client
        .from("invoice_sequences")
        .select("current_year, series_index, next_number")
        .eq("id", 1)
        .maybeSingle();
      let sequence = ensureOptionalData(sequenceResult.data, sequenceResult.error) as SupabaseInvoiceSequenceRow | null;

      if (!sequence) {
        const insertResult = await client
          .from("invoice_sequences")
          .insert({
            id: 1,
            current_year: currentYear,
            series_index: 0,
            next_number: 1,
          })
          .select("current_year, series_index, next_number")
          .single();
        sequence = ensureData(insertResult.data, insertResult.error) as SupabaseInvoiceSequenceRow;
      } else if (sequence.current_year !== currentYear) {
        const resetResult = await client
          .from("invoice_sequences")
          .update({
            current_year: currentYear,
            series_index: 0,
            next_number: 1,
          })
          .eq("id", 1)
          .select("current_year, series_index, next_number")
          .single();
        sequence = ensureData(resetResult.data, resetResult.error) as SupabaseInvoiceSequenceRow;
      }

      return buildInvoiceSeriesInfo(sequence.current_year, sequence.series_index, sequence.next_number);
    }

    return loadWebInvoiceSeries();
  },

  async advanceInvoiceSeries(): Promise<InvoiceSeriesInfo> {
    if (window.desktopApi) {
      return window.desktopApi.advanceInvoiceSeries();
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const current = await this.getInvoiceSeriesInfo();
      const nextSeriesIndex = getInvoiceSeriesIndex(current.seriesLabel) + 1;
      const updateResult = await client
        .from("invoice_sequences")
        .update({
          current_year: current.year,
          series_index: nextSeriesIndex,
          next_number: 1,
        })
        .eq("id", 1);
      ensureData(updateResult.data ?? [], updateResult.error);

      await insertSupabaseAuditLog(client, {
        action: "update",
        target_table: "invoice_sequences",
        target_id: 1,
        details: `Nouvelle serie de facturation S${getInvoiceSeriesLabel(nextSeriesIndex)}${current.yearCode}`,
      });

      return buildInvoiceSeriesInfo(current.year, nextSeriesIndex, 1);
    }

    const current = loadWebInvoiceSeries();
    const nextSeriesIndex = getInvoiceSeriesIndex(current.seriesLabel) + 1;
    const nextInfo = buildInvoiceSeriesInfo(current.year, nextSeriesIndex, 1);
    persistWebInvoiceSeries(nextInfo);

    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    activityHistory.unshift({
      id: Date.now(),
      date: new Date().toLocaleString("fr-FR"),
      action: "Mise a jour",
      target: "Facturation",
      details: `Nouvelle serie de facturation S${nextInfo.seriesLabel}${nextInfo.yearCode}`,
      user: "Utilisateur web",
    });
    persistWebActivityHistory(activityHistory);
    return nextInfo;
  },

  async resetInventoryCycle(): Promise<void> {
    if (window.desktopApi) {
      await window.desktopApi.resetInventoryCycle();
      return;
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const currentCycleId = await getCurrentSupabaseInventoryCycleId();
      const nextCycleId = currentCycleId + 1;
      const result = await client.from("inventory_cycles").insert({
        label: `Cycle ${nextCycleId}`,
      });
      ensureData(result.data ?? [], result.error);

      await insertSupabaseAuditLog(client, {
        action: "update",
        target_table: "inventory_cycles",
        target_id: nextCycleId,
        details: "Reinitialisation du cycle de stock apres inventaire",
      });
      return;
    }

    const products = loadJson("walikale-web-products", webSeedProducts).map((product) => ({
      ...product,
      quantity: 0,
      updatedAt: new Date().toISOString(),
    }));
    const sales = loadJson("walikale-web-sales", webSeedSales);
    const saleDetails = loadJson("walikale-web-sale-details", webSeedSaleDetails);
    persistWeb(products, [], sales, saleDetails);

    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    activityHistory.unshift({
      id: Date.now(),
      date: new Date().toLocaleString("fr-FR"),
      action: "Mise a jour",
      target: "Inventaire",
      details: "Reinitialisation du cycle de stock apres inventaire",
      user: "Utilisateur web",
    });
    persistWebActivityHistory(activityHistory);
  },

  async getCurrentStock(): Promise<StockRow[]> {
    if (window.desktopApi) {
      return window.desktopApi.getCurrentStock();
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const result = await client
        .from("current_stock_view")
        .select("product_id, product_name, quantity_in, quantity_out, current_stock, alert_threshold")
        .order("product_name", { ascending: true });
      const rows = ensureData(result.data, result.error) as SupabaseStockRow[];
      return rows.map((row) => ({
        productId: row.product_id,
        productName: row.product_name,
        quantityIn: Number(row.quantity_in),
        quantityOut: Number(row.quantity_out),
        currentStock: Number(row.current_stock),
        alertThreshold: row.alert_threshold,
      }));
    }

    return computeCurrentStock(loadJson("walikale-web-products", webSeedProducts));
  },
};
