/** Client name typed at the sale. Empty or "Client comptoir" means a walk-in customer (no client saved). */
export function normalizeSaleClientName(name: string | undefined | null) {
  const clean = (name ?? "").replace(/\s+/g, " ").trim();
  if (!clean || clean.toLowerCase() === "client comptoir") {
    return "";
  }
  if (clean.length > 120) {
    throw new Error("Le nom du client est trop long (120 caracteres maximum).");
  }
  return clean;
}
