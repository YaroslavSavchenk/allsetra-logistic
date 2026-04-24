export type OrderStatus =
  | 'Ter goedkeuring'
  | 'Nieuw'
  | 'In behandeling'
  | 'Verstuurd';

export type DeviceType = 'Eco5' | 'HCV5-Lite' | 'Smart5';

export interface OrderpickItem {
  product: string;
  quantity: number;
  note: string;
}

export interface Unit {
  id: string;
  imei: string;
  type: DeviceType;
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
  account: string;
  address: string;
  postcode: string;
  city: string;
  status: OrderStatus;
  createdAt: string;
  quoteOwner: string;
  notes: OrderNote[];
  orderpick: OrderpickItem[];
  units: Unit[];
}

export const OPEN_STATUSES: OrderStatus[] = ['Nieuw', 'In behandeling'];

export function isOpen(order: Order): boolean {
  return OPEN_STATUSES.includes(order.status);
}
