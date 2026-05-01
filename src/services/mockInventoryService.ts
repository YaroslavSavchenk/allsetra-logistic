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
    // Voorraad is the single source of truth for "what can we ship": every
    // product the picker should offer is one that has a stock row here.
    // Add a row to mockInventory.ts to surface a new product in the
    // new-order picker. Falls back to the full registry when the inventory
    // is empty so the picker is still useful in a fresh seed.
    if (this.inventory.length === 0) {
      return delay(clone(registryListProducts()));
    }
    const seen = new Set<string>();
    const products: Product[] = [];
    for (const item of this.inventory) {
      if (seen.has(item.productId)) continue;
      seen.add(item.productId);
      const product = registryGetProduct(item.productId);
      if (product) products.push(product);
    }
    return delay(clone(products));
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

  async receivePurchaseOrder(
    poId: string,
    productId: string,
  ): Promise<PurchaseOrder> {
    const po = this.purchaseOrders.find((p) => p.id === poId);
    if (!po) throw new Error(`Inkooporder ${poId} niet gevonden`);
    if (po.status === 'received') {
      throw new Error('Inkooporder is al ontvangen');
    }

    const line = po.items.find((i) => i.productId === productId);
    if (!line) {
      throw new Error(
        `Product ${productId} staat niet op inkooporder ${poId}`,
      );
    }
    if (line.receivedAt) {
      throw new Error('Deze regel is al ontvangen');
    }

    const ts = nowIso();
    line.receivedAt = ts;

    const inv = this.findOrCreate(line.productId);
    inv.opBestelling = Math.max(0, inv.opBestelling - line.qty);
    inv.opVoorraad += line.qty;
    inv.lastMovementAt = ts;

    this.movements.push({
      id: crypto.randomUUID(),
      productId: line.productId,
      delta: line.qty,
      reason: po.note || 'Inkooporder ontvangen',
      createdAt: ts,
      kind: 'purchase-received',
    });

    // PO flips to received once every line is in.
    if (po.items.every((l) => l.receivedAt)) {
      po.status = 'received';
      po.receivedAt = ts;
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

  async deletePurchaseOrder(poId: string): Promise<void> {
    const po = this.purchaseOrders.find((p) => p.id === poId);
    if (!po) {
      throw new Error(`Inkooporder ${poId} niet gevonden`);
    }
    if (po.status !== 'open') {
      throw new Error('Alleen open inkooporders kunnen verwijderd worden');
    }

    // Reverse the `opBestelling` bump that `registerPurchaseOrder` did at
    // creation. No `opVoorraad` change and no movement row - physical stock
    // never moved for an open PO, so there is nothing to audit.
    for (const line of po.items) {
      if (line.receivedAt) continue;
      const inv = this.findOrCreate(line.productId);
      inv.opBestelling = Math.max(0, inv.opBestelling - line.qty);
    }

    this.purchaseOrders = this.purchaseOrders.filter((p) => p.id !== poId);
    return delay(undefined);
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
    // Block manual adjustments that would push the on-hand stock below zero.
    // The ship flow has its own pre-flight check so it never reaches this
    // path with a negative outcome - manual adjusts are the only remaining
    // way to drive opVoorraad below 0, and the user wants that blocked.
    // Resulting in 0 is allowed (you can zero out a count).
    if (inv.opVoorraad + delta < 0) {
      throw new Error(
        `Voorraad zou onder 0 komen - huidige voorraad is ${inv.opVoorraad}, aanpassing ${delta >= 0 ? '+' : ''}${delta} is niet toegestaan.`,
      );
    }
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
