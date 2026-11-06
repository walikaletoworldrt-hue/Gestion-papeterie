import { FormEvent, useMemo, useState } from "react";
import { repository } from "../lib/repository";
import {
  buildPurchaseOrderHtml,
  buildPurchaseOrderText,
  formatOrderDate,
  formatOrderQuantity,
  OPEN_PURCHASE_ORDER_STATUSES,
  orderedUnits,
  pendingUnitsByProduct,
  PURCHASE_ORDER_STATUS_LABELS,
  remainingQuantity,
  suggestOrderQuantity,
} from "../lib/purchase-orders";
import type { Product, PurchaseOrder, PurchaseOrderDraft, PurchaseOrderStatus } from "../types";
import { EmptyState, Modal } from "./ui";

type ConfirmRequest = {
  title: string;
  message: string;
  actionLabel: string;
  tone?: "danger" | "default";
  onConfirm: () => Promise<void> | void;
};

type Props = {
  products: Product[];
  orders: PurchaseOrder[];
  isSuperAdmin: boolean;
  currentUserName: string;
  /** Absolute URL of the logo, printed on the order. */
  logoSrc: string;
  onOrdersChange: (orders: PurchaseOrder[]) => void;
  /** Stock changed (goods received): reload everything. */
  onStockChange: () => Promise<void>;
  showToast: (tone: "success" | "error" | "info", message: string) => void;
  askConfirmation: (request: ConfirmRequest) => void;
};

/** One line being typed in the order form. "pack" = ordered by the pack (ream, box...). */
type EditorLine = {
  key: number;
  productId: number | null;
  itemName: string;
  unit: string;
  mode: "unit" | "pack";
  quantity: string;
  note: string;
};

type EditorState = {
  id?: number;
  reference?: string;
  supplier: string;
  note: string;
  lines: EditorLine[];
};

type ReceiptState = {
  order: PurchaseOrder;
  quantities: Record<number, string>;
  prices: Record<number, string>;
};

type OrderFilter = "open" | "waiting" | "done" | "all";

const NO_SUPPLIER = "Fournisseur a preciser";

let lineKey = 1;

function productPack(product: Product | undefined) {
  return product && product.packLabel && Number(product.packSize) > 1 ? { label: product.packLabel, size: Number(product.packSize) } : null;
}

function stockState(product: Product) {
  if (product.quantity <= 0) return "Rupture";
  if (product.quantity <= product.alertThreshold) return "Stock faible";
  return "Correct";
}

function statusTone(status: PurchaseOrderStatus) {
  if (status === "recue") return "success";
  if (status === "annulee") return "muted";
  if (status === "partielle" || status === "envoyee") return "warning";
  return "neutral";
}

export function PurchaseOrdersTab({
  products,
  orders,
  isSuperAdmin,
  currentUserName,
  logoSrc,
  onOrdersChange,
  onStockChange,
  showToast,
  askConfirmation,
}: Props) {
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [selection, setSelection] = useState<Record<number, boolean>>({});
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("open");
  const [orderSearch, setOrderSearch] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorError, setEditorError] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<ReceiptState | null>(null);
  const [receiptError, setReceiptError] = useState("");
  const [busy, setBusy] = useState(false);

  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const pendingUnits = useMemo(() => pendingUnitsByProduct(orders), [orders]);
  const sortedProducts = useMemo(() => [...products].sort((left, right) => left.name.localeCompare(right.name, "fr")), [products]);
  const supplierNames = useMemo(
    () =>
      Array.from(new Set([...products.map((product) => product.supplier.trim()), ...orders.map((order) => order.supplier.trim())].filter(Boolean))).sort(
        (left, right) => left.localeCompare(right, "fr")
      ),
    [products, orders]
  );

  // Products in rupture or below their alert threshold, with the suggested quantity.
  const toOrder = useMemo(
    () =>
      products
        .filter((product) => product.quantity <= product.alertThreshold)
        .map((product) => {
          const pending = pendingUnits.get(product.id) ?? 0;
          return { product, pending, suggestion: suggestOrderQuantity(product, pending) };
        })
        .sort((left, right) => {
          const leftRank = left.product.quantity <= 0 ? 0 : 1;
          const rightRank = right.product.quantity <= 0 ? 0 : 1;
          return leftRank - rightRank || left.product.name.localeCompare(right.product.name, "fr");
        }),
    [products, pendingUnits]
  );

  const filteredToOrder = toOrder.filter(({ product }) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || [product.name, product.code, product.supplier, product.category].some((value) => value.toLowerCase().includes(query));
    const matchesSupplier = !supplierFilter || (product.supplier.trim() || NO_SUPPLIER) === supplierFilter;
    return matchesQuery && matchesSupplier;
  });

  const ruptureCount = toOrder.filter(({ product }) => product.quantity <= 0).length;
  const lowCount = toOrder.length - ruptureCount;
  const openOrders = orders.filter((order) => OPEN_PURCHASE_ORDER_STATUSES.includes(order.status));
  const waitingOrders = orders.filter((order) => order.status === "envoyee" || order.status === "partielle");
  const draftCount = orders.filter((order) => order.status === "brouillon").length;

  function isSelected(productId: number, suggestedQuantity: number) {
    return selection[productId] ?? suggestedQuantity > 0;
  }

  function quantityFor(productId: number, suggestedQuantity: number) {
    return quantities[productId] ?? (suggestedQuantity > 0 ? String(suggestedQuantity) : "");
  }

  const selectedRows = filteredToOrder.filter(
    ({ product, suggestion }) => isSelected(product.id, suggestion.quantity) && Number(quantityFor(product.id, suggestion.quantity)) > 0
  );
  const selectedSuppliers = Array.from(new Set(selectedRows.map(({ product }) => product.supplier.trim() || NO_SUPPLIER)));

  const filteredOrders = orders.filter((order) => {
    const query = orderSearch.trim().toLowerCase();
    const matchesQuery =
      !query ||
      [order.reference, order.supplier, ...order.items.map((item) => item.itemName)].some((value) => value.toLowerCase().includes(query));
    const matchesFilter =
      orderFilter === "all" ||
      (orderFilter === "open" && OPEN_PURCHASE_ORDER_STATUSES.includes(order.status)) ||
      (orderFilter === "waiting" && (order.status === "envoyee" || order.status === "partielle")) ||
      (orderFilter === "done" && (order.status === "recue" || order.status === "annulee"));
    return matchesQuery && matchesFilter;
  });

  const detailOrder = detailId ? orders.find((order) => order.id === detailId) ?? null : null;

  function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
  }

  async function run<T>(work: () => Promise<T>, fallback: string): Promise<T | null> {
    setBusy(true);
    try {
      return await work();
    } catch (error) {
      showToast("error", errorMessage(error, fallback));
      return null;
    } finally {
      setBusy(false);
    }
  }

  function lineFromProduct(product: Product, quantity: number | string, preferPack: boolean): EditorLine {
    const pack = productPack(product);
    return {
      key: lineKey++,
      productId: product.id,
      itemName: product.name,
      unit: product.unit,
      mode: pack && preferPack ? "pack" : "unit",
      quantity: String(quantity),
      note: "",
    };
  }

  function emptyLine(): EditorLine {
    return { key: lineKey++, productId: null, itemName: "", unit: "piece", mode: "unit", quantity: "1", note: "" };
  }

  function openNewOrder(lines: EditorLine[] = [emptyLine()], supplier = "") {
    setEditorError("");
    setEditor({ supplier, note: "", lines });
  }

  function openEditOrder(order: PurchaseOrder) {
    setEditorError("");
    setDetailId(null);
    setEditor({
      id: order.id,
      reference: order.reference,
      supplier: order.supplier,
      note: order.note,
      lines: order.items.map((item) => ({
        key: lineKey++,
        productId: item.productId,
        itemName: item.itemName,
        unit: item.unit,
        mode: item.packLabel && item.packSize ? "pack" : "unit",
        quantity: String(item.quantity),
        note: item.note,
      })),
    });
  }

  function selectedEditorLines(rows: typeof selectedRows) {
    return rows.map(({ product, suggestion }) => lineFromProduct(product, quantityFor(product.id, suggestion.quantity), Boolean(suggestion.packSize)));
  }

  /** One draft per supplier, created at once from the selected products. */
  async function createOrdersBySupplier() {
    if (selectedRows.length === 0) {
      showToast("info", "Cochez au moins un produit avec une quantite a commander.");
      return;
    }
    const groups = new Map<string, typeof selectedRows>();
    selectedRows.forEach((row) => {
      const supplier = row.product.supplier.trim() || NO_SUPPLIER;
      groups.set(supplier, [...(groups.get(supplier) ?? []), row]);
    });

    const result = await run(async () => {
      let latest = orders;
      for (const [supplier, rows] of groups) {
        latest = await repository.savePurchaseOrder(toDraft({ supplier, note: "", lines: selectedEditorLines(rows) }));
      }
      return latest;
    }, "Impossible de creer les bons de commande.");

    if (result) {
      onOrdersChange(result);
      setSelection({});
      setQuantities({});
      setOrderFilter("open");
      showToast(
        "success",
        `${groups.size} bon(s) de commande cree(s) en brouillon. Verifiez-les, imprimez-les puis marquez-les comme envoyes.`
      );
    }
  }

  function prepareSingleOrder() {
    if (selectedRows.length === 0) {
      showToast("info", "Cochez au moins un produit avec une quantite a commander.");
      return;
    }
    openNewOrder(selectedEditorLines(selectedRows), selectedSuppliers.length === 1 && selectedSuppliers[0] !== NO_SUPPLIER ? selectedSuppliers[0] : "");
  }

  function toDraft(state: EditorState): PurchaseOrderDraft {
    return {
      id: state.id,
      supplier: state.supplier,
      note: state.note,
      items: state.lines.map((line) => {
        const product = line.productId ? productsById.get(line.productId) : undefined;
        const pack = line.mode === "pack" ? productPack(product) : null;
        return {
          productId: line.productId,
          itemName: line.itemName,
          unit: line.unit,
          packLabel: pack?.label ?? null,
          packSize: pack?.size ?? null,
          quantity: Number(line.quantity),
          note: line.note,
        };
      }),
    };
  }

  function updateLine(key: number, changes: Partial<EditorLine>) {
    setEditor((current) =>
      current ? { ...current, lines: current.lines.map((line) => (line.key === key ? { ...line, ...changes } : line)) } : current
    );
  }

  function changeLineProduct(key: number, value: string) {
    if (value === "") {
      updateLine(key, { productId: null, itemName: "", unit: "piece", mode: "unit" });
      return;
    }
    const product = productsById.get(Number(value));
    if (!product) return;
    const suggestion = suggestOrderQuantity(product, pendingUnits.get(product.id) ?? 0);
    updateLine(key, {
      productId: product.id,
      itemName: product.name,
      unit: product.unit,
      mode: suggestion.packSize ? "pack" : "unit",
      quantity: String(suggestion.quantity > 0 ? suggestion.quantity : 1),
    });
  }

  async function handleEditorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    setEditorError("");
    setBusy(true);
    try {
      const next = await repository.savePurchaseOrder(toDraft(editor));
      onOrdersChange(next);
      const saved = editor.id ? next.find((order) => order.id === editor.id) : next[0];
      setEditor(null);
      setSelection({});
      setQuantities({});
      showToast("success", editor.id ? "Bon de commande mis a jour." : `Bon de commande ${saved?.reference ?? ""} cree en brouillon.`);
      if (saved) setDetailId(saved.id);
    } catch (error) {
      setEditorError(errorMessage(error, "Impossible d'enregistrer le bon de commande."));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(order: PurchaseOrder, status: PurchaseOrderStatus, success: string) {
    const next = await run(() => repository.setPurchaseOrderStatus(order.id, status), "Impossible de changer l'etat du bon.");
    if (next) {
      onOrdersChange(next);
      showToast("success", success);
    }
  }

  function confirmCancel(order: PurchaseOrder) {
    askConfirmation({
      title: "Annuler le bon de commande",
      message: `Le bon ${order.reference} (${order.supplier}) sera marque comme annule. Ses quantites ne compteront plus comme "deja commandees".`,
      actionLabel: "Annuler le bon",
      tone: "danger",
      onConfirm: () => changeStatus(order, "annulee", `Bon ${order.reference} annule.`),
    });
  }

  function confirmClose(order: PurchaseOrder) {
    askConfirmation({
      title: "Cloturer la commande",
      message: `Le reste du bon ${order.reference} ne sera plus attendu. Les produits concernes pourront etre recommandes.`,
      actionLabel: "Cloturer",
      onConfirm: () => changeStatus(order, "recue", `Bon ${order.reference} cloture.`),
    });
  }

  function confirmDelete(order: PurchaseOrder) {
    askConfirmation({
      title: "Supprimer le bon de commande",
      message: `Le bon ${order.reference} (${order.supplier}) sera supprime sur tous les postes.`,
      actionLabel: "Supprimer",
      tone: "danger",
      onConfirm: async () => {
        const next = await run(() => repository.deletePurchaseOrder(order.id), "Impossible de supprimer ce bon.");
        if (next) {
          onOrdersChange(next);
          setDetailId(null);
          showToast("success", `Bon ${order.reference} supprime.`);
        }
      },
    });
  }

  function orderHtml(order: PurchaseOrder, autoPrint: boolean) {
    return buildPurchaseOrderHtml(order, { logoSrc, preparedBy: order.userName || currentUserName, autoPrint });
  }

  function printOrder(order: PurchaseOrder) {
    const popup = window.open("", "_blank", "width=1000,height=900");
    if (!popup) {
      showToast("error", "Impossible d'ouvrir la fenetre d'impression. Autorisez les popups puis reessayez.");
      return;
    }
    popup.document.open();
    popup.document.write(orderHtml(order, true));
    popup.document.close();
  }

  async function exportOrderPdf(order: PurchaseOrder) {
    if (!repository.isDesktop) {
      showToast("info", "Sur le site web, choisissez \"Enregistrer au format PDF\" dans la fenetre d'impression.");
      printOrder(order);
      return;
    }
    const path = await run(
      () => repository.exportPurchaseOrderPdf(orderHtml(order, false), `bon-de-commande-${order.reference}`),
      "Impossible de creer le PDF."
    );
    showToast(path ? "success" : "info", path ? `PDF enregistre : ${path}` : "Export PDF annule ou impossible.");
  }

  async function copyOrderText(order: PurchaseOrder) {
    try {
      await navigator.clipboard.writeText(buildPurchaseOrderText(order));
      showToast("success", "Texte de la commande copie. Collez-le dans WhatsApp ou dans un e-mail.");
    } catch {
      showToast("error", "Impossible de copier le texte. Utilisez plutot le PDF.");
    }
  }

  function openReceipt(order: PurchaseOrder) {
    setReceiptError("");
    setDetailId(null);
    const quantitiesByItem: Record<number, string> = {};
    const pricesByItem: Record<number, string> = {};
    order.items.forEach((item) => {
      const remaining = remainingQuantity(item);
      quantitiesByItem[item.id] = item.productId && remaining > 0 ? String(remaining) : "0";
      const product = item.productId ? productsById.get(item.productId) : undefined;
      if (product) {
        const perOrderedUnit = product.purchasePrice * (item.packSize && item.packSize > 1 ? item.packSize : 1);
        pricesByItem[item.id] = String(Math.round(perOrderedUnit * 100) / 100);
      }
    });
    setReceipt({ order, quantities: quantitiesByItem, prices: pricesByItem });
  }

  async function handleReceiptSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receipt) return;
    setReceiptError("");
    setBusy(true);
    try {
      const next = await repository.receivePurchaseOrder({
        orderId: receipt.order.id,
        lines: receipt.order.items.map((item) => ({
          itemId: item.id,
          quantity: Number(receipt.quantities[item.id] || 0),
          purchasePrice: isSuperAdmin && receipt.prices[item.id] !== undefined && receipt.prices[item.id] !== "" ? Number(receipt.prices[item.id]) : undefined,
        })),
      });
      onOrdersChange(next);
      const updated = next.find((order) => order.id === receipt.order.id);
      setReceipt(null);
      await onStockChange();
      showToast(
        "success",
        updated?.status === "recue"
          ? `Commande ${receipt.order.reference} recue en entier. Le stock est mis a jour.`
          : `Reception enregistree. Le stock est mis a jour ; le reste du bon ${receipt.order.reference} reste attendu.`
      );
    } catch (error) {
      setReceiptError(errorMessage(error, "Impossible d'enregistrer la reception."));
    } finally {
      setBusy(false);
    }
  }

  function renderStatus(status: PurchaseOrderStatus) {
    return <span className={`order-status ${statusTone(status)}`}>{PURCHASE_ORDER_STATUS_LABELS[status]}</span>;
  }

  function receivedSummary(order: PurchaseOrder) {
    const done = order.items.filter((item) => remainingQuantity(item) <= 0).length;
    return `${done}/${order.items.length}`;
  }

  return (
    <>
      <section className="panel-card">
        <div className="panel-header supply-header">
          <h2>Commandes</h2>
          <div className="action-strip">
            <button className="primary-btn" type="button" onClick={() => openNewOrder()}>
              Nouveau bon de commande
            </button>
          </div>
        </div>
        <div className="sales-summary">
          <div className={`sales-indicator ${ruptureCount > 0 ? "danger" : "neutral"}`}>
            <span>En rupture</span>
            <strong>{ruptureCount}</strong>
          </div>
          <div className={`sales-indicator ${lowCount > 0 ? "warning" : "neutral"}`}>
            <span>Stock faible</span>
            <strong>{lowCount}</strong>
          </div>
          <div className={`sales-indicator ${draftCount > 0 ? "warning" : "neutral"}`}>
            <span>Bons en brouillon</span>
            <strong>{draftCount}</strong>
          </div>
          <div className={`sales-indicator ${waitingOrders.length > 0 ? "success" : "neutral"}`}>
            <span>En attente de livraison</span>
            <strong>{waitingOrders.length}</strong>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <h2>A commander</h2>
        </div>
        <p className="orders-help">
          Produits en rupture ou au niveau de leur seuil d'alerte. La quantite proposee ramene le stock a deux fois le seuil, moins ce qui
          est deja commande. Vous pouvez la changer, decocher un produit ou ajouter d'autres articles dans le bon.
        </p>
        <div className="section-tools">
          <input
            className="table-search-input"
            placeholder="Rechercher un produit, un code ou un fournisseur"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="stock-filters sales-filters">
            <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
              <option value="">Tous les fournisseurs</option>
              {Array.from(new Set(toOrder.map(({ product }) => product.supplier.trim() || NO_SUPPLIER)))
                .sort((left, right) => left.localeCompare(right, "fr"))
                .map((supplier) => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
            </select>
          </div>
          <span className="section-count">{filteredToOrder.length} produit(s)</span>
        </div>

        {toOrder.length === 0 ? (
          <EmptyState
            title="Aucun produit a commander"
            description="Aucun produit n'est en rupture ni sous son seuil d'alerte. Vous pouvez quand meme creer un bon avec Nouveau bon de commande."
          />
        ) : filteredToOrder.length === 0 ? (
          <EmptyState title="Aucun produit trouve" description="Essayez une autre recherche ou un autre fournisseur." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th aria-label="Choisir" />
                    <th>Produit</th>
                    <th>Fournisseur</th>
                    <th>Stock</th>
                    <th>Seuil</th>
                    <th>Deja commande</th>
                    <th>Etat</th>
                    <th>A commander</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredToOrder.map(({ product, pending, suggestion }) => {
                    const checked = isSelected(product.id, suggestion.quantity);
                    const state = stockState(product);
                    return (
                      <tr key={product.id} className={checked ? "" : "orders-row-off"}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => setSelection((current) => ({ ...current, [product.id]: event.target.checked }))}
                            aria-label={`Commander ${product.name}`}
                          />
                        </td>
                        <td>
                          <strong>{product.name}</strong>
                          <small className="orders-muted">{product.code}</small>
                        </td>
                        <td>{product.supplier || <span className="orders-muted">A preciser</span>}</td>
                        <td>
                          {product.quantity} {product.unit}
                        </td>
                        <td>{product.alertThreshold}</td>
                        <td>{pending > 0 ? `${pending} ${product.unit}` : "-"}</td>
                        <td>
                          <span className={`stock-status ${state === "Rupture" ? "danger" : "warning"}`}>{state}</span>
                        </td>
                        <td>
                          <div className="orders-qty-cell">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={quantityFor(product.id, suggestion.quantity)}
                              onChange={(event) => {
                                const value = event.target.value;
                                setQuantities((current) => ({ ...current, [product.id]: value }));
                                if (Number(value) > 0) setSelection((current) => ({ ...current, [product.id]: true }));
                              }}
                              aria-label={`Quantite de ${product.name}`}
                            />
                            <span>{suggestion.packSize ? `${suggestion.packLabel}(s) de ${suggestion.packSize}` : product.unit}</span>
                          </div>
                          {suggestion.quantity === 0 && pending > 0 ? <small className="orders-muted">Deja assez commande</small> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="orders-actions">
              <span className="section-count">
                {selectedRows.length} produit(s) choisi(s)
                {selectedSuppliers.length > 1 ? ` chez ${selectedSuppliers.length} fournisseurs` : ""}
              </span>
              <button className="ghost-btn" type="button" disabled={busy || selectedRows.length === 0} onClick={prepareSingleOrder}>
                Preparer un seul bon
              </button>
              <button className="primary-btn" type="button" disabled={busy || selectedRows.length === 0} onClick={() => void createOrdersBySupplier()}>
                {selectedSuppliers.length > 1 ? `Creer ${selectedSuppliers.length} bons (un par fournisseur)` : "Creer le bon de commande"}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <h2>Bons de commande</h2>
        </div>
        <div className="section-tools">
          <input
            className="table-search-input"
            placeholder="Rechercher par numero, fournisseur ou article"
            value={orderSearch}
            onChange={(event) => setOrderSearch(event.target.value)}
          />
          <div className="stock-filters sales-filters">
            <select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value as OrderFilter)}>
              <option value="open">En cours (brouillons et envoyes)</option>
              <option value="waiting">En attente de livraison</option>
              <option value="done">Recus ou annules</option>
              <option value="all">Tous les bons</option>
            </select>
          </div>
          <span className="section-count">{filteredOrders.length} bon(s)</span>
        </div>
        {orders.length === 0 ? (
          <EmptyState
            title="Aucun bon de commande"
            description="Cochez des produits dans A commander, ou cliquez sur Nouveau bon de commande."
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState title="Aucun bon trouve" description={openOrders.length === 0 ? "Aucun bon en cours." : "Aucun bon ne correspond a ce filtre."} />
        ) : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Date</th>
                  <th>Destinataire</th>
                  <th>Articles</th>
                  <th>Recus</th>
                  <th>Etat</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="sales-reference-cell">{order.reference}</td>
                    <td>{formatOrderDate(order.sentAt ?? order.createdAt)}</td>
                    <td>{order.supplier}</td>
                    <td>{order.items.length}</td>
                    <td>{order.status === "brouillon" || order.status === "annulee" ? "-" : receivedSummary(order)}</td>
                    <td>{renderStatus(order.status)}</td>
                    <td>
                      <div className="orders-row-actions">
                        <button className="ghost-btn" type="button" onClick={() => setDetailId(order.id)}>
                          Ouvrir
                        </button>
                        {order.status === "envoyee" || order.status === "partielle" ? (
                          <button className="ghost-btn success" type="button" onClick={() => openReceipt(order)}>
                            Receptionner
                          </button>
                        ) : (
                          <button className="ghost-btn" type="button" onClick={() => printOrder(order)}>
                            Imprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailOrder ? (
        <Modal title={`Bon de commande ${detailOrder.reference}`} onClose={() => setDetailId(null)} size="large">
          <div className="orders-detail-head">
            <div>
              <span>Destinataire</span>
              <strong>{detailOrder.supplier}</strong>
            </div>
            <div>
              <span>Etat</span>
              {renderStatus(detailOrder.status)}
            </div>
            <div>
              <span>Cree le</span>
              <strong>{formatOrderDate(detailOrder.createdAt)}</strong>
            </div>
            <div>
              <span>Envoye le</span>
              <strong>{formatOrderDate(detailOrder.sentAt)}</strong>
            </div>
            <div>
              <span>Prepare par</span>
              <strong>{detailOrder.userName || "-"}</strong>
            </div>
          </div>
          {detailOrder.note ? <p className="orders-help">Remarque : {detailOrder.note}</p> : null}
          <div className="table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Commande</th>
                  <th>Recu</th>
                  <th>Reste</th>
                  <th>Observations</th>
                </tr>
              </thead>
              <tbody>
                {detailOrder.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.itemName}</strong>
                      <small className="orders-muted">{item.productId ? item.productCode : "Hors catalogue"}</small>
                    </td>
                    <td>{formatOrderQuantity(item, item.quantity)}</td>
                    <td>{item.quantityReceived > 0 ? formatOrderQuantity(item, item.quantityReceived) : "-"}</td>
                    <td>
                      {detailOrder.status === "annulee" || detailOrder.status === "recue"
                        ? "-"
                        : remainingQuantity(item) > 0
                          ? formatOrderQuantity(item, remainingQuantity(item))
                          : "Complet"}
                    </td>
                    <td>{item.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="orders-detail-actions">
            <button className="ghost-btn" type="button" onClick={() => printOrder(detailOrder)}>
              Imprimer
            </button>
            <button className="ghost-btn" type="button" disabled={busy} onClick={() => void exportOrderPdf(detailOrder)}>
              Enregistrer en PDF
            </button>
            <button className="ghost-btn" type="button" onClick={() => void copyOrderText(detailOrder)}>
              Copier pour WhatsApp
            </button>
            {detailOrder.status === "brouillon" ? (
              <>
                <button className="ghost-btn" type="button" onClick={() => openEditOrder(detailOrder)}>
                  Modifier
                </button>
                <button
                  className="primary-btn"
                  type="button"
                  disabled={busy}
                  onClick={() => void changeStatus(detailOrder, "envoyee", `Bon ${detailOrder.reference} marque comme envoye.`)}
                >
                  Marquer comme envoye
                </button>
              </>
            ) : null}
            {detailOrder.status === "envoyee" || detailOrder.status === "partielle" ? (
              <button className="primary-btn" type="button" onClick={() => openReceipt(detailOrder)}>
                Receptionner la marchandise
              </button>
            ) : null}
            {detailOrder.status === "envoyee" && detailOrder.receiptsCount === 0 ? (
              <button
                className="ghost-btn muted"
                type="button"
                disabled={busy}
                onClick={() => void changeStatus(detailOrder, "brouillon", `Bon ${detailOrder.reference} remis en brouillon.`)}
              >
                Remettre en brouillon
              </button>
            ) : null}
            {detailOrder.status === "partielle" ? (
              <button className="ghost-btn muted" type="button" onClick={() => confirmClose(detailOrder)}>
                Cloturer (le reste ne viendra pas)
              </button>
            ) : null}
            {(detailOrder.status === "brouillon" || detailOrder.status === "envoyee") && detailOrder.receiptsCount === 0 ? (
              <button className="danger-btn" type="button" onClick={() => confirmCancel(detailOrder)}>
                Annuler le bon
              </button>
            ) : null}
            {detailOrder.status === "brouillon" || detailOrder.status === "annulee" ? (
              <button className="danger-btn" type="button" onClick={() => confirmDelete(detailOrder)}>
                Supprimer
              </button>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {editor ? (
        <Modal
          title={editor.id ? `Modifier le bon ${editor.reference ?? ""}` : "Nouveau bon de commande"}
          onClose={() => !busy && setEditor(null)}
          size="large"
        >
          <form className="sales-form-modern" onSubmit={(event) => void handleEditorSubmit(event)}>
            <div className="sales-form-row">
              <label>
                Destinataire (fournisseur ou acheteur)
                <input
                  list="order-suppliers"
                  value={editor.supplier}
                  onChange={(event) => setEditor((current) => (current ? { ...current, supplier: event.target.value } : current))}
                  placeholder="Nom du fournisseur ou de l'acheteur"
                  maxLength={120}
                  required
                  autoFocus
                />
                <datalist id="order-suppliers">
                  {supplierNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
              <label>
                Remarque (facultatif, imprimee sur le bon)
                <input
                  value={editor.note}
                  onChange={(event) => setEditor((current) => (current ? { ...current, note: event.target.value } : current))}
                  placeholder="Ex. : livrer avant vendredi"
                  maxLength={300}
                />
              </label>
            </div>

            <div className="table-wrap">
              <table className="orders-table orders-editor-table">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Commander par</th>
                    <th>Quantite</th>
                    <th>Observations</th>
                    <th aria-label="Retirer" />
                  </tr>
                </thead>
                <tbody>
                  {editor.lines.map((line) => {
                    const product = line.productId ? productsById.get(line.productId) : undefined;
                    const pack = productPack(product);
                    return (
                      <tr key={line.key}>
                        <td>
                          <select value={line.productId ?? ""} onChange={(event) => changeLineProduct(line.key, event.target.value)}>
                            <option value="">-- Article hors catalogue --</option>
                            {sortedProducts.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name} ({option.quantity} {option.unit} en stock)
                              </option>
                            ))}
                          </select>
                          {!line.productId ? (
                            <div className="orders-free-item">
                              <input
                                value={line.itemName}
                                onChange={(event) => updateLine(line.key, { itemName: event.target.value })}
                                placeholder="Nom de l'article"
                                maxLength={120}
                              />
                              <input
                                value={line.unit}
                                onChange={(event) => updateLine(line.key, { unit: event.target.value })}
                                placeholder="Unite"
                                maxLength={30}
                              />
                            </div>
                          ) : product ? (
                            <small className="orders-muted">
                              Stock {product.quantity} {product.unit} - seuil {product.alertThreshold}
                              {(pendingUnits.get(product.id) ?? 0) > 0 && !editor.id ? ` - deja commande ${pendingUnits.get(product.id)}` : ""}
                            </small>
                          ) : null}
                        </td>
                        <td>
                          {pack ? (
                            <select value={line.mode} onChange={(event) => updateLine(line.key, { mode: event.target.value as EditorLine["mode"] })}>
                              <option value="pack">
                                {pack.label} de {pack.size}
                              </option>
                              <option value="unit">{line.unit || "Unite"}</option>
                            </select>
                          ) : (
                            <span>{line.unit || "piece"}</span>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={line.quantity}
                            onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                            required
                          />
                          {pack && line.mode === "pack" && Number(line.quantity) > 0 ? (
                            <small className="orders-muted">= {orderedUnits({ quantity: Number(line.quantity), packSize: pack.size })} {line.unit}</small>
                          ) : null}
                        </td>
                        <td>
                          <input
                            value={line.note}
                            onChange={(event) => updateLine(line.key, { note: event.target.value })}
                            placeholder="Couleur, marque..."
                            maxLength={150}
                          />
                        </td>
                        <td>
                          <button
                            className="ghost-btn muted"
                            type="button"
                            onClick={() =>
                              setEditor((current) => (current ? { ...current, lines: current.lines.filter((entry) => entry.key !== line.key) } : current))
                            }
                            aria-label="Retirer cet article"
                          >
                            Retirer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => setEditor((current) => (current ? { ...current, lines: [...current.lines, emptyLine()] } : current))}
            >
              + Ajouter un article
            </button>
            <p className="orders-help">Le bon imprime ne montre aucun prix : seulement les articles, les quantites et vos observations.</p>
            {editorError ? <p className="error-text">{editorError}</p> : null}
            <div className="sales-modern-actions">
              <button className="ghost-btn muted" type="button" disabled={busy} onClick={() => setEditor(null)}>
                Annuler
              </button>
              <button className="primary-btn" type="submit" disabled={busy || editor.lines.length === 0}>
                {editor.id ? "Enregistrer les changements" : "Creer le bon (brouillon)"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {receipt ? (
        <Modal title={`Reception - ${receipt.order.reference}`} onClose={() => !busy && setReceipt(null)} size="large">
          <form className="sales-form-modern" onSubmit={(event) => void handleReceiptSubmit(event)}>
            <p className="orders-help">
              Saisissez ce qui est arrive. Chaque article recu entre dans le stock comme un reapprovisionnement (lot{" "}
              {receipt.order.reference}-R{receipt.order.receiptsCount + 1}). S'il manque quelque chose, le reste restera attendu.
            </p>
            <div className="table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Commande</th>
                    <th>Deja recu</th>
                    <th>Recu maintenant</th>
                    {isSuperAdmin ? <th>Prix d'achat (par unite commandee)</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {receipt.order.items.map((item) => {
                    const remaining = remainingQuantity(item);
                    const disabled = !item.productId || remaining <= 0;
                    return (
                      <tr key={item.id} className={disabled ? "orders-row-off" : ""}>
                        <td>
                          <strong>{item.itemName}</strong>
                          {!item.productId ? <small className="orders-muted">Hors catalogue : creez-le dans Produits pour l'ajouter au stock</small> : null}
                        </td>
                        <td>{formatOrderQuantity(item, item.quantity)}</td>
                        <td>{item.quantityReceived > 0 ? formatOrderQuantity(item, item.quantityReceived) : "-"}</td>
                        <td>
                          <div className="orders-qty-cell">
                            <input
                              type="number"
                              min={0}
                              max={remaining}
                              step="any"
                              disabled={disabled}
                              value={receipt.quantities[item.id] ?? "0"}
                              onChange={(event) =>
                                setReceipt((current) =>
                                  current ? { ...current, quantities: { ...current.quantities, [item.id]: event.target.value } } : current
                                )
                              }
                              aria-label={`Quantite recue de ${item.itemName}`}
                            />
                            <span>{item.packLabel && item.packSize ? `${item.packLabel}(s)` : item.unit}</span>
                          </div>
                          {remaining > 0 ? <small className="orders-muted">Reste {formatOrderQuantity(item, remaining)}</small> : null}
                        </td>
                        {isSuperAdmin ? (
                          <td>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              disabled={disabled}
                              value={receipt.prices[item.id] ?? ""}
                              onChange={(event) =>
                                setReceipt((current) => (current ? { ...current, prices: { ...current.prices, [item.id]: event.target.value } } : current))
                              }
                              aria-label={`Prix d'achat de ${item.itemName}`}
                            />
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!isSuperAdmin ? <p className="orders-help">Le prix d'achat reste celui fixe par le super administrateur.</p> : null}
            {receiptError ? <p className="error-text">{receiptError}</p> : null}
            <div className="sales-modern-actions">
              <button className="ghost-btn muted" type="button" disabled={busy} onClick={() => setReceipt(null)}>
                Annuler
              </button>
              <button className="primary-btn" type="submit" disabled={busy}>
                Enregistrer la reception
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
