import { invoke } from '@tauri-apps/api/core';
import type { Order, Unit } from '@/types/order';
import type { OrderDraft, OrderService } from './orderService';

/**
 * Calls out to the Rust-side Zoho client via Tauri commands. The Rust side
 * owns the OAuth refresh token, token cache, and actual HTTP traffic —
 * secrets are compiled into the Rust binary at build time and never reach
 * the frontend bundle.
 */
export const zohoOrderService: OrderService = {
  getOpenOrders() {
    return invoke<Order[]>('zoho_fetch_open_orders');
  },

  async getOrderById(id) {
    try {
      return await invoke<Order>('zoho_fetch_order', { id });
    } catch (err) {
      // Rust returns a NotFound error as a stringified error via IPC.
      if (typeof err === 'string' && err.toLowerCase().includes('niet gevonden')) {
        return null;
      }
      throw err;
    }
  },

  updateOrderUnits(id: string, units: Unit[]) {
    return invoke<Order>('zoho_update_units', { id, units });
  },

  markAsShipped(id: string) {
    return invoke<Order>('zoho_ship_order', { id });
  },

  // TODO: decide with sales whether logistics-created orders should be
  // pushed into Zoho (visible in CRM, full audit) or stay local-only. Until
  // that decision is made, fail fast in live mode so we don't silently lose
  // data — logistics will see the error and know not to use the feature
  // until it's wired.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createOrder(_draft: OrderDraft): Promise<Order> {
    return Promise.reject(
      new Error(
        'Logistiek-orders maken is nog niet beschikbaar in Zoho-modus — schakel eerst de mock back-end in of vraag de Zoho-push-flow aan.',
      ),
    );
  },
};

/**
 * Runtime probe — did the Rust binary get built with Zoho secrets baked in?
 * `false` during dev (`npm run dev`) and during Tauri builds without the
 * CI secrets, `true` otherwise. Used by `services/index.ts` to pick between
 * mock and live.
 */
export async function zohoIsConfigured(): Promise<boolean> {
  const inTauri =
    typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (!inTauri) return false;
  try {
    return await invoke<boolean>('zoho_is_configured');
  } catch {
    return false;
  }
}
