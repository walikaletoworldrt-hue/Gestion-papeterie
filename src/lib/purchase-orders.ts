/**
 * Purchase orders sent to a supplier or to the buyer: what to order, how much, and what was received.
 * Shared by the desktop (SQLite) and the web (Supabase) so both follow the same rules.
 * The printed order never shows prices.
 */
import type {
  Product,
  PurchaseOrder,
  PurchaseOrderDraft,
  PurchaseOrderItem,
  PurchaseOrderItemDraft,
  PurchaseOrderReceiptDraft,
  PurchaseOrderStatus,
} from "../types";
import { COMPANY_ID_NAT, COMPANY_RCCM } from "./company";

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyee",
  partielle: "Recue en partie",
  recue: "Recue",
  annulee: "Annulee",
};

/** Orders still waiting for goods: their quantities count as "already ordered". */
export const OPEN_PURCHASE_ORDER_STATUSES: PurchaseOrderStatus[] = ["brouillon", "envoyee", "partielle"];

export function isPurchaseOrderStatus(value: unknown): value is PurchaseOrderStatus {
  return typeof value === "string" && value in PURCHASE_ORDER_STATUS_LABELS;
}

/** Who may prepare, send and receive orders: same people as replenishments. */
export function canManagePurchaseOrders(role: string | null | undefined) {
  return role === "Super admin" || role === "Administrateur";
}

/** Status changes allowed by hand (receiving goods changes the status on its own). */
export function canChangePurchaseOrderStatus(from: PurchaseOrderStatus, to: PurchaseOrderStatus, hasReceipts: boolean) {
  if (to === "envoyee") return from === "brouillon";
  if (to === "brouillon") return from === "envoyee" && !hasReceipts;
  // A partly received order can be closed: the rest will not come.
  if (to === "recue") return from === "partielle";
  if (to === "annulee") return (from === "brouillon" || from === "envoyee") && !hasReceipts;
  return false;
}

/** Units of stock behind a quantity ordered (packs are converted to units). */
export function orderedUnits(item: { quantity: number; packSize: number | null }, quantity = item.quantity) {
  return roundQuantity(Number(quantity) * (item.packSize && item.packSize > 1 ? item.packSize : 1));
}

export function remainingQuantity(item: Pick<PurchaseOrderItem, "quantity" | "quantityReceived">) {
  return Math.max(0, roundQuantity(item.quantity - item.quantityReceived));
}

export function roundQuantity(value: number) {
  return Math.round(Number(value) * 100) / 100;
}

/** Status after a reception: everything in -> received, something in -> partly received. */
export function statusAfterReceipt(items: Array<Pick<PurchaseOrderItem, "quantity" | "quantityReceived">>): PurchaseOrderStatus {
  const allReceived = items.every((item) => remainingQuantity(item) <= 0);
  if (allReceived) return "recue";
  return items.some((item) => item.quantityReceived > 0) ? "partielle" : "envoyee";
}

/** "10 Rame(s) de 500" or "25 piece". */
export function formatOrderQuantity(item: Pick<PurchaseOrderItem, "packLabel" | "packSize" | "unit">, quantity: number) {
  if (item.packLabel && item.packSize && item.packSize > 1) {
    return `${formatNumber(quantity)} ${item.packLabel}${quantity > 1 ? "(s)" : ""} de ${item.packSize}`;
  }
  return `${formatNumber(quantity)} ${item.unit || "piece"}`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

/** Checks an order typed by the user and merges lines asking for the same product the same way. */
export function normalizePurchaseOrderDraft(draft: PurchaseOrderDraft, products: Array<Pick<Product, "id" | "name" | "unit">>): PurchaseOrderDraft {
  const supplier = String(draft.supplier ?? "").replace(/\s+/g, " ").trim();
  if (!supplier) {
    throw new Error("Indiquez a qui la commande est envoyee (fournisseur ou acheteur).");
  }
  if (supplier.length > 120) {
    throw new Error("Le nom du fournisseur est trop long (120 caracteres maximum).");
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  const merged: PurchaseOrderItemDraft[] = [];

  (draft.items ?? []).forEach((rawItem, index) => {
    const productId = rawItem.productId ? Number(rawItem.productId) : null;
    const product = productId ? productsById.get(productId) : undefined;
    if (productId && !product) {
      throw new Error(`Ligne ${index + 1} : produit introuvable. Il a peut-etre ete supprime.`);
    }
    const itemName = (product?.name ?? String(rawItem.itemName ?? "")).replace(/\s+/g, " ").trim();
    if (!itemName) {
      throw new Error(`Ligne ${index + 1} : choisissez un produit ou ecrivez le nom de l'article.`);
    }
    const quantity = roundQuantity(Number(rawItem.quantity));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Ligne ${index + 1} (${itemName}) : la quantite doit etre superieure a zero.`);
    }
    const packSize = rawItem.packLabel && Number(rawItem.packSize) > 1 ? Math.round(Number(rawItem.packSize)) : null;
    const packLabel = packSize ? String(rawItem.packLabel).trim() : null;
    const item: PurchaseOrderItemDraft = {
      productId,
      itemName,
      unit: (product?.unit ?? String(rawItem.unit ?? "")).trim() || "piece",
      packLabel,
      packSize,
      quantity,
      note: String(rawItem.note ?? "").trim(),
    };

    const same = merged.find(
      (existing) =>
        (productId ? existing.productId === productId : !existing.productId && existing.itemName.toLowerCase() === itemName.toLowerCase()) &&
        existing.packSize === item.packSize
    );
    if (same) {
      same.quantity = roundQuantity(same.quantity + item.quantity);
      same.note = [same.note, item.note].filter(Boolean).join(" - ");
      return;
    }
    merged.push(item);
  });

  if (merged.length === 0) {
    throw new Error("Ajoutez au moins un article a la commande.");
  }

  return { id: draft.id, supplier, note: String(draft.note ?? "").trim(), items: merged };
}

export type CheckedReceiptLine = {
  item: PurchaseOrderItem;
  /** Received now, in the ordered unit (packs or units). */
  quantity: number;
  /** Units added to stock. */
  units: number;
  purchasePrice?: number;
};

/** Checks a reception: the order must be waiting, quantities not above what is still expected. */
export function validatePurchaseOrderReceipt(order: PurchaseOrder, draft: PurchaseOrderReceiptDraft): CheckedReceiptLine[] {
  if (order.status !== "envoyee" && order.status !== "partielle") {
    throw new Error(
      order.status === "brouillon"
        ? "Marquez d'abord la commande comme envoyee avant de receptionner la marchandise."
        : "Cette commande n'attend plus de marchandise."
    );
  }

  const itemsById = new Map(order.items.map((item) => [item.id, item]));
  const lines: CheckedReceiptLine[] = [];

  (draft.lines ?? []).forEach((line) => {
    const item = itemsById.get(Number(line.itemId));
    if (!item) {
      throw new Error("Une ligne de la reception ne correspond pas a cette commande.");
    }
    const quantity = roundQuantity(Number(line.quantity));
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new Error(`${item.itemName} : la quantite recue ne peut pas etre negative.`);
    }
    if (quantity === 0) return;
    const remaining = remainingQuantity(item);
    if (quantity > remaining) {
      throw new Error(
        `${item.itemName} : vous recevez ${formatOrderQuantity(item, quantity)} mais il ne reste que ${formatOrderQuantity(item, remaining)} a recevoir. ` +
          "Enregistrez le surplus dans Reapprovisionnement."
      );
    }
    if (!item.productId) {
      throw new Error(
        `${item.itemName} n'est pas dans la liste des produits. Creez-le d'abord dans Produits, puis ajoutez-le a la commande, ou laissez sa quantite a 0.`
      );
    }
    const price = line.purchasePrice === undefined || line.purchasePrice === null || String(line.purchasePrice) === "" ? undefined : Number(line.purchasePrice);
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      throw new Error(`${item.itemName} : le prix d'achat est invalide.`);
    }
    lines.push({ item, quantity, units: orderedUnits(item, quantity), purchasePrice: price });
  });

  if (lines.length === 0) {
    throw new Error("Saisissez au moins une quantite recue.");
  }

  return lines;
}

/** Units still expected per product, over every open order. */
export function pendingUnitsByProduct(orders: PurchaseOrder[]) {
  const pending = new Map<number, number>();
  orders
    .filter((order) => OPEN_PURCHASE_ORDER_STATUSES.includes(order.status))
    .forEach((order) =>
      order.items.forEach((item) => {
        if (!item.productId) return;
        const units = orderedUnits(item, remainingQuantity(item));
        if (units > 0) pending.set(item.productId, roundQuantity((pending.get(item.productId) ?? 0) + units));
      })
    );
  return pending;
}

export type OrderSuggestion = {
  /** Quantity to order, in packs when packLabel is set. 0 = nothing to order. */
  quantity: number;
  packLabel: string | null;
  packSize: number | null;
  /** Units it brings to stock. */
  units: number;
};

/**
 * Suggested quantity: enough to reach twice the alert threshold (at least 1 unit above it),
 * minus what is in stock and what is already ordered. Products sold by the pack are ordered by the pack.
 */
export function suggestOrderQuantity(
  product: Pick<Product, "quantity" | "alertThreshold" | "packLabel" | "packSize">,
  pendingUnits = 0
): OrderSuggestion {
  const threshold = Math.max(0, Number(product.alertThreshold) || 0);
  const target = Math.max(threshold * 2, threshold + 1);
  const need = Math.ceil(target - Math.max(0, Number(product.quantity) || 0) - Math.max(0, pendingUnits));
  const packSize = product.packLabel && Number(product.packSize) > 1 ? Number(product.packSize) : null;

  if (need <= 0) {
    return { quantity: 0, packLabel: packSize ? product.packLabel : null, packSize, units: 0 };
  }
  if (packSize) {
    const packs = Math.ceil(need / packSize);
    return { quantity: packs, packLabel: product.packLabel, packSize, units: packs * packSize };
  }
  return { quantity: need, packLabel: null, packSize: null, units: need };
}

/** BC-26-P1-0001: the device code keeps numbers unique across PCs, even offline (like invoices). */
export function buildPurchaseOrderReference(year: number, deviceCode: string, number: number) {
  return `${purchaseOrderReferencePrefix(year, deviceCode)}${String(number).padStart(4, "0")}`;
}

export function purchaseOrderReferencePrefix(year: number, deviceCode: string) {
  return `BC-${String(year).slice(-2)}-${deviceCode}-`;
}

/** Next number for this device and year, from the references already known. */
export function nextPurchaseOrderNumber(references: string[], prefix: string) {
  return (
    references.reduce((highest, reference) => {
      if (!reference.startsWith(prefix)) return highest;
      const number = Number(reference.slice(prefix.length));
      return Number.isInteger(number) && number > highest ? number : highest;
    }, 0) + 1
  );
}

/** Stock lot of a reception: BC-26-P1-0001-R1, -R2 for a second delivery... */
export function receiptLotNumber(reference: string, receiptIndex: number) {
  return `${reference}-R${receiptIndex}`;
}

/** Plain text of the order, ready to paste in WhatsApp or an e-mail. */
export function buildPurchaseOrderText(order: PurchaseOrder) {
  const lines = order.items.map(
    (item, index) => `${index + 1}. ${item.itemName} : ${formatOrderQuantity(item, item.quantity)}${item.note ? ` (${item.note})` : ""}`
  );
  return [
    `Bon de commande ${order.reference} - Walikale Papeterie`,
    `Date : ${formatOrderDate(order.sentAt ?? order.createdAt)}`,
    `A : ${order.supplier}`,
    "",
    ...lines,
    ...(order.note ? ["", `Remarque : ${order.note}`] : []),
    "",
    "Merci de confirmer la disponibilite.",
  ].join("\n");
}

export function formatOrderDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A4 purchase order, without any price. autoPrint opens the print dialog when the page loads. */
export function buildPurchaseOrderHtml(order: PurchaseOrder, options: { logoSrc: string; preparedBy: string; autoPrint: boolean }) {
  const rows = order.items
    .map(
      (item, index) => `
        <tr>
          <td class="num">${index + 1}</td>
          <td>${escapeHtml(item.productCode || "-")}</td>
          <td><strong>${escapeHtml(item.itemName)}</strong></td>
          <td>${escapeHtml(item.packLabel && item.packSize ? `${item.packLabel} de ${item.packSize}` : item.unit || "piece")}</td>
          <td class="qty">${formatNumber(item.quantity)}</td>
          <td>${escapeHtml(item.note)}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Bon de commande ${escapeHtml(order.reference)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #16335b; background: #fff; font-size: 13px; }
      .sheet { max-width: 190mm; margin: 0 auto; padding: 8px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 14px; border-bottom: 3px solid #1567d8; }
      .brand { display: flex; gap: 12px; align-items: center; }
      .brand img { width: 74px; height: 74px; object-fit: contain; }
      .brand h1 { margin: 0 0 4px; font-size: 21px; }
      .brand p { margin: 1px 0; color: #425a7a; font-size: 11.5px; }
      .title { text-align: right; }
      .title h2 { margin: 0 0 6px; font-size: 22px; letter-spacing: 0.04em; color: #1567d8; }
      .title p { margin: 2px 0; font-size: 12.5px; }
      .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 16px 0; }
      .card { border: 1px solid #d6e4f5; border-radius: 10px; padding: 10px 12px; background: #fafcff; }
      .card span { display: block; color: #5f7391; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
      .card strong { font-size: 15px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #eaf2fc; color: #16335b; text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.03em; }
      th, td { border: 1px solid #c9d9ec; padding: 7px 8px; vertical-align: top; }
      td.num { width: 34px; text-align: center; color: #5f7391; }
      td.qty, th.qty { text-align: center; font-size: 15px; font-weight: 700; width: 80px; }
      .note { margin-top: 12px; padding: 10px 12px; border-left: 4px solid #1567d8; background: #f4f8fd; }
      .summary { margin-top: 10px; color: #5f7391; font-size: 12px; }
      .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 34px; }
      .signature { border-top: 1px solid #8aa4c4; padding-top: 6px; text-align: center; color: #425a7a; font-size: 12px; min-height: 60px; }
      .footer { margin-top: 26px; text-align: center; color: #7a8ca6; font-size: 10.5px; }
      @media print { .sheet { padding: 0; } }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="header">
        <div class="brand">
          <img src="${escapeHtml(options.logoSrc)}" alt="Walikale to World" />
          <div>
            <h1>Walikale Papeterie</h1>
            <p><strong>N° RCCM :</strong> ${escapeHtml(COMPANY_RCCM)}</p>
            <p><strong>Id. Nat :</strong> ${escapeHtml(COMPANY_ID_NAT)}</p>
            <p><strong>Contact :</strong> +243 812681339</p>
          </div>
        </div>
        <div class="title">
          <h2>BON DE COMMANDE</h2>
          <p><strong>${escapeHtml(order.reference)}</strong></p>
          <p>Date : ${escapeHtml(formatOrderDate(order.sentAt ?? order.createdAt))}</p>
        </div>
      </div>

      <div class="cards">
        <div class="card"><span>Destinataire (fournisseur / acheteur)</span><strong>${escapeHtml(order.supplier)}</strong></div>
        <div class="card"><span>Prepare par</span><strong>${escapeHtml(options.preparedBy || order.userName || "-")}</strong></div>
      </div>

      <table>
        <thead>
          <tr><th>N°</th><th>Code</th><th>Designation</th><th>Unite</th><th class="qty">Quantite</th><th>Observations</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="summary">${order.items.length} article(s) commande(s).</p>
      ${order.note ? `<div class="note"><strong>Remarque :</strong> ${escapeHtml(order.note)}</div>` : ""}

      <div class="signatures">
        <div class="signature">Pour Walikale Papeterie<br />(nom et signature)</div>
        <div class="signature">Recu par le fournisseur / l'acheteur<br />(nom, signature et date)</div>
      </div>
      <p class="footer">Merci de confirmer la disponibilite des articles et le delai de livraison.</p>
    </div>
    ${options.autoPrint ? `<script>window.addEventListener("load", () => setTimeout(() => { window.focus(); window.print(); }, 150));</script>` : ""}
  </body>
</html>`;
}
