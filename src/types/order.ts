export type OrderStatus =
  | 'Ter goedkeuring'
  | 'Nieuw'
  | 'In behandeling'
  | 'Verstuurd';

/**
 * Where the order originated. `'zoho'` means a sales-created order pulled
 * from CRM (the default and historic case). `'logistics'` means logistics
 * created the order locally - for ad-hoc shipments without a sales quote.
 * The Zoho-push behaviour for logistics-originated orders is TBD; for now
 * they live only in the local store.
 */
export type OrderSource = 'zoho' | 'logistics';

export interface OrderpickItem {
  productId: string;
  quantity: number;
  note: string;
}

export interface Unit {
  id: string;
  imei: string;
  productId: string;
}

/**
 * A note attached to the order in Zoho. Multiple per order, written by sales
 * (or anyone with write access). The app displays them read-only and refreshes
 * them on a short interval so edits in Zoho show up live.
 */
export interface OrderNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  modifiedAt: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  /**
   * For Zoho-sourced orders this is the linked CRM Account name. For
   * logistics-created orders it's a free-text recipient label (person,
   * department, external company without a CRM record).
   */
  account: string;
  address: string;
  postcode: string;
  city: string;
  status: OrderStatus;
  createdAt: string;
  /**
   * Set by `markAsShipped` when the order transitions to `Verstuurd`. Drives
   * the Verzonden tab sort order and the pakbon header. Null for any order
   * that hasn't shipped yet.
   */
  shippedAt: string | null;
  quoteOwner: string;
  source: OrderSource;
  notes: OrderNote[];
  orderpick: OrderpickItem[];
  units: Unit[];
}

export const OPEN_STATUSES: OrderStatus[] = ['Nieuw', 'In behandeling'];

export function isOpen(order: Order): boolean {
  return OPEN_STATUSES.includes(order.status);
}
