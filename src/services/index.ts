import { mockOrderService } from './mockOrderService';
import { zohoOrderService, zohoIsConfigured } from './zohoOrderService';
import { mockInventoryService } from './mockInventoryService';
import { zohoCatalogService } from './zohoCatalogService';
import type { OrderService } from './orderService';
import type { InventoryService } from './inventoryService';
import type { Product } from '@/types/product';

/**
 * **Force-mock for v0.2.x.** The Zoho live path is wired but two pieces are
 * unfinished: (a) `createOrder` for logistics-originated orders rejects in
 * live mode pending a business decision on Zoho-push, and (b) the Products
 * module field mapping hasn't been verified against the real schema yet.
 * Until both are resolved we run entirely on local mock data so demos and
 * QA stay usable. To re-enable Zoho live mode, flip this to `false`.
 */
const FORCE_MOCK = true;

/** Reflects which back-end the façade landed on after the probe settles.
 *  Components can read this to surface a "mock data" badge in the UI. */
export type ServiceMode = 'mock' | 'zoho';
let resolvedMode: ServiceMode = 'mock';

/**
 * A façade that starts on the mock service and swaps to Zoho as soon as the
 * Rust side confirms it has baked-in credentials. The probe is fired once
 * at load time; until it resolves, the mock is used.
 */
let active: OrderService = mockOrderService;

const resolved: Promise<void> = (FORCE_MOCK
  ? Promise.resolve(false)
  : zohoIsConfigured()
)
  .then((configured) => {
    if (configured) {
      active = zohoOrderService;
      resolvedMode = 'zoho';
      console.info('[services] Zoho configured - using live service');
    } else {
      console.info(
        FORCE_MOCK
          ? '[services] FORCE_MOCK - using mock service'
          : '[services] Zoho not configured - using mock service',
      );
    }
  })
  // Defensive: any unexpected probe failure must not deadlock every
  // service call awaiting `resolved`. We stay on the mock implementation.
  .catch((err) => {
    console.warn('[services] Zoho probe failed, staying on mock', err);
  });

/** Resolves to the active mode after the probe settles. */
export async function getServiceMode(): Promise<ServiceMode> {
  await resolved;
  return resolvedMode;
}

export const orderService: OrderService = {
  async getOpenOrders() {
    await resolved;
    return active.getOpenOrders();
  },
  async getOrderById(id) {
    await resolved;
    return active.getOrderById(id);
  },
  async updateOrderUnits(id, units) {
    await resolved;
    return active.updateOrderUnits(id, units);
  },
  async markAsPacked(id) {
    await resolved;
    return active.markAsPacked(id);
  },
  async markAsShipped(id) {
    await resolved;
    return active.markAsShipped(id);
  },
  async createOrder(draft) {
    await resolved;
    return active.createOrder(draft);
  },
  async listShippedOrders(opts) {
    await resolved;
    return active.listShippedOrders(opts);
  },
  async getShippedOrder(id) {
    await resolved;
    return active.getShippedOrder(id);
  },
};

/**
 * Inventory façade. Stock + purchase orders today live only in the mock;
 * there are no Rust commands for them yet. The product catalogue, however,
 * does have a live Zoho path: `listProducts()` swaps to the Zoho Products
 * module fetch as soon as `zohoIsConfigured` resolves true. Mock and live
 * use the same shape so callers don't care.
 *
 * TODO: when a Zoho Items / Inventory module backend lands, build a parallel
 * `zohoInventoryService` and route stock/PO calls through it analogous to
 * the order service.
 */
const activeInventory: InventoryService = mockInventoryService;

let activeListProducts: () => Promise<Product[]> = () =>
  activeInventory.listProducts();

const catalogResolved: Promise<void> = (FORCE_MOCK
  ? Promise.resolve(false)
  : zohoIsConfigured()
)
  .then((configured) => {
    if (configured) {
      activeListProducts = () => zohoCatalogService.listProducts();
      console.info('[services] Zoho configured - using live product catalogue');
    } else {
      console.info(
        FORCE_MOCK
          ? '[services] FORCE_MOCK - picker reads from voorraad'
          : '[services] Zoho not configured - picker reads from voorraad',
      );
    }
  })
  .catch((err) => {
    console.warn(
      '[services] Zoho catalogue probe failed, staying on mock',
      err,
    );
  });

export const inventoryService: InventoryService = {
  async listInventory() {
    return activeInventory.listInventory();
  },
  async getProduct(productId) {
    return activeInventory.getProduct(productId);
  },
  async listProducts() {
    await catalogResolved;
    return activeListProducts();
  },
  async registerPurchaseOrder(items, note) {
    return activeInventory.registerPurchaseOrder(items, note);
  },
  async receivePurchaseOrder(poId, productId) {
    return activeInventory.receivePurchaseOrder(poId, productId);
  },
  async listPurchaseOrders() {
    return activeInventory.listPurchaseOrders();
  },
  async deletePurchaseOrder(poId) {
    return activeInventory.deletePurchaseOrder(poId);
  },
  async adjustStock(productId, delta, reason) {
    return activeInventory.adjustStock(productId, delta, reason);
  },
  async deductForShipment(orderId, picks) {
    return activeInventory.deductForShipment(orderId, picks);
  },
  async listMovements(productId) {
    return activeInventory.listMovements(productId);
  },
};

export type { OrderService, OrderDraft } from './orderService';
export type { InventoryService } from './inventoryService';
