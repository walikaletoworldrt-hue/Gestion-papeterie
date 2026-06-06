export type TabId =
  | "dashboard"
  | "products"
  | "clients"
  | "initial-stock"
  | "replenishments"
  | "sales"
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
};

export type SupplyHistoryItem = {
  id: number;
  date: string;
  product: string;
  quantity: number;
  supplier: string;
  amount: number;
  movementType: "stock_initial" | "reapprovisionnement" | "vente";
};

export type ActivityHistoryItem = {
  id: number;
  date: string;
  action: string;
  target: string;
  details: string;
  user: string;
};

export type DashboardMetrics = {
  totalStock: number;
  totalProducts: number;
  dailySales: number;
  suppliers: number;
};

export type SaleDraft = {
  clientId: number | null;
  paymentMethod: string;
  items: SaleItemDraft[];
};

export type SaleItemDraft = {
  productId: number;
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
  productId: number;
  productName: string;
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

export type SyncConflictPreview = {
  localPendingChanges: number;
  localLastChangeAt: string | null;
  cloudLastChangeAt: string | null;
  localBuckets: SyncConflictBucket[];
  cloudBuckets: SyncConflictBucket[];
};

export type SyncSnapshot = {
  products: Array<Record<string, unknown>>;
  clients: Array<Record<string, unknown>>;
  initialStocks: Array<Record<string, unknown>>;
  replenishments: Array<Record<string, unknown>>;
  sales: Array<Record<string, unknown>>;
  saleItems: Array<Record<string, unknown>>;
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
  listSales: () => Promise<SaleRecord[]>;
  createSale: (draft: SaleDraft) => Promise<SaleRecord[]>;
  getSaleDetail: (saleId: number) => Promise<SaleDetail | null>;
  printSaleInvoice: (saleId: number) => Promise<boolean>;
  exportSalePdf: (saleId: number) => Promise<string | null>;
  getSupplyHistory: () => Promise<SupplyHistoryItem[]>;
  getActivityHistory: () => Promise<ActivityHistoryItem[]>;
  getDashboardMetrics: () => Promise<DashboardMetrics>;
  listClients: () => Promise<Client[]>;
  saveClient: (draft: ClientDraft) => Promise<Client[]>;
  listUsers: () => Promise<AppUser[]>;
  saveUser: (draft: UserDraft) => Promise<AppUser[]>;
  authenticateUser: (draft: LoginDraft) => Promise<AppUser | null>;
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
  resetInventoryCycle: () => Promise<void>;
  getSyncStatus: () => Promise<SyncStatus>;
  getSyncConflictPreview: () => Promise<SyncConflictPreview>;
  exportSyncSnapshot: () => Promise<SyncSnapshot>;
  importSyncSnapshot: (snapshot: SyncSnapshot) => Promise<void>;
  markSyncComplete: (syncedAt?: string | null) => Promise<void>;
};
