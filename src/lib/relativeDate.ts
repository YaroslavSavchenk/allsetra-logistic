/**
 * Sidebar-only relative date label for the Verzonden-tab.
 *
 * Returns "vandaag" / "gisteren" / "N dagen geleden" for anything within the
 * last week, otherwise a NL short date (`dd-MM-yyyy`). The workspace header
 * keeps using `formatDateTime()` from `lib/format` - this is intentionally
 * compact and only suitable next to a row that already shows ordernumber +
 * account.
 */
export function relativeDateShort(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  // Compare on calendar-day boundaries in the local timezone - otherwise
  // a shipment at 23:50 vs a "now" at 00:10 the next day would round to
  // 0 days and call yesterday "vandaag".
  const day = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((day(now) - day(date)) / 86_400_000);

  if (diffDays <= 0) return 'vandaag';
  if (diffDays === 1) return 'gisteren';
  if (diffDays <= 7) return `${diffDays} dagen geleden`;

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}
