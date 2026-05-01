import type { Order, Unit } from '@/types/order';
import { OPEN_STATUSES } from '@/types/order';
import { MOCK_ORDERS } from '@/data/mockData';
import { isImeiProduct } from '@/lib/productStrategy';
import type {
  ListShippedOrdersOptions,
  OrderDraft,
  OrderService,
} from './orderService';

const SHIPPED_DEFAULT_LIMIT = 50;

const SIMULATED_LATENCY_MS = 120;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export class MockOrderService implements OrderService {
  private orders: Order[];
  // Logistics-Created Order counter. Resets on every page reload because the
  // mock store is in-memory; that's harmless because the orders themselves
  // are gone after a reload too. Real persistence (Zoho or otherwise) will
  // own the numbering scheme.
  private lcoCounter = 1;

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

  async markAsPacked(id: string): Promise<Order> {
    const order = this.orders.find((o) => o.id === id);
    if (!order) throw new Error(`Order ${id} niet gevonden`);
    if (order.status === 'Verstuurd') {
      throw new Error('Order is al verzonden en kan niet opnieuw ingepakt worden');
    }
    // Idempotent: re-marking an already-Ingepakt order is a no-op (status
    // stays the same). This keeps the UI flow simple - clicking Inpakken
    // again after navigating away just opens the waybill without errors.
    order.status = 'Ingepakt';
    return delay(clone(order));
  }

  async markAsShipped(id: string): Promise<Order> {
    const order = this.orders.find((o) => o.id === id);
    if (!order) throw new Error(`Order ${id} niet gevonden`);

    order.status = 'Verstuurd';
    order.shippedAt = nowIso();
    return delay(clone(order));
  }

  async listShippedOrders(opts?: ListShippedOrdersOptions): Promise<Order[]> {
    const limit = opts?.limit ?? SHIPPED_DEFAULT_LIMIT;
    const q = opts?.search?.trim().toLowerCase() ?? '';
    const shipped = this.orders
      .filter((o) => o.status === 'Verstuurd')
      .filter((o) => {
        if (!q) return true;
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.account.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Recentste boven. shippedAt should always exist for Verstuurd
        // orders, but fall back to createdAt defensively.
        const ta = new Date(a.shippedAt ?? a.createdAt).getTime();
        const tb = new Date(b.shippedAt ?? b.createdAt).getTime();
        return tb - ta;
      })
      .slice(0, limit);
    return delay(clone(shipped));
  }

  async getShippedOrder(id: string): Promise<Order | null> {
    const order = this.orders.find(
      (o) => o.id === id && o.status === 'Verstuurd',
    );
    return delay(order ? clone(order) : null);
  }

  async createOrder(draft: OrderDraft): Promise<Order> {
    if (!draft.recipient.trim()) {
      throw new Error('Ontvanger is verplicht');
    }
    if (!draft.address.trim() || !draft.postcode.trim() || !draft.city.trim()) {
      throw new Error('Verzendadres is verplicht');
    }
    if (draft.orderpick.length === 0) {
      throw new Error('Voeg ten minste één product toe');
    }
    for (const line of draft.orderpick) {
      if (line.quantity <= 0 || !Number.isFinite(line.quantity)) {
        throw new Error('Aantal moet groter dan 0 zijn');
      }
    }

    const ts = nowIso();
    const orderNumber = `LCO-${String(this.lcoCounter++).padStart(4, '0')}`;
    const id = `lco_${crypto.randomUUID().slice(0, 8)}`;

    // One Unit per piece for IMEI products; non-IMEI products just sit in
    // orderpick and get deducted by qty on shipment.
    const units: Unit[] = [];
    let unitSerial = 1;
    for (const line of draft.orderpick) {
      if (isImeiProduct(line.productId)) {
        for (let i = 0; i < line.quantity; i++) {
          units.push({
            id: `u${unitSerial++}`,
            imei: '',
            productId: line.productId,
          });
        }
      }
    }

    const order: Order = {
      id,
      orderNumber,
      account: draft.recipient.trim(),
      address: draft.address.trim(),
      postcode: draft.postcode.trim(),
      city: draft.city.trim(),
      status: 'Nieuw',
      createdAt: ts,
      shippedAt: null,
      quoteOwner: 'Logistiek',
      source: 'logistics',
      notes: draft.note?.trim()
        ? [
            {
              id: `n_${crypto.randomUUID().slice(0, 8)}`,
              author: 'Logistiek',
              content: draft.note.trim(),
              createdAt: ts,
              modifiedAt: null,
            },
          ]
        : [],
      orderpick: clone(draft.orderpick),
      units,
    };

    this.orders.push(order);
    return delay(clone(order));
  }
}

export const mockOrderService = new MockOrderService();
