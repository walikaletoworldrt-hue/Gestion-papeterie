import { FormEvent, ReactNode, useEffect, useState } from "react";
import brandLogo from "../img/logo-walikale1.png";
import { repository } from "./lib/repository";
import type {
  ActivityHistoryItem,
  AppUser,
  Client,
  ClientDraft,
  DashboardMetrics,
  ExpenseDraft,
  ExpenseItem,
  InvoiceSeriesInfo,
  Product,
  ProductDraft,
  SaleDetail,
  SaleItemDraft,
  SaleServiceItemDraft,
  SaleDraft,
  SaleRecord,
  Service,
  ServiceDraft,
  SyncConflictPreview,
  SyncStatus,
  StockRow,
  SupplyHistoryItem,
  TabId,
  UserDraft,
  UserRole,
} from "./types";

const tabs: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "products", label: "Produits" },
  { id: "services", label: "Services" },
  { id: "clients", label: "Clients" },
  { id: "expenses", label: "Depenses" },
  { id: "initial-stock", label: "Stock initial" },
  { id: "replenishments", label: "Reapprovisionnement" },
  { id: "sales", label: "Ventes" },
  { id: "current-stock", label: "Stock actuel" },
  { id: "utilisateurs", label: "Utilisateurs" },
  { id: "history", label: "Historique" },
];

const emptyDraft: ProductDraft = {
  code: "",
  name: "",
  category: "General",
  purchasePrice: 0,
  sellingPrice: 0,
  quantity: 0,
  unit: "piece",
  alertThreshold: 0,
  supplier: "",
};

const emptySaleDraft: SaleDraft = {
  clientId: null,
  paymentMethod: "Especes",
  items: [],
  serviceItems: [],
};

const emptyServiceDraft: ServiceDraft = {
  name: "",
  category: "",
  unitPrice: 0,
  description: "",
  active: true,
};

const emptyClientDraft: ClientDraft = {
  name: "",
  phone: "",
  address: "",
  email: "",
};

const emptyUserDraft: UserDraft = {
  fullName: "",
  username: "",
  email: "",
  role: "Employe",
  password: "",
};

const emptyExpenseDraft: ExpenseDraft = {
  detail: "",
  nature: "",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  approvedBy: "",
  purpose: "",
};

const userRoles: UserRole[] = ["Administrateur", "Super admin", "Employe"];
type ModalId = "product" | "service" | "client" | "sale" | "user" | "saleDetail" | "password" | "replenishment" | "supplyHistory" | "expense" | "expenseReport";
type ToastState = {
  tone: "success" | "error" | "info";
  message: string;
} | null;

type ConfirmState =
  | {
      title: string;
      message: string;
      actionLabel: string;
      tone?: "danger" | "default";
      onConfirm: () => Promise<void> | void;
    }
  | null;
type ProductSortKey = "code" | "name" | "category" | "purchasePrice" | "sellingPrice" | "alertThreshold";
type PasswordModalState = {
  userId: number;
  title: string;
  requireCurrentPassword: boolean;
};

type ExpenseReportState = {
  totalSalesAmount: number;
  totalExpensesAmount: number;
  netBalance: number;
  productLines: Array<{
    productId: number;
    productName: string;
    category: string;
    quantity: number;
    amount: number;
  }>;
  serviceLines: Array<{
    category: string;
    quantity: number;
    amount: number;
  }>;
};

type SyncConflictState = {
  preview: SyncConflictPreview;
} | null;

type ReplenishmentDraft = {
  productId: number;
  quantity: number | "";
  purchasePrice: number;
  sellingPrice: number;
  supplier: string;
};

type SalesTrendPreset = "7d" | "30d" | "90d" | "month" | "year" | "custom";
type SalesTrendGrouping = "day" | "week" | "month" | "year";
type SalesTrendPoint = {
  key: string;
  label: string;
  amount: number;
  count: number;
  start: Date;
};
type SalesPeriodPreset = "all" | "today" | "7d" | "30d" | "90d" | "month" | "year" | "custom";

function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue % 1 === 0 ? safeValue.toFixed(0) : safeValue.toFixed(2)} FC`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function parseSaleDate(value: string) {
  const normalized = value.trim();
  const frenchMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (frenchMatch) {
    const [, day, month, year] = frenchMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfWeek(date: Date) {
  const normalized = startOfDay(date);
  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(normalized, diff);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function toInputDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTrendLabel(date: Date, grouping: SalesTrendGrouping) {
  if (grouping === "day") {
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  }

  if (grouping === "week") {
    return `Sem. ${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`;
  }

  if (grouping === "month") {
    return date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  }

  return String(date.getFullYear());
}

function extractHistorySubject(details: string) {
  const text = details.trim();
  const patterns = [
    /^Creation utilisateur\s+(.+)$/i,
    /^Creation client\s+(.+)$/i,
    /^Creation produit\s+(.+)$/i,
    /^Mise a jour produit\s+(.+)$/i,
    /^Mot de passe mis a jour pour\s+(.+)$/i,
    /^Changement de role vers\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return text;
}

function formatHistoryAction(entry: ActivityHistoryItem) {
  const details = entry.details.trim();
  const target = entry.target.toLowerCase();

  if (/mot de passe mis a jour/i.test(details)) {
    return "Mot de passe reinitialise";
  }

  if (/reinitialisation d'acces utilisateur/i.test(details)) {
    return "Acces utilisateur reinitialise";
  }

  if (/creation utilisateur/i.test(details)) {
    return "Utilisateur cree";
  }

  if (/creation client/i.test(details)) {
    return "Client cree";
  }

  if (/creation produit/i.test(details)) {
    return "Produit cree";
  }

  if (/mise a jour produit/i.test(details)) {
    return "Produit modifie";
  }

  if (/suppression produit/i.test(details)) {
    return "Produit supprime";
  }

  if (/suppression utilisateur/i.test(details)) {
    return "Utilisateur supprime";
  }

  if (/changement de role/i.test(details)) {
    return "Role utilisateur modifie";
  }

  if (/vente\s+/i.test(details) || target.includes("vente")) {
    return entry.action === "Suppression" ? "Vente supprimee" : "Vente enregistree";
  }

  if (target.includes("reapprovisionnement") || /reapprovisionnement/i.test(details)) {
    return "Reapprovisionnement ajoute";
  }

  if (target.includes("stock initial")) {
    return "Stock initial ajoute";
  }

  if (/nouvelle serie de facturation/i.test(details)) {
    return "Serie de facturation modifiee";
  }

  if (/reinitialisation du cycle de stock apres inventaire/i.test(details)) {
    return "Inventaire reinitialise";
  }

  if (target.includes("expense") || target.includes("depense") || /depense engagee/i.test(details)) {
    return "Depense engagee";
  }

  return entry.action;
}

function formatHistoryDetails(entry: ActivityHistoryItem) {
  const details = entry.details.trim();

  if (/mot de passe mis a jour pour/i.test(details)) {
    return extractHistorySubject(details);
  }

  if (/creation utilisateur/i.test(details)) {
    const subject = extractHistorySubject(details);
    return subject && subject !== details ? `${subject}${entry.target ? ` - ${entry.target.replace(/^Utilisateur\s*/i, "").trim()}` : ""}` : details;
  }

  if (/creation client/i.test(details) || /creation produit/i.test(details) || /mise a jour produit/i.test(details)) {
    return extractHistorySubject(details);
  }

  if (/changement de role vers/i.test(details)) {
    return `${entry.target} - ${details.replace(/^Changement de role vers\s+/i, "Role: ").trim()}`;
  }

  if (/vente\s+/i.test(details)) {
    return details;
  }

  return details;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getRoleBadgeClass(role: string) {
  if (role === "Super admin") {
    return "user-role-badge super-admin";
  }

  if (role === "Administrateur") {
    return "user-role-badge admin";
  }

  return "user-role-badge employee";
}

function createSaleLine(productId = 0): SaleItemDraft {
  return {
    productId,
    quantity: 1,
  };
}

function createSaleServiceLine(serviceId = 0): SaleServiceItemDraft {
  return {
    serviceId,
    quantity: 1,
  };
}

function createEmptyReplenishmentDraft(products: Product[]): ReplenishmentDraft {
  const firstProduct = products[0];

  return {
    productId: firstProduct?.id ?? 0,
    quantity: "",
    purchasePrice: firstProduct?.purchasePrice ?? 0,
    sellingPrice: firstProduct?.sellingPrice ?? 0,
    supplier: firstProduct?.supplier ?? "",
  };
}

const sessionStorageKey = "walikale-active-user-id";

function Modal({
  title,
  children,
  onClose,
  size = "default",
  backdropClassName = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "default" | "large";
  backdropClassName?: string;
}) {
  return (
    <div className={`modal-backdrop ${backdropClassName}`.trim()} role="presentation" onClick={onClose}>
      <div
        className={`modal-card ${size === "large" ? "large" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close-btn" type="button" onClick={onClose} aria-label="Fermer la fenetre">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        ...
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("replenishments");
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [currentStock, setCurrentStock] = useState<StockRow[]>([]);
  const [invoiceSeriesInfo, setInvoiceSeriesInfo] = useState<InvoiceSeriesInfo | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    available: false,
    online: true,
    lastSyncedAt: null,
    pendingChanges: 0,
  });
  const [syncBusy, setSyncBusy] = useState(false);
  const [supplyHistory, setSupplyHistory] = useState<SupplyHistoryItem[]>([]);
  const [activityHistory, setActivityHistory] = useState<ActivityHistoryItem[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalStock: 0,
    totalProducts: 0,
    dailySales: 18,
    suppliers: 0,
    totalSalesAmount: 0,
    totalExpenses: 0,
    netSalesAmount: 0,
  });
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(emptyServiceDraft);
  const [clientDraft, setClientDraft] = useState<ClientDraft>(emptyClientDraft);
  const [userDraft, setUserDraft] = useState<UserDraft>(emptyUserDraft);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(emptyExpenseDraft);
  const [expenseReport, setExpenseReport] = useState<ExpenseReportState | null>(null);
  const [saleDraft, setSaleDraft] = useState<SaleDraft>(emptySaleDraft);
  const [replenishmentDraft, setReplenishmentDraft] = useState<ReplenishmentDraft>(createEmptyReplenishmentDraft([]));
  const [saleDateDraft, setSaleDateDraft] = useState(() => new Date().toISOString().slice(0, 10));
  const [saleNoteDraft, setSaleNoteDraft] = useState("");
  const [saleError, setSaleError] = useState("");
  const [userError, setUserError] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<SaleDetail | null>(null);
  const [invoiceMessage, setInvoiceMessage] = useState("");
  const [activeModal, setActiveModal] = useState<ModalId | null>(null);
  const [productModalMode, setProductModalMode] = useState<"create" | "edit">("create");
  const [toast, setToast] = useState<ToastState>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [productSortKey, setProductSortKey] = useState<ProductSortKey>("name");
  const [productSortDirection, setProductSortDirection] = useState<"asc" | "desc">("asc");
  const [globalSearch, setGlobalSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [saleSearch, setSaleSearch] = useState("");
  const [salesPeriodPreset, setSalesPeriodPreset] = useState<SalesPeriodPreset>("all");
  const [salesPeriodStart, setSalesPeriodStart] = useState(() => toInputDateValue(addDays(new Date(), -29)));
  const [salesPeriodEnd, setSalesPeriodEnd] = useState(() => toInputDateValue(new Date()));
  const [salesTrendPreset, setSalesTrendPreset] = useState<SalesTrendPreset>("30d");
  const [salesTrendGrouping, setSalesTrendGrouping] = useState<SalesTrendGrouping>("day");
  const [salesTrendStart, setSalesTrendStart] = useState(() => toInputDateValue(addDays(new Date(), -29)));
  const [salesTrendEnd, setSalesTrendEnd] = useState(() => toInputDateValue(new Date()));
  const [stockSearch, setStockSearch] = useState("");
  const [stockCategoryFilter, setStockCategoryFilter] = useState("Tous");
  const [stockStatusFilter, setStockStatusFilter] = useState("Tous");
  const [userSearch, setUserSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [supplyHistorySearch, setSupplyHistorySearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [startupIssue, setStartupIssue] = useState("");
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [passwordModalState, setPasswordModalState] = useState<PasswordModalState | null>(null);
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [syncConflictState, setSyncConflictState] = useState<SyncConflictState>(null);
  const [expenseReportBusy, setExpenseReportBusy] = useState(false);
  const isSuperAdmin = currentUser?.role === "Super admin";
  const isAdministrator = currentUser?.role === "Administrateur";
  const canManageUsers = isSuperAdmin;
  const canManageInventory = isSuperAdmin || isAdministrator;
  const canManageExpenses = isSuperAdmin || isAdministrator;
  const canCreateClients = Boolean(currentUser);
  const canCreateSales = Boolean(currentUser);
  const visibleTabs = tabs.filter((tab) => {
    if (canManageUsers) {
      return true;
    }

    if (isAdministrator) {
      return !["utilisateurs", "history"].includes(tab.id);
    }

    return !["initial-stock", "replenishments", "utilisateurs", "history"].includes(tab.id);
  });

  useEffect(() => {
    const activeTabVisible = visibleTabs.some((tab) => tab.id === activeTab);
    if (!activeTabVisible && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [activeTab, visibleTabs]);

  async function loadData() {
    setLoading(true);
    setStartupIssue("");

    const settled = await Promise.allSettled([
      repository.getSyncStatus(),
      repository.listProducts(),
      repository.listServices(),
      repository.listClients(),
      repository.listExpenses(),
      repository.listUsers(),
      repository.listSales(),
      repository.getSupplyHistory(),
      repository.getActivityHistory(),
      repository.getDashboardMetrics(),
      repository.getCurrentStock(),
      repository.getInvoiceSeriesInfo(),
    ]);

    const errors = settled
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason)));

    const nextSyncStatus =
      settled[0].status === "fulfilled"
        ? settled[0].value
        : { available: Boolean(window.desktopApi), online: true, lastSyncedAt: null, pendingChanges: 0 };
    const nextProducts = settled[1].status === "fulfilled" ? settled[1].value : [];
    const nextServices = settled[2].status === "fulfilled" ? settled[2].value : [];
    const nextClients = settled[3].status === "fulfilled" ? settled[3].value : [];
    const nextExpenses = settled[4].status === "fulfilled" ? settled[4].value : [];
    const nextUsers = settled[5].status === "fulfilled" ? settled[5].value : [];
    const nextSales = settled[6].status === "fulfilled" ? settled[6].value : [];
    const nextHistory = settled[7].status === "fulfilled" ? settled[7].value : [];
    const nextActivityHistory = settled[8].status === "fulfilled" ? settled[8].value : [];
    const nextMetrics =
      settled[9].status === "fulfilled"
        ? settled[9].value
        : { totalStock: 0, totalProducts: 0, dailySales: 0, suppliers: 0, totalSalesAmount: 0, totalExpenses: 0, netSalesAmount: 0 };
    const nextCurrentStock = settled[10].status === "fulfilled" ? settled[10].value : [];
    const nextInvoiceSeriesInfo = settled[11].status === "fulfilled" ? settled[11].value : null;

    setProducts(nextProducts);
    setServices(nextServices);
    setClients(nextClients);
    setExpenses(nextExpenses);
    setUsers(nextUsers);
    setSales(nextSales);
    setSupplyHistory(nextHistory);
    setActivityHistory(nextActivityHistory);
    setMetrics(nextMetrics);
    setCurrentStock(nextCurrentStock);
    setInvoiceSeriesInfo(nextInvoiceSeriesInfo);
    setSyncStatus(nextSyncStatus);
    setSaleDraft((current) => ({
      ...current,
      clientId: current.clientId ?? nextClients[0]?.id ?? null,
      items:
        current.items.length > 0
          ? current.items.map((item) => ({
              ...item,
              productId: item.productId || nextProducts[0]?.id || 0,
            }))
          : nextProducts.length > 0
            ? [createSaleLine(nextProducts[0]?.id || 0)]
            : [],
      serviceItems:
        current.serviceItems.length > 0
          ? current.serviceItems.map((item) => ({
              ...item,
              serviceId: item.serviceId || nextServices[0]?.id || 0,
            }))
          : [],
    }));

    if (errors.length > 0) {
      console.error("Chargement initial incomplet:", errors);
      const message = errors[0] ?? "Une erreur est survenue pendant le chargement de l'application.";
      setStartupIssue(message);
      showToast("error", `Chargement incomplet: ${message}`);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (repository.hasSupabaseConfig && !window.desktopApi && !currentUser) {
      setLoading(false);
      return;
    }

    void loadData();
  }, [currentUser]);

  useEffect(() => {
    async function refreshSyncIndicator() {
      try {
        const nextStatus = await repository.getSyncStatus();
        setSyncStatus(nextStatus);
      } catch {
        setSyncStatus((current) => ({
          ...current,
          online: typeof navigator !== "undefined" ? navigator.onLine : current.online,
        }));
      }
    }

    function handleConnectivityChange() {
      void refreshSyncIndicator();
    }

    window.addEventListener("online", handleConnectivityChange);
    window.addEventListener("offline", handleConnectivityChange);

    return () => {
      window.removeEventListener("online", handleConnectivityChange);
      window.removeEventListener("offline", handleConnectivityChange);
    };
  }, []);

  useEffect(() => {
    if (!activeModal) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveModal(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeModal]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!repository.hasSupabaseConfig && users.length === 0) {
      setCurrentUser(null);
      return;
    }

    const savedUserId = window.sessionStorage.getItem(sessionStorageKey);

    if (!savedUserId && !repository.hasSupabaseConfig) {
      return;
    }

    let cancelled = false;

    void repository.restoreUserSession(savedUserId ? Number(savedUserId) : 0).then((restoredUser) => {
      if (cancelled) {
        return;
      }

      if (restoredUser) {
        setCurrentUser(restoredUser);
        return;
      }

      window.sessionStorage.removeItem(sessionStorageKey);
      setCurrentUser(null);
    });

    return () => {
      cancelled = true;
    };
  }, [users]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (visibleTabs.some((tab) => tab.id === activeTab)) {
      return;
    }

    setActiveTab("dashboard");
  }, [activeTab, currentUser, visibleTabs]);

  function closeModal() {
    setActiveModal(null);
    setSaleError("");
    setInvoiceMessage("");
    setReplenishmentDraft(createEmptyReplenishmentDraft(products));
    setServiceDraft(emptyServiceDraft);
    setExpenseDraft(emptyExpenseDraft);
    setExpenseReport(null);
    setSyncConflictState(null);
    setPasswordModalState(null);
    setPasswordDraft({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordError("");
  }

  function showToast(tone: "success" | "error" | "info", message: string) {
    setToast({ tone, message });
  }

  function showAccessDenied(message: string) {
    showToast("error", message);
  }

  function askConfirmation(state: NonNullable<ConfirmState>) {
    setConfirmState(state);
  }

  function handleGlobalSearchChange(value: string) {
    setGlobalSearch(value);
    setProductSearch(value);
    setServiceSearch(value);
    setClientSearch(value);
    setSaleSearch(value);
    setStockSearch(value);
    setExpenseSearch(value);
    setUserSearch(value);
    setHistorySearch(value);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");

    const query = normalizeText(loginIdentifier);
    const password = loginPassword.trim();

    if (!query) {
      setLoginError("Saisissez votre identifiant ou votre adresse e-mail.");
      return;
    }

    if (!password) {
      setLoginError("Saisissez votre mot de passe.");
      return;
    }

    try {
      setLoginBusy(true);
      const authenticatedUser = await repository.authenticateUser({
        identifier: loginIdentifier,
        password: loginPassword,
      });

      if (!authenticatedUser) {
        setLoginError("Identifiant ou mot de passe incorrect.");
        return;
      }

      await loadData();
      setCurrentUser(authenticatedUser);
      window.sessionStorage.setItem(sessionStorageKey, String(authenticatedUser.id));
      setLoginIdentifier("");
      setLoginPassword("");
      showToast("success", `Bienvenue ${authenticatedUser.fullName}.`);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Connexion impossible.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    await repository.logoutUser();
    window.sessionStorage.removeItem(sessionStorageKey);
    setCurrentUser(null);
    setActiveModal(null);
    setConfirmState(null);
    setLoginError("");
    setLoginIdentifier("");
    setLoginPassword("");
    showToast("info", "Vous avez ete deconnecte.");
  }

  function handleProductSort(key: ProductSortKey) {
    if (productSortKey === key) {
      setProductSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setProductSortKey(key);
    setProductSortDirection("asc");
  }

  function getProductSortIndicator(key: ProductSortKey) {
    if (productSortKey !== key) {
      return " <>";
    }

    return productSortDirection === "asc" ? " ^" : " v";
  }

  async function handleConfirmAction() {
    if (!confirmState) {
      return;
    }

    try {
      setConfirmBusy(true);
      await confirmState.onConfirm();
      setConfirmState(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  function openProductCreateModal() {
    if (!canManageInventory) {
      showAccessDenied("Votre profil ne permet pas d'ajouter un produit.");
      return;
    }

    setProductModalMode("create");
    setDraft(emptyDraft);
    setActiveModal("product");
  }

  function openServiceModal() {
    if (!canManageInventory) {
      showAccessDenied("Votre profil ne permet pas d'enregistrer un service.");
      return;
    }

    setServiceDraft(emptyServiceDraft);
    setActiveModal("service");
  }

  function openClientModal() {
    if (!canCreateClients) {
      showAccessDenied("Veuillez vous connecter pour ajouter un client.");
      return;
    }

    setClientDraft(emptyClientDraft);
    setActiveModal("client");
  }

  function openSaleModal() {
    if (!canCreateSales) {
      showAccessDenied("Veuillez vous connecter pour enregistrer une vente.");
      return;
    }

    setSaleError("");
    setSaleDateDraft(new Date().toISOString().slice(0, 10));
    setSaleNoteDraft("");
    setSelectedSaleDetail(null);
    setSaleDraft((current) => ({
      ...current,
      clientId: current.clientId ?? clients[0]?.id ?? null,
      items: current.items.length > 0 ? current.items : products.length > 0 ? [createSaleLine(products[0]?.id ?? 0)] : [],
      serviceItems: current.serviceItems.length > 0 ? current.serviceItems : [],
    }));
    setActiveModal("sale");
  }

  function openUserModal() {
    if (!canManageUsers) {
      showAccessDenied("Seul le super administrateur peut ajouter un utilisateur.");
      return;
    }

    setUserError("");
    setUserDraft(emptyUserDraft);
    setActiveModal("user");
  }

  function openReplenishmentModal(product?: Product) {
    if (!canManageInventory) {
      showAccessDenied("Votre profil ne permet pas d'enregistrer un approvisionnement.");
      return;
    }

    if (products.length === 0) {
      showAccessDenied("Ajoutez d'abord un produit avant de faire un approvisionnement.");
      return;
    }

    const selectedProduct = product ?? products[0];
    setReplenishmentDraft({
      productId: selectedProduct.id,
      quantity: "",
      purchasePrice: selectedProduct.purchasePrice,
      sellingPrice: selectedProduct.sellingPrice,
      supplier: selectedProduct.supplier,
    });
    setActiveModal("replenishment");
  }

  function openExpenseModal() {
    if (!canManageExpenses) {
      showAccessDenied("Votre profil ne permet pas d'enregistrer une depense.");
      return;
    }

    setExpenseDraft({
      ...emptyExpenseDraft,
      approvedBy: currentUser?.fullName ?? "",
      date: new Date().toISOString().slice(0, 10),
    });
    setActiveModal("expense");
  }

  async function openExpenseReportModal() {
    try {
      setExpenseReportBusy(true);
      const saleDetails = await Promise.all(sales.map((sale) => repository.getSaleDetail(sale.id)));
      const productTotals = new Map<number, { productId: number; productName: string; category: string; quantity: number; amount: number }>();
      const serviceTotals = new Map<string, { category: string; quantity: number; amount: number }>();

      saleDetails.filter((detail): detail is SaleDetail => Boolean(detail)).forEach((detail) => {
        detail.items.forEach((item) => {
          if (item.lineType === "service") {
            const category = item.productName.trim() || item.category?.trim() || "Service";
            const existingService = serviceTotals.get(category);
            serviceTotals.set(category, {
              category,
              quantity: (existingService?.quantity ?? 0) + item.quantity,
              amount: (existingService?.amount ?? 0) + item.lineTotal,
            });
          } else {
            const product = products.find((entry) => entry.id === item.productId);
            const category = product?.category?.trim() || item.category?.trim() || "Autre";
            const productKey = item.productId ?? 0;
            const existingProduct = productTotals.get(productKey);
            productTotals.set(productKey, {
              productId: productKey,
              productName: item.productName,
              category,
              quantity: (existingProduct?.quantity ?? 0) + item.quantity,
              amount: (existingProduct?.amount ?? 0) + item.lineTotal,
            });
          }
        });
      });

      const totalSalesAmount = sales.reduce((sum, sale) => sum + sale.amount, 0);
      const totalExpensesAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

      setExpenseReport({
        totalSalesAmount,
        totalExpensesAmount,
        netBalance: totalSalesAmount - totalExpensesAmount,
        productLines: [...productTotals.values()].sort((left, right) => right.amount - left.amount),
        serviceLines: [...serviceTotals.values()].sort((left, right) => right.amount - left.amount),
      });
      setActiveModal("expenseReport");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Impossible de generer le rapport complet.");
    } finally {
      setExpenseReportBusy(false);
    }
  }

  function openSupplyHistoryModal() {
    setSupplyHistorySearch("");
    setActiveModal("supplyHistory");
  }

  function openPasswordModal(user: AppUser, requireCurrentPassword: boolean) {
    const isOwnAccount = user.id === currentUser?.id;

    if (!isOwnAccount && !canManageUsers) {
      showAccessDenied("Seul le super administrateur peut reinitialiser le mot de passe d'un autre utilisateur.");
      return;
    }

    setPasswordError("");
    setPasswordDraft({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordModalState({
      userId: user.id,
      title: requireCurrentPassword
        ? "Changer mon mot de passe"
        : `Reinitialiser le mot de passe de ${user.fullName}`,
      requireCurrentPassword,
    });
    setActiveModal("password");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageInventory) {
      showAccessDenied("Votre profil ne permet pas de gerer les produits.");
      return;
    }

    if (!draft.name.trim() || !draft.supplier.trim()) {
      return;
    }

    await repository.saveProduct({
      ...draft,
      name: draft.name.trim(),
      supplier: draft.supplier.trim(),
      quantity: Number(draft.quantity),
      purchasePrice: Number(draft.purchasePrice),
      sellingPrice: Number(draft.sellingPrice),
      alertThreshold: Number(draft.alertThreshold ?? 0),
    });

    setDraft(emptyDraft);
    await loadData();
    closeModal();
    showToast("success", productModalMode === "edit" ? "Produit mis a jour avec succes." : "Produit enregistre avec succes.");
  }

  async function handleDelete(id: number) {
    if (!canManageInventory) {
      showAccessDenied("Votre profil ne permet pas de supprimer un produit.");
      return;
    }

    await repository.deleteProduct(id);
    await loadData();
    showToast("success", "Produit supprime avec succes.");
  }

  function handleEdit(product: Product) {
    if (!canManageInventory) {
      showAccessDenied("Votre profil ne permet pas de modifier un produit.");
      return;
    }

    setProductModalMode("edit");
    setDraft({
      code: product.code,
      name: product.name,
      category: product.category,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      quantity: product.quantity,
      unit: product.unit,
      alertThreshold: product.alertThreshold,
      supplier: product.supplier,
    });
    setActiveModal("product");
  }

  async function handleClientSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateClients) {
      showAccessDenied("Votre profil ne permet pas d'ajouter un client.");
      return;
    }

    if (!clientDraft.name.trim()) {
      return;
    }

    const nextClients = await repository.saveClient({
      name: clientDraft.name.trim(),
      phone: clientDraft.phone,
      address: clientDraft.address,
      email: clientDraft.email,
    });

    setClients(nextClients);
    setClientDraft(emptyClientDraft);
    closeModal();
    showToast("success", "Client enregistre avec succes.");
  }

  async function handleServiceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageInventory) {
      showToast("error", "Votre profil ne permet pas d'enregistrer un service.");
      return;
    }

    try {
      const nextServices = await repository.saveService(serviceDraft);
      setServices(nextServices);
      setServiceDraft(emptyServiceDraft);
      setActiveModal(null);
      showToast("success", "Service enregistre avec succes.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Impossible d'enregistrer ce service.");
    }
  }

  async function handleReplenishmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageInventory) {
      showAccessDenied("Votre profil ne permet pas d'enregistrer un approvisionnement.");
      return;
    }

    const selectedProduct = products.find((item) => item.id === replenishmentDraft.productId);

    if (!selectedProduct) {
      showToast("error", "Selectionnez un produit valide a approvisionner.");
      return;
    }

    const replenishmentQuantity = Number(replenishmentDraft.quantity);

    if (!replenishmentQuantity || replenishmentQuantity <= 0) {
      showToast("error", "La quantite d'approvisionnement doit etre superieure a zero.");
      return;
    }

    await repository.saveProduct({
      code: selectedProduct.code,
      name: selectedProduct.name,
      category: selectedProduct.category,
      purchasePrice: Number(replenishmentDraft.purchasePrice),
      sellingPrice: Number(replenishmentDraft.sellingPrice),
      quantity: replenishmentQuantity,
      unit: selectedProduct.unit,
      alertThreshold: selectedProduct.alertThreshold,
      supplier: replenishmentDraft.supplier.trim() || selectedProduct.supplier,
    });

    await loadData();
    closeModal();
    showToast("success", "Approvisionnement enregistre avec succes.");
  }

  async function handleExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageExpenses) {
      showAccessDenied("Votre profil ne permet pas d'enregistrer une depense.");
      return;
    }

    await repository.saveExpense({
      detail: expenseDraft.detail.trim(),
      nature: expenseDraft.nature.trim(),
      amount: Number(expenseDraft.amount),
      date: expenseDraft.date,
      approvedBy: expenseDraft.approvedBy.trim(),
      purpose: expenseDraft.purpose.trim(),
    });

    await loadData();
    closeModal();
    showToast("success", "Depense enregistree avec succes.");
  }

  async function handleSaleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaleError("");

    if (!canCreateSales) {
      setSaleError("Votre profil ne permet pas d'enregistrer une vente.");
      showToast("error", "Votre profil ne permet pas d'enregistrer une vente.");
      return;
    }

    if (saleHasInsufficientStock) {
      setSaleError("Stock insuffisant sur un ou plusieurs produits.");
      showToast("error", "Stock insuffisant sur un ou plusieurs produits.");
      return;
    }

    try {
      await repository.createSale({
        clientId: saleDraft.clientId,
        paymentMethod: saleDraft.paymentMethod,
        items: saleDraft.items.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
        })),
        serviceItems: saleDraft.serviceItems.map((item) => ({
          serviceId: Number(item.serviceId),
          quantity: Number(item.quantity),
        })),
      });

      setSaleDraft({
        clientId: clients[0]?.id ?? null,
        paymentMethod: "Especes",
        items: products.length > 0 ? [createSaleLine(products[0]?.id ?? 0)] : [],
        serviceItems: [],
      });
      await loadData();
      closeModal();
      showToast("success", "Vente enregistree avec succes.");
    } catch (error) {
      setSaleError(error instanceof Error ? error.message : "La vente a echoue.");
      showToast("error", error instanceof Error ? error.message : "La vente a echoue.");
    }
  }

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserError("");
    setUserMessage("");

    if (!canManageUsers) {
      setUserError("Seul le super administrateur peut ajouter un utilisateur.");
      showToast("error", "Seul le super administrateur peut ajouter un utilisateur.");
      return;
    }

    try {
      const nextUsers = await repository.saveUser({
        fullName: userDraft.fullName.trim(),
        username: userDraft.username.trim(),
        email: userDraft.email.trim(),
        role: userDraft.role,
        password: userDraft.password,
      });

      setUsers(nextUsers);
      setUserDraft(emptyUserDraft);
      setUserMessage("Utilisateur ajoute avec succes.");
      closeModal();
      showToast("success", "Utilisateur ajoute avec succes.");
    } catch (error) {
      setUserError(error instanceof Error ? error.message : "Impossible d'ajouter cet utilisateur.");
      showToast("error", error instanceof Error ? error.message : "Impossible d'ajouter cet utilisateur.");
    }
  }

  async function handleUserRoleChange(userId: number, role: UserRole) {
    setUserError("");
    setUserMessage("");

    if (!canManageUsers) {
      setUserError("Seul le super administrateur peut modifier les roles.");
      showToast("error", "Seul le super administrateur peut modifier les roles.");
      return;
    }

    try {
      const nextUsers = await repository.updateUserRole(userId, role);
      setUsers(nextUsers);
      setUserMessage("Role utilisateur mis a jour.");
      showToast("success", "Role utilisateur mis a jour.");
    } catch (error) {
      setUserError(error instanceof Error ? error.message : "Impossible de mettre a jour le role.");
      showToast("error", error instanceof Error ? error.message : "Impossible de mettre a jour le role.");
    }
  }

  async function handleRefreshUserAccess(userId: number) {
    setUserError("");
    setUserMessage("");

    if (!canManageUsers) {
      setUserError("Seul le super administrateur peut gerer les comptes.");
      showToast("error", "Seul le super administrateur peut gerer les comptes.");
      return;
    }

    try {
      const nextUsers = await repository.refreshUserAccess(userId);
      setUsers(nextUsers);
      setUserMessage("Acces utilisateur reinitialise.");
      showToast("success", "Acces utilisateur reinitialise.");
    } catch (error) {
      setUserError(error instanceof Error ? error.message : "Impossible de reinitialiser l'acces.");
      showToast("error", error instanceof Error ? error.message : "Impossible de reinitialiser l'acces.");
    }
  }

  async function handleDeleteUser(user: AppUser) {
    setUserError("");
    setUserMessage("");

    if (!canManageUsers) {
      setUserError("Seul le super administrateur peut supprimer un utilisateur.");
      showToast("error", "Seul le super administrateur peut supprimer un utilisateur.");
      return;
    }

    try {
      const nextUsers = await repository.deleteUser(user.id);
      setUsers(nextUsers);
      setUserMessage("Utilisateur supprime.");
      showToast("success", "Utilisateur supprime avec succes.");
    } catch (error) {
      setUserError(error instanceof Error ? error.message : "Impossible de supprimer cet utilisateur.");
      showToast("error", error instanceof Error ? error.message : "Impossible de supprimer cet utilisateur.");
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!passwordModalState) {
      return;
    }

    if (passwordModalState.userId !== currentUser?.id && !canManageUsers) {
      setPasswordError("Seul le super administrateur peut reinitialiser le mot de passe d'un autre utilisateur.");
      showToast("error", "Seul le super administrateur peut reinitialiser le mot de passe d'un autre utilisateur.");
      return;
    }

    setPasswordError("");

    if (!passwordDraft.newPassword.trim()) {
      setPasswordError("Saisissez le nouveau mot de passe.");
      return;
    }

    if (passwordDraft.newPassword.trim().length < 6) {
      setPasswordError("Le mot de passe doit contenir au moins 6 caracteres.");
      return;
    }

    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      setPasswordError("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    try {
      setPasswordBusy(true);
      const nextUsers = await repository.changeUserPassword({
        userId: passwordModalState.userId,
        currentPassword: passwordModalState.requireCurrentPassword ? passwordDraft.currentPassword : undefined,
        newPassword: passwordDraft.newPassword,
      });
      setUsers(nextUsers);
      closeModal();
      showToast("success", "Mot de passe mis a jour avec succes.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de modifier le mot de passe.";
      setPasswordError(message);
      showToast("error", message);
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleToggleUserActive(user: AppUser) {
    setUserError("");
    setUserMessage("");

    try {
      const nextUsers = await repository.setUserActive(user.id, !user.active);
      setUsers(nextUsers);
      setUserMessage(user.active ? "Compte desactive avec succes." : "Compte active avec succes.");
      showToast("success", user.active ? "Compte desactive avec succes." : "Compte active avec succes.");
    } catch (error) {
      setUserError(error instanceof Error ? error.message : "Impossible de modifier l'etat du compte.");
      showToast("error", error instanceof Error ? error.message : "Impossible de modifier l'etat du compte.");
    }
  }

  function updateSaleLine(index: number, patch: Partial<SaleItemDraft>) {
    setSaleDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  function addSaleLine() {
    setSaleDraft((current) => ({
      ...current,
      items: [...current.items, createSaleLine(products[0]?.id ?? 0)],
    }));
  }

  function removeSaleLine(index: number) {
    setSaleDraft((current) => {
      const nextItems = current.items.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        items: nextItems.length > 0 ? nextItems : [createSaleLine(products[0]?.id ?? 0)],
      };
    });
  }

  function updateSaleServiceLine(index: number, patch: Partial<SaleServiceItemDraft>) {
    setSaleDraft((current) => ({
      ...current,
      serviceItems: current.serviceItems.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  function addSaleServiceLine() {
    setSaleDraft((current) => ({
      ...current,
      serviceItems: [...current.serviceItems, createSaleServiceLine(services[0]?.id ?? 0)],
    }));
  }

  function removeSaleServiceLine(index: number) {
    setSaleDraft((current) => ({
      ...current,
      serviceItems: current.serviceItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  const salePreviewTotal = saleDraft.items.reduce((sum, line) => {
    const product = products.find((item) => item.id === line.productId);
    if (!product) {
      return sum;
    }

    return sum + product.sellingPrice * line.quantity;
  }, 0) + saleDraft.serviceItems.reduce((sum, line) => {
    const service = services.find((item) => item.id === line.serviceId);
    return sum + (service?.unitPrice ?? 0) * line.quantity;
  }, 0);
  const selectedSaleClient = clients.find((client) => client.id === saleDraft.clientId) ?? null;
  const saleClientCode = selectedSaleClient ? `CL-${String(selectedSaleClient.id).padStart(4, "0")}` : "";
  const saleUnitsTotal =
    saleDraft.items.reduce((sum, line) => sum + Number(line.quantity || 0), 0) +
    saleDraft.serviceItems.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const requestedProductQuantities = saleDraft.items.reduce((map, line) => {
    map.set(line.productId, (map.get(line.productId) ?? 0) + Number(line.quantity || 0));
    return map;
  }, new Map<number, number>());
  const saleHasInsufficientStock = saleDraft.items.some((line) => {
    const product = products.find((item) => item.id === line.productId);
    if (!product) {
      return false;
    }

    return (requestedProductQuantities.get(line.productId) ?? 0) > product.quantity;
  });

  const filteredProducts = products.filter((item) => {
    const query = normalizeText(productSearch);
    if (!query) return true;
    return [item.code, item.name, item.category, item.supplier].some((value) => normalizeText(value).includes(query));
  });
  const sortedFilteredProducts = [...filteredProducts].sort((left, right) => {
    const direction = productSortDirection === "asc" ? 1 : -1;

    if (productSortKey === "purchasePrice" || productSortKey === "sellingPrice" || productSortKey === "alertThreshold") {
      return (left[productSortKey] - right[productSortKey]) * direction;
    }

    return String(left[productSortKey]).localeCompare(String(right[productSortKey]), "fr", { sensitivity: "base" }) * direction;
  });
  const productCategoriesCount = new Set(filteredProducts.map((item) => item.category)).size;
  const lowStockProductsCount = filteredProducts.filter((item) => item.quantity <= item.alertThreshold).length;
  const totalProductStockValue = filteredProducts.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);
  const filteredServices = services.filter((item) => {
    const query = normalizeText(serviceSearch);
    if (!query) return true;
    return [item.name, item.category, item.description, item.active ? "actif" : "inactif"].some((value) =>
      normalizeText(String(value)).includes(query)
    );
  });
  const activeServicesCount = filteredServices.filter((item) => item.active).length;
  const serviceCategoriesCount = new Set(filteredServices.map((item) => item.category)).size;
  const replenishedProductNames = new Set(
    supplyHistory
      .filter((entry) => entry.movementType === "reapprovisionnement")
      .map((entry) => normalizeText(entry.product))
  );
  const allReplenishmentProducts = products.filter((item) => replenishedProductNames.has(normalizeText(item.name)));
  const replenishmentProducts = filteredProducts.filter((item) => replenishedProductNames.has(normalizeText(item.name)));

  const filteredClients = clients.filter((item) => {
    const query = normalizeText(clientSearch);
    if (!query) return true;
    return [item.name, item.phone, item.address, item.email].some((value) => normalizeText(value).includes(query));
  });
  const clientsWithEmailCount = filteredClients.filter((item) => item.email.trim().length > 0).length;
  const clientsWithPhoneCount = filteredClients.filter((item) => item.phone.trim().length > 0).length;

  const salesPeriodToday = startOfDay(new Date());
  let salesPeriodRangeStart: Date | null = null;
  let salesPeriodRangeEnd: Date | null = null;

  if (salesPeriodPreset === "today") {
    salesPeriodRangeStart = salesPeriodToday;
    salesPeriodRangeEnd = endOfDay(salesPeriodToday);
  } else if (salesPeriodPreset === "7d") {
    salesPeriodRangeStart = addDays(salesPeriodToday, -6);
    salesPeriodRangeEnd = endOfDay(salesPeriodToday);
  } else if (salesPeriodPreset === "30d") {
    salesPeriodRangeStart = addDays(salesPeriodToday, -29);
    salesPeriodRangeEnd = endOfDay(salesPeriodToday);
  } else if (salesPeriodPreset === "90d") {
    salesPeriodRangeStart = addDays(salesPeriodToday, -89);
    salesPeriodRangeEnd = endOfDay(salesPeriodToday);
  } else if (salesPeriodPreset === "month") {
    salesPeriodRangeStart = startOfMonth(salesPeriodToday);
    salesPeriodRangeEnd = endOfDay(salesPeriodToday);
  } else if (salesPeriodPreset === "year") {
    salesPeriodRangeStart = startOfYear(salesPeriodToday);
    salesPeriodRangeEnd = endOfDay(salesPeriodToday);
  } else if (salesPeriodPreset === "custom") {
    const customStart = parseSaleDate(salesPeriodStart);
    const customEnd = parseSaleDate(salesPeriodEnd);
    salesPeriodRangeStart = customStart ? startOfDay(customStart) : null;
    salesPeriodRangeEnd = customEnd ? endOfDay(customEnd) : null;
  }

  if (salesPeriodRangeStart && salesPeriodRangeEnd && salesPeriodRangeStart.getTime() > salesPeriodRangeEnd.getTime()) {
    const swappedStart = startOfDay(salesPeriodRangeEnd);
    salesPeriodRangeEnd = endOfDay(salesPeriodRangeStart);
    salesPeriodRangeStart = swappedStart;
  }

  const filteredSales = sales.filter((item) => {
    const query = normalizeText(saleSearch);
    const matchesQuery =
      !query ||
      [item.reference, item.clientName, item.paymentMethod, item.date, item.status].some((value) =>
        normalizeText(String(value)).includes(query)
      );

    const saleDate = parseSaleDate(item.date);
    const matchesPeriod =
      !salesPeriodRangeStart ||
      !salesPeriodRangeEnd ||
      (saleDate !== null &&
        saleDate.getTime() >= salesPeriodRangeStart.getTime() &&
        saleDate.getTime() <= salesPeriodRangeEnd.getTime());

    return matchesQuery && matchesPeriod;
  });
  const totalSalesAmount = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalSalesLines = filteredSales.reduce((sum, sale) => sum + sale.itemsCount, 0);
  const totalCounterSales = filteredSales.filter((sale) => sale.clientName === "Client comptoir").length;
  const salesPeriodExpensesTotal = expenses
    .filter((item) => {
      if (!salesPeriodRangeStart || !salesPeriodRangeEnd) {
        return true;
      }

      const expenseDate = parseSaleDate(item.date);
      return (
        expenseDate !== null &&
        expenseDate.getTime() >= salesPeriodRangeStart.getTime() &&
        expenseDate.getTime() <= salesPeriodRangeEnd.getTime()
      );
    })
    .reduce((sum, item) => sum + item.amount, 0);
  const salesPeriodNetAmount = totalSalesAmount - salesPeriodExpensesTotal;

  const salesTrendToday = startOfDay(new Date());
  let salesTrendRangeStart = addDays(salesTrendToday, -29);
  let salesTrendRangeEnd = endOfDay(salesTrendToday);

  if (salesTrendPreset === "7d") {
    salesTrendRangeStart = addDays(salesTrendToday, -6);
  } else if (salesTrendPreset === "30d") {
    salesTrendRangeStart = addDays(salesTrendToday, -29);
  } else if (salesTrendPreset === "90d") {
    salesTrendRangeStart = addDays(salesTrendToday, -89);
  } else if (salesTrendPreset === "month") {
    salesTrendRangeStart = startOfMonth(salesTrendToday);
  } else if (salesTrendPreset === "year") {
    salesTrendRangeStart = startOfYear(salesTrendToday);
  } else {
    const customStart = parseSaleDate(salesTrendStart);
    const customEnd = parseSaleDate(salesTrendEnd);
    salesTrendRangeStart = customStart ? startOfDay(customStart) : addDays(salesTrendToday, -29);
    salesTrendRangeEnd = customEnd ? endOfDay(customEnd) : endOfDay(salesTrendToday);
  }

  if (salesTrendRangeStart.getTime() > salesTrendRangeEnd.getTime()) {
    const swappedStart = startOfDay(salesTrendRangeEnd);
    salesTrendRangeEnd = endOfDay(salesTrendRangeStart);
    salesTrendRangeStart = swappedStart;
  }

  const salesTrendGroups = new Map<string, SalesTrendPoint>();
  for (const sale of sales) {
    const saleDate = parseSaleDate(sale.date);
    if (!saleDate) {
      continue;
    }

    const saleTime = saleDate.getTime();
    if (saleTime < salesTrendRangeStart.getTime() || saleTime > salesTrendRangeEnd.getTime()) {
      continue;
    }

    let bucketStart = startOfDay(saleDate);
    if (salesTrendGrouping === "week") {
      bucketStart = startOfWeek(saleDate);
    } else if (salesTrendGrouping === "month") {
      bucketStart = startOfMonth(saleDate);
    } else if (salesTrendGrouping === "year") {
      bucketStart = startOfYear(saleDate);
    }

    const key = `${salesTrendGrouping}-${toInputDateValue(bucketStart)}`;
    const existing = salesTrendGroups.get(key);
    if (existing) {
      existing.amount += sale.amount;
      existing.count += 1;
    } else {
      salesTrendGroups.set(key, {
        key,
        label: getTrendLabel(bucketStart, salesTrendGrouping),
        amount: sale.amount,
        count: 1,
        start: bucketStart,
      });
    }
  }

  const salesTrendData = Array.from(salesTrendGroups.values()).sort((left, right) => left.start.getTime() - right.start.getTime());
  const salesTrendMaxAmount = salesTrendData.reduce((max, item) => Math.max(max, item.amount), 0);
  const salesTrendTotalAmount = salesTrendData.reduce((sum, item) => sum + item.amount, 0);
  const salesTrendSalesCount = salesTrendData.reduce((sum, item) => sum + item.count, 0);
  const salesTrendAverageTicket = salesTrendSalesCount > 0 ? salesTrendTotalAmount / salesTrendSalesCount : 0;
  const salesTrendPeak = salesTrendData.reduce<SalesTrendPoint | null>(
    (current, item) => (!current || item.amount > current.amount ? item : current),
    null
  );

  const stockRows = currentStock.map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const initialStock = supplyHistory
      .filter((entry) => entry.product === item.productName && entry.movementType === "stock_initial")
      .reduce((sum, entry) => sum + entry.quantity, 0);
    const replenishments = supplyHistory
      .filter((entry) => entry.product === item.productName && entry.movementType === "reapprovisionnement")
      .reduce((sum, entry) => sum + entry.quantity, 0);
    const salesUnits = supplyHistory
      .filter((entry) => entry.product === item.productName && entry.movementType === "vente")
      .reduce((sum, entry) => sum + entry.quantity, 0);
    const status =
      item.currentStock <= 0 ? "Rupture" : item.currentStock <= item.alertThreshold ? "Stock faible" : "OK";

    return {
      ...item,
      category: product?.category ?? "General",
      initialStock,
      replenishments,
      salesUnits,
      averagePurchasePrice: product?.purchasePrice ?? 0,
      sellingPrice: product?.sellingPrice ?? 0,
      stockValue: item.currentStock * (product?.purchasePrice ?? 0),
      potentialRevenue: item.currentStock * (product?.sellingPrice ?? 0),
      potentialMargin: item.currentStock * ((product?.sellingPrice ?? 0) - (product?.purchasePrice ?? 0)),
      unit: product?.unit ?? "piece",
      status,
    };
  });

  const stockCategories = ["Tous", ...new Set(stockRows.map((item) => item.category))];
  const filteredStockRows = stockRows.filter((item) => {
    const query = normalizeText(stockSearch);
    const matchesQuery =
      !query ||
      [item.productName, item.category, item.unit, item.status].some((value) => normalizeText(String(value)).includes(query));
    const matchesCategory = stockCategoryFilter === "Tous" || item.category === stockCategoryFilter;
    const matchesStatus = stockStatusFilter === "Tous" || item.status === stockStatusFilter;
    return matchesQuery && matchesCategory && matchesStatus;
  });
  const stockLowCount = filteredStockRows.filter((item) => item.currentStock > 0 && item.currentStock <= item.alertThreshold).length;
  const stockZeroCount = filteredStockRows.filter((item) => item.currentStock <= 0).length;
  const stockHealthyCount = filteredStockRows.filter((item) => item.currentStock > item.alertThreshold).length;
  const stockUnitsTotal = filteredStockRows.reduce((sum, item) => sum + item.currentStock, 0);
  const stockValueTotal = filteredStockRows.reduce((sum, item) => sum + item.stockValue, 0);
  const stockPotentialRevenueTotal = filteredStockRows.reduce((sum, item) => sum + item.potentialRevenue, 0);
  const stockPotentialMarginTotal = filteredStockRows.reduce((sum, item) => sum + item.potentialMargin, 0);
  const replenishmentSpendTotal = supplyHistory
    .filter((entry) => entry.movementType === "reapprovisionnement")
    .reduce((sum, entry) => sum + entry.amount, 0);

  function handleExportStockCsv() {
    const rows = [
      [
        "Produit",
        "Categorie",
        "Stock initial",
        "Reappro.",
        "Ventes",
        "Stock actuel",
        ...(isSuperAdmin ? ["P.A. moyen", "Valeur du stock"] : []),
        "Unite",
        "Seuil",
        "Statut",
      ].join(";"),
      ...filteredStockRows.map((item) =>
        [
          item.productName,
          item.category,
          item.initialStock,
          item.replenishments,
          item.salesUnits,
          item.currentStock,
          ...(isSuperAdmin ? [item.averagePurchasePrice.toFixed(2), item.stockValue.toFixed(2)] : []),
          item.unit,
          item.alertThreshold,
          item.status,
        ].join(";")
      ),
    ].join("\n");

    downloadCsv("stock-actuel.csv", rows);
    showToast("success", "Export CSV du stock genere.");
  }

  async function handleAdvanceInvoiceSeries() {
    if (!canManageInventory) {
      showAccessDenied("Votre profil ne permet pas de changer la serie des factures.");
      return;
    }

    const nextInfo = await repository.advanceInvoiceSeries();
    setInvoiceSeriesInfo(nextInfo);
    await loadData();
    showToast("success", `La numerotation passe maintenant en serie ${nextInfo.seriesLabel}${nextInfo.yearCode}.`);
  }

  async function handleResetInventoryCycle() {
    if (!canManageInventory) {
      showAccessDenied("Votre profil ne permet pas de reinitialiser le stock apres inventaire.");
      return;
    }

    await repository.resetInventoryCycle();
    await loadData();
    showToast("success", "Le stock a ete reinitialise pour un nouveau cycle d'inventaire.");
  }

  async function handleSyncNow() {
    try {
      setSyncBusy(true);
      const currentSyncStatus = await repository.getSyncStatus();

      if (currentSyncStatus.pendingChanges > 0 && currentSyncStatus.cloudHasChanges) {
        const preview = await repository.getSyncConflictPreview();
        setSyncConflictState({
          preview,
        });
        return;
      }

      const nextStatus = await repository.syncDesktopToCloud();
      setSyncStatus(nextStatus);
      showToast("success", "Synchronisation vers Supabase terminee.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Synchronisation impossible.");
    } finally {
      setSyncBusy(false);
    }
  }

  async function handleKeepLocalDuringConflict() {
    try {
      setSyncBusy(true);
      const nextStatus = await repository.syncDesktopToCloud(true);
      setSyncStatus(nextStatus);
      setSyncConflictState(null);
      showToast("success", "Les donnees locales ont ete poussees vers Supabase.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Synchronisation impossible.");
    } finally {
      setSyncBusy(false);
    }
  }

  async function handleTakeCloudDuringConflict() {
    try {
      setSyncBusy(true);
      const nextStatus = await repository.pullCloudToDesktop();
      setSyncStatus(nextStatus);
      setSyncConflictState(null);
      await loadData();
      showToast("success", "Les donnees du cloud ont remplace les donnees locales.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Recuperation du cloud impossible.");
    } finally {
      setSyncBusy(false);
    }
  }

  function handleSyncButtonClick() {
    if (!window.desktopApi) {
      showToast("error", "La synchronisation locale vers Supabase est reservee a l'application desktop.");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      showToast("info", "Mode hors ligne actif. Vous pouvez continuer a travailler localement puis synchroniser des que la connexion revient.");
      return;
    }

    if (!repository.hasSupabaseConfig) {
      showToast("error", "Supabase n'est pas configure sur cette version de l'application. Ajoutez la configuration puis regenerez l'executable.");
      return;
    }

    void handleSyncNow();
  }

  const filteredUsers = users.filter((item) => {
    const query = normalizeText(userSearch);
    if (!query) return true;
    return [item.fullName, item.username, item.email, item.role].some((value) => normalizeText(value).includes(query));
  });
  const filteredExpenses = expenses.filter((item) => {
    const query = normalizeText(expenseSearch);
    if (!query) return true;
    return [item.detail, item.nature, item.requestedBy, item.approvedBy, item.purpose, item.date, String(item.amount)].some((value) =>
      normalizeText(String(value)).includes(query)
    );
  });
  const expensesTotal = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
  const adminUsersCount = filteredUsers.filter((item) => item.role !== "Employe").length;
  const activeUsersCount = filteredUsers.filter((item) => item.active).length;

  const filteredHistory = activityHistory.filter((item) => {
    const query = normalizeText(historySearch);
    if (!query) return true;
    return [item.action, item.target, item.details, item.user, item.date].some((value) =>
      normalizeText(String(value)).includes(query)
    );
  });
  const formattedHistory = filteredHistory.map((entry) => ({
    ...entry,
    formattedAction: formatHistoryAction(entry),
    formattedDetails: formatHistoryDetails(entry),
  }));
  const replenishmentHistoryEntries = supplyHistory.filter((item) => item.movementType === "reapprovisionnement");
  const filteredReplenishmentHistory = replenishmentHistoryEntries.filter((item) => {
    const query = normalizeText(supplyHistorySearch);
    if (!query) return true;
    return [item.product, item.supplier, item.date, String(item.quantity), String(item.amount)].some((value) =>
      normalizeText(String(value)).includes(query)
    );
  });
  const replenishmentHistoryUnits = filteredReplenishmentHistory.reduce((sum, item) => sum + item.quantity, 0);
  const replenishmentHistoryAmount = filteredReplenishmentHistory.reduce((sum, item) => sum + item.amount, 0);
  const dashboardLowStockCount = currentStock.filter((item) => item.currentStock <= item.alertThreshold).length;
  const dashboardCounterSalesCount = sales.filter((sale) => sale.clientName === "Client comptoir").length;
  const expenseReportTopProduct = expenseReport?.productLines[0] ?? null;
  const expenseReportTopCategory = expenseReport?.serviceLines[0] ?? null;
  const expenseReportGeneratedAt = new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (loading && users.length === 0) {
    return (
      <div className="login-shell">
        <div className="login-panel loading-panel">
          <div className="login-brand-mark loading-brand-mark">
            <img className="login-logo" src={brandLogo} alt="Logo Walikale to World" />
          </div>
          <p className="login-kicker">Ouverture en cours</p>
          <h1>Gestion papeterie Walikale to world</h1>
          <p className="login-copy">Preparation de votre espace de travail...</p>
          {startupIssue ? <p className="error-text startup-error">{startupIssue}</p> : null}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    const activeAccounts = users.filter((item) => item.active);

    return (
      <div className="login-shell">
        <article className="login-panel login-panel-standalone">
          <div className="login-brand-mark login-brand-banner">
            <img className="login-logo" src={brandLogo} alt="Logo Walikale to World" />
          </div>
          <div className="login-panel-header">
            <h1 className="login-title">WALIKALE TO WORLD</h1>
            <p className="login-subtitle">Gestion des stocks</p>
          </div>

          <div className="login-panel-header login-panel-section">
            <h2>Connexion</h2>
            <p>Connectez-vous pour acceder a votre espace de travail.</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Adresse e-mail ou identifiant
              <input
                value={loginIdentifier}
                onChange={(event) => setLoginIdentifier(event.target.value)}
                placeholder="votre@email.com"
                autoComplete="username"
              />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
              />
            </label>

            {loginError ? <p className="error-text">{loginError}</p> : null}
            {startupIssue ? <p className="error-text startup-error">{startupIssue}</p> : null}

            <button
              className="primary-btn login-submit-btn"
              type="submit"
              disabled={loginBusy || (!repository.hasSupabaseConfig && activeAccounts.length === 0)}
            >
              {loginBusy ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          {!repository.hasSupabaseConfig && activeAccounts.length === 0 ? (
            <EmptyState
              title="Aucun compte actif"
              description="Ajoutez d'abord un utilisateur pour pouvoir ouvrir un espace de travail."
            />
          ) : null}
        </article>

        <div className="login-footer">
          <span>Developpeur : Ir Roberto</span>
          <span>Contact : +243 812681339</span>
          <span>walikaletoworld.rt@gmail.com</span>
        </div>

        {toast ? (
          <div className={`toast ${toast.tone}`} role="status" aria-live="polite">
            {toast.message}
          </div>
        ) : null}
      </div>
    );
  }

  async function handleSelectSale(saleId: number) {
    const detail = await repository.getSaleDetail(saleId);
    setSelectedSaleDetail(detail);
    setInvoiceMessage("");
    setActiveModal("saleDetail");
  }

  async function handlePrintInvoice() {
    if (!selectedSaleDetail) {
      return;
    }

    try {
      const success = await repository.printSaleInvoice(selectedSaleDetail.id);
      setInvoiceMessage(success ? "La fenetre de facture a ete ouverte avec les actions d'impression." : "Impossible d'imprimer cette facture.");
      showToast(
        success ? "success" : "error",
        success ? "La fenetre de facture a ete ouverte avec les actions d'impression." : "Impossible d'imprimer cette facture."
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'imprimer cette facture.";
      setInvoiceMessage(message);
      showToast("error", message);
    }
  }

  async function handleExportInvoicePdf() {
    if (!selectedSaleDetail) {
      return;
    }

    try {
      const result = await repository.exportSalePdf(selectedSaleDetail.id);
      setInvoiceMessage(result ? `PDF exporte: ${result}` : "Export PDF annule ou impossible.");
      showToast(result ? "success" : "info", result ? `PDF exporte: ${result}` : "Export PDF annule ou impossible.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'exporter cette facture en PDF.";
      setInvoiceMessage(message);
      showToast("error", message);
    }
  }

  async function handlePrintReceipt() {
    if (!selectedSaleDetail) {
      return;
    }

    try {
      const success = await repository.printSaleReceipt(selectedSaleDetail.id);
      const message = success
        ? "La fenetre du ticket 80 mm a ete ouverte pour impression XPrinter."
        : "Impossible d'imprimer ce ticket 80 mm.";
      setInvoiceMessage(message);
      showToast(success ? "success" : "error", message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'imprimer ce ticket 80 mm.";
      setInvoiceMessage(message);
      showToast("error", message);
    }
  }

  async function handleExportReceiptPdf() {
    if (!selectedSaleDetail) {
      return;
    }

    try {
      const result = await repository.exportSaleReceiptPdf(selectedSaleDetail.id);
      const message = result ? `Ticket PDF exporte: ${result}` : "Export du ticket PDF annule ou impossible.";
      setInvoiceMessage(message);
      showToast(result ? "success" : "info", message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'exporter ce ticket 80 mm en PDF.";
      setInvoiceMessage(message);
      showToast("error", message);
    }
  }

  return (
    <div className={`app-shell ${activeModal === "expenseReport" ? "printing-expense-report" : ""}`.trim()}>
      <header className="topbar">
        <div className="topbar-main">
          <div className="brand">
            <div className="brand-logo-shell brand-logo-banner">
              <img className="brand-logo" src={brandLogo} alt="Walikale to World Tech Adapt Hub" />
            </div>
            <div className="brand-copy">
              <p className="brand-title">Walikale to World</p>
              <p className="brand-subtitle">Gestion des stocks</p>
            </div>
          </div>

          <label className="global-search-shell" aria-label="Recherche globale">
            <span className="global-search-icon" aria-hidden="true">
              Rechercher
            </span>
            <input
              className="global-search-input"
              value={globalSearch}
              onChange={(event) => handleGlobalSearchChange(event.target.value)}
              placeholder="Recherche globale..."
            />
          </label>

          <div className="topbar-actions">
            <span className={`status-chip ${syncStatus.online && repository.hasSupabaseConfig ? "online" : ""}`}>
              {!repository.hasSupabaseConfig ? "Sync non configuree" : syncStatus.online ? "En ligne" : "Hors ligne"}
            </span>
            <button className="topbar-action-btn" type="button" disabled>
              {syncStatus.cloudHasChanges
                ? "Cloud modifie"
                : syncStatus.lastSyncedAt
                  ? `Sync ${syncStatus.pendingChanges > 0 ? `(${syncStatus.pendingChanges})` : "a jour"}`
                  : "Sync non lancee"}
            </button>
            <button
              className="topbar-action-btn"
              type="button"
              onClick={handleSyncButtonClick}
              disabled={syncBusy}
            >
              {syncBusy ? "Synchronisation..." : "Synchroniser"}
            </button>
            <div className="user-inline-card">
              <span className="user-inline-name">{currentUser.email}</span>
              <span className="role-pill">{currentUser.role}</span>
            </div>
            <button className="logout-square-btn" type="button" onClick={() => void handleLogout()} aria-label="Deconnexion">
              Sortir
            </button>
          </div>
        </div>

        <div className="topbar-tabs">
          <nav className="nav-tabs" aria-label="Navigation principale">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="content">
        {activeTab === "dashboard" && (
          <>
            <section className="hero-card">
              <div>
                <p className="eyebrow">Vue d'ensemble</p>
                <h1>Pilotage central de votre papeterie</h1>
                <p className="hero-copy">
                  Retrouvez dans un seul espace le suivi des produits, des clients, du stock,
                  des ventes, des utilisateurs et des activites recentes.
                </p>
              </div>

              <div className="dashboard-summary">
                <article className="metric-card">
                  <span>Unites en stock</span>
                  <strong>{metrics.totalStock.toLocaleString("fr-FR")}</strong>
                </article>
                <article className="metric-card">
                  <span>Produits suivis</span>
                  <strong>{metrics.totalProducts}</strong>
                </article>
                <article className="metric-card">
                  <span>Ventes du jour</span>
                  <strong>{metrics.dailySales}</strong>
                </article>
                <article className="metric-card">
                  <span>Montant vendu</span>
                  <strong>{formatCurrency(metrics.totalSalesAmount ?? 0)}</strong>
                </article>
                <article className="metric-card warning">
                  <span>Depenses engagees</span>
                  <strong>{formatCurrency(metrics.totalExpenses ?? 0)}</strong>
                </article>
                <article className="metric-card success">
                  <span>Solde net</span>
                  <strong>{formatCurrency(metrics.netSalesAmount ?? 0)}</strong>
                </article>
                <article className="metric-card">
                  <span>Fournisseurs</span>
                  <strong>{metrics.suppliers}</strong>
                </article>
                <article className="metric-card warning">
                  <span>Alertes stock</span>
                  <strong>{dashboardLowStockCount}</strong>
                </article>
                <article className="metric-card neutral">
                  <span>Clients comptoir</span>
                  <strong>{dashboardCounterSalesCount}</strong>
                </article>
              </div>
            </section>

            <section className="dashboard-grid">
              <article className="panel-card">
                <div className="panel-header">
                  <h2>Fonctionnement</h2>
                </div>
                <div className="status-stack">
                  <span className="pill success">{repository.isDesktop ? "Pret a servir" : "Disponible partout"}</span>
                  <span className="pill info">{repository.hasSupabaseConfig ? "Donnees securisees" : "Controle recommande"}</span>
                  <span className="pill neutral">{loading ? "Mise a jour en cours..." : "Tout est en ordre"}</span>
                </div>
              </article>
              <article className="panel-card">
                <div className="panel-header">
                  <h2>Synthese d'activite</h2>
                </div>
                <ul className="detail-list">
                  <li>{products.length} produits suivis.</li>
                  <li>{clients.length} clients enregistres.</li>
                  <li>{users.length} utilisateurs disponibles.</li>
                  <li>{currentStock.filter((item) => item.currentStock <= item.alertThreshold).length} alertes de stock.</li>
                </ul>
              </article>
              <article className="panel-card">
                <div className="panel-header">
                  <h2>Points d'attention</h2>
                </div>
                <div className="dashboard-alerts">
                  <span className="dashboard-alert-chip warning">{dashboardLowStockCount} stock(s) a surveiller</span>
                  <span className="dashboard-alert-chip success">{metrics.dailySales} vente(s) aujourd'hui</span>
                  <span className="dashboard-alert-chip neutral">{users.length} utilisateur(s) disponibles</span>
                </div>
              </article>
              <article className="panel-card">
                <div className="panel-header">
                  <h2>Acces rapides</h2>
                </div>
                <div className="dashboard-actions">
                  <button className="ghost-btn" type="button" onClick={() => setActiveTab("products")}>
                    Ouvrir produits
                  </button>
                  <button className="ghost-btn" type="button" onClick={() => setActiveTab("sales")}>
                    Ouvrir ventes
                  </button>
                  <button className="ghost-btn" type="button" onClick={() => setActiveTab("current-stock")}>
                    Ouvrir stock
                  </button>
                </div>
              </article>
              <article className="panel-card sales-trends-card">
                <div className="panel-header">
                  <h2>Tendance des ventes</h2>
                </div>
                <div className="sales-trends-toolbar">
                  <label>
                    <span>Periode</span>
                    <select value={salesTrendPreset} onChange={(event) => setSalesTrendPreset(event.target.value as SalesTrendPreset)}>
                      <option value="7d">7 derniers jours</option>
                      <option value="30d">30 derniers jours</option>
                      <option value="90d">90 derniers jours</option>
                      <option value="month">Mois en cours</option>
                      <option value="year">Annee en cours</option>
                      <option value="custom">Personnalisee</option>
                    </select>
                  </label>
                  <label>
                    <span>Regroupement</span>
                    <select
                      value={salesTrendGrouping}
                      onChange={(event) => setSalesTrendGrouping(event.target.value as SalesTrendGrouping)}
                    >
                      <option value="day">Jour</option>
                      <option value="week">Semaine</option>
                      <option value="month">Mois</option>
                      <option value="year">Annee</option>
                    </select>
                  </label>
                  {salesTrendPreset === "custom" ? (
                    <>
                      <label>
                        <span>Du</span>
                        <input type="date" value={salesTrendStart} onChange={(event) => setSalesTrendStart(event.target.value)} />
                      </label>
                      <label>
                        <span>Au</span>
                        <input type="date" value={salesTrendEnd} onChange={(event) => setSalesTrendEnd(event.target.value)} />
                      </label>
                    </>
                  ) : null}
                </div>

                <div className="sales-summary compact-summary sales-trends-summary">
                  <div className="sales-indicator neutral">
                    <span>Montant sur la periode</span>
                    <strong>{formatCurrency(salesTrendTotalAmount)}</strong>
                  </div>
                  <div className="sales-indicator success">
                    <span>Nombre de ventes</span>
                    <strong>{salesTrendSalesCount}</strong>
                  </div>
                  <div className="sales-indicator neutral">
                    <span>Panier moyen</span>
                    <strong>{formatCurrency(salesTrendAverageTicket)}</strong>
                  </div>
                  <div className="sales-indicator warning">
                    <span>Meilleure periode</span>
                    <strong>{salesTrendPeak ? `${salesTrendPeak.label} - ${formatCurrency(salesTrendPeak.amount)}` : "Aucune vente"}</strong>
                  </div>
                </div>

                {salesTrendData.length === 0 ? (
                  <EmptyState
                    title="Aucune vente sur cette periode"
                    description="Change la periode ou enregistre de nouvelles ventes pour afficher le graphique."
                  />
                ) : (
                  <div className="bar-chart" aria-label="Graphique des ventes par periode">
                    {salesTrendData.map((item) => {
                      const height = salesTrendMaxAmount > 0 ? Math.max((item.amount / salesTrendMaxAmount) * 100, 12) : 12;
                      return (
                        <div className="bar-wrap" key={item.key}>
                          <strong>{formatCurrency(item.amount)}</strong>
                          <div
                            className="bar"
                            style={{ height: `${height}%` }}
                            title={`${item.label}: ${formatCurrency(item.amount)} pour ${item.count} vente(s)`}
                          />
                          <span>{item.label}</span>
                          <small>{item.count} vente(s)</small>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </section>
          </>
        )}

        {activeTab === "products" && (
          <section className="panel-card">
            <div className="panel-header">
              <h2>Produits</h2>
              <div className="panel-header-actions">
                {canManageInventory ? (
                  <button className="primary-btn" type="button" onClick={openProductCreateModal}>
                    Nouveau produit
                  </button>
                ) : null}
              </div>
            </div>
            <div className="products-summary">
              <div className="products-indicator neutral">
                <span>Produits affiches</span>
                <strong>{filteredProducts.length}</strong>
              </div>
              <div className="products-indicator success">
                <span>Valeur achat</span>
                <strong>{formatCurrency(totalProductStockValue)}</strong>
              </div>
              <div className="products-indicator neutral">
                <span>Categories</span>
                <strong>{productCategoriesCount}</strong>
              </div>
              <div className="products-indicator warning">
                <span>Seuil atteint</span>
                <strong>{lowStockProductsCount}</strong>
              </div>
            </div>
            <div className="section-tools">
              <input
                className="table-search-input"
                placeholder="Rechercher par code, nom, categorie ou fournisseur"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
              <span className="section-count">{filteredProducts.length} resultat(s)</span>
            </div>
            {products.length === 0 ? (
              <EmptyState
                title="Aucun produit enregistre"
                description="Ajoutez votre premier produit pour commencer a gerer le stock et les ventes."
              />
            ) : filteredProducts.length === 0 ? (
              <EmptyState title="Aucun produit trouve" description="Essayez un autre mot-cle pour affiner votre recherche." />
            ) : (
              <div className="table-wrap products-table-wrap">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>
                        <button className="sort-header-btn" type="button" onClick={() => handleProductSort("code")}>
                          Code{getProductSortIndicator("code")}
                        </button>
                      </th>
                      <th>
                        <button className="sort-header-btn" type="button" onClick={() => handleProductSort("name")}>
                          Nom{getProductSortIndicator("name")}
                        </button>
                      </th>
                      <th>
                        <button className="sort-header-btn" type="button" onClick={() => handleProductSort("category")}>
                          Categorie{getProductSortIndicator("category")}
                        </button>
                      </th>
                      <th>
                        <button className="sort-header-btn" type="button" onClick={() => handleProductSort("purchasePrice")}>
                          Prix achat{getProductSortIndicator("purchasePrice")}
                        </button>
                      </th>
                      <th>
                        <button className="sort-header-btn" type="button" onClick={() => handleProductSort("sellingPrice")}>
                          Prix de vente{getProductSortIndicator("sellingPrice")}
                        </button>
                      </th>
                      <th>
                        <button className="sort-header-btn" type="button" onClick={() => handleProductSort("alertThreshold")}>
                          Seuil{getProductSortIndicator("alertThreshold")}
                        </button>
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFilteredProducts.map((item) => (
                      <tr key={item.id}>
                        <td className="products-code-cell">{item.code}</td>
                        <td>{item.name}</td>
                        <td>
                          <span className="products-category-badge">{item.category}</span>
                        </td>
                        <td>{formatCurrency(item.purchasePrice)}</td>
                        <td className="products-price-cell">{formatCurrency(item.sellingPrice)}</td>
                        <td>
                          <span className={`products-threshold-badge ${item.quantity <= item.alertThreshold ? "warning" : "success"}`}>
                            {item.alertThreshold}
                          </span>
                        </td>
                        <td className="actions-cell">
                          {canManageInventory ? (
                            <>
                              <button className="warn-btn" onClick={() => handleEdit(item)} type="button">
                                Modifier
                              </button>
                              <button
                                className="danger-btn"
                                onClick={() =>
                                  askConfirmation({
                                    title: "Supprimer ce produit",
                                    message: `Le produit ${item.name} sera retire de la liste. Cette action est irreversible.`,
                                    actionLabel: "Supprimer le produit",
                                    tone: "danger",
                                    onConfirm: () => handleDelete(item.id),
                                  })
                                }
                                type="button"
                              >
                                Supprimer
                              </button>
                            </>
                          ) : (
                            <span className="section-count">Lecture seule</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === "services" && (
          <section className="panel-card">
            <div className="panel-header">
              <h2>Services</h2>
              <div className="panel-header-actions">
                {canManageInventory ? (
                  <button className="primary-btn" type="button" onClick={openServiceModal}>
                    Nouveau service
                  </button>
                ) : null}
              </div>
            </div>
            <div className="products-summary">
              <div className="products-indicator neutral">
                <span>Services affiches</span>
                <strong>{filteredServices.length}</strong>
              </div>
              <div className="products-indicator success">
                <span>Services actifs</span>
                <strong>{activeServicesCount}</strong>
              </div>
              <div className="products-indicator neutral">
                <span>Categories</span>
                <strong>{serviceCategoriesCount}</strong>
              </div>
            </div>
            <div className="section-tools">
              <input
                className="table-search-input"
                placeholder="Rechercher par nom, categorie, description ou etat"
                value={serviceSearch}
                onChange={(event) => setServiceSearch(event.target.value)}
              />
              <span className="section-count">{filteredServices.length} resultat(s)</span>
            </div>
            {services.length === 0 ? (
              <EmptyState
                title="Aucun service enregistre"
                description="Ajoutez ici les prestations comme saisie, impression, scan ou maintenance."
              />
            ) : filteredServices.length === 0 ? (
              <EmptyState title="Aucun service trouve" description="Aucun service ne correspond a votre recherche." />
            ) : (
              <div className="table-wrap products-table-wrap">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Categorie</th>
                      <th>Prix unitaire</th>
                      <th>Description</th>
                      <th>Etat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((item) => (
                      <tr key={item.id}>
                        <td className="products-code-cell">{item.name}</td>
                        <td>{item.category}</td>
                        <td className="products-price-cell">{formatCurrency(item.unitPrice)}</td>
                        <td>{item.description || "-"}</td>
                        <td>
                          <span className={`products-threshold-badge ${item.active ? "success" : "warning"}`}>
                            {item.active ? "Actif" : "Inactif"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === "clients" && (
          <section className="panel-card">
            <div className="panel-header">
              <h2>Clients</h2>
              <div className="panel-header-actions">
                {canCreateClients ? (
                  <button className="primary-btn" type="button" onClick={openClientModal}>
                    Nouveau client
                  </button>
                ) : null}
              </div>
            </div>
            <div className="clients-summary">
              <div className="clients-indicator neutral">
                <span>Clients affiches</span>
                <strong>{filteredClients.length}</strong>
              </div>
              <div className="clients-indicator success">
                <span>Avec e-mail</span>
                <strong>{clientsWithEmailCount}</strong>
              </div>
              <div className="clients-indicator neutral">
                <span>Avec telephone</span>
                <strong>{clientsWithPhoneCount}</strong>
              </div>
            </div>
            <div className="section-tools">
              <input
                className="table-search-input"
                placeholder="Rechercher par nom, telephone, adresse ou e-mail"
                value={clientSearch}
                onChange={(event) => setClientSearch(event.target.value)}
              />
              <span className="section-count">{filteredClients.length} resultat(s)</span>
            </div>
            {clients.length === 0 ? (
              <EmptyState
                title="Aucun client enregistre"
                description="Ajoutez un client pour retrouver facilement ses informations lors des ventes."
              />
            ) : filteredClients.length === 0 ? (
              <EmptyState title="Aucun client trouve" description="Aucun client ne correspond a votre recherche actuelle." />
            ) : (
              <div className="table-wrap clients-table-wrap">
                <table className="clients-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Telephone</th>
                      <th>Adresse</th>
                      <th>E-mail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <tr key={client.id}>
                        <td className="clients-name-cell">{client.name}</td>
                        <td>{client.phone || "-"}</td>
                        <td>{client.address}</td>
                        <td className="clients-email-cell">{client.email || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === "expenses" && (
          <section className="panel-card">
            <div className="panel-header">
              <h2>Depenses engagees</h2>
              <div className="panel-header-actions">
                {canManageExpenses ? (
                  <button className="primary-btn" type="button" onClick={openExpenseModal}>
                    Nouvelle depense
                  </button>
                ) : null}
                <button className="ghost-btn" type="button" onClick={() => void openExpenseReportModal()} disabled={expenseReportBusy}>
                  {expenseReportBusy ? "Generation..." : "Generer le rapport complet"}
                </button>
              </div>
            </div>
            <div className="sales-summary compact-summary">
              <div className="sales-indicator warning">
                <span>Total des depenses</span>
                <strong>{formatCurrency(expensesTotal)}</strong>
              </div>
              <div className="sales-indicator neutral">
                <span>Nombre d'ecritures</span>
                <strong>{filteredExpenses.length}</strong>
              </div>
              <div className="sales-indicator success">
                <span>Impact sur le vendu</span>
                <strong>{formatCurrency((metrics.netSalesAmount ?? 0))}</strong>
              </div>
            </div>
            <div className="section-tools">
              <input
                className="table-search-input"
                placeholder="Rechercher par nature, detail, usage, approbateur ou utilisateur"
                value={expenseSearch}
                onChange={(event) => setExpenseSearch(event.target.value)}
              />
              <span className="section-count">{filteredExpenses.length} resultat(s)</span>
            </div>
            {expenses.length === 0 ? (
              <EmptyState
                title="Aucune depense enregistree"
                description="Enregistrez ici les depenses engagees pour suivre leur impact sur le resultat des ventes."
              />
            ) : filteredExpenses.length === 0 ? (
              <EmptyState title="Aucune depense trouvee" description="Aucune depense ne correspond a votre recherche." />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Nature</th>
                      <th>Detail</th>
                      <th>Montant</th>
                      <th>Utilisateur</th>
                      <th>Approuve par</th>
                      <th>Usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((item) => (
                      <tr key={item.id}>
                        <td>{item.date}</td>
                        <td>{item.nature}</td>
                        <td>{item.detail}</td>
                        <td>{formatCurrency(item.amount)}</td>
                        <td>{item.requestedBy}</td>
                        <td>{item.approvedBy}</td>
                        <td>{item.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === "initial-stock" && (
          <section className="panel-card">
            <div className="panel-header">
              <h2>Stock initial</h2>
              <div className="panel-header-actions">
                {canManageInventory ? (
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={() =>
                      askConfirmation({
                        title: "Passer a une nouvelle serie",
                        message: `La numerotation actuelle sera cloturee et une nouvelle serie de factures demarrera a 0001. Utilisez cette action apres votre inventaire.`,
                        actionLabel: "Demarrer la nouvelle serie",
                        onConfirm: () => handleAdvanceInvoiceSeries(),
                      })
                    }
                  >
                    Nouvelle serie apres inventaire
                  </button>
                ) : null}
              </div>
            </div>
            <p className="hero-copy">
              Le stock initial est enregistre automatiquement a la creation d'un nouveau produit.
            </p>
            {invoiceSeriesInfo ? (
              <div className="sales-summary compact-summary">
                <div className="sales-indicator neutral">
                  <span>Serie active</span>
                  <strong>S{invoiceSeriesInfo.seriesLabel}{invoiceSeriesInfo.yearCode}</strong>
                </div>
                <div className="sales-indicator success">
                  <span>Prochaine facture</span>
                  <strong>{invoiceSeriesInfo.nextReference}</strong>
                </div>
              </div>
            ) : null}
            {products.length === 0 ? (
              <EmptyState
                title="Aucun stock initial disponible"
                description="Le stock initial apparaitra ici apres l'enregistrement de vos premiers produits."
              />
            ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Quantite initiale</th>
                    <th>Prix d'achat</th>
                    <th>Unite</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.purchasePrice)}</td>
                      <td>{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </section>
        )}

        {activeTab === "replenishments" && (
          <section className="panel-card supply-card">
            <div className="panel-header supply-header">
              <h2>Reapprovisionnements</h2>
              <div className="action-strip">
                {canManageInventory ? (
                  <button className="primary-btn" type="button" onClick={() => openReplenishmentModal()}>
                    Nouvel approvisionnement
                  </button>
                ) : null}
                <button className="ghost-btn" type="button" onClick={openSupplyHistoryModal}>
                  Historique d'approvisionnement
                </button>
                <button className="ghost-btn" type="button">
                  Importer Excel
                </button>
                <button className="ghost-btn success" type="button">
                  Exporter Excel
                </button>
                <button className="ghost-btn muted" type="button">
                  Modele Excel
                </button>
              </div>
            </div>
            <div className="section-tools">
              <input
                className="table-search-input"
                placeholder="Rechercher un produit ou un fournisseur"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
              <span className="section-count">{replenishmentProducts.length} resultat(s)</span>
            </div>
            {allReplenishmentProducts.length === 0 ? (
              <EmptyState
                title="Aucun reapprovisionnement a afficher"
                description="Aucun produit n'a encore ete reapprovisionne dans le cycle d'inventaire en cours."
              />
            ) : replenishmentProducts.length === 0 ? (
              <EmptyState title="Aucun element trouve" description="Essayez une autre recherche pour retrouver un produit." />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Prix d'achat</th>
                      <th>Prix de vente</th>
                      <th>Stock</th>
                      <th>Fournisseur</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {replenishmentProducts.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{formatCurrency(item.purchasePrice)}</td>
                        <td>{formatCurrency(item.sellingPrice)}</td>
                        <td>{item.quantity}</td>
                      <td>{item.supplier}</td>
                      <td className="actions-cell">
                        {canManageInventory ? (
                          <>
                              <button className="primary-btn" onClick={() => openReplenishmentModal(item)} type="button">
                                Approvisionner
                              </button>
                              <button
                                className="warn-btn"
                                onClick={() => handleEdit(item)}
                                type="button"
                              >
                                Modifier
                              </button>
                              <button
                                className="danger-btn"
                                onClick={() =>
                                  askConfirmation({
                                    title: "Supprimer ce produit",
                                    message: `Le produit ${item.name} sera retire de la liste. Cette action est irreversible.`,
                                    actionLabel: "Supprimer le produit",
                                    tone: "danger",
                                    onConfirm: () => handleDelete(item.id),
                                  })
                                }
                                type="button"
                              >
                                Supprimer
                              </button>
                            </>
                          ) : (
                            <span className="section-count">Lecture seule</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === "sales" && (
          <section className="panel-card">
            <div className="panel-header">
              <h2>Ventes</h2>
              <div className="panel-header-actions">
                {canCreateSales ? (
                  <button className="primary-btn" type="button" onClick={openSaleModal}>
                    Nouvelle vente
                  </button>
                ) : null}
              </div>
            </div>
            <div className="sales-summary">
              <div className="sales-indicator neutral">
                <span>Ventes affichees</span>
                <strong>{filteredSales.length}</strong>
              </div>
              <div className="sales-indicator success">
                <span>Montant total</span>
                <strong>{formatCurrency(totalSalesAmount)}</strong>
              </div>
              <div className="sales-indicator warning">
                <span>Depenses engagees</span>
                <strong>{formatCurrency(salesPeriodExpensesTotal)}</strong>
              </div>
              <div className="sales-indicator success">
                <span>Montant net</span>
                <strong>{formatCurrency(salesPeriodNetAmount)}</strong>
              </div>
              <div className="sales-indicator neutral">
                <span>Lignes vendues</span>
                <strong>{totalSalesLines}</strong>
              </div>
              <div className="sales-indicator neutral">
                <span>Clients comptoir</span>
                <strong>{totalCounterSales}</strong>
              </div>
              {invoiceSeriesInfo ? (
                <div className="sales-indicator neutral">
                  <span>Prochaine reference</span>
                  <strong>{invoiceSeriesInfo.nextReference}</strong>
                </div>
              ) : null}
            </div>
            <div className="section-tools">
              <input
                className="table-search-input"
                placeholder="Rechercher par facture, client, date ou paiement"
                value={saleSearch}
                onChange={(event) => setSaleSearch(event.target.value)}
              />
              <div className="stock-filters sales-filters">
                <select value={salesPeriodPreset} onChange={(event) => setSalesPeriodPreset(event.target.value as SalesPeriodPreset)}>
                  <option value="all">Toutes les periodes</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="7d">7 derniers jours</option>
                  <option value="30d">30 derniers jours</option>
                  <option value="90d">90 derniers jours</option>
                  <option value="month">Mois en cours</option>
                  <option value="year">Annee en cours</option>
                  <option value="custom">Periode personnalisee</option>
                </select>
                {salesPeriodPreset === "custom" ? (
                  <>
                    <input type="date" value={salesPeriodStart} onChange={(event) => setSalesPeriodStart(event.target.value)} />
                    <input type="date" value={salesPeriodEnd} onChange={(event) => setSalesPeriodEnd(event.target.value)} />
                  </>
                ) : null}
              </div>
              <span className="section-count">{filteredSales.length} resultat(s)</span>
            </div>
            {saleError ? <p className="error-text">{saleError}</p> : null}
            {sales.length === 0 ? (
              <EmptyState
                title="Aucune vente enregistree"
                description="Creez une nouvelle vente pour commencer a alimenter votre historique commercial."
              />
            ) : filteredSales.length === 0 ? (
              <EmptyState title="Aucune vente trouvee" description="Aucune vente ne correspond a votre recherche actuelle." />
            ) : (
            <div className="table-wrap sales-table-wrap">
              <table className="sales-table">
                <thead>
                  <tr>
                    <th>Facture</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Lignes</th>
                    <th>Paiement</th>
                    <th>Statut</th>
                    <th>Consultation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="sales-reference-cell">{sale.reference}</td>
                      <td>{sale.clientName}</td>
                      <td>{sale.date}</td>
                      <td className="sales-amount-cell">{formatCurrency(sale.amount)}</td>
                      <td>{sale.itemsCount}</td>
                      <td>{sale.paymentMethod}</td>
                      <td>
                        <span className={`sales-status ${sale.status === "Payee" ? "success" : "warning"}`}>
                          {sale.status}
                        </span>
                      </td>
                      <td>
                        <button className="ghost-btn muted" type="button" onClick={() => void handleSelectSale(sale.id)}>
                          Consulter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </section>
        )}

        {activeTab === "current-stock" && (
          <section className="panel-card">
            <div className="panel-header">
              <h2>Stock actuel</h2>
              <div className="panel-header-actions">
                {canManageInventory ? (
                  <button
                    className="ghost-btn danger"
                    type="button"
                    onClick={() =>
                      askConfirmation({
                        title: "Reinitialiser le stock apres inventaire",
                        message:
                          "Les produits resteront dans la liste, mais le stock initial, les reapprovisionnements et les ventes du cycle courant repartiront a zero. Cette action demarre un nouveau cycle d'inventaire.",
                        actionLabel: "Reinitialiser le stock",
                        tone: "danger",
                        onConfirm: () => handleResetInventoryCycle(),
                      })
                    }
                  >
                    Reinitialiser le stock
                  </button>
                ) : null}
              </div>
            </div>
            <div className="stock-summary">
              <div className="stock-indicator neutral">
                <span>Articles suivis</span>
                <strong>{filteredStockRows.length}</strong>
              </div>
              {isSuperAdmin ? (
                <div className="stock-indicator neutral">
                  <span>Valeur totale du stock (achat)</span>
                  <strong>{formatCurrency(stockValueTotal)}</strong>
                </div>
              ) : null}
              {isSuperAdmin ? (
                <div className="stock-indicator warning">
                  <span>Total depense en approvisionnement</span>
                  <strong>{formatCurrency(replenishmentSpendTotal)}</strong>
                </div>
              ) : null}
              {isSuperAdmin ? (
                <div className="stock-indicator neutral">
                  <span>Vente potentielle du stock</span>
                  <strong>{formatCurrency(stockPotentialRevenueTotal)}</strong>
                </div>
              ) : null}
              {isSuperAdmin ? (
                <div className="stock-indicator success">
                  <span>Gain potentiel apres vente</span>
                  <strong>{formatCurrency(stockPotentialMarginTotal)}</strong>
                </div>
              ) : null}
              <div className="stock-indicator success">
                <span>Stock correct</span>
                <strong>{stockHealthyCount}</strong>
              </div>
              <div className="stock-indicator warning">
                <span>Stock faible</span>
                <strong>{stockLowCount}</strong>
              </div>
              <div className="stock-indicator danger">
                <span>Rupture</span>
                <strong>{stockZeroCount}</strong>
              </div>
            </div>
            <div className="section-tools stock-tools">
              <div className="stock-filters">
                <select value={stockCategoryFilter} onChange={(event) => setStockCategoryFilter(event.target.value)}>
                  {stockCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select value={stockStatusFilter} onChange={(event) => setStockStatusFilter(event.target.value)}>
                  <option value="Tous">Tous les statuts</option>
                  <option value="OK">Stock correct</option>
                  <option value="Stock faible">Stock faible</option>
                  <option value="Rupture">Rupture</option>
                </select>
              </div>
              <div className="stock-tools-actions">
                <input
                  className="table-search-input"
                  placeholder="Rechercher un produit..."
                  value={stockSearch}
                  onChange={(event) => setStockSearch(event.target.value)}
                />
                <button className="ghost-btn" type="button" onClick={handleExportStockCsv}>
                  Exporter CSV
                </button>
              </div>
            </div>
            {currentStock.length === 0 ? (
              <EmptyState
                title="Aucun stock disponible"
                description="Les mouvements de stock apparaitront ici des que vous enregistrerez vos produits."
              />
            ) : filteredStockRows.length === 0 ? (
              <EmptyState title="Aucun article trouve" description="Aucun produit en stock ne correspond a votre recherche." />
            ) : (
            <div className="table-wrap stock-table-wrap">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Categorie</th>
                    <th>Stock initial</th>
                    <th>Reappro.</th>
                    <th>Ventes</th>
                    <th>Entrees</th>
                    <th>Stock actuel</th>
                    {isSuperAdmin ? <th>P.A. moyen</th> : null}
                    {isSuperAdmin ? <th>Valeur stock (achat)</th> : null}
                    <th>Unite</th>
                    <th>Seuil</th>
                    <th>Alerte</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockRows.map((item) => (
                    <tr key={item.productId}>
                      <td>{item.productName}</td>
                      <td>
                        <span className="stock-category-badge">{item.category}</span>
                      </td>
                      <td>{item.initialStock}</td>
                      <td>+{item.replenishments}</td>
                      <td>-{item.salesUnits}</td>
                      <td>+{item.quantityIn}</td>
                      <td className="stock-current-cell">{item.currentStock}</td>
                      {isSuperAdmin ? <td>{formatCurrency(item.averagePurchasePrice)}</td> : null}
                      {isSuperAdmin ? <td className="stock-value-cell">{formatCurrency(item.stockValue)}</td> : null}
                      <td>{item.unit}</td>
                      <td>{item.alertThreshold}</td>
                      <td>
                        <span className={`stock-status ${item.currentStock <= 0 ? "danger" : item.currentStock <= item.alertThreshold ? "warning" : "success"}`}>
                          {item.currentStock <= 0 ? "Rupture" : item.currentStock <= item.alertThreshold ? "Stock faible" : "Correct"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="stock-total-row">
                    <td colSpan={6}>Total du stock actuel</td>
                    <td className="stock-current-cell">{stockUnitsTotal}</td>
                    {isSuperAdmin ? <td>-</td> : null}
                    {isSuperAdmin ? <td className="stock-value-cell">{formatCurrency(stockValueTotal)}</td> : null}
                    <td colSpan={isSuperAdmin ? 3 : 4}></td>
                  </tr>
                </tbody>
              </table>
            </div>
            )}
          </section>
        )}

        {activeTab === "utilisateurs" && isSuperAdmin && (
          <section className="panel-card">
            <div className="users-header">
              <div className="users-header-main">
                <span className="users-header-icon" aria-hidden="true">
                  Util.
                </span>
                <h2>Gestion des utilisateurs</h2>
                <span className="users-count-badge">{users.length} utilisateurs</span>
              </div>
              <div className="users-header-actions">
                <button className="ghost-btn muted" type="button" onClick={() => void loadData()}>
                  Actualiser
                </button>
                {canManageUsers ? (
                  <button className="primary-btn" type="button" onClick={openUserModal}>
                    Ajouter un utilisateur
                  </button>
                ) : null}
              </div>
            </div>
            {userError ? <p className="error-text">{userError}</p> : null}
            {userMessage ? <p className="invoice-message">{userMessage}</p> : null}
            {users.length === 0 ? (
              <EmptyState
                title="Aucun utilisateur disponible"
                description="Ajoutez un utilisateur pour commencer a organiser votre equipe."
              />
            ) : filteredUsers.length === 0 ? (
              <EmptyState title="Aucun utilisateur trouve" description="Aucun utilisateur ne correspond a votre recherche." />
            ) : (
            <div className="table-wrap users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Adresse e-mail</th>
                    <th>Role</th>
                    <th>Date de creation</th>
                    <th>Derniere connexion</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className={!user.active ? "user-row-inactive" : ""}>
                      <td className="user-email-cell">{user.email}</td>
                      <td>
                        <span className={getRoleBadgeClass(user.role)}>{user.role}</span>
                      </td>
                      <td>{formatDateTime(user.createdAt)}</td>
                      <td>{formatDateTime(user.lastLoginAt)}</td>
                      <td>
                        <div className="users-actions">
                          <select
                            className="user-role-select"
                            value={user.role}
                            disabled={!canManageUsers}
                            onChange={(event) => void handleUserRoleChange(user.id, event.target.value as UserRole)}
                          >
                            {userRoles.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                          <button
                            className="icon-btn key"
                            type="button"
                            title={user.id === currentUser?.id ? "Changer mot de passe" : "Reinitialiser mot de passe"}
                            onClick={() => openPasswordModal(user, user.id === currentUser?.id)}
                          >
                            Cle
                          </button>
                          <button
                            className="icon-btn access"
                            type="button"
                            title="Reinitialiser acces"
                            disabled={user.active}
                            onClick={() => void handleRefreshUserAccess(user.id)}
                          >
                            Acces
                          </button>
                          <button
                            className="icon-btn"
                            type="button"
                            title="Reinitialiser acces"
                            onClick={() => void handleRefreshUserAccess(user.id)}
                          >
                            🔑
                          </button>
                          <button
                            className="icon-btn danger"
                            type="button"
                            title="Supprimer"
                            disabled={user.id === currentUser?.id}
                            onClick={() =>
                              askConfirmation({
                                title: "Supprimer cet utilisateur",
                                message: `Le compte ${user.email} sera retire de la liste des utilisateurs. Cette action est irreversible.`,
                                actionLabel: "Supprimer l'utilisateur",
                                tone: "danger",
                                onConfirm: () => handleDeleteUser(user),
                              })
                            }
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </section>
        )}

        {activeTab === "history" && isSuperAdmin && (
          <section className="panel-card">
            <div className="panel-header">
              <h2>Historique</h2>
            </div>
            <div className="section-tools">
              <input
                className="table-search-input"
                placeholder="Rechercher par date, utilisateur, action ou details"
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
              />
              <span className="section-count">{formattedHistory.length} resultat(s)</span>
            </div>
            {activityHistory.length === 0 ? (
              <EmptyState
                title="Aucun historique disponible"
                description="Les actions importantes du systeme s'afficheront ici au fur et a mesure de l'activite."
              />
            ) : formattedHistory.length === 0 ? (
              <EmptyState title="Aucun element trouve" description="Aucune action ne correspond a votre recherche." />
            ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date et heure</th>
                    <th>Utilisateur</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {formattedHistory.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.date}</td>
                      <td>{entry.user}</td>
                      <td>{entry.formattedAction}</td>
                      <td>{entry.formattedDetails}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </section>
        )}
      </main>

      {activeModal === "product" ? (
        <Modal
          title={productModalMode === "edit" ? "Mettre a jour le produit" : "Nouveau produit"}
          onClose={closeModal}
        >
          <form className="modal-form modal-form-stack" onSubmit={handleSubmit}>
            <label>
              Code
              <input
                value={draft.code}
                onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
              />
            </label>
            <label>
              Produit
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label>
              Categorie
              <input
                value={draft.category}
                onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
              />
            </label>
            <label>
              Prix achat
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.purchasePrice}
                onChange={(event) => setDraft((current) => ({ ...current, purchasePrice: Number(event.target.value) }))}
                required
              />
            </label>
            <label>
              Prix vente
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.sellingPrice}
                onChange={(event) => setDraft((current) => ({ ...current, sellingPrice: Number(event.target.value) }))}
                required
              />
            </label>
            <label>
              Quantite
              <input
                type="number"
                min="0"
                value={draft.quantity}
                onChange={(event) => setDraft((current) => ({ ...current, quantity: Number(event.target.value) }))}
                required
              />
            </label>
            <label>
              Unite
              <input
                value={draft.unit}
                onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))}
              />
            </label>
            <label>
              Seuil alerte
              <input
                type="number"
                min="0"
                value={draft.alertThreshold}
                onChange={(event) => setDraft((current) => ({ ...current, alertThreshold: Number(event.target.value) }))}
              />
            </label>
            <label>
              Fournisseur
              <input
                value={draft.supplier}
                onChange={(event) => setDraft((current) => ({ ...current, supplier: event.target.value }))}
                required
              />
            </label>
            <div className="modal-actions">
              <button className="ghost-btn muted" type="button" onClick={closeModal}>
                Annuler
              </button>
              <button className="primary-btn" type="submit">
                {productModalMode === "edit" ? "Mettre a jour" : "Valider"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "client" ? (
        <Modal title="Nouveau client" onClose={closeModal}>
          <form className="modal-form modal-form-stack" onSubmit={handleClientSubmit}>
            <label>
              Nom
              <input
                value={clientDraft.name}
                onChange={(event) => setClientDraft((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label>
              Telephone
              <input
                value={clientDraft.phone}
                onChange={(event) => setClientDraft((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>
            <label>
              Adresse
              <input
                value={clientDraft.address}
                onChange={(event) => setClientDraft((current) => ({ ...current, address: event.target.value }))}
              />
            </label>
            <label>
              Email
              <input
                value={clientDraft.email}
                onChange={(event) => setClientDraft((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <div className="modal-actions">
              <button className="ghost-btn muted" type="button" onClick={closeModal}>
                Annuler
              </button>
              <button className="primary-btn" type="submit">
                Enregistrer le client
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "service" ? (
        <Modal title="Nouveau service" onClose={closeModal}>
          <form className="modal-form modal-form-stack" onSubmit={handleServiceSubmit}>
            <label>
              Nom du service
              <input
                value={serviceDraft.name}
                onChange={(event) => setServiceDraft((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label>
              Categorie
              <input
                value={serviceDraft.category}
                onChange={(event) => setServiceDraft((current) => ({ ...current, category: event.target.value }))}
                placeholder="Ex: Impression, maintenance, numerisation..."
                required
              />
            </label>
            <label>
              Prix unitaire
              <input
                type="number"
                min="0"
                step="0.01"
                value={serviceDraft.unitPrice || ""}
                onChange={(event) => setServiceDraft((current) => ({ ...current, unitPrice: Number(event.target.value) }))}
                required
              />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={serviceDraft.description}
                onChange={(event) => setServiceDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Description courte du service"
              />
            </label>
            <label>
              <span>Etat</span>
              <select
                value={serviceDraft.active === false ? "inactive" : "active"}
                onChange={(event) => setServiceDraft((current) => ({ ...current, active: event.target.value === "active" }))}
              >
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </label>
            <div className="modal-actions">
              <button className="ghost-btn muted" type="button" onClick={closeModal}>
                Annuler
              </button>
              <button className="primary-btn" type="submit">
                Enregistrer le service
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "expense" ? (
        <Modal title="Nouvelle depense engagee" onClose={closeModal}>
          <form className="modal-form modal-form-stack" onSubmit={handleExpenseSubmit}>
            <label>
              Nature de la depense
              <input
                value={expenseDraft.nature}
                onChange={(event) => setExpenseDraft((current) => ({ ...current, nature: event.target.value }))}
                placeholder="Ex: Transport, loyer, fournitures..."
                required
              />
            </label>
            <label>
              Detail
              <input
                value={expenseDraft.detail}
                onChange={(event) => setExpenseDraft((current) => ({ ...current, detail: event.target.value }))}
                placeholder="Resume court de la depense"
                required
              />
            </label>
            <label>
              Montant
              <input
                type="number"
                min="0"
                step="0.01"
                value={expenseDraft.amount || ""}
                onChange={(event) => setExpenseDraft((current) => ({ ...current, amount: Number(event.target.value) }))}
                required
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={expenseDraft.date}
                onChange={(event) => setExpenseDraft((current) => ({ ...current, date: event.target.value }))}
                required
              />
            </label>
            <label>
              Approuve par
              <input
                value={expenseDraft.approvedBy}
                onChange={(event) => setExpenseDraft((current) => ({ ...current, approvedBy: event.target.value }))}
                placeholder="Nom de la personne qui a approuve"
                required
              />
            </label>
            <label>
              La depense sert a quoi ?
              <textarea
                rows={3}
                value={expenseDraft.purpose}
                onChange={(event) => setExpenseDraft((current) => ({ ...current, purpose: event.target.value }))}
                placeholder="Usage ou objectif de la depense"
                required
              />
            </label>
            <div className="modal-actions">
              <button className="ghost-btn muted" type="button" onClick={closeModal}>
                Annuler
              </button>
              <button className="primary-btn" type="submit">
                Enregistrer la depense
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "expenseReport" && expenseReport ? (
        <Modal
          title="Rapport complet des ventes et depenses"
          onClose={closeModal}
          size="large"
          backdropClassName="printable-expense-backdrop"
        >
          <div className="confirm-stack expense-report-sheet">
            <div className="expense-report-header">
              <div>
                <p className="expense-report-kicker">Rapport financier</p>
                <h3>Rapport complet des ventes et depenses</h3>
                <p className="expense-report-subtitle">
                  Document de synthese pour lecture a l'ecran, impression papier ou export PDF.
                </p>
              </div>
              <div className="expense-report-meta">
                <span>Genere le {expenseReportGeneratedAt}</span>
                <span>Par {currentUser?.fullName ?? "Utilisateur"}</span>
              </div>
            </div>

            <div className="sales-summary compact-summary expense-report-summary">
              <div className="sales-indicator success">
                <span>Montant total vendu</span>
                <strong>{formatCurrency(expenseReport.totalSalesAmount)}</strong>
              </div>
              <div className="sales-indicator warning">
                <span>Total des depenses</span>
                <strong>{formatCurrency(expenseReport.totalExpensesAmount)}</strong>
              </div>
              <div className="sales-indicator neutral">
                <span>Solde apres depenses</span>
                <strong>{formatCurrency(expenseReport.netBalance)}</strong>
              </div>
            </div>

            <section className="expense-report-callout">
              <h4>Lecture rapide</h4>
              <p>
                {expenseReport.netBalance >= 0
                  ? `Les ventes couvrent actuellement les depenses avec un solde positif de ${formatCurrency(expenseReport.netBalance)}.`
                  : `Les depenses depassent actuellement les ventes de ${formatCurrency(Math.abs(expenseReport.netBalance))}.`}
              </p>
              <div className="expense-report-highlights">
                <div className="expense-report-highlight">
                  <span>Produit le plus vendeur</span>
                  <strong>{expenseReportTopProduct ? expenseReportTopProduct.productName : "Aucun produit"}</strong>
                  <small>
                    {expenseReportTopProduct
                      ? `${expenseReportTopProduct.quantity} unite(s) - ${formatCurrency(expenseReportTopProduct.amount)}`
                      : "Aucune vente detaillee"}
                  </small>
                </div>
                <div className="expense-report-highlight">
                  <span>Service dominant</span>
                  <strong>{expenseReportTopCategory ? expenseReportTopCategory.category : "Aucun service"}</strong>
                  <small>
                    {expenseReportTopCategory
                      ? `${expenseReportTopCategory.quantity} unite(s) - ${formatCurrency(expenseReportTopCategory.amount)}`
                      : "Aucune repartition disponible"}
                  </small>
                </div>
                <div className="expense-report-highlight">
                  <span>Nombre de depenses</span>
                  <strong>{expenses.length}</strong>
                  <small>
                    {expenses.length > 0
                      ? `Depense moyenne: ${formatCurrency(expenseReport.totalExpensesAmount / expenses.length)}`
                      : "Aucune depense enregistree"}
                  </small>
                </div>
              </div>
            </section>

            <section className="expense-report-section">
              <div className="expense-report-section-header">
                <div>
                  <h4>Ventes par produit</h4>
                  <p>Quels produits ont genere le plus de chiffre d'affaires.</p>
                </div>
              </div>
              <div className="table-wrap modal-table-wrap">
                <table className="expense-report-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Categorie</th>
                      <th>Quantite vendue</th>
                      <th>Montant vendu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseReport.productLines.map((line) => (
                      <tr key={line.productId}>
                        <td>{line.productName}</td>
                        <td>{line.category}</td>
                        <td>{line.quantity}</td>
                        <td>{formatCurrency(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="expense-report-section">
              <div className="expense-report-section-header">
                <div>
                  <h4>Repartition par categorie</h4>
                  <p>Vue detaillee des services et activites vendus.</p>
                </div>
              </div>
              <div className="table-wrap modal-table-wrap">
                <table className="expense-report-table">
                  <thead>
                    <tr>
                      <th>Service / activite</th>
                      <th>Quantite totale</th>
                      <th>Total genere</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseReport.serviceLines.map((line) => (
                      <tr key={line.category}>
                        <td>{line.category}</td>
                        <td>{line.quantity}</td>
                        <td>{formatCurrency(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="expense-report-section">
              <div className="expense-report-section-header">
                <div>
                  <h4>Journal des depenses</h4>
                  <p>Liste detaillee des depenses qui impactent le resultat.</p>
                </div>
              </div>
              <div className="table-wrap modal-table-wrap">
                <table className="expense-report-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Nature</th>
                      <th>Detail</th>
                      <th>Montant</th>
                      <th>Utilisateur</th>
                      <th>Approuve par</th>
                      <th>Usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((item) => (
                      <tr key={item.id}>
                        <td>{item.date}</td>
                        <td>{item.nature}</td>
                        <td>{item.detail}</td>
                        <td>{formatCurrency(item.amount)}</td>
                        <td>{item.requestedBy}</td>
                        <td>{item.approvedBy}</td>
                        <td>{item.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="modal-actions expense-report-actions">
              <button className="ghost-btn" type="button" onClick={() => window.print()}>
                Imprimer / PDF
              </button>
              <button className="ghost-btn muted" type="button" onClick={closeModal}>
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {activeModal === "replenishment" ? (
        <Modal title="Nouvel approvisionnement" onClose={closeModal}>
          <form className="modal-form modal-form-stack" onSubmit={handleReplenishmentSubmit}>
            <label>
              Produit
              <select
                value={replenishmentDraft.productId}
                onChange={(event) => {
                  const productId = Number(event.target.value);
                  const selectedProduct = products.find((item) => item.id === productId);
                  setReplenishmentDraft((current) => ({
                    ...current,
                    productId,
                    purchasePrice: selectedProduct?.purchasePrice ?? current.purchasePrice,
                    sellingPrice: selectedProduct?.sellingPrice ?? current.sellingPrice,
                    supplier: selectedProduct?.supplier ?? current.supplier,
                  }));
                }}
                required
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantite a approvisionner
              <input
                type="number"
                min="1"
                value={replenishmentDraft.quantity}
                onChange={(event) =>
                  setReplenishmentDraft((current) => ({
                    ...current,
                    quantity: event.target.value === "" ? "" : Number(event.target.value),
                  }))
                }
                required
              />
            </label>
            <label>
              Prix d'achat
              <input
                type="number"
                min="0"
                step="0.01"
                value={replenishmentDraft.purchasePrice}
                onChange={(event) =>
                  setReplenishmentDraft((current) => ({ ...current, purchasePrice: Number(event.target.value) }))
                }
                required
              />
            </label>
            <label>
              Prix de vente
              <input
                type="number"
                min="0"
                step="0.01"
                value={replenishmentDraft.sellingPrice}
                onChange={(event) =>
                  setReplenishmentDraft((current) => ({ ...current, sellingPrice: Number(event.target.value) }))
                }
                required
              />
            </label>
            <label>
              Fournisseur
              <input
                value={replenishmentDraft.supplier}
                onChange={(event) => setReplenishmentDraft((current) => ({ ...current, supplier: event.target.value }))}
                required
              />
            </label>
            <label>
              Date d'approvisionnement
              <input value={new Date().toLocaleDateString("fr-FR")} readOnly />
            </label>
            <div className="modal-actions">
              <button className="ghost-btn muted" type="button" onClick={closeModal}>
                Annuler
              </button>
              <button className="primary-btn" type="submit">
                Enregistrer l'approvisionnement
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "sale" ? (
        <Modal title="Nouvelle facture de vente" onClose={closeModal}>
          <form className="sales-form-modern" onSubmit={handleSaleSubmit}>
            <div className="sales-form-row">
              <label>
                Code client
                <input value={saleClientCode} placeholder="Ex: CL-AB2345" readOnly />
              </label>
              <label>
                Date
                <input type="date" value={saleDateDraft} onChange={(event) => setSaleDateDraft(event.target.value)} />
              </label>
            </div>

            <label>
              Nom du client
              <select
                value={saleDraft.clientId ?? ""}
                onChange={(event) =>
                  setSaleDraft((current) => ({
                    ...current,
                    clientId: event.target.value ? Number(event.target.value) : null,
                  }))
                }
              >
                <option value="">Client comptoir</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Mode de paiement
              <select
                value={saleDraft.paymentMethod}
                onChange={(event) => setSaleDraft((current) => ({ ...current, paymentMethod: event.target.value }))}
              >
                <option>Especes</option>
                <option>Mobile Money</option>
                <option>Virement</option>
              </select>
            </label>

            <div className="sales-modern-products">
              <p className="sales-modern-label">Produits achetes</p>
              {products.length === 0 ? <p className="hero-copy">Aucun produit en stock. Tu peux tout de meme facturer uniquement des services.</p> : null}
              {saleDraft.items.map((line, index) => {
                const selectedProduct = products.find((item) => item.id === line.productId);
                const requestedQuantity = requestedProductQuantities.get(line.productId) ?? 0;
                const hasInsufficientStock = selectedProduct ? requestedQuantity > selectedProduct.quantity : false;

                return (
                  <div className={`sales-line-card ${hasInsufficientStock ? "insufficient" : ""}`} key={`${line.productId}-${index}`}>
                    <div className="sales-line-main">
                      <select
                        value={line.productId}
                        onChange={(event) => updateSaleLine(index, { productId: Number(event.target.value) })}
                      >
                        {products.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        className="sales-qty-input"
                        type="number"
                        min="1"
                        placeholder="Qte"
                        value={line.quantity}
                        onChange={(event) => updateSaleLine(index, { quantity: Number(event.target.value) })}
                      />
                      <button className="icon-btn delete" type="button" title="Retirer le produit" onClick={() => removeSaleLine(index)}>
                        Retirer
                      </button>
                    </div>
                    <div className="sales-line-meta">
                      <span>{formatCurrency(selectedProduct?.sellingPrice ?? 0)}</span>
                      <span>Stock: {selectedProduct?.quantity ?? 0} {selectedProduct?.unit ?? ""}</span>
                      {hasInsufficientStock ? (
                        <span className="sales-line-warning">
                          Stock insuffisant: demande {requestedQuantity}, disponible {selectedProduct?.quantity ?? 0}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              <button className="sales-add-line-btn" type="button" onClick={addSaleLine} disabled={products.length === 0}>
                + Ajouter un produit
              </button>
            </div>

            <div className="sales-modern-products">
              <p className="sales-modern-label">Services effectues</p>
              {saleDraft.serviceItems.length === 0 ? (
                <p className="hero-copy">Ajoute ici les prestations comme saisie, impression, scan ou maintenance.</p>
              ) : null}
              {saleDraft.serviceItems.map((line, index) => {
                const selectedService = services.find((item) => item.id === line.serviceId);

                return (
                  <div className="sales-line-card" key={`${line.serviceId}-${index}`}>
                    <div className="sales-line-main">
                      <select
                        value={line.serviceId}
                        onChange={(event) => updateSaleServiceLine(index, { serviceId: Number(event.target.value) })}
                      >
                        {services.filter((item) => item.active).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="sales-qty-input"
                        type="number"
                        min="1"
                        placeholder="Qte"
                        value={line.quantity}
                        onChange={(event) => updateSaleServiceLine(index, { quantity: Number(event.target.value) })}
                      />
                      <button className="icon-btn delete" type="button" title="Retirer le service" onClick={() => removeSaleServiceLine(index)}>
                        Retirer
                      </button>
                    </div>
                    <div className="sales-line-meta">
                      <span>{formatCurrency(selectedService?.unitPrice ?? 0)}</span>
                      <span>{selectedService?.category ?? "Service"}</span>
                    </div>
                  </div>
                );
              })}

              <button className="sales-add-line-btn" type="button" onClick={addSaleServiceLine} disabled={services.filter((item) => item.active).length === 0}>
                + Ajouter un service
              </button>
            </div>

            <label>
              Notes (optionnel)
              <textarea
                rows={3}
                placeholder="Remarques..."
                value={saleNoteDraft}
                onChange={(event) => setSaleNoteDraft(event.target.value)}
              />
            </label>

            <div className="sales-inline-summary">
              <span>{saleUnitsTotal} unites</span>
              <span>•</span>
              <span>{saleDraft.paymentMethod}</span>
              <span>•</span>
              <strong>{formatCurrency(salePreviewTotal)} total</strong>
            </div>

            {saleError ? <p className="error-text">{saleError}</p> : null}
            {saleHasInsufficientStock ? <p className="error-text">Stock insuffisant sur un ou plusieurs produits. La vente ne peut pas etre validee.</p> : null}
            <div className="modal-actions">
              <button className="ghost-btn muted" type="button" onClick={closeModal}>
                Annuler
              </button>
              <button className="primary-btn" type="submit" disabled={saleHasInsufficientStock}>
                Enregistrer et preparer la facture
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "user" ? (
        <Modal title="Nouvel utilisateur" onClose={closeModal}>
          <form className="modal-form modal-form-stack" onSubmit={handleUserSubmit}>
            <label>
              Nom complet
              <input
                value={userDraft.fullName}
                onChange={(event) => setUserDraft((current) => ({ ...current, fullName: event.target.value }))}
                required
              />
            </label>
            <label>
              Nom d'utilisateur
              <input
                value={userDraft.username}
                onChange={(event) => setUserDraft((current) => ({ ...current, username: event.target.value }))}
                required
              />
            </label>
            <label>
              Adresse e-mail
              <input
                type="email"
                value={userDraft.email}
                onChange={(event) => setUserDraft((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </label>
            <label>
              Mot de passe initial
              <input
                type="password"
                value={userDraft.password}
                onChange={(event) => setUserDraft((current) => ({ ...current, password: event.target.value }))}
                minLength={6}
                required
              />
            </label>
            <label>
              Role
              <select
                value={userDraft.role}
                onChange={(event) => setUserDraft((current) => ({ ...current, role: event.target.value as UserRole }))}
              >
                {userRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button className="ghost-btn muted" type="button" onClick={closeModal}>
                Annuler
              </button>
              <button className="primary-btn" type="submit">
                Enregistrer
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "password" && passwordModalState ? (
        <Modal title={passwordModalState.title} onClose={closeModal}>
          <form className="modal-form modal-form-stack" onSubmit={handleChangePassword}>
            {passwordModalState.requireCurrentPassword ? (
              <label>
                Mot de passe actuel
                <input
                  type="password"
                  value={passwordDraft.currentPassword}
                  onChange={(event) => setPasswordDraft((current) => ({ ...current, currentPassword: event.target.value }))}
                  autoComplete="current-password"
                  required
                />
              </label>
            ) : null}
            <label>
              Nouveau mot de passe
              <input
                type="password"
                value={passwordDraft.newPassword}
                onChange={(event) => setPasswordDraft((current) => ({ ...current, newPassword: event.target.value }))}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
            <label>
              Confirmer le mot de passe
              <input
                type="password"
                value={passwordDraft.confirmPassword}
                onChange={(event) => setPasswordDraft((current) => ({ ...current, confirmPassword: event.target.value }))}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
            {passwordError ? <p className="error-text">{passwordError}</p> : null}
            <div className="modal-actions">
              <button className="ghost-btn muted" type="button" onClick={closeModal} disabled={passwordBusy}>
                Annuler
              </button>
              <button className="primary-btn" type="submit" disabled={passwordBusy}>
                {passwordBusy ? "Mise a jour..." : "Enregistrer le mot de passe"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "saleDetail" && selectedSaleDetail ? (
        <Modal title={`Details de la facture ${selectedSaleDetail.reference}`} onClose={closeModal} size="large">
            <div className="sale-detail-card modal-detail-card">
              <div className="invoice-header">
                <div className="invoice-logo-shell">
                  <img className="invoice-logo" src={brandLogo} alt="Walikale to World Tech Adapt Hub" />
                </div>
                <div className="invoice-copy">
                  <h2>Details de la facture {selectedSaleDetail.reference}</h2>
                  <p className="invoice-subtitle">Walikale Papeterie</p>
                </div>
              </div>
            <div className="sale-detail-meta">
              <span>Client: {selectedSaleDetail.clientName}</span>
              <span>Date: {selectedSaleDetail.date}</span>
              <span>Paiement: {selectedSaleDetail.paymentMethod}</span>
              <span>Total: {formatCurrency(selectedSaleDetail.amount)}</span>
            </div>
            <div className="sales-actions-row invoice-actions-row">
              <button className="ghost-btn" type="button" onClick={() => void handlePrintInvoice()}>
                Imprimer facture A4
              </button>
              <button className="primary-btn" type="button" onClick={() => void handleExportInvoicePdf()}>
                Exporter PDF A4
              </button>
              <button className="ghost-btn success" type="button" onClick={() => void handlePrintReceipt()}>
                Imprimer ticket 80 mm
              </button>
              <button className="ghost-btn" type="button" onClick={() => void handleExportReceiptPdf()}>
                Exporter ticket PDF
              </button>
            </div>
            {invoiceMessage ? <p className="invoice-message">{invoiceMessage}</p> : null}
            <div className="table-wrap modal-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Quantite</th>
                    <th>Prix unitaire</th>
                    <th>Sous-total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSaleDetail.items.map((item, index) => (
                    <tr key={`${selectedSaleDetail.id}-${item.productId}-${index}`}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      ) : null}

      {activeModal === "supplyHistory" ? (
        <Modal title="Historique d'approvisionnement" onClose={closeModal} size="large">
          <div className="confirm-stack">
            <div className="section-tools">
              <input
                className="table-search-input"
                placeholder="Rechercher un produit, un fournisseur ou une date"
                value={supplyHistorySearch}
                onChange={(event) => setSupplyHistorySearch(event.target.value)}
              />
              <span className="section-count">{filteredReplenishmentHistory.length} mouvement(s)</span>
            </div>
            <div className="stock-summary compact-summary">
              <article className="stock-stat-card">
                <span className="stock-stat-title">Total approvisionne</span>
                <strong>{replenishmentHistoryUnits}</strong>
              </article>
              <article className="stock-stat-card">
                <span className="stock-stat-title">Valeur cumulee</span>
                <strong>{formatCurrency(replenishmentHistoryAmount)}</strong>
              </article>
            </div>
            {filteredReplenishmentHistory.length === 0 ? (
              <EmptyState
                title="Aucun approvisionnement trouve"
                description="Aucun mouvement d'approvisionnement ne correspond a cette recherche."
              />
            ) : (
              <div className="table-wrap modal-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Produit</th>
                      <th>Quantite</th>
                      <th>Prix d'achat</th>
                      <th>Prix de vente</th>
                      <th>Fournisseur</th>
                      <th>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReplenishmentHistory.map((item) => (
                      <tr key={item.id}>
                        <td>{item.date}</td>
                        <td>{item.product}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.purchasePrice)}</td>
                        <td>{formatCurrency(item.sellingPrice)}</td>
                        <td>{item.supplier}</td>
                        <td>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="modal-actions">
              <button className="ghost-btn muted" type="button" onClick={closeModal}>
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {confirmState ? (
        <Modal title={confirmState.title} onClose={() => !confirmBusy && setConfirmState(null)}>
          <div className="confirm-stack">
            <p className="confirm-text">{confirmState.message}</p>
            <div className="modal-actions">
              <button
                className="ghost-btn muted"
                type="button"
                disabled={confirmBusy}
                onClick={() => setConfirmState(null)}
              >
                Annuler
              </button>
              <button
                className={confirmState.tone === "danger" ? "danger-btn" : "primary-btn"}
                type="button"
                disabled={confirmBusy}
                onClick={() => void handleConfirmAction()}
              >
                {confirmBusy ? "Traitement..." : confirmState.actionLabel}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {syncConflictState ? (
        <Modal title="Conflit de synchronisation" onClose={() => !syncBusy && setSyncConflictState(null)}>
          <div className="confirm-stack">
            <p className="confirm-text">
              Des modifications existent a la fois sur ce poste et dans Supabase. Choisissez maintenant la version qui doit
              devenir la reference.
            </p>
            <p className="confirm-text">
              Changements locaux en attente : <strong>{syncConflictState.preview.localPendingChanges}</strong>
            </p>
            <div className="sync-conflict-grid">
              <div className="sync-conflict-card">
                <h3>Ce poste</h3>
                <p className="sync-conflict-date">
                  Derniere activite :{" "}
                  {syncConflictState.preview.localLastChangeAt ? formatDateTime(syncConflictState.preview.localLastChangeAt) : "Non precisee"}
                </p>
                {syncConflictState.preview.localBuckets.length > 0 ? (
                  <div className="sync-conflict-list">
                    {syncConflictState.preview.localBuckets.map((bucket) => (
                      <div className="sync-conflict-row" key={`local-${bucket.key}`}>
                        <span>{bucket.label}</span>
                        <strong>{bucket.count}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="sync-conflict-empty">Aucun detail local supplementaire.</p>
                )}
              </div>
              <div className="sync-conflict-card">
                <h3>Supabase</h3>
                <p className="sync-conflict-date">
                  Derniere activite :{" "}
                  {syncConflictState.preview.cloudLastChangeAt ? formatDateTime(syncConflictState.preview.cloudLastChangeAt) : "Non precisee"}
                </p>
                {syncConflictState.preview.cloudBuckets.length > 0 ? (
                  <div className="sync-conflict-list">
                    {syncConflictState.preview.cloudBuckets.map((bucket) => (
                      <div className="sync-conflict-row" key={`cloud-${bucket.key}`}>
                        <span>{bucket.label}</span>
                        <strong>{bucket.count}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="sync-conflict-empty">Aucun detail cloud supplementaire.</p>
                )}
              </div>
            </div>
            <p className="confirm-text">Garder le local envoie ce poste vers Supabase. Prendre le cloud remplace les donnees locales.</p>
            <div className="modal-actions">
              <button
                className="ghost-btn muted"
                type="button"
                disabled={syncBusy}
                onClick={() => setSyncConflictState(null)}
              >
                Annuler
              </button>
              <button className="warn-btn" type="button" disabled={syncBusy} onClick={() => void handleTakeCloudDuringConflict()}>
                {syncBusy ? "Traitement..." : "Prendre le cloud"}
              </button>
              <button className="primary-btn" type="button" disabled={syncBusy} onClick={() => void handleKeepLocalDuringConflict()}>
                {syncBusy ? "Traitement..." : "Garder le local"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {toast ? (
        <div className={`toast ${toast.tone}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
