import type { Order, OrderpickItem, Unit } from '@/types/order';

/**
 * Draft used by `createOrder` - the minimal fields logistics fills in when
 * making a manual order. The service generates the id, ordernumber, status,
 * timestamp, source, quote owner and (for IMEI products) the Units.
 */
export interface OrderDraft {
  /** Free-text recipient label (person, company, internal team). */
  recipient: string;
  address: string;
  postcode: string;
  city: string;
  /** Optional internal note attached as an OrderNote. */
  note?: string;
  orderpick: OrderpickItem[];
}

/** Filter/paging options for the shipped-orders feed. */
export interface ListShippedOrdersOptions {
  /** Cap the number of returned orders. Defaults to 50 server-side. */
  limit?: number;
  /** Free-text filter - matched against order number and account. */
  search?: string;
}

/**
 * Interface that abstracts order persistence. Components depend on this, not
 * on a specific implementation. `MockOrderService` is used today; a
 * `ZohoOrderService` will slot in behind the same interface later.
 */
export interface OrderService {
  getOpenOrders(): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | null>;
  updateOrderUnits(id: string, units: Unit[]): Promise<Order>;
  markAsShipped(id: string): Promise<Order>;
  /**
   * Create a new logistics-originated order. The service assigns an
   * LCO-prefixed ordernumber, sets `source: 'logistics'`, and auto-generates
   * Units for every IMEI-bearing product line.
   *
   * TODO: when Zoho integration goes live, decide whether logistics-created
   * orders should also be pushed into Zoho or stay local-only.
   */
  createOrder(draft: OrderDraft): Promise<Order>;
  /**
   * Orders with status `Verstuurd`, sorted by `shippedAt` desc (recentste
   * boven). Drives the Verzonden tab feed.
   */
  listShippedOrders(opts?: ListShippedOrdersOptions): Promise<Order[]>;
  /**
   * Single shipped order - same payload as `getOrderById`, kept as a separate
   * method so the live Zoho impl can hit a search endpoint scoped to
   * `Status:equals:Verstuurd` if useful.
   */
  getShippedOrder(id: string): Promise<Order | null>;
}
