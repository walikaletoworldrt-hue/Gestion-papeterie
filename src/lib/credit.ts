/** Payment method saved on a sale made on credit (the client pays later, all or part). */
export const CREDIT_PAYMENT_METHOD = "Credit";

export function isCreditPaymentMethod(method: string | null | undefined) {
  return method === CREDIT_PAYMENT_METHOD;
}

/** Roles allowed to sell on credit. Repayments can be received by anyone who sells. */
export function canSellOnCredit(role: string | null | undefined) {
  return role === "Super admin" || role === "Administrateur";
}

/**
 * Amount still owed on a sale. amountPaid is what was paid at the sale (null = paid in full,
 * as for every sale made before credit existed); repaid is the sum of later repayments.
 */
export function computeBalanceDue(total: number, amountPaid: number | null | undefined, repaid: number) {
  if (amountPaid === null || amountPaid === undefined) {
    return 0;
  }
  return Math.max(0, roundMoney(Number(total) - Number(amountPaid) - Number(repaid)));
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/** A debt is late when something is still owed after the due day (YYYY-MM-DD, compared on this computer's calendar). */
export function isDebtOverdue(balanceDue: number, dueDate: string | null | undefined, today: string) {
  return balanceDue > 0 && Boolean(dueDate) && String(dueDate) < today;
}

export type CreditTerms = { amountPaid: number; dueDate: string; phone: string };

/** Checks what a credit sale needs: a named client with a phone, a down payment below the total, a due day not in the past. */
export function validateCreditTerms(
  input: { clientName: string; clientPhone?: string; amountPaid?: number; dueDate?: string },
  total: number,
  today: string
): CreditTerms {
  if (!input.clientName) {
    throw new Error("Vente a credit : saisissez le nom du client (pas \"Client comptoir\").");
  }
  const phone = (input.clientPhone ?? "").replace(/\s+/g, " ").trim();
  if (phone.replace(/\D/g, "").length < 6) {
    throw new Error("Vente a credit : saisissez le numero de telephone du client.");
  }
  const amountPaid = roundMoney(Number(input.amountPaid ?? 0));
  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    throw new Error("Vente a credit : l'acompte doit etre un montant positif (0 si rien n'est paye).");
  }
  if (amountPaid >= total) {
    throw new Error("Vente a credit : l'acompte couvre deja tout le montant. Choisissez un autre mode de paiement.");
  }
  const dueDate = (input.dueDate ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(new Date(`${dueDate}T12:00:00`).getTime())) {
    throw new Error("Vente a credit : choisissez la date limite de paiement.");
  }
  if (dueDate < today) {
    throw new Error("Vente a credit : la date limite de paiement ne peut pas etre dans le passe.");
  }
  return { amountPaid, dueDate, phone };
}

/** Checks a repayment against what is still owed. */
export function validateRepaymentAmount(amount: number, balanceDue: number) {
  const value = roundMoney(Number(amount));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Le montant du versement doit etre superieur a zero.");
  }
  if (balanceDue <= 0) {
    throw new Error("Cette dette est deja soldee.");
  }
  if (value > balanceDue) {
    throw new Error(`Le versement depasse le reste a payer (${balanceDue} FC).`);
  }
  return value;
}

/** "2026-11-15" -> "15/11/2026". */
export function formatDayFr(day: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(day ?? "");
  return match ? `${match[3]}/${match[2]}/${match[1]}` : day ?? "";
}

/** Payment method as printed and shown on screen. */
export function paymentMethodLabel(method: string) {
  return isCreditPaymentMethod(method) ? "Credit (a payer plus tard)" : method;
}

/** Lines printed under the total of a credit sale's invoice or receipt. */
export function creditDocumentLines(sale: { isCredit?: boolean; amountPaid?: number; balanceDue?: number; dueDate?: string | null }) {
  if (!sale.isCredit) return [];
  const lines: Array<{ label: string; amount?: number; text?: string; strong?: boolean }> = [
    { label: "Deja paye", amount: sale.amountPaid ?? 0 },
    { label: "Reste a payer", amount: sale.balanceDue ?? 0, strong: true },
  ];
  if ((sale.balanceDue ?? 0) > 0 && sale.dueDate) {
    lines.push({ label: "A payer avant le", text: formatDayFr(sale.dueDate) });
  }
  return lines;
}
