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

/** Day of a date on this computer's calendar, as YYYY-MM-DD (not UTC: a sale at 1 am in Walikale is still today). */
export function toLocalDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Timestamp saved for a sale. Today (or no day) keeps the real time; a past day is saved at noon that day,
 * so a sale forgotten yesterday can be entered with its real date. Future days are refused.
 */
export function resolveSaleDate(day: string | undefined | null, now = new Date()) {
  const today = toLocalDay(now);
  if (!day || day === today) {
    return now.toISOString();
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(new Date(`${day}T12:00:00`).getTime())) {
    throw new Error("La date de vente n'est pas valide.");
  }
  if (day > today) {
    throw new Error("La date de vente ne peut pas etre dans le futur.");
  }
  return new Date(`${day}T12:00:00`).toISOString();
}
