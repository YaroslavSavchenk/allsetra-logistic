import type { Product } from '@/types/product';
import type {
  InventoryItem,
  InventoryMovement,
  PurchaseOrder,
} from '@/types/inventory';
import { MOCK_INVENTORY, MOCK_PURCHASE_ORDERS } from '@/data/mockInventory';
import {
  getProduct as registryGetProduct,
  listProducts as registryListProducts,
} from '@/lib/productStrategy';
import type { InventoryService } from './inventoryService';

const SIMULATED_LATENCY_MS = 120;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(value), SIMULATED_LATENCY_MS),
  );
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  // Match the seconds-level precision used by `mockData.ts`.
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/**
 * In-memory inventory backend. Mirrors `MockOrderService` in style: deep
 * clones every value crossing the boundary so callers can never mutate
 * internal state, and adds a small artificial latency to keep the loading
 * states honest in development.
 */
export class MockInventoryService implements InventoryService {
  private inventory: InventoryItem[];
  private purchaseOrders: PurchaseOrder[];
  private movements: InventoryMovement[] = [];

  constructor(
    inventorySeed: InventoryItem[] = MOCK_INVENTORY,
    purchaseOrderSeed: PurchaseOrder[] = MOCK_PURCHASE_ORDERS,
  ) {
    this.inventory = clone(inventorySeed);
    this.purchaseOrders = clone(purchaseOrderSeed);
  }

  async listInventory(): Promise<InventoryItem[]> {
    return delay(clone(this.inventory));
  }

  async getProduct(productId: string): Promise<Product | null> {
    return delay(registryGetProduct(productId));
  }

  async listProducts(): Promise<Product[]> {
    return delay(clone(registryListProducts()));
  }

  async registerPurchaseOrder(
    items: { productId: string; qty: number }[],
    note: string = '',
  ): Promise<PurchaseOrder> {
    if (items.length === 0) {
      throw new Error('Geen producten geselecteerd voor inkooporder');
    }
    for (const item of items) {
      if (item.qty <= 0 || !Number.isFinite(item.qty)) {
        throw new Error('Aantal moet groter dan 0 zijn');
      }
    }

    const po: PurchaseOrder = {
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      note,
      status: 'open',
      items: clone(items),
    };
    this.purchaseOrders.push(po);

    for (const item of items) {
      const inv = this.findOrCreate(item.productId);
      inv.opBestelling += item.qty;
    }

    return delay(clone(po));
  }

  async receivePurchaseOrder(poId: string): Promise<PurchaseOrder> {
    const po = this.purchaseOrders.find((p) => p.id === poId);
    if (!po) throw new Error(`Inkooporder ${poId} niet gevonden`);
    if (po.status === 'received') {
      throw new Error('Inkooporder is al ontvangen');
    }

    const ts = nowIso();
    po.status = 'received';
    po.receivedAt = ts;

    for (const item of po.items) {
      const inv = this.findOrCreate(item.productId);
      inv.opBestelling = Math.max(0, inv.opBestelling - item.qty);
      inv.opVoorraad += item.qty;
      inv.lastMovementAt = ts;

      this.movements.push({
        id: crypto.randomUUID(),
        productId: item.productId,
        delta: item.qty,
        reason: po.note || 'Inkooporder ontvangen',
        createdAt: ts,
        kind: 'purchase-received',
      });
    }

    return delay(clone(po));
  }

  async listPurchaseOrders(): Promise<PurchaseOrder[]> {
    const sorted = [...this.purchaseOrders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return delay(clone(sorted));
  }

  async adjustStock(
    productId: string,
    delta: number,
    reason: string,
  ): Promise<InventoryMovement> {
    if (!Number.isFinite(delta) || delta === 0) {
      throw new Error('Aanpassing moet een getal anders dan 0 zijn');
    }
    if (!reason || !reason.trim()) {
      throw new Error('Reden is verplicht bij handmatige aanpassing');
    }

    const inv = this.findOrCreate(productId);
    const ts = nowIso();
    inv.opVoorraad += delta;
    inv.lastMovementAt = ts;

    const movement: InventoryMovement = {
      id: crypto.randomUUID(),
      productId,
      delta,
      reason: reason.trim(),
      createdAt: ts,
      kind: 'manual-adjust',
    };
    this.movements.push(movement);

    return delay(clone(movement));
  }

  async deductForShipment(
    orderId: string,
    picks: { productId: string; qty: number }[],
  ): Promise<InventoryMovement[]> {
    const ts = nowIso();
    const created: InventoryMovement[] = [];

    for (const pick of picks) {
      if (pick.qty <= 0) continue;
      const inv = this.findOrCreate(pick.productId);
      inv.opVoorraad -= pick.qty;
      inv.lastMovementAt = ts;

      const movement: InventoryMovement = {
        id: crypto.randomUUID(),
        productId: pick.productId,
        delta: -pick.qty,
        reason: `Verzonden bij order ${orderId}`,
        createdAt: ts,
        kind: 'shipment-deducted',
        linkedOrderId: orderId,
      };
      this.movements.push(movement);
      created.push(movement);
    }

    return delay(clone(created));
  }

  async listMovements(productId?: string): Promise<InventoryMovement[]> {
    const filtered = productId
      ? this.movements.filter((m) => m.productId === productId)
      : this.movements;
    const sorted = [...filtered].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return delay(clone(sorted));
  }

  private findOrCreate(productId: string): InventoryItem {
    let inv = this.inventory.find((i) => i.productId === productId);
    if (!inv) {
      inv = {
        productId,
        opVoorraad: 0,
        opBestelling: 0,
        lastMovementAt: null,
      };
      this.inventory.push(inv);
    }
    return inv;
  }
}

export const mockInventoryService = new MockInventoryService();
