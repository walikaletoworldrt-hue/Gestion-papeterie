import fs from "node:fs";
import path from "node:path";
import type { SaleDetail } from "../src/types";

type InvoiceFormat = "a4" | "receipt80mm";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue % 1 === 0 ? safeValue.toFixed(0) : safeValue.toFixed(2)} FC`;
}

function getLogoDataUri(appRoot: string) {
  const pngLogoPath = path.join(appRoot, "img", "logo-walikale1.png");
  const svgLogoPath = path.join(appRoot, "public", "logo-walikale.svg");

  if (fs.existsSync(pngLogoPath)) {
    const image = fs.readFileSync(pngLogoPath);
    return `data:image/png;base64,${image.toString("base64")}`;
  }

  if (fs.existsSync(svgLogoPath)) {
    const svg = fs.readFileSync(svgLogoPath, "utf-8");
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  return "";
}

function buildToolbar(format: InvoiceFormat) {
  const label = format === "receipt80mm" ? "Imprimer ticket 80 mm" : "Imprimer facture";
  return `
    <div class="toolbar no-print">
      <button type="button" onclick="window.print()">${label}</button>
      <button type="button" class="secondary" onclick="window.close()">Fermer</button>
    </div>
  `;
}

function buildA4Markup(sale: SaleDetail, logoDataUri: string) {
  const rows = sale.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.productName)}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.unitPrice)}</td>
          <td>${formatCurrency(item.lineTotal)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="sheet invoice-sheet">
      <div class="header">
        <div class="brand">
          <img src="${logoDataUri}" alt="Walikale to World Tech Adapt Hub" />
          <div>
            <h1>Walikale Papeterie</h1>
            <div class="company-meta">
              <p><strong>N° RCCM :</strong> CD/GOM/RCCM/24-A-01041</p>
              <p><strong>Id.NAT :</strong> 01-G4701-N66253Q</p>
              <p><strong>N° Impôt :</strong> 01-G4701-N66</p>
              <p><strong>Contact :</strong> +243 812681339</p>
            </div>
          </div>
        </div>
        <div class="invoice-title">
          <h2>FACTURE</h2>
          <p>${escapeHtml(sale.reference)}</p>
          <p>${escapeHtml(sale.date)}</p>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <span>Client</span>
          <strong>${escapeHtml(sale.clientName)}</strong>
        </div>
        <div class="card">
          <span>Paiement</span>
          <strong>${escapeHtml(sale.paymentMethod)}</strong>
        </div>
      </div>

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
          ${rows}
        </tbody>
      </table>

      <div class="total-box">
        <div class="total-row">
          <span>Total</span>
          <strong>${formatCurrency(sale.amount)}</strong>
        </div>
      </div>

      <div class="footer">
        <p>Adresse : Q.CampTP, Avenue Kuya, route vers MUBI en face du Bureau PAM</p>
        <p>E-mail : walikaletoworld.rt@gmail.com</p>
        <div class="thank-you">
          Walikale to World vous remercie pour votre achat.
        </div>
      </div>
    </div>
  `;
}

function buildReceiptMarkup(sale: SaleDetail, logoDataUri: string) {
  const rows = sale.items
    .map(
      (item) => `
        <div class="receipt-line">
          <div class="receipt-line-name">${escapeHtml(item.productName)}</div>
          <div class="receipt-line-meta">
            <span>${item.quantity} x ${formatCurrency(item.unitPrice)}</span>
            <strong>${formatCurrency(item.lineTotal)}</strong>
          </div>
        </div>
      `
    )
    .join("");

  return `
    <div class="sheet receipt-sheet">
      <div class="receipt-header">
        ${logoDataUri ? `<img class="receipt-logo" src="${logoDataUri}" alt="Walikale to World Tech Adapt Hub" />` : ""}
        <h1>Walikale Papeterie</h1>
        <p>Q.CampTP, Avenue Kuya, route vers MUBI</p>
        <p>En face du Bureau PAM</p>
        <p>+243 812681339</p>
      </div>

      <div class="receipt-separator"></div>

      <div class="receipt-meta">
        <div><span>Ticket</span><strong>${escapeHtml(sale.reference)}</strong></div>
        <div><span>Date</span><strong>${escapeHtml(sale.date)}</strong></div>
        <div><span>Client</span><strong>${escapeHtml(sale.clientName)}</strong></div>
        <div><span>Paiement</span><strong>${escapeHtml(sale.paymentMethod)}</strong></div>
      </div>

      <div class="receipt-separator"></div>

      <div class="receipt-lines">
        ${rows}
      </div>

      <div class="receipt-separator"></div>

      <div class="receipt-total">
        <span>TOTAL</span>
        <strong>${formatCurrency(sale.amount)}</strong>
      </div>

      <div class="receipt-footer">
        <p>Merci pour votre achat.</p>
        <p>Walikale to World Tech Adapt Hub</p>
      </div>
    </div>
  `;
}

export function buildInvoiceHtml(
  sale: SaleDetail,
  appRoot: string,
  options?: {
    interactive?: boolean;
    format?: InvoiceFormat;
  }
) {
  const format = options?.format ?? "a4";
  const logoDataUri = getLogoDataUri(appRoot);
  const toolbar = options?.interactive ? buildToolbar(format) : "";
  const markup = format === "receipt80mm" ? buildReceiptMarkup(sale, logoDataUri) : buildA4Markup(sale, logoDataUri);

  return `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(sale.reference)}</title>
        <style>
          :root {
            color-scheme: light;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: "Segoe UI", Arial, sans-serif;
            color: #0f1b2d;
            margin: 0;
            padding: 16px;
            background: #ffffff;
          }
          .toolbar {
            display: flex;
            gap: 10px;
            margin: 0 auto 10px;
            max-width: 760px;
          }
          .toolbar button {
            min-height: 36px;
            padding: 0 16px;
            border: 0;
            border-radius: 10px;
            background: #1783e5;
            color: #fff;
            font-weight: 700;
            cursor: pointer;
          }
          .toolbar button.secondary {
            background: #e9f2fb;
            color: #29507a;
          }
          .sheet {
            background: #fff;
          }
          .invoice-sheet {
            max-width: 760px;
            margin: 0 auto;
            border: 1px solid #dfe8f1;
            border-radius: 16px;
            padding: 18px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            border-bottom: 1px solid #d6e4f5;
            padding-bottom: 12px;
          }
          .brand {
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }
          .brand img {
            width: 145px;
            height: auto;
          }
          .brand h1 {
            margin: 0 0 4px;
            font-size: 19px;
          }
          .company-meta p,
          .invoice-title p {
            margin: 2px 0;
            color: #4e647f;
            font-size: 12px;
            line-height: 1.35;
          }
          .company-meta strong {
            color: #0f1b2d;
          }
          .invoice-title {
            text-align: right;
          }
          .invoice-title h2 {
            margin: 0 0 4px;
            font-size: 22px;
            color: #1783e5;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin: 14px 0 10px;
          }
          .thank-you {
            margin: 10px 0 0;
            padding: 10px 12px;
            border: 1px solid #d6e4f5;
            border-radius: 10px;
            background: #f7fbff;
            color: #29507a;
            font-size: 12px;
            text-align: center;
          }
          .card {
            border: 1px solid #d6e4f5;
            border-radius: 10px;
            padding: 9px 11px;
            background: #fbfdff;
          }
          .card span {
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #5d6f8b;
            margin-bottom: 4px;
          }
          .card strong {
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            border-radius: 12px;
            overflow: hidden;
          }
          th,
          td {
            text-align: left;
            padding: 9px 8px;
            border-bottom: 1px solid #d6e4f5;
            font-size: 13px;
          }
          th {
            color: #5d6f8b;
            font-size: 12px;
            background: #eef7ff;
          }
          .total-box {
            margin-top: 12px;
            margin-left: auto;
            width: 220px;
            border: 1px solid #d6e4f5;
            border-radius: 12px;
            background: #f7fbff;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 12px;
            font-size: 13px;
          }
          .total-row strong {
            color: #1783e5;
            font-size: 15px;
          }
          .footer {
            margin-top: 14px;
            padding-top: 10px;
            border-top: 1px solid #d6e4f5;
            text-align: center;
          }
          .footer p {
            margin: 3px 0;
            color: #4e647f;
            font-size: 11px;
            line-height: 1.35;
          }
          .receipt-sheet {
            width: 72mm;
            max-width: 72mm;
            margin: 0 auto;
            padding: 4mm 3mm 6mm;
            font-family: "Courier New", monospace;
            color: #000;
          }
          .receipt-header,
          .receipt-footer {
            text-align: center;
          }
          .receipt-logo {
            display: block;
            width: 34mm;
            max-width: 100%;
            height: auto;
            margin: 0 auto 2mm;
          }
          .receipt-header h1 {
            margin: 0 0 1.5mm;
            font-size: 14px;
          }
          .receipt-header p,
          .receipt-footer p {
            margin: 0.6mm 0;
            font-size: 10px;
            line-height: 1.3;
          }
          .receipt-separator {
            border-top: 1px dashed #000;
            margin: 3mm 0;
          }
          .receipt-meta,
          .receipt-lines {
            display: grid;
            gap: 2mm;
          }
          .receipt-meta div {
            display: flex;
            justify-content: space-between;
            gap: 3mm;
            font-size: 10px;
          }
          .receipt-meta span {
            color: #333;
          }
          .receipt-meta strong {
            font-size: 10px;
            text-align: right;
          }
          .receipt-line {
            display: grid;
            gap: 1mm;
          }
          .receipt-line-name {
            font-size: 10px;
            font-weight: 700;
            word-break: break-word;
          }
          .receipt-line-meta {
            display: flex;
            justify-content: space-between;
            gap: 3mm;
            font-size: 10px;
          }
          .receipt-line-meta strong {
            text-align: right;
          }
          .receipt-total {
            display: flex;
            justify-content: space-between;
            gap: 3mm;
            font-size: 12px;
            font-weight: 700;
          }
          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            .no-print {
              display: none !important;
            }
            .invoice-sheet {
              border: 0;
              border-radius: 0;
              padding: 0;
            }
          }
          ${format === "receipt80mm" ? `
            @page {
              size: 80mm auto;
              margin: 0;
            }
          ` : ""}
        </style>
      </head>
      <body>
        ${toolbar}
        ${markup}
      </body>
    </html>
  `;
}
