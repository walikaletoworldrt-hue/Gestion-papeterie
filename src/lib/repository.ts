import { createClient } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "./supabase";
import type {
  ActivityHistoryItem,
  AppUser,
  Client,
  ClientDraft,
  CybercafeSale,
  CybercafeSaleDraft,
  CybercafeTariff,
  CybercafeTariffDraft,
  DashboardMetrics,
  DesktopSyncCredentials,
  ExpenseDraft,
  ExpenseItem,
  InvoiceSeriesInfo,
  LoginDraft,
  PasswordChangeDraft,
  Product,
  ProductDraft,
  ReplenishmentImportSummary,
  Service,
  ServiceDraft,
  SaleDetail,
  SaleItemDraft,
  SaleServiceItemDraft,
  SaleDraft,
  SaleRecord,
  SyncConflictBucket,
  SyncConflictPreview,
  SyncPendingOverview,
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
const desktopSupabaseAuthRetryDelayMs = 60_000;
let desktopSupabaseSessionPromise: Promise<ReturnType<typeof getSupabaseClient>> | null = null;
let desktopSupabaseAuthBlockedUntil = 0;
let desktopSupabaseSessionEmail: string | null = null;

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

const webSeedCybercafeTariffs: CybercafeTariff[] = [
  { id: 1, name: "Connexion internet 30 minutes", unitPrice: 200, active: true, createdAt: now, updatedAt: now },
  { id: 2, name: "Connexion internet 1 heure", unitPrice: 500, active: true, createdAt: now, updatedAt: now },
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

function getProductCategoryCode(category: string) {
  const categoryCodeMap: Record<string, string> = {
    Papeterie: "PAP",
    "Cahiers et registres": "CAH",
    "Stylos et ecriture": "STY",
    "Papier et impressions": "IMP",
    "Classement et archivage": "CLA",
    "Fournitures scolaires": "SCO",
    "Informatique et accessoires": "INF",
    "Impression et photocopie": "PHO",
    "Boissons fraiches": "BOI",
    "Biscuits et snacks": "SNK",
    Confiserie: "CNF",
    "Hygiéne et entretien": "HYG",
    "Divers boutique": "DIV",
  };
  const directCode = categoryCodeMap[category];
  if (directCode) {
    return directCode;
  }

  const normalized = category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0] + (words[2]?.[0] ?? "X")).toUpperCase();
  }

  return normalized.slice(0, 3).toUpperCase().padEnd(3, "X") || "PRD";
}

function buildNextProductCode(category: string, products: Array<{ code: string }>) {
  const prefix = `PAP-${getProductCategoryCode(category)}-`;
  const nextIndex =
    products.reduce((max, product) => {
      if (!product.code.startsWith(prefix)) {
        return max;
      }

      const numericPart = Number(product.code.slice(prefix.length));
      return Number.isFinite(numericPart) ? Math.max(max, numericPart) : max;
    }, 0) + 1;

  return `${prefix}${String(nextIndex).padStart(3, "0")}`;
}

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

type SupabaseCybercafeTariffRow = {
  id: number;
  name: string;
  unit_price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type SupabaseCybercafeSaleRow = {
  id: number;
  tariff_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sold_at: string;
  payment_method: string;
  note: string | null;
  tariff?: { name: string | null } | Array<{ name: string | null }> | null;
  user?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
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

type SupabaseReplenishmentRow = {
  id: number;
  lot_number: string | null;
  transport_total: number | null;
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

async function ensureDesktopSupabaseSession() {
  if (!window.desktopApi) {
    return getSupabaseClient();
  }

  if (desktopSupabaseAuthBlockedUntil > Date.now()) {
    const waitSeconds = Math.max(1, Math.ceil((desktopSupabaseAuthBlockedUntil - Date.now()) / 1000));
    throw new Error(
      `Connexion cloud temporairement limitee par Supabase. Reessayez dans ${waitSeconds} seconde(s).`
    );
  }

  const credentials = (await window.desktopApi.getCurrentSyncCredentials()) as DesktopSyncCredentials;
  const normalizedEmail = credentials.email.toLowerCase();

  if (desktopSupabaseSessionPromise && desktopSupabaseSessionEmail === normalizedEmail) {
    return desktopSupabaseSessionPromise;
  }

  desktopSupabaseSessionPromise = null;
  desktopSupabaseSessionEmail = normalizedEmail;

  desktopSupabaseSessionPromise = (async () => {
    const client = getSupabaseClient();
    const currentSession = await client.auth.getSession();
    const sessionUser = currentSession.data.session?.user ?? null;

    if (sessionUser?.email?.toLowerCase() === normalizedEmail) {
      return client;
    }

    if (sessionUser) {
      const signOutResult = await client.auth.signOut();
      if (signOutResult.error) {
        throw new Error(signOutResult.error.message || "Impossible de reinitialiser la session Supabase.");
      }
    }

    const signInResult = await client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (signInResult.error) {
      const message = signInResult.error.message || "authentification refusee.";
      const normalized = message.toLowerCase();

      if (normalized.includes("rate limit")) {
        desktopSupabaseAuthBlockedUntil = Date.now() + desktopSupabaseAuthRetryDelayMs;
        throw new Error(
          `Connexion cloud temporairement limitee par Supabase pour ${credentials.email}. Attendez environ 60 secondes puis relancez la synchronisation.`
        );
      }

      if (normalized.includes("invalid login credentials")) {
        const authClient = createIsolatedSupabaseClient();
        const signUpResult = await authClient.auth.signUp({
          email: credentials.email,
          password: credentials.password,
        });

        if (signUpResult.error) {
          const signUpMessage = signUpResult.error.message || "creation du compte cloud refusee.";
          const signUpNormalized = signUpMessage.toLowerCase();

          if (signUpNormalized.includes("rate limit") || signUpNormalized.includes("too many requests")) {
            desktopSupabaseAuthBlockedUntil = Date.now() + desktopSupabaseAuthRetryDelayMs;
            throw new Error(
              `Creation du compte cloud temporairement limitee par Supabase pour ${credentials.email}. Attendez environ 60 secondes puis relancez la synchronisation.`
            );
          }

          if (!isRecoverableSupabaseSignUpError(signUpMessage)) {
            throw new Error(`Impossible de creer le compte cloud pour ${credentials.email}: ${signUpMessage}`);
          }
        }

        const retrySignInResult = await client.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (retrySignInResult.error) {
          throw new Error(
            `Impossible d'ouvrir la session cloud pour ${credentials.email}: ${retrySignInResult.error.message || "authentification refusee."}`
          );
        }

        desktopSupabaseAuthBlockedUntil = 0;
        return client;
      }

      throw new Error(`Impossible d'ouvrir la session cloud pour ${credentials.email}: ${message}`);
    }

    desktopSupabaseAuthBlockedUntil = 0;
    return client;
  })();

  try {
    return await desktopSupabaseSessionPromise;
  } catch (error) {
    desktopSupabaseSessionPromise = null;
    desktopSupabaseSessionEmail = null;
    throw error;
  }
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue % 1 === 0 ? safeValue.toFixed(0) : safeValue.toFixed(2)} FC`;
}

function getBrowserBrandLogoSrc() {
  if (typeof document === "undefined") {
    return "";
  }

  const logo = document.querySelector<HTMLImageElement>(".brand-logo");
  return logo?.src ?? "";
}

function buildBrowserSaleDocumentHtml(sale: SaleDetail, format: "invoice" | "receipt") {
  const logoSrc = getBrowserBrandLogoSrc();
  const rows = sale.items
    .map((item) => {
      const label = item.lineType === "service" ? `${item.productName} (Service)` : item.productName;
      const category = item.category ? `<div class="line-category">${escapeHtml(item.category)}</div>` : "";
      return `
        <tr>
          <td>
            <div class="line-name">${escapeHtml(label)}</div>
            ${category}
          </td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.unitPrice)}</td>
          <td>${formatCurrency(item.lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  const compactRows = sale.items
    .map((item) => {
      const label = item.lineType === "service" ? `${item.productName} (Service)` : item.productName;
      return `
        <div class="receipt-line">
          <div class="line-name">${escapeHtml(label)}</div>
          <div class="receipt-meta-line">
            <span>${item.quantity} x ${formatCurrency(item.unitPrice)}</span>
            <strong>${formatCurrency(item.lineTotal)}</strong>
          </div>
        </div>
      `;
    })
    .join("");

  const body =
    format === "receipt"
      ? `
        <div class="receipt-sheet">
          <div class="receipt-head">
            ${logoSrc ? `<img class="receipt-logo" src="${logoSrc}" alt="Walikale to World" />` : ""}
            <h1>Walikale Papeterie</h1>
            <p>Gestion des stocks</p>
          </div>
          <div class="receipt-block">
            <div><span>Ticket</span><strong>${escapeHtml(sale.reference)}</strong></div>
            <div><span>Date</span><strong>${escapeHtml(sale.date)}</strong></div>
            <div><span>Client</span><strong>${escapeHtml(sale.clientName)}</strong></div>
            <div><span>Paiement</span><strong>${escapeHtml(sale.paymentMethod)}</strong></div>
          </div>
          <div class="receipt-lines">${compactRows}</div>
          <div class="receipt-total">
            <span>Total</span>
            <strong>${formatCurrency(sale.amount)}</strong>
          </div>
        </div>
      `
      : `
        <div class="invoice-sheet">
          <div class="invoice-head">
            <div class="invoice-brand">
              ${logoSrc ? `<img class="invoice-logo" src="${logoSrc}" alt="Walikale to World" />` : ""}
              <div class="invoice-brand-copy">
                <p class="invoice-kicker">Facture client</p>
                <h1>Walikale Papeterie</h1>
                <p>Gestion des stocks et ventes</p>
              </div>
            </div>
            <div class="invoice-title">
              <h2>FACTURE</h2>
              <p>Reference : ${escapeHtml(sale.reference)}</p>
              <p>Date : ${escapeHtml(sale.date)}</p>
            </div>
          </div>
          <div class="invoice-meta">
            <div><span>Client</span><strong>${escapeHtml(sale.clientName)}</strong></div>
            <div><span>Paiement</span><strong>${escapeHtml(sale.paymentMethod)}</strong></div>
            <div><span>Contact</span><strong>+243 812681339</strong></div>
            <div><span>Adresse</span><strong>Q. Camp TP, avenue Kuya, vers Mubi</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Designation</th>
                <th>Quantite</th>
                <th>Prix unitaire</th>
                <th>Sous-total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="invoice-total">
            <span>Total a payer</span>
            <strong>${formatCurrency(sale.amount)}</strong>
          </div>
          <div class="invoice-footer">
            <p>RCCM : CD/GOM/RCCM/24-A-01041 | Id. Nat : 01-G4701-N66253Q</p>
            <p>E-mail : walikaletoworld.rt@gmail.com</p>
          </div>
        </div>
      `;

  return `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(sale.reference)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Segoe UI", Arial, sans-serif;
            color: #10213c;
            background: #f3f7fc;
            padding: 24px;
          }
          .invoice-sheet, .receipt-sheet {
            background: #fff;
            margin: 0 auto;
            box-shadow: 0 18px 48px rgba(15, 35, 65, 0.12);
          }
          .invoice-sheet {
            max-width: 820px;
            border-radius: 18px;
            padding: 26px 26px 22px;
          }
          .invoice-head {
            display: flex;
            justify-content: space-between;
            gap: 18px;
            align-items: flex-start;
            border-bottom: 1px solid #d6e4f5;
            padding-bottom: 18px;
          }
          .invoice-brand {
            display: flex;
            align-items: flex-start;
            gap: 14px;
          }
          .invoice-brand-copy {
            display: grid;
            gap: 4px;
          }
          .invoice-logo {
            width: 84px;
            height: auto;
            object-fit: contain;
          }
          h1, h2, p { margin: 0; }
          .invoice-kicker {
            color: #1567d8;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .invoice-brand p, .invoice-title p, .invoice-footer p {
            color: #5f7391;
            margin-top: 4px;
          }
          .invoice-brand h1 {
            font-size: 26px;
            line-height: 1.1;
          }
          .invoice-title { text-align: right; }
          .invoice-title h2 {
            color: #1567d8;
            margin-bottom: 8px;
            font-size: 24px;
            letter-spacing: 0.04em;
          }
          .invoice-meta {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin: 18px 0 16px;
          }
          .invoice-meta div, .receipt-block div {
            border: 1px solid #dbe6ef;
            border-radius: 12px;
            padding: 10px 12px;
            background: #fafcff;
          }
          .invoice-meta span, .receipt-block span {
            display: block;
            color: #5f7391;
            font-size: 11px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead th {
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #5f7391;
            background: #f4f8fd;
            padding: 10px 12px;
          }
          tbody td {
            padding: 11px 12px;
            border-bottom: 1px solid #e5edf6;
            vertical-align: top;
            font-size: 14px;
          }
          .line-name { font-weight: 600; }
          .line-category {
            color: #7084a0;
            font-size: 12px;
            margin-top: 4px;
          }
          .invoice-total, .receipt-total {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 18px;
            padding: 14px 16px;
            border-radius: 14px;
            background: #eef5ff;
            font-size: 17px;
            font-weight: 700;
          }
          .invoice-footer {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid #e5edf6;
            text-align: center;
          }
          .invoice-footer p {
            font-size: 11px;
            line-height: 1.45;
          }
          .receipt-sheet {
            width: 80mm;
            border-radius: 0;
            padding: 12px;
            box-shadow: none;
          }
          .receipt-head { text-align: center; }
          .receipt-logo {
            width: 68px;
            height: auto;
            object-fit: contain;
            margin-bottom: 6px;
          }
          .receipt-head p {
            color: #5f7391;
            margin-top: 4px;
            font-size: 12px;
          }
          .receipt-block, .receipt-lines {
            display: grid;
            gap: 8px;
            margin-top: 12px;
          }
          .receipt-line {
            border-bottom: 1px dashed #d4ddea;
            padding-bottom: 8px;
          }
          .receipt-meta-line {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: 4px;
            font-size: 12px;
            color: #516785;
          }
          @media print {
            body {
              background: #fff;
              padding: 0;
            }
            .invoice-sheet, .receipt-sheet {
              box-shadow: none;
              margin: 0;
            }
            .invoice-sheet {
              max-width: none;
              border-radius: 0;
              padding: 0;
            }
          }
          @media (max-width: 760px) {
            body {
              padding: 12px;
            }
            .invoice-sheet {
              padding: 18px;
            }
            .invoice-head,
            .invoice-meta {
              grid-template-columns: 1fr;
              display: grid;
            }
            .invoice-title {
              text-align: left;
            }
          }
        </style>
      </head>
      <body>
        ${body}
        <script>
          window.addEventListener("load", () => {
            setTimeout(() => {
              window.focus();
              window.print();
            }, 150);
          });
        </script>
      </body>
    </html>
  `;
}

function printBrowserSaleDocument(sale: SaleDetail, format: "invoice" | "receipt") {
  if (typeof window === "undefined") {
    return false;
  }

  const popup = window.open("", "_blank", format === "receipt" ? "width=420,height=900" : "width=1100,height=900");
  if (!popup) {
    throw new Error("Impossible d'ouvrir la fenetre d'impression. Autorisez les popups puis reessayez.");
  }

  popup.document.open();
  popup.document.write(buildBrowserSaleDocumentHtml(sale, format));
  popup.document.close();
  return true;
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
  const client = await ensureDesktopSupabaseSession();
  const result = await client.from(table).delete().gte("id", 0);
  ensureData(result.data ?? [], result.error);
}

async function insertSupabaseRows(table: string, rows: Array<Record<string, unknown>>, chunkSize = 200) {
  if (rows.length === 0) {
    return;
  }

  const client = await ensureDesktopSupabaseSession();
  const canUpsertById = rows.every((row) => typeof row.id === "number" || typeof row.id === "string");

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const result = canUpsertById
      ? await client.from(table).upsert(chunk, {
          onConflict: "id",
          ignoreDuplicates: false,
        })
      : await client.from(table).insert(chunk);
    ensureData(result.data ?? [], result.error);
  }
}

async function getCloudLastChangeAt() {
  const client = await ensureDesktopSupabaseSession();
  const result = await client
    .from("audit_logs")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = ensureOptionalData(result.data, result.error) as { created_at: string } | null;
  return row?.created_at ?? null;
}

async function syncSupabaseIdentitySequences() {
  const client = await ensureDesktopSupabaseSession();
  const result = await client.rpc("sync_identity_sequences");
  ensureOptionalData(result.data, result.error);
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
      error_description?: unknown;
    };

    const parts = [
      typeof candidate.message === "string" ? candidate.message : null,
      typeof candidate.details === "string" ? candidate.details : null,
      typeof candidate.hint === "string" ? candidate.hint : null,
      typeof candidate.error_description === "string" ? candidate.error_description : null,
      typeof candidate.code === "string" ? `code: ${candidate.code}` : null,
    ].filter((part): part is string => Boolean(part && part.trim().length > 0));

    if (parts.length > 0) {
      return parts.join(" | ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

function normalizeSupabaseSyncError(error: unknown) {
  const message = getErrorMessage(error);
  const missingRelation = extractMissingSupabaseRelation(message);

  if (missingRelation) {
    return new Error(
      `Le schema Supabase est incomplet. La table ou vue '${missingRelation}' est absente. Executez la migration correspondante dans database (notamment supabase-cybercafe-migration.sql pour le module Cybercafe), puis relancez la synchronisation.`
    );
  }

  return new Error(message);
}

async function assertSupabaseSyncSchema() {
  const client = getSupabaseClient();
  const checks: Array<{ relation: string; column: string }> = [
    { relation: "users", column: "id" },
    { relation: "products", column: "id" },
    { relation: "services", column: "id" },
    { relation: "cybercafe_tariffs", column: "id" },
    { relation: "clients", column: "id" },
    { relation: "expenses", column: "id" },
    { relation: "initial_stocks", column: "id" },
    { relation: "replenishments", column: "id" },
    { relation: "sales", column: "id" },
    { relation: "sale_items", column: "id" },
    { relation: "sale_service_items", column: "id" },
    { relation: "cybercafe_sales", column: "id" },
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

const syncBucketDefinitions: Record<string, { label: string; tables: string[] }> = {
  products: { label: "Produits", tables: ["products"] },
  services: { label: "Services", tables: ["services"] },
  cybercafe: { label: "Cybercafe", tables: ["cybercafe_tariffs", "cybercafe_sales"] },
  clients: { label: "Clients", tables: ["clients"] },
  expenses: { label: "Depenses", tables: ["expenses"] },
  initial_stocks: { label: "Stock initial", tables: ["initial_stocks"] },
  replenishments: { label: "Reapprovisionnements", tables: ["replenishments"] },
  sales: { label: "Ventes et mouvements", tables: ["sales", "sale_items", "sale_service_items", "stock_movements"] },
  users: { label: "Utilisateurs", tables: ["users"] },
  invoice_sequences: { label: "Facturation", tables: ["invoice_sequences"] },
  inventory_cycles: { label: "Inventaire", tables: ["inventory_cycles"] },
};

const syncTableToBucketKey = new Map(
  Object.entries(syncBucketDefinitions).flatMap(([bucketKey, definition]) =>
    definition.tables.map((table) => [table, bucketKey] as const)
  )
);

function getSyncBucketLabel(key: string) {
  return syncBucketDefinitions[key]?.label ?? key.split("_").join(" ");
}

function normalizeSyncBucketKey(key: string) {
  return syncTableToBucketKey.get(key) ?? key;
}

function getTablesForSyncBucketKeys(keys: string[]) {
  return [...new Set(keys.flatMap((key) => syncBucketDefinitions[key]?.tables ?? [key]))];
}

function groupSyncBuckets(
  buckets: Array<{ key: string; label: string; count: number }>
): SyncConflictBucket[] {
  const grouped = new Map<string, SyncConflictBucket>();

  buckets.forEach((bucket) => {
    const normalizedKey = normalizeSyncBucketKey(bucket.key);
    const existing = grouped.get(normalizedKey);
    if (existing) {
      existing.count += bucket.count;
      return;
    }

    grouped.set(normalizedKey, {
      key: normalizedKey,
      label: getSyncBucketLabel(normalizedKey),
      count: bucket.count,
    });
  });

  return [...grouped.values()].sort(
    (left, right) => right.count - left.count || left.label.localeCompare(right.label, "fr", { sensitivity: "base" })
  );
}

function sumSelectedSyncBuckets(buckets: SyncConflictBucket[], selectedBucketKeys: string[]) {
  const selected = new Set(selectedBucketKeys);
  return buckets.reduce((total, bucket) => (selected.has(bucket.key) ? total + bucket.count : total), 0);
}

function getSyncBucketKeysWithChanges(buckets: SyncConflictBucket[]) {
  return buckets.filter((bucket) => bucket.count > 0).map((bucket) => bucket.key);
}

function hasSyncBucketOverlap(leftKeys: string[], rightKeys: string[]) {
  const rightSet = new Set(rightKeys);
  return leftKeys.some((key) => rightSet.has(key));
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

    const key = normalizeSyncBucketKey(row.target_table ?? "autre");
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
    cybercafeTariffs,
    clients,
    expenses,
    initialStocks,
    replenishments,
    sales,
    saleItems,
    saleServiceItems,
    cybercafeSales,
    stockMovements,
    auditLogs,
    invoiceSequences,
    inventoryCycles,
  ] = await Promise.all([
    client.from("users").select("id, auth_user_id, full_name, username, email, password_hash, role, active, created_at, last_login_at").order("id", { ascending: true }),
    client.from("products").select("id, code, name, category, purchase_price, selling_price, unit, alert_threshold, supplier, created_at, updated_at").order("id", { ascending: true }),
    client.from("services").select("id, name, category, unit_price, description, active, created_at, updated_at").order("id", { ascending: true }),
    client.from("cybercafe_tariffs").select("id, name, unit_price, active, created_at, updated_at").order("id", { ascending: true }),
    client.from("clients").select("id, name, phone, address, email, created_at").order("id", { ascending: true }),
    client.from("expenses").select("id, detail, nature, amount, expense_date, user_id, approved_by, purpose").order("id", { ascending: true }),
    client.from("initial_stocks").select("id, product_id, quantity, purchase_price, stock_date, cycle_id, user_id, note").order("id", { ascending: true }),
    client.from("replenishments").select("id, product_id, quantity, purchase_price, supplier, replenished_at, cycle_id, user_id, note").order("id", { ascending: true }),
    client.from("sales").select("id, reference, client_id, sold_at, total_amount, payment_method, cycle_id, user_id").order("id", { ascending: true }),
    client.from("sale_items").select("id, sale_id, product_id, quantity, unit_price, line_total").order("id", { ascending: true }),
    client.from("sale_service_items").select("id, sale_id, service_id, quantity, unit_price, line_total").order("id", { ascending: true }),
    client.from("cybercafe_sales").select("id, tariff_id, quantity, unit_price, total_amount, sold_at, payment_method, note, user_id").order("id", { ascending: true }),
    client.from("stock_movements").select("id, product_id, movement_type, quantity, source_table, source_id, movement_date, cycle_id, user_id").order("id", { ascending: true }),
    client.from("audit_logs").select("id, user_id, action, target_table, target_id, details, actor_name, actor_username, source_device, source_platform, created_at").order("id", { ascending: true }),
    client.from("invoice_sequences").select("id, current_year, series_index, next_number, updated_at").order("id", { ascending: true }),
    client.from("inventory_cycles").select("id, label, started_at, user_id").order("id", { ascending: true }),
  ]);

  return {
    users: ensureData(users.data, users.error) as Array<Record<string, unknown>>,
    products: ensureData(products.data, products.error) as Array<Record<string, unknown>>,
    services: ensureData(services.data, services.error) as Array<Record<string, unknown>>,
    cybercafeTariffs: ensureData(cybercafeTariffs.data, cybercafeTariffs.error) as Array<Record<string, unknown>>,
    clients: ensureData(clients.data, clients.error) as Array<Record<string, unknown>>,
    expenses: ensureData(expenses.data, expenses.error) as Array<Record<string, unknown>>,
    initialStocks: ensureData(initialStocks.data, initialStocks.error) as Array<Record<string, unknown>>,
    replenishments: ensureData(replenishments.data, replenishments.error) as Array<Record<string, unknown>>,
    sales: ensureData(sales.data, sales.error) as Array<Record<string, unknown>>,
    saleItems: ensureData(saleItems.data, saleItems.error) as Array<Record<string, unknown>>,
    saleServiceItems: ensureData(saleServiceItems.data, saleServiceItems.error) as Array<Record<string, unknown>>,
    cybercafeSales: ensureData(cybercafeSales.data, cybercafeSales.error) as Array<Record<string, unknown>>,
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

  const [localOverview, cloudAuditLogsResult] = await Promise.all([
    window.desktopApi.getPendingSyncOverview(),
    getSupabaseClient()
      .from("audit_logs")
      .select("target_table, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const cloudAuditLogs = ensureData(cloudAuditLogsResult.data, cloudAuditLogsResult.error) as Array<{
    target_table?: string | null;
    created_at?: string | null;
  }>;

  const cloudSummary = buildSyncBucketsFromAuditLogs(cloudAuditLogs, localStatus.lastSyncedAt);
  const groupedLocalBuckets = groupSyncBuckets(localOverview.buckets);

  return {
    localPendingChanges: localStatus.pendingChanges,
    localLastChangeAt: localOverview.latestChangedAt,
    cloudLastChangeAt: cloudSummary.latestChangedAt ?? cloudLastChangeAt,
    localBuckets: groupedLocalBuckets,
    cloudBuckets: cloudSummary.buckets,
  };
}

async function getCloudSyncOverview(since: string | null) {
  const cloudAuditLogsResult = await getSupabaseClient()
    .from("audit_logs")
    .select("target_table, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const cloudAuditLogs = ensureData(cloudAuditLogsResult.data, cloudAuditLogsResult.error) as Array<{
    target_table?: string | null;
    created_at?: string | null;
  }>;

  return buildSyncBucketsFromAuditLogs(cloudAuditLogs, since);
}

function createEmptySyncSnapshot(): SyncSnapshot {
  return {
    users: [],
    products: [],
    services: [],
    cybercafeTariffs: [],
    clients: [],
    expenses: [],
    initialStocks: [],
    replenishments: [],
    sales: [],
    saleItems: [],
    saleServiceItems: [],
    cybercafeSales: [],
    stockMovements: [],
    auditLogs: [],
    invoiceSequences: [],
    inventoryCycles: [],
  };
}

function filterSyncSnapshot(snapshot: SyncSnapshot, selectedTables: string[] | null): SyncSnapshot {
  if (!selectedTables || selectedTables.length === 0) {
    return snapshot;
  }

  const included = new Set(selectedTables);
  const filtered = createEmptySyncSnapshot();

  if (included.has("users")) filtered.users = snapshot.users ?? [];
  if (included.has("products")) filtered.products = snapshot.products ?? [];
  if (included.has("services")) filtered.services = snapshot.services ?? [];
  if (included.has("cybercafe_tariffs")) filtered.cybercafeTariffs = snapshot.cybercafeTariffs ?? [];
  if (included.has("clients")) filtered.clients = snapshot.clients ?? [];
  if (included.has("expenses")) filtered.expenses = snapshot.expenses ?? [];
  if (included.has("initial_stocks")) filtered.initialStocks = snapshot.initialStocks ?? [];
  if (included.has("replenishments")) filtered.replenishments = snapshot.replenishments ?? [];
  if (included.has("sales")) filtered.sales = snapshot.sales ?? [];
  if (included.has("sale_items")) filtered.saleItems = snapshot.saleItems ?? [];
  if (included.has("sale_service_items")) filtered.saleServiceItems = snapshot.saleServiceItems ?? [];
  if (included.has("cybercafe_sales")) filtered.cybercafeSales = snapshot.cybercafeSales ?? [];
  if (included.has("stock_movements")) filtered.stockMovements = snapshot.stockMovements ?? [];
  if (included.has("invoice_sequences")) filtered.invoiceSequences = snapshot.invoiceSequences ?? [];
  if (included.has("inventory_cycles")) filtered.inventoryCycles = snapshot.inventoryCycles ?? [];

  filtered.auditLogs = (snapshot.auditLogs ?? []).filter((row) => {
    const targetTable = String(row.target_table ?? "");
    return included.has(targetTable);
  });

  return filtered;
}

function mergeAuditLogsForSync(
  cloudRows: Array<Record<string, unknown>>,
  localRows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const merged = new Map<string, Record<string, unknown>>();

  [...cloudRows, ...localRows].forEach((row) => {
    const key = [
      String(row.created_at ?? ""),
      String(row.action ?? ""),
      String(row.target_table ?? ""),
      String(row.target_id ?? ""),
      String(row.details ?? ""),
      String(row.actor_username ?? ""),
      String(row.source_device ?? ""),
      String(row.source_platform ?? ""),
    ].join("|");

    merged.set(key, {
      user_id: row.user_id ?? null,
      action: row.action ?? null,
      target_table: row.target_table ?? null,
      target_id: row.target_id ?? null,
      details: row.details ?? null,
      actor_name: row.actor_name ?? null,
      actor_username: row.actor_username ?? null,
      source_device: row.source_device ?? null,
      source_platform: row.source_platform ?? null,
      created_at: row.created_at ?? new Date().toISOString(),
    });
  });

  return [...merged.values()].sort((left, right) =>
    String(left.created_at ?? "").localeCompare(String(right.created_at ?? ""))
  );
}

function mergeSnapshotsForCloudSync(
  cloudSnapshot: SyncSnapshot,
  localSnapshot: SyncSnapshot,
  localTablesToApply: string[]
): SyncSnapshot {
  const merged: SyncSnapshot = {
    users: cloudSnapshot.users ?? [],
    products: cloudSnapshot.products ?? [],
    services: cloudSnapshot.services ?? [],
    cybercafeTariffs: cloudSnapshot.cybercafeTariffs ?? [],
    clients: cloudSnapshot.clients ?? [],
    expenses: cloudSnapshot.expenses ?? [],
    initialStocks: cloudSnapshot.initialStocks ?? [],
    replenishments: cloudSnapshot.replenishments ?? [],
    sales: cloudSnapshot.sales ?? [],
    saleItems: cloudSnapshot.saleItems ?? [],
    saleServiceItems: cloudSnapshot.saleServiceItems ?? [],
    cybercafeSales: cloudSnapshot.cybercafeSales ?? [],
    stockMovements: cloudSnapshot.stockMovements ?? [],
    auditLogs: cloudSnapshot.auditLogs ?? [],
    invoiceSequences: cloudSnapshot.invoiceSequences ?? [],
    inventoryCycles: cloudSnapshot.inventoryCycles ?? [],
  };

  const included = new Set(localTablesToApply);

  if (included.has("users")) merged.users = localSnapshot.users ?? [];
  if (included.has("products")) merged.products = localSnapshot.products ?? [];
  if (included.has("services")) merged.services = localSnapshot.services ?? [];
  if (included.has("cybercafe_tariffs")) merged.cybercafeTariffs = localSnapshot.cybercafeTariffs ?? [];
  if (included.has("clients")) merged.clients = localSnapshot.clients ?? [];
  if (included.has("expenses")) merged.expenses = localSnapshot.expenses ?? [];
  if (included.has("initial_stocks")) merged.initialStocks = localSnapshot.initialStocks ?? [];
  if (included.has("replenishments")) merged.replenishments = localSnapshot.replenishments ?? [];
  if (included.has("sales")) merged.sales = localSnapshot.sales ?? [];
  if (included.has("sale_items")) merged.saleItems = localSnapshot.saleItems ?? [];
  if (included.has("sale_service_items")) merged.saleServiceItems = localSnapshot.saleServiceItems ?? [];
  if (included.has("cybercafe_sales")) merged.cybercafeSales = localSnapshot.cybercafeSales ?? [];
  if (included.has("stock_movements")) merged.stockMovements = localSnapshot.stockMovements ?? [];
  if (included.has("invoice_sequences")) merged.invoiceSequences = localSnapshot.invoiceSequences ?? [];
  if (included.has("inventory_cycles")) merged.inventoryCycles = localSnapshot.inventoryCycles ?? [];

  const localAuditRows = (localSnapshot.auditLogs ?? []).filter((row) => included.has(String(row.target_table ?? "")));
  merged.auditLogs = mergeAuditLogsForSync(cloudSnapshot.auditLogs ?? [], localAuditRows);

  return merged;
}

async function replaceSupabaseSyncTables(syncSnapshot: SyncSnapshot, selectedTables: string[] | null, canSyncUsers: boolean) {
  const included = selectedTables ? new Set(selectedTables) : null;
  const hasTable = (table: string) => !included || included.has(table);

  if (hasTable("sale_items")) await deleteSupabaseRows("sale_items");
  if (hasTable("sale_service_items")) await deleteSupabaseRows("sale_service_items");
  if (hasTable("cybercafe_sales")) await deleteSupabaseRows("cybercafe_sales");
  if (hasTable("stock_movements")) await deleteSupabaseRows("stock_movements");
  if (hasTable("sales")) await deleteSupabaseRows("sales");
  if (hasTable("replenishments")) await deleteSupabaseRows("replenishments");
  if (hasTable("initial_stocks")) await deleteSupabaseRows("initial_stocks");
  if (hasTable("audit_logs")) await deleteSupabaseRows("audit_logs");
  if (hasTable("expenses")) await deleteSupabaseRows("expenses");
  if (hasTable("services")) await deleteSupabaseRows("services");
  if (hasTable("cybercafe_tariffs")) await deleteSupabaseRows("cybercafe_tariffs");
  if (hasTable("clients")) await deleteSupabaseRows("clients");
  if (hasTable("products")) await deleteSupabaseRows("products");
  if (hasTable("inventory_cycles")) await deleteSupabaseRows("inventory_cycles");
  if (hasTable("invoice_sequences")) await deleteSupabaseRows("invoice_sequences");

  if (canSyncUsers && hasTable("users")) {
    await syncUsersToSupabase(syncSnapshot.users ?? []);
  }

  if (hasTable("products")) await insertSupabaseRows("products", syncSnapshot.products);
  if (hasTable("services")) await insertSupabaseRows("services", syncSnapshot.services);
  if (hasTable("cybercafe_tariffs")) await insertSupabaseRows("cybercafe_tariffs", syncSnapshot.cybercafeTariffs);
  if (hasTable("clients")) await insertSupabaseRows("clients", syncSnapshot.clients);
  if (hasTable("expenses")) await insertSupabaseRows("expenses", syncSnapshot.expenses ?? []);
  if (hasTable("inventory_cycles")) await insertSupabaseRows("inventory_cycles", syncSnapshot.inventoryCycles);
  if (hasTable("invoice_sequences")) await insertSupabaseRows("invoice_sequences", syncSnapshot.invoiceSequences);
  if (hasTable("initial_stocks")) await insertSupabaseRows("initial_stocks", syncSnapshot.initialStocks);
  if (hasTable("replenishments")) await insertSupabaseRows("replenishments", syncSnapshot.replenishments);
  if (hasTable("sales")) await insertSupabaseRows("sales", syncSnapshot.sales);
  if (hasTable("sale_items")) await insertSupabaseRows("sale_items", syncSnapshot.saleItems);
  if (hasTable("sale_service_items")) await insertSupabaseRows("sale_service_items", syncSnapshot.saleServiceItems);
  if (hasTable("cybercafe_sales")) await insertSupabaseRows("cybercafe_sales", syncSnapshot.cybercafeSales);
  if (hasTable("stock_movements")) await insertSupabaseRows("stock_movements", syncSnapshot.stockMovements);
  if (hasTable("audit_logs")) await insertSupabaseRows("audit_logs", syncSnapshot.auditLogs);
}

async function syncUsersToSupabase(snapshotUsers: Array<Record<string, unknown>>) {
  const client = await ensureDesktopSupabaseSession();
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

  const existingByAuthUserId = new Map(
    existingUsers.filter((user) => user.auth_user_id).map((user) => [String(user.auth_user_id), user])
  );
  const existingByUsername = new Map(existingUsers.map((user) => [user.username.toLowerCase(), user]));
  const existingByEmail = new Map(
    existingUsers.filter((user) => user.email).map((user) => [String(user.email).toLowerCase(), user])
  );

  const payload = snapshotUsers.map((rawUser) => {
    const snapshotAuthUserId =
      typeof rawUser.auth_user_id === "string" && rawUser.auth_user_id.trim().length > 0
        ? rawUser.auth_user_id.trim()
        : null;
    const username = String(rawUser.username ?? "").trim().toLowerCase();
    const email = rawUser.email ? String(rawUser.email).trim().toLowerCase() : null;
    const existingUser =
      (snapshotAuthUserId ? existingByAuthUserId.get(snapshotAuthUserId) : undefined) ??
      (email ? existingByEmail.get(email) : undefined) ??
      existingByUsername.get(username);
    const resolvedAuthUserId = existingUser?.auth_user_id ?? null;

    return {
      id: existingUser?.id ?? null,
      auth_user_id: resolvedAuthUserId ?? null,
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

  const seenAuthUserIds = new Map<string, string>();
  for (const row of payload) {
    if (!row.auth_user_id) {
      continue;
    }

    const previousUsername = seenAuthUserIds.get(row.auth_user_id);
    if (previousUsername && previousUsername !== row.username) {
      throw new Error(
        `Deux profils locaux (${previousUsername} et ${row.username}) pointent vers le meme compte web (${row.auth_user_id}). Corrigez la duplication des utilisateurs avant de relancer la synchronisation.`
      );
    }

    seenAuthUserIds.set(row.auth_user_id, row.username);
  }

  for (let index = 0; index < payload.length; index += 1) {
    const currentPayload = payload[index];
    const existingUser =
      (currentPayload.auth_user_id ? existingByAuthUserId.get(currentPayload.auth_user_id) : undefined) ??
      (currentPayload.email ? existingByEmail.get(currentPayload.email) : undefined) ??
      existingByUsername.get(currentPayload.username);

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

    if (signUpResult.error) {
      const message = signUpResult.error.message;
      const normalized = message.toLowerCase();

      if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
        throw new Error(
          `Le compte web ${currentPayload.email} n'a pas pu etre cree automatiquement car la limite d'envoi de Supabase a ete atteinte. Creez d'abord cet utilisateur dans Authentication > Users, puis relancez la synchronisation.`
        );
      }

      if (!isRecoverableSupabaseSignUpError(message)) {
        throw new Error(`Impossible de creer le compte web pour ${currentPayload.email}: ${message}`);
      }
    }

    currentPayload.auth_user_id = signUpResult.data.user?.id ?? existingUser?.auth_user_id ?? null;
  }

  const existingPayload = payload.filter((row) => row.id !== null);
  const newPayload = payload
    .filter((row) => row.id === null)
    .map(({ id: _id, ...row }) => row);

  if (existingPayload.length > 0) {
    const upsertResult = await client.from("users").upsert(existingPayload, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    ensureData(upsertResult.data ?? [], upsertResult.error);
  }

  if (newPayload.length > 0) {
    const insertResult = await client.from("users").insert(newPayload);
    ensureData(insertResult.data ?? [], insertResult.error);
  }
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

function normalizeUserDraftForProvisioning(draft: UserDraft) {
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

  return {
    fullName,
    normalizedEmail,
    normalizedUsername,
    password,
  };
}

async function findSupabaseUserProfileByIdentity(
  client: ReturnType<typeof getSupabaseClient>,
  email: string,
  username: string
): Promise<SupabaseUserRow | null> {
  const byEmailResult = await client
    .from("users")
    .select("id, auth_user_id, full_name, username, email, role, active, created_at, last_login_at")
    .eq("email", email)
    .limit(1);
  const byEmailRows = ensureData(byEmailResult.data ?? [], byEmailResult.error) as SupabaseUserRow[];

  if (byEmailRows[0]) {
    return byEmailRows[0];
  }

  const byUsernameResult = await client
    .from("users")
    .select("id, auth_user_id, full_name, username, email, role, active, created_at, last_login_at")
    .eq("username", username)
    .limit(1);
  const byUsernameRows = ensureData(byUsernameResult.data ?? [], byUsernameResult.error) as SupabaseUserRow[];
  return byUsernameRows[0] ?? null;
}

async function provisionUserIntoSupabase(draft: UserDraft, options?: { localUserId?: number }) {
  const client = window.desktopApi ? await ensureDesktopSupabaseSession() : getSupabaseClient();
  const authClient = createIsolatedSupabaseClient();
  const { fullName, normalizedEmail, normalizedUsername, password } = normalizeUserDraftForProvisioning(draft);
  let existingProfile = await findSupabaseUserProfileByIdentity(client, normalizedEmail, normalizedUsername);
  let authUserId = existingProfile?.auth_user_id ?? null;

  if (!authUserId) {
    const signUpResult = await authClient.auth.signUp({
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
      const message = signUpResult.error.message || "Impossible de creer le compte Supabase.";
      const normalized = message.toLowerCase();

      if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
        throw new Error(
          `Supabase limite temporairement la creation du compte web pour ${normalizedEmail}. Reessayez un peu plus tard ou lancez la synchronisation ensuite.`
        );
      }

      if (!isRecoverableSupabaseSignUpError(message)) {
        throw new Error(message);
      }
    }

    authUserId = signUpResult.data.user?.id ?? null;

    if (!authUserId) {
      existingProfile = await findSupabaseUserProfileByIdentity(client, normalizedEmail, normalizedUsername);
      authUserId = existingProfile?.auth_user_id ?? null;
    }
  }

  if (!authUserId) {
    throw new Error(
      `Le compte Auth de ${normalizedEmail} semble deja exister, mais son profil applicatif n'a pas pu etre relie automatiquement.`
    );
  }

  const profilePayload = {
    id: existingProfile?.id ?? options?.localUserId,
    auth_user_id: authUserId,
    full_name: fullName,
    username: normalizedUsername,
    email: normalizedEmail,
    role: draft.role,
    active: true,
    last_login_at: existingProfile?.last_login_at ?? new Date().toISOString(),
  };

  if (existingProfile) {
    const updateResult = await client.from("users").update(profilePayload).eq("id", existingProfile.id);
    ensureData(updateResult.data ?? [], updateResult.error);
  } else {
    const insertResult = await client.from("users").insert({
      ...profilePayload,
      created_at: new Date().toISOString(),
    });
    ensureData(insertResult.data ?? [], insertResult.error);
  }

  await insertSupabaseAuditLog(client, {
    action: existingProfile ? "update" : "create",
    target_table: "users",
    target_id: existingProfile?.id ?? options?.localUserId ?? null,
    details: `${existingProfile ? "Liaison" : "Creation"} utilisateur ${normalizedEmail}`,
  });

  return {
    authUserId,
    fullName,
    normalizedEmail,
    normalizedUsername,
    password,
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

async function ensureSuperAdminAccessForInventoryCycle() {
  if (window.desktopApi) {
    return;
  }

  if (isSupabaseEnabled()) {
    const profile = await getSupabaseSessionProfile();
    if (profile?.role !== "Super admin") {
      throw new Error("Seul le super administrateur peut effectuer cette action.");
    }
    return;
  }

  const activeUserId = Number(localStorage.getItem(webSessionStorageKey) ?? "0");
  const users = loadJson("walikale-web-users", webSeedUsers);
  const activeUser = users.find((user) => user.id === activeUserId) ?? null;

  if (activeUser?.role !== "Super admin") {
    throw new Error("Seul le super administrateur peut effectuer cette action.");
  }
}

async function ensureSuperAdminAccess(message: string) {
  if (window.desktopApi) {
    return;
  }

  if (isSupabaseEnabled()) {
    const profile = await getSupabaseSessionProfile();
    if (profile?.role !== "Super admin") {
      throw new Error(message);
    }
    return;
  }

  const activeUserId = Number(localStorage.getItem(webSessionStorageKey) ?? "0");
  const users = loadJson("walikale-web-users", webSeedUsers);
  const activeUser = users.find((user) => user.id === activeUserId) ?? null;

  if (activeUser?.role !== "Super admin") {
    throw new Error(message);
  }
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

    return {
      ...localStatus,
      available: Boolean(supabase),
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
      cloudHasChanges: false,
    };
  },

  async getPendingSyncOverview(): Promise<SyncPendingOverview> {
    if (!window.desktopApi) {
      return {
        buckets: [],
        latestChangedAt: null,
      };
    }

    const overview = await window.desktopApi.getPendingSyncOverview();
    return {
      ...overview,
      buckets: groupSyncBuckets(overview.buckets),
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

  async syncDesktopToCloud(forcePush = false, selectedBucketKeys?: string[]): Promise<SyncStatus> {
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
      const syncCredentials = (await window.desktopApi.getCurrentSyncCredentials()) as DesktopSyncCredentials;
      const canSyncUsers = syncCredentials.role === "Super admin";
      const localStatus = await window.desktopApi.getSyncStatus();
      const localOverview = groupSyncBuckets((await window.desktopApi.getPendingSyncOverview()).buckets);
      const localBucketKeys = selectedBucketKeys && selectedBucketKeys.length > 0 ? selectedBucketKeys : getSyncBucketKeysWithChanges(localOverview);
      const selectedTables =
        selectedBucketKeys && selectedBucketKeys.length > 0 ? getTablesForSyncBucketKeys(selectedBucketKeys) : null;
      const cloudOverview = await getCloudSyncOverview(localStatus.lastSyncedAt);
      const cloudBucketKeys = getSyncBucketKeysWithChanges(cloudOverview.buckets);
      const cloudLastChangeAt = cloudOverview.latestChangedAt ?? (await getCloudLastChangeAt());
      const cloudHasChanges = Boolean(
        selectedBucketKeys && selectedBucketKeys.length > 0
          ? sumSelectedSyncBuckets(cloudOverview.buckets, selectedBucketKeys) > 0
          : cloudLastChangeAt &&
            (!localStatus.lastSyncedAt || new Date(cloudLastChangeAt).getTime() > new Date(localStatus.lastSyncedAt).getTime())
      );
      const localPendingChanges = selectedBucketKeys && selectedBucketKeys.length > 0
        ? sumSelectedSyncBuckets(localOverview, selectedBucketKeys)
        : localStatus.pendingChanges;
      const hasOverlappingChanges = hasSyncBucketOverlap(localBucketKeys, cloudBucketKeys);

      if (!forcePush && localPendingChanges > 0 && cloudHasChanges && hasOverlappingChanges) {
        throw new Error("Conflit detecte : le cloud et ce poste ont tous les deux des changements non synchronises.");
      }

      if (!forcePush && localPendingChanges === 0 && cloudHasChanges) {
        const cloudSnapshot = await getCloudSnapshot();
        await window.desktopApi.importSyncSnapshot(cloudSnapshot);
        await window.desktopApi.markSyncComplete(cloudLastChangeAt);
        return this.getSyncStatus();
      }

      const snapshot = await window.desktopApi.exportSyncSnapshot();
      const syncSnapshot = filterSyncSnapshot(snapshot as SyncSnapshot, selectedTables);
      const changedTables = selectedTables ?? [
        "users",
        "products",
        "services",
        "cybercafe_tariffs",
        "clients",
        "expenses",
        "inventory_cycles",
        "invoice_sequences",
        "initial_stocks",
        "replenishments",
        "sales",
        "sale_items",
        "sale_service_items",
        "cybercafe_sales",
        "stock_movements",
        "audit_logs",
      ];

      const effectiveChangedTables = canSyncUsers ? changedTables : changedTables.filter((table) => table !== "users");

      if (!forcePush && localPendingChanges > 0 && cloudHasChanges && !hasOverlappingChanges) {
        const mergedSnapshot = mergeSnapshotsForCloudSync(
          await getCloudSnapshot(),
          snapshot as SyncSnapshot,
          effectiveChangedTables.filter((table) => table !== "audit_logs")
        );

        await replaceSupabaseSyncTables(mergedSnapshot, null, canSyncUsers);
        await syncSupabaseIdentitySequences();

        const syncedAt = new Date().toISOString();
        if (selectedTables && selectedTables.length > 0) {
          await window.desktopApi.markSyncBucketsComplete(effectiveChangedTables, syncedAt);
        } else {
          await window.desktopApi.importSyncSnapshot(mergedSnapshot);
          await window.desktopApi.markSyncComplete(syncedAt);
        }

        return this.getSyncStatus();
      }

      await replaceSupabaseSyncTables(syncSnapshot, selectedTables ? [...effectiveChangedTables, "audit_logs"] : null, canSyncUsers);
      await syncSupabaseIdentitySequences();

      const syncedAt = new Date().toISOString();
      if (selectedTables && selectedTables.length > 0) {
        await window.desktopApi.markSyncBucketsComplete(effectiveChangedTables, syncedAt);
      } else {
        await window.desktopApi.markSyncComplete(syncedAt);
      }
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
      const profile = await getSupabaseSessionProfile();
      try {
        const sequenceSyncResult = await client.rpc("sync_identity_sequences");
        ensureOptionalData(sequenceSyncResult.data, sequenceSyncResult.error);
      } catch {
        // Compatibility: older Supabase projects may not yet have the helper function.
      }
      const cycleId = await getCurrentSupabaseInventoryCycleId();
      const trimmedName = draft.name.trim();
      const trimmedSupplier = draft.supplier.trim();
      const normalizedProduct = {
        code: draft.code?.trim() || buildNextProductCode(draft.category?.trim() || "Papeterie", await this.listProducts()),
        name: trimmedName,
        category: draft.category?.trim() || "Papeterie",
        purchase_price: Number(draft.purchasePrice),
        selling_price: Number(draft.sellingPrice),
        unit: draft.unit?.trim() || "piece",
        alert_threshold: Number(draft.alertThreshold ?? 0),
        supplier: trimmedSupplier,
      };

      const existingResult = await client
        .from("products")
        .select("id, name, code, category, purchase_price, selling_price, unit, alert_threshold, supplier")
        .ilike("name", trimmedName)
        .limit(1)
        .maybeSingle();
      if (existingResult.error) {
        throw new Error(existingResult.error.message || "Impossible de verifier le produit existant.");
      }
      const existing = existingResult.data as {
        id: number;
        name: string;
        code: string;
        category: string;
        purchase_price: number;
        selling_price: number;
        unit: string;
        alert_threshold: number;
        supplier: string;
      } | null;

      if (existing) {
        const isMetadataChanged =
          existing.code !== normalizedProduct.code ||
          existing.name !== normalizedProduct.name ||
          existing.category !== normalizedProduct.category ||
          Number(existing.purchase_price) !== Number(normalizedProduct.purchase_price) ||
          Number(existing.selling_price) !== Number(normalizedProduct.selling_price) ||
          existing.unit !== normalizedProduct.unit ||
          Number(existing.alert_threshold) !== Number(normalizedProduct.alert_threshold) ||
          existing.supplier !== normalizedProduct.supplier;

        if (isMetadataChanged && profile?.role !== "Super admin") {
          throw new Error("Seul le super administrateur peut modifier un produit existant.");
        }

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
            lot_number: draft.replenishmentLotNumber?.trim() || null,
            transport_total: Number(draft.replenishmentTransportTotal ?? 0),
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
    const activeUserId = Number(localStorage.getItem(webSessionStorageKey) ?? "0");
    const webUsers = loadJson("walikale-web-users", webSeedUsers);
    const activeUser = webUsers.find((user) => user.id === activeUserId) ?? null;
    const existing = products.find((item) => item.name.toLowerCase() === draft.name.toLowerCase());

    if (existing) {
      const isMetadataChanged =
        existing.code !== (draft.code || existing.code) ||
        existing.category !== (draft.category || existing.category) ||
        Number(existing.purchasePrice) !== Number(draft.purchasePrice) ||
        Number(existing.sellingPrice) !== Number(draft.sellingPrice) ||
        existing.unit !== (draft.unit || existing.unit) ||
        Number(existing.alertThreshold) !== Number(draft.alertThreshold ?? existing.alertThreshold) ||
        existing.supplier !== draft.supplier;

      if (isMetadataChanged && activeUser?.role !== "Super admin") {
        throw new Error("Seul le super administrateur peut modifier un produit existant.");
      }

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
        code: draft.code || buildNextProductCode(draft.category || "Papeterie", products),
        name: draft.name,
        category: draft.category || "Papeterie",
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
      lotNumber: draft.replenishmentLotNumber?.trim() || undefined,
      transportTotal: Number(draft.replenishmentTransportTotal ?? 0),
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
      await ensureSuperAdminAccess("Seul le super administrateur peut supprimer un produit.");
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

    await ensureSuperAdminAccess("Seul le super administrateur peut supprimer un produit.");
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

  async listCybercafeTariffs(): Promise<CybercafeTariff[]> {
    if (window.desktopApi) return window.desktopApi.listCybercafeTariffs();

    if (isSupabaseEnabled()) {
      const result = await getSupabaseClient()
        .from("cybercafe_tariffs")
        .select("id, name, unit_price, active, created_at, updated_at")
        .order("active", { ascending: false })
        .order("unit_price", { ascending: true });
      const rows = ensureData(result.data, result.error) as SupabaseCybercafeTariffRow[];
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        unitPrice: Number(row.unit_price),
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }

    return loadJson("walikale-web-cybercafe-tariffs", webSeedCybercafeTariffs);
  },

  async saveCybercafeTariff(draft: CybercafeTariffDraft): Promise<CybercafeTariff[]> {
    if (window.desktopApi) return window.desktopApi.saveCybercafeTariff(draft);

    const name = draft.name.trim();
    const unitPrice = Number(draft.unitPrice);
    if (!name) throw new Error("Le nom du tarif cybercafe est obligatoire.");
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error("Le prix du tarif doit etre superieur a zero.");

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      let tariffId = draft.id;
      if (draft.id) {
        const result = await client
          .from("cybercafe_tariffs")
          .update({ name, unit_price: unitPrice, active: draft.active !== false })
          .eq("id", draft.id);
        ensureData(result.data ?? [], result.error);
      } else {
        const result = await client
          .from("cybercafe_tariffs")
          .insert({ name, unit_price: unitPrice, active: draft.active !== false })
          .select("id")
          .single();
        tariffId = (ensureData(result.data, result.error) as { id: number }).id;
      }
      await insertSupabaseAuditLog(client, {
        action: draft.id ? "update" : "create",
        target_table: "cybercafe_tariffs",
        target_id: tariffId ?? 0,
        details: `${draft.id ? "Mise a jour" : "Creation"} tarif cybercafe ${name}`,
      });
      return this.listCybercafeTariffs();
    }

    const tariffs = loadJson("walikale-web-cybercafe-tariffs", webSeedCybercafeTariffs);
    const existing = tariffs.find((item) => item.id === draft.id);
    if (existing) {
      existing.name = name;
      existing.unitPrice = unitPrice;
      existing.active = draft.active !== false;
      existing.updatedAt = new Date().toISOString();
    } else {
      tariffs.unshift({ id: Date.now(), name, unitPrice, active: draft.active !== false, createdAt: now, updatedAt: now });
    }
    localStorage.setItem("walikale-web-cybercafe-tariffs", JSON.stringify(tariffs));
    return tariffs;
  },

  async listCybercafeSales(): Promise<CybercafeSale[]> {
    if (window.desktopApi) return window.desktopApi.listCybercafeSales();

    if (isSupabaseEnabled()) {
      const result = await getSupabaseClient()
        .from("cybercafe_sales")
        .select("id, tariff_id, quantity, unit_price, total_amount, sold_at, payment_method, note, tariff:cybercafe_tariffs(name), user:users(full_name)")
        .order("sold_at", { ascending: false })
        .order("id", { ascending: false });
      const rows = ensureData(result.data, result.error) as SupabaseCybercafeSaleRow[];
      return rows.map((row) => ({
        id: row.id,
        tariffId: row.tariff_id,
        tariffName: relationFirst(row.tariff)?.name ?? "Tarif cybercafe",
        unitPrice: Number(row.unit_price),
        quantity: row.quantity,
        amount: Number(row.total_amount),
        date: formatFrenchDate(row.sold_at),
        paymentMethod: row.payment_method,
        note: row.note ?? "",
        userName: relationFirst(row.user)?.full_name ?? "Utilisateur",
      }));
    }

    return loadJson<CybercafeSale[]>("walikale-web-cybercafe-sales", []);
  },

  async createCybercafeSale(draft: CybercafeSaleDraft): Promise<CybercafeSale[]> {
    if (window.desktopApi) return window.desktopApi.createCybercafeSale(draft);

    const tariffId = Number(draft.tariffId);
    const quantity = Number(draft.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Le nombre de connexions doit etre superieur a zero.");
    const tariffs = await this.listCybercafeTariffs();
    const tariff = tariffs.find((item) => item.id === tariffId && item.active);
    if (!tariff) throw new Error("Selectionnez un tarif cybercafe actif.");

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const result = await client
        .from("cybercafe_sales")
        .insert({
          tariff_id: tariff.id,
          quantity,
          unit_price: tariff.unitPrice,
          total_amount: tariff.unitPrice * quantity,
          sold_at: `${draft.date || new Date().toISOString().slice(0, 10)}T12:00:00.000Z`,
          payment_method: draft.paymentMethod || "Especes",
          note: draft.note.trim() || null,
        })
        .select("id")
        .single();
      const inserted = ensureData(result.data, result.error) as { id: number };
      await insertSupabaseAuditLog(client, {
        action: "create",
        target_table: "cybercafe_sales",
        target_id: inserted.id,
        details: `Recette cybercafe ${tariff.name}: ${quantity} connexion(s), ${tariff.unitPrice * quantity} FC`,
      });
      return this.listCybercafeSales();
    }

    const sales = loadJson<CybercafeSale[]>("walikale-web-cybercafe-sales", []);
    sales.unshift({
      id: Date.now(), tariffId: tariff.id, tariffName: tariff.name, unitPrice: tariff.unitPrice, quantity,
      amount: tariff.unitPrice * quantity, date: formatFrenchDate(`${draft.date}T12:00:00.000Z`),
      paymentMethod: draft.paymentMethod || "Especes", note: draft.note.trim(), userName: "Utilisateur web",
    });
    localStorage.setItem("walikale-web-cybercafe-sales", JSON.stringify(sales));
    return sales;
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

    return printBrowserSaleDocument(detail, "invoice");
  },

  async exportSalePdf(saleId: number): Promise<string | null> {
    if (window.desktopApi) {
      return window.desktopApi.exportSalePdf(saleId);
    }

    const detail = await this.getSaleDetail(saleId);
    if (!detail) {
      return null;
    }

    printBrowserSaleDocument(detail, "invoice");
    return "La facture s'ouvre dans une fenetre dediee. Utilisez ensuite le dialogue d'impression du navigateur pour enregistrer en PDF.";
  },

  async printSaleReceipt(saleId: number): Promise<boolean> {
    if (window.desktopApi) {
      return window.desktopApi.printSaleReceipt(saleId);
    }

    const detail = await this.getSaleDetail(saleId);
    if (!detail) {
      return false;
    }

    return printBrowserSaleDocument(detail, "receipt");
  },

  async exportSaleReceiptPdf(saleId: number): Promise<string | null> {
    if (window.desktopApi) {
      return window.desktopApi.exportSaleReceiptPdf(saleId);
    }

    const detail = await this.getSaleDetail(saleId);
    if (!detail) {
      return null;
    }

    printBrowserSaleDocument(detail, "receipt");
    return "Le ticket s'ouvre dans une fenetre dediee. Utilisez ensuite le dialogue d'impression du navigateur pour enregistrer en PDF.";
  },

  async exportExpenseReportPdf(html: string, fileName: string): Promise<string | null> {
    if (window.desktopApi) {
      return window.desktopApi.exportExpenseReportPdf(html, fileName);
    }

    return null;
  },

  async createBackup(): Promise<string | null> {
    if (window.desktopApi) {
      return window.desktopApi.createBackup();
    }

    return null;
  },

  async restoreBackup(): Promise<string | null> {
    if (window.desktopApi) {
      return window.desktopApi.restoreBackup();
    }

    return null;
  },

  async exportReplenishmentTemplateCsv(): Promise<string | null> {
    if (window.desktopApi) {
      return window.desktopApi.exportReplenishmentTemplateCsv();
    }

    return "modele-approvisionnement.csv";
  },

  async exportReplenishmentHistoryCsv(): Promise<string | null> {
    const rows = [
      ["date", "product_name", "quantity", "purchase_price", "selling_price", "supplier", "amount"],
      ...((await this.getSupplyHistory())
        .filter((item) => item.movementType === "reapprovisionnement")
        .map((item) => [item.date, item.product, item.quantity, item.purchasePrice, item.sellingPrice, item.supplier, item.amount])),
    ];
    const content = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, "\"\"")}"`).join(",")).join("\n");

    if (window.desktopApi) {
      return window.desktopApi.exportReplenishmentHistoryCsv();
    }

    const fileName = "approvisionnements.csv";
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return fileName;
  },

  async importReplenishmentCsv(): Promise<ReplenishmentImportSummary | null> {
    if (window.desktopApi) {
      return window.desktopApi.importReplenishmentCsv();
    }

    throw new Error("L'import CSV d'approvisionnement est disponible dans l'application desktop.");
  },

  async pruneActivityHistory(months: number): Promise<number> {
    if (window.desktopApi) {
      return window.desktopApi.pruneActivityHistory(months);
    }

    const normalizedMonths = Math.max(1, Math.floor(months));
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - normalizedMonths);
    cutoffDate.setHours(0, 0, 0, 0);
    const cutoffIso = cutoffDate.toISOString();

    if (isSupabaseEnabled()) {
      await ensureSuperAdminAccess("Seul le super administrateur peut nettoyer l'historique.");

      const client = getSupabaseClient();
      const selectResult = await client.from("audit_logs").select("id").lt("created_at", cutoffIso);
      const rows = ensureData(selectResult.data, selectResult.error) as { id: number }[];

      if (rows.length === 0) {
        return 0;
      }

      const deleteResult = await client.from("audit_logs").delete().lt("created_at", cutoffIso);
      ensureData(deleteResult.data, deleteResult.error);
      return rows.length;
    }

    await ensureSuperAdminAccess("Seul le super administrateur peut nettoyer l'historique.");
    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    const nextActivityHistory = activityHistory.filter((item) => {
      if (!item.timestamp) {
        return true;
      }
      return item.timestamp >= cutoffIso;
    });

    persistWebActivityHistory(nextActivityHistory);
    return activityHistory.length - nextActivityHistory.length;
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
      const replenishmentsResult = await client
        .from("replenishments")
        .select("id, lot_number, transport_total")
        .eq("cycle_id", cycleId);
      const rows = ensureData(movementsResult.data, movementsResult.error) as SupabaseHistoryRow[];
      const salesRows = ensureData(salesResult.data, salesResult.error) as Array<{
        id: number;
        client_id: number | null;
        client?: { name: string | null } | Array<{ name: string | null }> | null;
      }>;
      const replenishmentRows = ensureData(replenishmentsResult.data, replenishmentsResult.error) as SupabaseReplenishmentRow[];
      const salesMap = new Map(salesRows.map((row) => [row.id, row]));
      const replenishmentMap = new Map(replenishmentRows.map((row) => [row.id, row]));

      return rows.map((row) => {
        const sale = row.source_table === "sales" && row.source_id ? salesMap.get(row.source_id) : null;
        const replenishment =
          row.source_table === "replenishments" && row.source_id ? replenishmentMap.get(row.source_id) : null;
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
          lotNumber: replenishment?.lot_number ?? undefined,
          transportTotal: replenishment?.transport_total ?? undefined,
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
        timestamp: row.created_at,
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
      const [products, sales, cybercafeSales, expenses] = await Promise.all([
        this.listProducts(),
        this.listSales(),
        this.listCybercafeSales(),
        this.listExpenses(),
      ]);
      const totalSalesAmount = sales.reduce((sum, item) => sum + item.amount, 0) + cybercafeSales.reduce((sum, item) => sum + item.amount, 0);
      const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
      return {
        totalStock: products.reduce((sum, item) => sum + item.quantity, 0),
        totalProducts: products.length,
        dailySales: sales.length + cybercafeSales.length,
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
      const payload = {
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        address: draft.address.trim(),
        email: draft.email.trim(),
      };

      if (draft.id) {
        await ensureSuperAdminAccess("Seul le super administrateur peut modifier un client.");
        const updateResult = await client.from("clients").update(payload).eq("id", draft.id);
        ensureData(updateResult.data ?? [], updateResult.error);

        await insertSupabaseAuditLog(client, {
          action: "update",
          target_table: "clients",
          target_id: draft.id,
          details: `Mise a jour client ${payload.name}`,
        });
      } else {
        const insertResult = await client.from("clients").insert(payload);
        ensureData(insertResult.data ?? [], insertResult.error);

        await insertSupabaseAuditLog(client, {
          action: "create",
          target_table: "clients",
          details: `Creation client ${payload.name}`,
        });
      }

      return this.listClients();
    }

    const clients = loadJson("walikale-web-clients", webSeedClients);
    const payload = {
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      email: draft.email.trim(),
    };

    if (draft.id) {
      await ensureSuperAdminAccess("Seul le super administrateur peut modifier un client.");
      const existing = clients.find((item) => item.id === draft.id);
      if (existing) {
        existing.name = payload.name;
        existing.phone = payload.phone;
        existing.address = payload.address;
        existing.email = payload.email;
      }
    } else {
      clients.unshift({
        id: Date.now(),
        name: payload.name,
        phone: payload.phone,
        address: payload.address,
        email: payload.email,
        createdAt: new Date().toISOString(),
      });
    }

    localStorage.setItem("walikale-web-clients", JSON.stringify(clients));
    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    activityHistory.unshift({
      id: Date.now(),
      date: new Date().toLocaleString("fr-FR"),
      action: draft.id ? "Mise a jour" : "Creation",
      target: draft.id ? `Client #${draft.id}` : "Client",
      details: `${draft.id ? "Mise a jour" : "Creation"} client ${payload.name}`,
      user: "Utilisateur web",
    });
    persistWebActivityHistory(activityHistory);
    return clients;
  },

  async deleteClient(id: number): Promise<Client[]> {
    if (window.desktopApi) {
      return window.desktopApi.deleteClient(id);
    }

    if (isSupabaseEnabled()) {
      await ensureSuperAdminAccess("Seul le super administrateur peut supprimer un client.");
      const client = getSupabaseClient();
      await insertSupabaseAuditLog(client, {
        action: "delete",
        target_table: "clients",
        target_id: id,
        details: "Suppression client",
      });

      const deleteResult = await client.from("clients").delete().eq("id", id);
      ensureData(deleteResult.data ?? [], deleteResult.error);
      return this.listClients();
    }

    await ensureSuperAdminAccess("Seul le super administrateur peut supprimer un client.");
    const clients = loadJson("walikale-web-clients", webSeedClients).filter((item) => item.id !== id);
    localStorage.setItem("walikale-web-clients", JSON.stringify(clients));
    const activityHistory = loadJson("walikale-web-activity-history", webSeedActivityHistory);
    activityHistory.unshift({
      id: Date.now(),
      date: new Date().toLocaleString("fr-FR"),
      action: "Suppression",
      target: `Client #${id}`,
      details: "Suppression client",
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

  async saveUser(draft: UserDraft): Promise<{ users: AppUser[]; notice?: string }> {
    if (window.desktopApi) {
      const previousLocalStatus = await window.desktopApi.getSyncStatus();
      let cloudAlreadyAhead = false;

      if (supabase && (typeof navigator === "undefined" || navigator.onLine)) {
        try {
          await assertSupabaseSyncSchema();
          const previousCloudLastChangeAt = await getCloudLastChangeAt();
          cloudAlreadyAhead = Boolean(
            previousCloudLastChangeAt &&
              (!previousLocalStatus.lastSyncedAt ||
                new Date(previousCloudLastChangeAt).getTime() > new Date(previousLocalStatus.lastSyncedAt).getTime())
          );
        } catch (error) {
          console.warn("saveUser desktop preflight sync check failed", error);
        }
      }

      const users = await window.desktopApi.saveUser(draft);
      const normalizedEmail = draft.email.trim().toLowerCase();
      const createdLocalUser = users.find((user) => user.email.trim().toLowerCase() === normalizedEmail) ?? null;

      if (!supabase) {
        return {
          users,
          notice: "Utilisateur ajoute localement. Le cloud n'est pas configure sur ce poste.",
        };
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return {
          users,
          notice: "Utilisateur ajoute localement. Son compte web sera prepare au retour d'Internet.",
        };
      }

      try {
        await assertSupabaseSyncSchema();
        const provisionedUser = await provisionUserIntoSupabase(draft, {
          localUserId: createdLocalUser?.id,
        });
        const linkedUsers = await window.desktopApi.linkCloudUserProfile({
          authUserId: provisionedUser.authUserId,
          fullName: provisionedUser.fullName,
          username: provisionedUser.normalizedUsername,
          email: provisionedUser.normalizedEmail,
          role: draft.role,
          password: provisionedUser.password,
        });

        if (previousLocalStatus.pendingChanges === 0) {
          const syncedAt = (await getCloudLastChangeAt()) ?? new Date().toISOString();

          if (cloudAlreadyAhead) {
            const cloudSnapshot = await getCloudSnapshot();
            await window.desktopApi.importSyncSnapshot(cloudSnapshot);
          }

          await window.desktopApi.markSyncComplete(syncedAt);
        }

        return {
          users: previousLocalStatus.pendingChanges === 0 && cloudAlreadyAhead ? await window.desktopApi.listUsers() : linkedUsers,
          notice: "Utilisateur ajoute localement et compte web prepare pour les autres postes.",
        };
      } catch (error) {
        console.warn("saveUser desktop cloud provisioning failed", error);
        return {
          users,
          notice:
            error instanceof Error
              ? `Utilisateur ajoute localement. La preparation du compte web reste a finaliser: ${error.message}`
              : "Utilisateur ajoute localement. La preparation du compte web reste a finaliser.",
        };
      }
    }

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const provisionedUser = await provisionUserIntoSupabase(draft);

      await insertSupabaseAuditLog(client, {
        action: "create",
        target_table: "users",
        details: `Creation utilisateur ${provisionedUser.normalizedEmail}`,
      });

      return {
        users: await this.listUsers(),
        notice: "Utilisateur ajoute avec succes.",
      };
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
    return {
      users,
      notice: "Utilisateur ajoute avec succes.",
    };
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

    await ensureSuperAdminAccessForInventoryCycle();

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

    await ensureSuperAdminAccessForInventoryCycle();

    if (isSupabaseEnabled()) {
      const client = getSupabaseClient();
      const currentCycleId = await getCurrentSupabaseInventoryCycleId();
      const nextCycleId = currentCycleId + 1;
      await deleteSupabaseRows("sale_items");
      await deleteSupabaseRows("sale_service_items");
      await deleteSupabaseRows("stock_movements");
      await deleteSupabaseRows("sales");
      await deleteSupabaseRows("replenishments");
      await deleteSupabaseRows("initial_stocks");
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
    persistWeb(products, [], [], []);

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
