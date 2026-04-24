import type { Order, Unit } from '@/types/order';
import { OPEN_STATUSES } from '@/types/order';
import { MOCK_ORDERS } from '@/data/mockData';
import type { OrderService } from './orderService';

const SIMULATED_LATENCY_MS = 120;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class MockOrderService implements OrderService {
  private orders: Order[];

  constructor(seed: Order[] = MOCK_ORDERS) {
    this.orders = clone(seed);
  }

  async getOpenOrders(): Promise<Order[]> {
    const open = this.orders
      .filter((o) => OPEN_STATUSES.includes(o.status))
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    return delay(clone(open));
  }

  async getOrderById(id: string): Promise<Order | null> {
    const order = this.orders.find((o) => o.id === id);
    return delay(order ? clone(order) : null);
  }

  async updateOrderUnits(id: string, units: Unit[]): Promise<Order> {
    const order = this.orders.find((o) => o.id === id);
    if (!order) throw new Error(`Order ${id} niet gevonden`);

    order.units = clone(units);
    const anyFilled = units.some((u) => u.imei.trim().length > 0);
    if (order.status === 'Nieuw' && anyFilled) {
      order.status = 'In behandeling';
    }

    return delay(clone(order));
  }

  async markAsShipped(id: string): Promise<Order> {
    const order = this.orders.find((o) => o.id === id);
    if (!order) throw new Error(`Order ${id} niet gevonden`);

    order.status = 'Verstuurd';
    return delay(clone(order));
  }
}

export const mockOrderService = new MockOrderService();
