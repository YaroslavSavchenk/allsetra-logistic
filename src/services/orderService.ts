import type { Order, Unit } from '@/types/order';

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
}
