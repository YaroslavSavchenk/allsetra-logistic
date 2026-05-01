import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryService, orderService, type OrderDraft } from '@/services';
import { getProductName } from '@/lib/productStrategy';
import type { Order, Unit } from '@/types/order';
import { INVENTORY_KEY, MOVEMENTS_KEY } from './useInventory';

export interface StockShortfall {
  productId: string;
  productName: string;
  requested: number;
  available: number;
}

/**
 * Thrown by `useShipOrder` when the pre-flight inventory check finds that
 * one or more picked products don't have enough `opVoorraad` to cover the
 * shipment. The mutation aborts before `markAsShipped` runs, so nothing is
 * mutated server-side. The UI catches this to show a Dutch-language toast
 * naming the specific products + their available/requested counts.
 */
export class InsufficientStockError extends Error {
  shortfalls: StockShortfall[];
  constructor(shortfalls: StockShortfall[]) {
    const names = shortfalls.map((s) => s.productName).join(', ');
    super(`Geen voorraad beschikbaar voor: ${names}`);
    this.name = 'InsufficientStockError';
    this.shortfalls = shortfalls;
  }
}

const OPEN_ORDERS_KEY = ['orders', 'open'] as const;
const SHIPPED_ORDERS_KEY = ['orders', 'shipped'] as const;
const orderKey = (id: string) => ['orders', 'byId', id] as const;
const shippedOrderKey = (id: string) =>
  ['orders', 'shipped', 'byId', id] as const;

export function useOpenOrders() {
  return useQuery({
    queryKey: OPEN_ORDERS_KEY,
    queryFn: () => orderService.getOpenOrders(),
  });
}

export function useShippedOrders(search?: string) {
  return useQuery({
    queryKey: [...SHIPPED_ORDERS_KEY, { search: search ?? '' }] as const,
    queryFn: () => orderService.listShippedOrders({ search }),
  });
}

export function useShippedOrder(id: string | null) {
  return useQuery({
    queryKey: id ? shippedOrderKey(id) : ['orders', 'shipped', 'byId', 'none'],
    queryFn: () => (id ? orderService.getShippedOrder(id) : null),
    enabled: id !== null,
  });
}

const DETAIL_REFETCH_INTERVAL_MS = 30_000;

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: id ? orderKey(id) : ['orders', 'byId', 'none'],
    queryFn: () => (id ? orderService.getOrderById(id) : null),
    enabled: id !== null,
    // Keep notes + other server-side edits live while an order is open.
    refetchInterval: DETAIL_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateOrderUnits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, units }: { id: string; units: Unit[] }) =>
      orderService.updateOrderUnits(id, units),
    onSuccess: (order: Order) => {
      qc.setQueryData(orderKey(order.id), order);
      qc.invalidateQueries({ queryKey: OPEN_ORDERS_KEY });
    },
  });
}

/**
 * Flips an order to status `Ingepakt`. Used by the inpakken-stap in the
 * Orders-tab; the status persists across navigation so the waybill stays
 * attached to the order instead of relying on local component state.
 */
export function useMarkAsPacked() {
  const qc = useQueryClient();
  return useMutation<Order, Error, string>({
    mutationFn: (id) => orderService.markAsPacked(id),
    onSuccess: (order) => {
      qc.setQueryData(orderKey(order.id), order);
      qc.invalidateQueries({ queryKey: OPEN_ORDERS_KEY });
    },
  });
}

export interface ShipOrderInput {
  id: string;
  /** All orderpick items, IMEI and non-IMEI alike. The inventory service
   *  decrements `opVoorraad` per pick. */
  picks: { productId: string; qty: number }[];
}

export interface ShipOrderResult {
  order: Order;
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation<Order, Error, OrderDraft>({
    mutationFn: (draft) => orderService.createOrder(draft),
    onSuccess: (order) => {
      qc.setQueryData(orderKey(order.id), order);
      qc.invalidateQueries({ queryKey: OPEN_ORDERS_KEY });
    },
  });
}

export function useShipOrder() {
  const qc = useQueryClient();
  return useMutation<ShipOrderResult, Error, ShipOrderInput>({
    mutationFn: async ({ id, picks }) => {
      // Pre-flight stock check: aggregate the picks per product (an order
      // could in theory carry the same productId on multiple orderpick rows)
      // and reject the entire ship if any product can't cover its total
      // demand. We do this BEFORE markAsShipped so a failed check leaves
      // the order untouched - no half-shipped state, no rollback needed.
      // Empty picks array short-circuits: nothing to check, fall through to
      // the existing service no-op.
      if (picks.length > 0) {
        const demandByProduct = new Map<string, number>();
        for (const p of picks) {
          demandByProduct.set(
            p.productId,
            (demandByProduct.get(p.productId) ?? 0) + p.qty,
          );
        }
        const inventory = await inventoryService.listInventory();
        const stockByProduct = new Map(
          inventory.map((i) => [i.productId, i.opVoorraad] as const),
        );
        const shortfalls: StockShortfall[] = [];
        for (const [productId, requested] of demandByProduct) {
          const available = stockByProduct.get(productId) ?? 0;
          if (available < requested) {
            shortfalls.push({
              productId,
              productName: getProductName(productId),
              requested,
              available,
            });
          }
        }
        if (shortfalls.length > 0) {
          throw new InsufficientStockError(shortfalls);
        }
      }

      const order = await orderService.markAsShipped(id);
      // Always run the deduction; an empty picks array is a no-op service-side.
      await inventoryService.deductForShipment(order.id, picks);
      // Pull fresh inventory so the Voorraad tab is in sync without a
      // manual refresh.
      const inventory = await inventoryService.listInventory();
      qc.setQueryData(INVENTORY_KEY, inventory);
      return { order };
    },
    onSuccess: ({ order }) => {
      qc.setQueryData(orderKey(order.id), order);
      qc.setQueryData(shippedOrderKey(order.id), order);
      qc.invalidateQueries({ queryKey: OPEN_ORDERS_KEY });
      qc.invalidateQueries({ queryKey: SHIPPED_ORDERS_KEY });
      qc.invalidateQueries({ queryKey: MOVEMENTS_KEY });
    },
  });
}
