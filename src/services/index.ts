import { mockOrderService } from './mockOrderService';
import type { OrderService } from './orderService';

/**
 * Single injection point. Swap this for a `ZohoOrderService` instance when the
 * backend integration lands — no component needs to change.
 */
export const orderService: OrderService = mockOrderService;

export type { OrderService } from './orderService';
