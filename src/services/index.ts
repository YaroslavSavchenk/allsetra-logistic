import { mockOrderService } from './mockOrderService';
import { zohoOrderService, zohoIsConfigured } from './zohoOrderService';
import type { OrderService } from './orderService';

/**
 * A façade that starts on the mock service and swaps to Zoho as soon as the
 * Rust side confirms it has baked-in credentials. The probe is fired once
 * at load time; until it resolves, the mock is used — which keeps the app
 * responsive in browser dev (`npm run dev`) and in Tauri builds without
 * Zoho secrets. After the probe resolves, all calls go to whichever service
 * is active.
 */
let active: OrderService = mockOrderService;

const resolved: Promise<void> = zohoIsConfigured().then((configured) => {
  if (configured) {
    active = zohoOrderService;
    console.info('[services] Zoho configured — using live service');
  } else {
    console.info('[services] Zoho not configured — using mock service');
  }
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
};

export type { OrderService } from './orderService';
