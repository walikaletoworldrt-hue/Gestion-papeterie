import type { ProductDetailsDraft } from "../types";

/** Shared by the desktop database and the web repository, so both apply the same rules. */

export function normalizeProductDetails(draft: ProductDetailsDraft): ProductDetailsDraft {
  const details = {
    code: draft.code?.trim() ?? "",
    name: draft.name?.trim() ?? "",
    category: draft.category?.trim() || "Papeterie",
    purchasePrice: Number(draft.purchasePrice),
    sellingPrice: Number(draft.sellingPrice),
    unit: draft.unit?.trim() || "piece",
    alertThreshold: Number(draft.alertThreshold ?? 0),
    supplier: draft.supplier?.trim() ?? "",
  };

  if (!details.code || !details.name || !details.supplier) {
    throw new Error("Le code, le nom et le fournisseur du produit sont obligatoires.");
  }
  if (![details.purchasePrice, details.sellingPrice, details.alertThreshold].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error("Les prix et le seuil d'alerte doivent etre des nombres positifs.");
  }

  return details;
}

export function validateInitialStockCorrection(quantity: number, reason: string) {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("La quantite initiale doit etre un nombre positif ou zero.");
  }
  if (!reason) {
    throw new Error("Indiquez le motif de la correction.");
  }
}

/** Refuses a correction that changes nothing or would make the current stock negative. */
export function checkCorrectedStock(productName: string, previous: number, next: number, currentStock: number) {
  if (previous === next) {
    throw new Error(`Le stock initial de ${productName} est deja de ${next}.`);
  }

  const correctedStock = currentStock - previous + next;
  if (correctedStock < 0) {
    throw new Error(
      `Correction impossible : le stock actuel de ${productName} deviendrait ${correctedStock}. ` +
        `Les ventes et approvisionnements deja enregistres demandent un stock initial d'au moins ${next - correctedStock}.`
    );
  }
}

export function describeInitialStockCorrection(productName: string, unit: string, previous: number, next: number, reason: string) {
  return `Correction stock initial ${productName} : ${previous} -> ${next} ${unit || "piece"}. Motif : ${reason}`;
}
