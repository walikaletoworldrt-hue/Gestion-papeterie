export type TabId =
  | "dashboard"
  | "products"
  | "services"
  | "expenses"
  | "initial-stock"
  | "replenishments"
  | "sales"
  | "cybercafe"
  | "current-stock"
  | "utilisateurs"
  | "history";

export type Product = {
  id: number;
  code: string;
  name: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  unit: string;
  alertThreshold: number;
  supplier: string;
  updatedAt: string;
};

export type ProductDraft = {
  code?: string;
  name: string;
  category?: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  unit?: string;
  alertThreshold?: number;
  supplier: string;
  replenishmentLotNumber?: string;
};

/** Product information edited from "Modifier": never the quantity, which only changes through stock movements. */
export type ProductDetailsDraft = {
  code: string;
  name: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  unit: string;
  alertThreshold: number;
  supplier: string;
};

/** Initial stock of a product for the current inventory cycle. */
export type InitialStockItem = {
  productId: number;
  quantity: number;
};

export type InitialStockCorrectionDraft = {
  productId: number;
  quantity: number;
  reason: string;
};

export type Service = {
  id: number;
  name: string;
  category: string;
  unitPrice: number;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceDraft = {
  name: string;
  category: string;
  unitPrice: number;
  description: string;
  active?: boolean;
};

export type CybercafeTariff = {
  id: number;
  name: string;
  unitPrice: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CybercafeTariffDraft = {
  id?: number;
  name: string;
  unitPrice: number;
  active?: boolean;
};

export type CybercafeSale = {
  id: number;
  tariffId: number;
  tariffName: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  date: string;
  paymentMethod: string;
  note: string;
  userName: string;
};

export type CybercafeSaleDraft = {
  tariffId: number;
  quantity: number;
  amount?: number;
  date: string;
  paymentMethod: string;
  note: string;
};

export type MikhmonSale = {
  id: number;
  date: string;
  time: string;
  username: string;
  profile: string;
  comment: string;
  amount: number;
};

export type MikhmonImportSummary = {
  imported: number;
  skipped: number;
  totalAmount: number;
  ticketCount: number;
  errors: string[];
};

export type SupplyHistoryItem = {
  id: number;
  date: string;
  product: string;
  quantity: number;
  supplier: string;
  purchasePrice: number;
  sellingPrice: number;
  amount: number;
  lotNumber?: string;
  transportTotal?: number;
  movementType: "stock_initial" | "reapprovisionnement" | "vente";
};

export type ReplenishmentImportSummary = {
  imported: number;
  skipped: number;
  errors: string[];
};

export type ActivityHistoryItem = {
  id: number;
  date: string;
  timestamp?: string;
  action: string;
  target: string;
  details: string;
  user: string;
};

export type ExpenseItem = {
  id: number;
  detail: string;
  nature: string;
  amount: number;
  date: string;
  requestedBy: string;
  approvedBy: string;
  purpose: string;
};

export type ExpenseDraft = {
  detail: string;
  nature: string;
  amount: number;
  date: string;
  approvedBy: string;
  purpose: string;
};

export type DashboardMetrics = {
  totalStock: number;
  totalProducts: number;
  dailySales: number;
  suppliers: number;
  totalSalesAmount?: number;
  totalExpenses?: number;
  netSalesAmount?: number;
};

export type SaleDraft = {
  clientId: number | null;
  /** Name typed at the sale. When filled, it wins over clientId: the client is found by name or created. */
  clientName?: string;
  /** Day of the sale (YYYY-MM-DD). Empty means now. */
  soldOn?: string;
  paymentMethod: string;
  items: SaleItemDraft[];
  serviceItems: SaleServiceItemDraft[];
};

export type SaleItemDraft = {
  productId: number;
  quantity: number;
};

export type SaleServiceItemDraft = {
  serviceId: number;
  quantity: number;
};

export type SaleRecord = {
  id: number;
  reference: string;
  clientName: string;
  date: string;
  amount: number;
  paymentMethod: string;
  status: "Payee" | "En attente";
  itemsCount: number;
};

export type SaleDetailItem = {
  lineType: "product" | "service";
  productId?: number;
  serviceId?: number;
  productName: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type SaleDetail = {
  id: number;
  reference: string;
  clientName: string;
  date: string;
  amount: number;
  paymentMethod: string;
  status: "Payee" | "En attente";
  items: SaleDetailItem[];
};

export type Client = {
  id: number;
  name: string;
  phone: string;
  address: string;
  email: string;
  createdAt: string;
};

export type ClientDraft = {
  id?: number;
  name: string;
  phone: string;
  address: string;
  email: string;
};

export type UserRole = "Administrateur" | "Super admin" | "Employe";

export type AppUser = {
  id: number;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLoginAt: string;
};

export type UserDraft = {
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  password: string;
};

export type LoginDraft = {
  identifier: string;
  password: string;
};

export type CloudDesktopSessionDraft = {
  authUserId: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  password: string;
};

export type DesktopSyncCredentials = {
  userId: number;
  email: string;
  password: string;
  role: UserRole;
};

export type PasswordChangeDraft = {
  userId: number;
  currentPassword?: string;
  newPassword: string;
};

export type StockRow = {
  productId: number;
  productName: string;
  quantityIn: number;
  quantityOut: number;
  currentStock: number;
  alertThreshold: number;
};

export type InvoiceSeriesInfo = {
  seriesLabel: string;
  year: number;
  yearCode: string;
  nextNumber: number;
  nextReference: string;
  lastReference: string | null;
  /** Code of the device that issues the invoices (P1, P2... for PCs, W for the web). Null until configured. */
  deviceCode: string | null;
};

export type SyncStatus = {
  available: boolean;
  online: boolean;
  lastSyncedAt: string | null;
  pendingChanges: number;
  cloudHasChanges?: boolean;
};

export type SyncConflictBucket = {
  key: string;
  label: string;
  count: number;
};

export type SyncPendingOverview = {
  buckets: SyncConflictBucket[];
  latestChangedAt: string | null;
};

export type SyncConflictPreview = {
  localPendingChanges: number;
  localLastChangeAt: string | null;
  cloudLastChangeAt: string | null;
  localBuckets: SyncConflictBucket[];
  cloudBuckets: SyncConflictBucket[];
};

export type SyncSnapshot = {
  users: Array<Record<string, unknown>>;
  products: Array<Record<string, unknown>>;
  services: Array<Record<string, unknown>>;
  cybercafeTariffs: Array<Record<string, unknown>>;
  clients: Array<Record<string, unknown>>;
  expenses: Array<Record<string, unknown>>;
  initialStocks: Array<Record<string, unknown>>;
  replenishments: Array<Record<string, unknown>>;
  sales: Array<Record<string, unknown>>;
  saleItems: Array<Record<string, unknown>>;
  saleServiceItems: Array<Record<string, unknown>>;
  cybercafeSales: Array<Record<string, unknown>>;
  mikhmonSales: Array<Record<string, unknown>>;
  stockMovements: Array<Record<string, unknown>>;
  auditLogs: Array<Record<string, unknown>>;
  invoiceSequences: Array<Record<string, unknown>>;
  inventoryCycles: Array<Record<string, unknown>>;
};

export type DesktopApi = {
  getPlatform: () => string;
  listProducts: () => Promise<Product[]>;
  saveProduct: (draft: ProductDraft) => Promise<Product[]>;
  deleteProduct: (id: number) => Promise<Product[]>;
  updateProductDetails: (id: number, draft: ProductDetailsDraft) => Promise<Product[]>;
  listInitialStocks: () => Promise<InitialStockItem[]>;
  correctInitialStock: (draft: InitialStockCorrectionDraft) => Promise<InitialStockItem[]>;
  listServices: () => Promise<Service[]>;
  saveService: (draft: ServiceDraft) => Promise<Service[]>;
  listCybercafeTariffs: () => Promise<CybercafeTariff[]>;
  saveCybercafeTariff: (draft: CybercafeTariffDraft) => Promise<CybercafeTariff[]>;
  listCybercafeSales: () => Promise<CybercafeSale[]>;
  createCybercafeSale: (draft: CybercafeSaleDraft) => Promise<CybercafeSale[]>;
  listMikhmonSales: () => Promise<MikhmonSale[]>;
  importMikhmonCsv: (fileName: string, content: string) => Promise<MikhmonImportSummary>;
  listSales: () => Promise<SaleRecord[]>;
  createSale: (draft: SaleDraft) => Promise<SaleRecord[]>;
  getSaleDetail: (saleId: number) => Promise<SaleDetail | null>;
  printSaleInvoice: (saleId: number) => Promise<boolean>;
  exportSalePdf: (saleId: number) => Promise<string | null>;
  printSaleReceipt: (saleId: number) => Promise<boolean>;
  exportSaleReceiptPdf: (saleId: number) => Promise<string | null>;
  exportExpenseReportPdf: (html: string, fileName: string) => Promise<string | null>;
  exportReplenishmentTemplateCsv: () => Promise<string | null>;
  exportReplenishmentHistoryCsv: () => Promise<string | null>;
  importReplenishmentCsv: () => Promise<ReplenishmentImportSummary | null>;
  getSupplyHistory: () => Promise<SupplyHistoryItem[]>;
  getActivityHistory: () => Promise<ActivityHistoryItem[]>;
  pruneActivityHistory: (months: number | "all") => Promise<number>;
  listExpenses: () => Promise<ExpenseItem[]>;
  saveExpense: (draft: ExpenseDraft) => Promise<ExpenseItem[]>;
  getDashboardMetrics: () => Promise<DashboardMetrics>;
  listClients: () => Promise<Client[]>;
  saveClient: (draft: ClientDraft) => Promise<Client[]>;
  deleteClient: (id: number) => Promise<Client[]>;
  listUsers: () => Promise<AppUser[]>;
  saveUser: (draft: UserDraft) => Promise<AppUser[]>;
  linkCloudUserProfile: (draft: CloudDesktopSessionDraft) => Promise<AppUser[]>;
  authenticateUser: (draft: LoginDraft) => Promise<AppUser | null>;
  cacheCloudAuthenticatedUser: (draft: CloudDesktopSessionDraft) => Promise<AppUser>;
  getCurrentSyncCredentials: () => Promise<DesktopSyncCredentials>;
  restoreUserSession: (userId: number) => Promise<AppUser | null>;
  logoutUser: () => Promise<void>;
  changeUserPassword: (draft: PasswordChangeDraft) => Promise<AppUser[]>;
  setUserActive: (userId: number, active: boolean) => Promise<AppUser[]>;
  updateUserRole: (userId: number, role: UserRole) => Promise<AppUser[]>;
  refreshUserAccess: (userId: number) => Promise<AppUser[]>;
  deleteUser: (userId: number) => Promise<AppUser[]>;
  getCurrentStock: () => Promise<StockRow[]>;
  getInvoiceSeriesInfo: () => Promise<InvoiceSeriesInfo>;
  advanceInvoiceSeries: () => Promise<InvoiceSeriesInfo>;
  setDeviceCode: (code: string) => Promise<InvoiceSeriesInfo>;
  resetInventoryCycle: () => Promise<void>;
  getSyncStatus: () => Promise<SyncStatus>;
  getPendingSyncOverview: () => Promise<SyncPendingOverview>;
  getSyncConflictPreview: () => Promise<SyncConflictPreview>;
  exportSyncSnapshot: () => Promise<SyncSnapshot>;
  rowSyncGetState: () => Promise<{ deviceCode: string | null; deviceId: string; deviceLabel: string; cursor: number }>;
  rowSyncCollect: () => Promise<import("./lib/row-sync-schema").RowSyncLocalChanges>;
  rowSyncApply: (changes: import("./lib/row-sync-schema").RowSyncPulledChanges) => Promise<import("./lib/row-sync-schema").RowSyncApplyResult>;
  rowSyncMarkPushed: (pushed: Record<string, import("./lib/row-sync-schema").RowSyncPushedRow[]>, tombstoneIds: number[]) => Promise<void>;
  rowSyncFinish: (syncedAt: string) => Promise<SyncStatus>;
  importSyncSnapshot: (snapshot: SyncSnapshot) => Promise<void>;
  markSyncComplete: (syncedAt?: string | null) => Promise<void>;
  markSyncBucketsComplete: (tables: string[], syncedAt?: string | null) => Promise<void>;
  createBackup: () => Promise<string | null>;
  restoreBackup: () => Promise<string | null>;
};
