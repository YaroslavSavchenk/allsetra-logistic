import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryService, orderService, type OrderDraft } from '@/services';
import type { Order, Unit } from '@/types/order';
import type { InventoryItem } from '@/types/inventory';
import { INVENTORY_KEY, MOVEMENTS_KEY } from './useInventory';

const OPEN_ORDERS_KEY = ['orders', 'open'] as const;
const orderKey = (id: string) => ['orders', 'byId', id] as const;

export function useOpenOrders() {
  return useQuery({
    queryKey: OPEN_ORDERS_KEY,
    queryFn: () => orderService.getOpenOrders(),
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

export interface ShipOrderInput {
  id: string;
  /** All orderpick items, IMEI and non-IMEI alike. The inventory service
   *  decrements `opVoorraad` per pick. */
  picks: { productId: string; qty: number }[];
}

export interface ShipOrderResult {
  order: Order;
  /** Inventory rows that ended up below zero after deduction. The caller
   *  surfaces a non-blocking warning toast for these — logistics is allowed
   *  to ship short. */
  negatives: InventoryItem[];
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
      const order = await orderService.markAsShipped(id);
      // Always run the deduction; an empty picks array is a no-op service-side.
      await inventoryService.deductForShipment(order.id, picks);
      // Pull fresh inventory so the Voorraad tab is in sync without a
      // manual refresh, and so we can warn on any negative stock.
      const inventory = await inventoryService.listInventory();
      qc.setQueryData(INVENTORY_KEY, inventory);
      const pickedIds = new Set(picks.map((p) => p.productId));
      const negatives = inventory.filter(
        (i) => pickedIds.has(i.productId) && i.opVoorraad < 0,
      );
      return { order, negatives };
    },
    onSuccess: ({ order }) => {
      qc.setQueryData(orderKey(order.id), order);
      qc.invalidateQueries({ queryKey: OPEN_ORDERS_KEY });
      qc.invalidateQueries({ queryKey: MOVEMENTS_KEY });
    },
  });
}
