import type { Order } from '@/types/order';
import { getProduct, getProductName } from '@/lib/productStrategy';
import { COMPANY_INFO, type CompanyInfo } from '@/config/company';

/**
 * Pure function that returns a self-contained HTML document string for the
 * pakbon (waybill). The output is fed to an `<iframe srcDoc={...}>` and to
 * `iframe.contentWindow.print()` for printing / "save as PDF" via the system
 * print dialog (Windows: Microsoft Print to PDF).
 *
 * Why HTML instead of `@react-pdf/renderer`:
 * the PDF approach uses `blob:` iframe URLs which the Tauri CSP blocks. A
 * `srcDoc` iframe runs same-origin under WebView2 with no CSP changes — the
 * print dialog handles paper output and PDF export equally well.
 *
 * The HTML is fully self-contained — no external fonts, no external CSS,
 * no scripts. `@page` rules size the page to A4 with sane margins for print.
 *
 * Defensiveness: every dynamic value flowing from `order` / `company` is
 * HTML-escaped via `escape()` before interpolation. A Zoho note containing
 * `<script>` or `&` etc. cannot break the document.
 */
export function buildWaybillHtml(
  order: Order,
  company: CompanyInfo = COMPANY_INFO,
): string {
  // Split orderpick: IMEI products surface as Units, the rest are accessoires.
  const accessoires = order.orderpick.filter(
    (p) => getProduct(p.productId)?.hasIMEI === false,
  );
  const accessoiresQty = accessoires.reduce((sum, p) => sum + p.quantity, 0);
  const unitsCount = order.units.length;

  const totalLabel = buildTotalLabel(unitsCount, accessoiresQty);
  const generatedAtStr = formatDateTimeLong(new Date());

  const headerLeft = renderHeaderLeft(company);
  const headerRight = renderHeaderRight(order);
  const addressBlock = renderAddressBlock(order);
  const unitsSection = unitsCount > 0 ? renderUnitsSection(order) : '';
  const accessoiresSection =
    accessoires.length > 0
      ? renderAccessoiresSection(accessoires, accessoiresQty)
      : '';

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<title>Pakbon ${escape(order.orderNumber || '')}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #111111;
    font-family: system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    padding: 6mm 4mm;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16pt;
    padding-bottom: 10pt;
    margin-bottom: 14pt;
    border-bottom: 1px solid #cccccc;
  }
  .header-left {
    max-width: 60%;
    display: flex;
    flex-direction: column;
  }
  .header-right {
    max-width: 40%;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
  }
  .logo {
    max-width: 120pt;
    max-height: 40pt;
    object-fit: contain;
    margin-bottom: 4pt;
  }
  .company-name {
    font-size: 12pt;
    font-weight: 700;
    margin: 0 0 2pt 0;
  }
  .company-line {
    font-size: 9pt;
    color: #444444;
    margin: 0;
  }
  .company-meta {
    font-size: 8pt;
    color: #666666;
    margin-top: 4pt;
  }
  .pakbon-title {
    font-size: 22pt;
    font-weight: 700;
    letter-spacing: 1.5pt;
    text-transform: uppercase;
    margin: 0;
    line-height: 1.1;
  }
  .order-number {
    font-size: 12pt;
    font-family: ui-monospace, "SF Mono", "Cascadia Mono", "Consolas", monospace;
    font-weight: 700;
    margin-top: 2pt;
  }
  .shipped-at {
    font-size: 9pt;
    color: #444444;
    margin-top: 4pt;
  }
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 14pt;
    margin-bottom: 6pt;
  }
  .section-title {
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 1pt;
    color: #222222;
    text-transform: uppercase;
  }
  .section-meta {
    font-size: 9pt;
    color: #666666;
  }
  .address-block {
    padding: 8pt 10pt;
    border: 1px solid #dddddd;
    border-radius: 3pt;
    background-color: #fafafa;
  }
  .address-line {
    font-size: 11pt;
    margin: 0;
    word-break: break-word;
  }
  .address-line-strong {
    font-size: 11pt;
    font-weight: 700;
    margin: 0 0 2pt 0;
    word-break: break-word;
  }
  table.lines {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #dddddd;
    border-radius: 3pt;
    overflow: hidden;
  }
  table.lines thead th {
    text-align: left;
    background-color: #f0f0f0;
    border-bottom: 2px solid #cccccc;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.5pt;
    color: #444444;
    padding: 5pt 8pt;
    text-transform: uppercase;
  }
  table.lines tbody td {
    border-bottom: 1px solid #eeeeee;
    padding: 5pt 8pt;
    font-size: 10pt;
    vertical-align: top;
    word-break: break-word;
  }
  table.lines tbody tr:last-child td {
    border-bottom: none;
  }
  td.mono {
    font-family: ui-monospace, "SF Mono", "Cascadia Mono", "Consolas", monospace;
  }
  td.qty {
    text-align: right;
    width: 20%;
    font-family: ui-monospace, "SF Mono", "Cascadia Mono", "Consolas", monospace;
  }
  th.qty {
    text-align: right;
  }
  .footer {
    margin-top: 22pt;
    padding-top: 8pt;
    border-top: 1px solid #cccccc;
  }
  .footer-total {
    font-size: 10pt;
    font-weight: 700;
    margin: 0 0 12pt 0;
  }
  .signature {
    font-size: 9pt;
    color: #444444;
    margin: 0 0 14pt 0;
  }
  .signature-line {
    letter-spacing: 0.5pt;
  }
  .footer-meta {
    font-size: 8pt;
    color: #777777;
    margin: 0;
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="header-left">${headerLeft}</div>
      <div class="header-right">${headerRight}</div>
    </div>

    <div class="section-header">
      <span class="section-title">Afleveradres</span>
    </div>
    <div class="address-block">${addressBlock}</div>

    ${unitsSection}
    ${accessoiresSection}

    <div class="footer">
      <p class="footer-total">Eindtotaal: ${escape(totalLabel)}</p>
      <p class="signature">
        Handtekening ontvanger:
        <span class="signature-line">____________________________________</span>
      </p>
      <p class="footer-meta">Pakbon gegenereerd: ${escape(generatedAtStr)}</p>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderHeaderLeft(company: CompanyInfo): string {
  const logoTag = company.logoPath
    ? `<img class="logo" src="${escape(company.logoPath)}" alt="${escape(company.name)}">`
    : '';
  return `${logoTag}
      <p class="company-name">${escape(company.name)}</p>
      <p class="company-line">${escape(company.addressLine1)}</p>
      <p class="company-line">${escape(company.addressLine2)}</p>
      <p class="company-meta">${escape(company.kvk)} · ${escape(company.btw)}</p>`;
}

function renderHeaderRight(order: Order): string {
  return `<p class="pakbon-title">Pakbon</p>
      <p class="order-number">#${escape(order.orderNumber || '—')}</p>
      <p class="shipped-at">Verzonden: ${escape(formatDateLong(order.shippedAt))}</p>`;
}

function renderAddressBlock(order: Order): string {
  const account = order.account?.trim() || '—';
  const addressLines = (order.address || '—')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const addressLinesHtml = addressLines.length > 0
    ? addressLines
        .map((line) => `<p class="address-line">${escape(line)}</p>`)
        .join('\n      ')
    : `<p class="address-line">—</p>`;

  const postcode = (order.postcode || '').trim();
  const city = (order.city || '').trim();
  let postcodeCity: string;
  if (postcode && city) {
    postcodeCity = `${postcode} ${city}`;
  } else if (postcode) {
    postcodeCity = postcode;
  } else if (city) {
    postcodeCity = city;
  } else {
    postcodeCity = '—';
  }

  return `<p class="address-line-strong">${escape(account)}</p>
      ${addressLinesHtml}
      <p class="address-line">${escape(postcodeCity)}</p>`;
}

function renderUnitsSection(order: Order): string {
  const rows = order.units
    .map((unit) => {
      const product = escape(getProductName(unit.productId));
      const imei = escape(unit.imei || '—');
      return `<tr><td>${product}</td><td class="mono">${imei}</td></tr>`;
    })
    .join('\n          ');

  return `
    <div class="section-header">
      <span class="section-title">Units</span>
      <span class="section-meta">Totaal: ${order.units.length} stuks</span>
    </div>
    <table class="lines">
      <thead>
        <tr><th>Type</th><th>IMEI</th></tr>
      </thead>
      <tbody>
          ${rows}
      </tbody>
    </table>`;
}

function renderAccessoiresSection(
  accessoires: ReadonlyArray<{ productId: string; quantity: number }>,
  totalQty: number,
): string {
  const rows = accessoires
    .map((line) => {
      const product = escape(getProductName(line.productId));
      const qty = `${line.quantity}×`;
      return `<tr><td>${product}</td><td class="qty">${escape(qty)}</td></tr>`;
    })
    .join('\n          ');

  return `
    <div class="section-header">
      <span class="section-title">Accessoires</span>
      <span class="section-meta">Totaal: ${totalQty} stuks</span>
    </div>
    <table class="lines">
      <thead>
        <tr><th>Product</th><th class="qty">Aantal</th></tr>
      </thead>
      <tbody>
          ${rows}
      </tbody>
    </table>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the eindtotaal string defensively. Either side may be zero — the
 * resulting label adapts to "X units + Y accessoires" / "X units" /
 * "Y accessoires" / "0 items".
 */
function buildTotalLabel(units: number, accessoires: number): string {
  if (units === 0 && accessoires === 0) return '0 items';
  const parts: string[] = [];
  if (units > 0) parts.push(`${units} units`);
  if (accessoires > 0) parts.push(`${accessoires} accessoires`);
  return parts.join(' + ');
}

/**
 * Format an ISO date string in Dutch long form: `1 mei 2026`. Returns `—`
 * for null/invalid input — defensive against missing shippedAt.
 */
function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Format a Date in Dutch long form with a 24h clock — used in the footer
 * `Pakbon gegenereerd` row. Example: `1 mei 2026, 09:05`.
 */
function formatDateTimeLong(date: Date): string {
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * HTML-escape a string. Applied to every dynamic value that lands in the
 * pakbon — no value from `order` or `company` is ever interpolated raw.
 * Without this a Zoho-authored note containing `<script>` or even a stray
 * `&` could break the document.
 */
function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
