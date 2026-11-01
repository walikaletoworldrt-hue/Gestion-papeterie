/**
 * Selling by the pack (ream of paper, box of pens, packet of envelopes...).
 * Stock is always counted in units (sheets, pens...). A product may also be sold by the pack,
 * with its own price: selling 1 ream of 100 sheets takes 100 sheets out of stock and charges the ream price.
 */

export type SaleUnit = "unit" | "pack";

export type PackSettings = {
  /** Name of the pack ("Rame", "Boite", "Paquet"); empty = sold by the unit only. */
  packLabel: string | null;
  /** Units in one pack (100 sheets in a ream). */
  packSize: number | null;
  /** Price of one pack. */
  packPrice: number | null;
};

export function hasPack(settings: Partial<PackSettings> | null | undefined) {
  return Boolean(settings?.packLabel) && Number(settings?.packSize) > 1 && Number(settings?.packPrice) > 0;
}

/** "Rame de 100". */
export function describePack(label: string | null | undefined, size: number | null | undefined) {
  return `${label ?? "Lot"} de ${Number(size ?? 0)}`;
}

/** Checks the pack settings typed on a product: all empty (no pack) or all filled. */
export function normalizePackSettings(input: Partial<PackSettings> | null | undefined): PackSettings {
  const label = String(input?.packLabel ?? "").replace(/\s+/g, " ").trim();
  const size = input?.packSize === null || input?.packSize === undefined || String(input.packSize) === "" ? null : Number(input.packSize);
  const price = input?.packPrice === null || input?.packPrice === undefined || String(input.packPrice) === "" ? null : Number(input.packPrice);

  if (!label && !size && !price) {
    return { packLabel: null, packSize: null, packPrice: null };
  }
  if (!label) {
    throw new Error("Vente en gros : donnez un nom au lot (Rame, Boite, Paquet...).");
  }
  if (label.length > 40) {
    throw new Error("Vente en gros : le nom du lot est trop long (40 caracteres maximum).");
  }
  if (size === null || !Number.isInteger(size) || size < 2) {
    throw new Error("Vente en gros : le nombre d'unites par lot doit etre un nombre entier d'au moins 2.");
  }
  if (price === null || !Number.isFinite(price) || price <= 0) {
    throw new Error("Vente en gros : le prix du lot doit etre superieur a zero.");
  }
  return { packLabel: label, packSize: size, packPrice: Math.round(price * 100) / 100 };
}

export type ResolvedSaleLine = {
  /** Units taken out of stock. */
  units: number;
  lineTotal: number;
  /** Price per unit (line total / units), kept so older versions still read a consistent line. */
  unitPrice: number;
  /** Pack sold, or null when sold by the unit. */
  packLabel: string | null;
  packCount: number | null;
  packSize: number | null;
};

/** Price and stock effect of one sale line. Quantity is counted in the chosen sale unit. */
export function resolveSaleLine(
  product: { name: string; sellingPrice: number } & Partial<PackSettings>,
  line: { quantity: number; saleUnit?: SaleUnit }
): ResolvedSaleLine {
  const quantity = Number(line.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`La quantite doit etre un nombre entier superieur a zero pour ${product.name}.`);
  }

  if (line.saleUnit === "pack") {
    if (!hasPack(product)) {
      throw new Error(`${product.name} ne se vend pas en gros : definissez d'abord le lot sur la fiche du produit.`);
    }
    const packSize = Number(product.packSize);
    const units = quantity * packSize;
    const lineTotal = Math.round(quantity * Number(product.packPrice) * 100) / 100;
    // Rounded like the cloud column (2 decimals); the line total stays exact.
    return { units, lineTotal, unitPrice: Math.round((lineTotal / units) * 100) / 100, packLabel: product.packLabel ?? null, packCount: quantity, packSize };
  }

  const lineTotal = Math.round(quantity * Number(product.sellingPrice) * 100) / 100;
  return { units: quantity, lineTotal, unitPrice: Number(product.sellingPrice), packLabel: null, packCount: null, packSize: null };
}

/** Same product sold the same way on two lines = one line. A product can be on two lines: by the unit and by the pack. */
export function mergeSaleLines<T extends { productId: number; quantity: number; saleUnit?: SaleUnit }>(items: T[]) {
  const grouped = new Map<string, { productId: number; quantity: number; saleUnit: SaleUnit }>();
  items.forEach((item) => {
    const saleUnit: SaleUnit = item.saleUnit === "pack" ? "pack" : "unit";
    const key = `${item.productId}:${saleUnit}`;
    const existing = grouped.get(key);
    grouped.set(key, { productId: item.productId, saleUnit, quantity: (existing?.quantity ?? 0) + Number(item.quantity) });
  });
  return [...grouped.values()];
}

/** Units of each product asked for in a sale (all lines together), to check the stock. */
export function unitsRequestedByProduct(
  items: Array<{ productId: number; quantity: number; saleUnit?: SaleUnit }>,
  packSizeOf: (productId: number) => number | null | undefined
) {
  const totals = new Map<number, number>();
  items.forEach((item) => {
    const factor = item.saleUnit === "pack" ? Number(packSizeOf(item.productId) ?? 1) || 1 : 1;
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + Number(item.quantity || 0) * factor);
  });
  return totals;
}

/** How a sale line is printed: "2 Rame" at the ream price, or "5" at the unit price. */
export function saleLineDisplay(item: {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  packLabel?: string | null;
  packCount?: number | null;
  packSize?: number | null;
}) {
  if (item.packLabel && item.packCount) {
    return {
      name: `${item.productName} (${describePack(item.packLabel, item.packSize)})`,
      quantity: `${item.packCount} ${item.packLabel}`,
      unitPrice: item.lineTotal / item.packCount,
    };
  }
  return { name: item.productName, quantity: String(item.quantity), unitPrice: item.unitPrice };
}
