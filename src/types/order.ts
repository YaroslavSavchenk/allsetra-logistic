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
  salesNote: string | null;
  orderpick: OrderpickItem[];
  units: Unit[];
}

export const OPEN_STATUSES: OrderStatus[] = ['Nieuw', 'In behandeling'];

export function isOpen(order: Order): boolean {
  return OPEN_STATUSES.includes(order.status);
}
