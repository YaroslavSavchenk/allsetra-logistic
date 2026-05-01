import {
  Document,
  Page,
  View,
  Text,
  Image,
  type DocumentProps,
} from '@react-pdf/renderer';
import type { Order } from '@/types/order';
import { getProduct, getProductName } from '@/lib/productStrategy';
import { COMPANY_INFO, type CompanyInfo } from '@/config/company';
import { styles } from './waybillStyles';

// LOGO: drop logo.png in src/assets and set logoPath in COMPANY_INFO when
// ready. While logoPath is undefined, the header falls back to the company
// name as plain text — keeps the PDF rendering safe even if no asset exists.

interface Props {
  order: Order;
  company?: CompanyInfo;
  /**
   * Override "now" for deterministic snapshots/tests. Defaults to current time.
   */
  generatedAt?: Date;
}

/**
 * Reusable pakbon (waybill) PDF template. Pure render — no I/O, no hooks.
 *
 * Order type doesn't carry contactName/externalRef today — skipping those
 * fields. Add when the model gains them.
 */
export function WaybillDocument({
  order,
  company = COMPANY_INFO,
  generatedAt,
}: Props) {
  // Split orderpick into accessoires (no IMEI). IMEI products surface as Units.
  const accessoires = order.orderpick.filter(
    (p) => getProduct(p.productId)?.hasIMEI === false,
  );
  const accessoiresQty = accessoires.reduce((sum, p) => sum + p.quantity, 0);
  const unitsCount = order.units.length;

  const totalLabel = buildTotalLabel(unitsCount, accessoiresQty);

  const now = generatedAt ?? new Date();
  const generatedAtStr = formatDateTimeLong(now);

  // Document title shows up in the PDF reader's tab. Helpful when several
  // pakbonnen are open at once.
  const docProps: DocumentProps = {
    title: `Pakbon ${order.orderNumber}`,
    author: company.name,
    creator: company.name,
    producer: company.name,
  };

  return (
    <Document {...docProps}>
      <Page size="A4" style={styles.page} wrap>
        {/* Header — repeats on every page so multipage units stay branded. */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {company.logoPath ? (
              <Image style={styles.logo} src={company.logoPath} />
            ) : (
              <Text style={styles.companyName}>{company.name}</Text>
            )}
            {company.logoPath && (
              <Text style={styles.companyName}>{company.name}</Text>
            )}
            <Text style={styles.companyLine}>{company.addressLine1}</Text>
            <Text style={styles.companyLine}>{company.addressLine2}</Text>
            <Text style={styles.companyMeta}>
              {company.kvk} · {company.btw}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.pakbonTitle}>PAKBON</Text>
            <Text style={styles.orderNumber}>#{order.orderNumber || '—'}</Text>
            <Text style={styles.shippedAt}>
              Verzonden: {formatDateLong(order.shippedAt)}
            </Text>
          </View>
        </View>

        {/* Afleveradres ---------------------------------------------------- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AFLEVERADRES</Text>
        </View>
        <View style={styles.addressBlock}>
          <Text style={styles.addressLineStrong}>{order.account || '—'}</Text>
          {/* Address may carry newlines from sales. Render each line as its
              own <Text> so wrap works as expected. */}
          {(order.address || '—').split(/\r?\n/).map((line, i) => (
            <Text key={`addr-${i}`} style={styles.addressLine}>
              {line || ' '}
            </Text>
          ))}
          <Text style={styles.addressLine}>
            {(order.postcode || '').trim()}
            {order.postcode && order.city ? ' ' : ''}
            {(order.city || '').trim() || (!order.postcode ? '—' : '')}
          </Text>
        </View>

        {/* Units (only if any) -------------------------------------------- */}
        {unitsCount > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>UNITS</Text>
              <Text style={styles.sectionMeta}>Totaal: {unitsCount} stuks</Text>
            </View>
            <View style={styles.table}>
              {/* Column header — only at the top of the table. @react-pdf
                  supports `fixed` only on direct children of <Page/>, so a
                  per-page repeat would need a more elaborate layout. Keeping
                  it simple: the heading shows once, rows wrap across pages. */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colProduct]}>
                  TYPE
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colImei]}>
                  IMEI
                </Text>
              </View>
              <View wrap>
                {order.units.map((unit, idx) => {
                  const isLast = idx === order.units.length - 1;
                  return (
                    <View
                      key={unit.id ?? `u-${idx}`}
                      style={isLast ? styles.tableRowLast : styles.tableRow}
                      wrap={false}
                    >
                      <Text style={[styles.tableCell, styles.colProduct]}>
                        {getProductName(unit.productId)}
                      </Text>
                      <Text style={[styles.tableCellMono, styles.colImei]}>
                        {unit.imei || '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Accessoires (only if any) -------------------------------------- */}
        {accessoires.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ACCESSOIRES</Text>
              <Text style={styles.sectionMeta}>
                Totaal: {accessoiresQty} stuks
              </Text>
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colProduct]}>
                  PRODUCT
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colQty]}>
                  AANTAL
                </Text>
              </View>
              <View wrap>
                {accessoires.map((line, idx) => {
                  const isLast = idx === accessoires.length - 1;
                  return (
                    <View
                      key={`acc-${line.productId}-${idx}`}
                      style={isLast ? styles.tableRowLast : styles.tableRow}
                      wrap={false}
                    >
                      <Text style={[styles.tableCell, styles.colProduct]}>
                        {getProductName(line.productId)}
                      </Text>
                      <Text style={[styles.tableCellMono, styles.colQty]}>
                        {line.quantity}×
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Footer — repeats on every page. */}
        <View style={styles.footer} fixed>
          <View style={styles.footerTopRow}>
            <Text style={styles.footerTotal}>Eindtotaal: {totalLabel}</Text>
            <Text style={styles.footerSignature}>
              Handtekening ontvanger: ____________
            </Text>
          </View>
          <View style={styles.footerBottomRow}>
            <Text>Pakbon gegenereerd: {generatedAtStr}</Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `Pagina ${pageNumber} / ${totalPages}`
              }
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Helpers — local so the template stays a single drop-in file.
// ---------------------------------------------------------------------------

function buildTotalLabel(units: number, accessoires: number): string {
  if (units === 0 && accessoires === 0) return '0 items';
  const parts: string[] = [];
  if (units > 0) parts.push(`${units} units`);
  if (accessoires > 0) parts.push(`${accessoires} accessoires`);
  return parts.join(' + ');
}

/**
 * Format an ISO date string in Dutch long form: `1 mei 2026`.
 * Returns `—` for null/invalid input — defensive against missing shippedAt.
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
