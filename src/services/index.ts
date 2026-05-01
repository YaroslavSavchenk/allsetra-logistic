import { mockOrderService } from './mockOrderService';
import { zohoOrderService, zohoIsConfigured } from './zohoOrderService';
import { mockInventoryService } from './mockInventoryService';
import { zohoCatalogService } from './zohoCatalogService';
import type { OrderService } from './orderService';
import type { InventoryService } from './inventoryService';
import type { Product } from '@/types/product';

/**
 * A façade that starts on the mock service and swaps to Zoho as soon as the
 * Rust side confirms it has baked-in credentials. The probe is fired once
 * at load time; until it resolves, the mock is used — which keeps the app
 * responsive in browser dev (`npm run dev`) and in Tauri builds without
 * Zoho secrets. After the probe resolves, all calls go to whichever service
 * is active.
 */
let active: OrderService = mockOrderService;

const resolved: Promise<void> = zohoIsConfigured()
  .then((configured) => {
    if (configured) {
      active = zohoOrderService;
      console.info('[services] Zoho configured — using live service');
    } else {
      console.info('[services] Zoho not configured — using mock service');
    }
  })
  // Defensive: any unexpected probe failure must not deadlock every
  // service call awaiting `resolved`. We stay on the mock implementation.
  .catch((err) => {
    console.warn('[services] Zoho probe failed, staying on mock', err);
  });

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
  async markAsShipped(id) {
    await resolved;
    return active.markAsShipped(id);
  },
  async createOrder(draft) {
    await resolved;
    return active.createOrder(draft);
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

const catalogResolved: Promise<void> = zohoIsConfigured()
  .then((configured) => {
    if (configured) {
      activeListProducts = () => zohoCatalogService.listProducts();
      console.info('[services] Zoho configured — using live product catalogue');
    } else {
      console.info('[services] Zoho not configured — using mock product catalogue');
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
  async receivePurchaseOrder(poId) {
    return activeInventory.receivePurchaseOrder(poId);
  },
  async listPurchaseOrders() {
    return activeInventory.listPurchaseOrders();
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
