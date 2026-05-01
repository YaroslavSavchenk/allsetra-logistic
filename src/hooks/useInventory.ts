import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services';
import { getProduct } from '@/lib/productStrategy';
import type {
  InventoryItem,
  InventoryMovement,
  PurchaseOrder,
} from '@/types/inventory';
import type { Product } from '@/types/product';

export const INVENTORY_KEY = ['inventory'] as const;
export const PURCHASE_ORDERS_KEY = ['purchase-orders'] as const;
export const MOVEMENTS_KEY = ['movements'] as const;
export const CATALOG_KEY = ['catalog'] as const;
const movementsKey = (productId?: string) =>
  productId ? (['movements', productId] as const) : MOVEMENTS_KEY;
const productKey = (productId: string) => ['product', productId] as const;

export function useInventory() {
  return useQuery<InventoryItem[]>({
    queryKey: INVENTORY_KEY,
    queryFn: () => inventoryService.listInventory(),
  });
}

/**
 * Full product catalogue, sourced from Zoho when configured and from the
 * local registry otherwise. Cached aggressively — products don't change
 * often, so we don't refetch on focus and keep stale data fresh for an hour.
 */
export function useCatalog() {
  return useQuery<Product[]>({
    queryKey: CATALOG_KEY,
    queryFn: () => inventoryService.listProducts(),
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useProduct(productId: string | null) {
  return useQuery<Product | null>({
    queryKey: productId ? productKey(productId) : ['product', 'none'],
    // The product registry is local + synchronous, but we expose it via the
    // service interface so callers stay uniform with the future Zoho-backed
    // version. Resolves immediately.
    queryFn: () => Promise.resolve(productId ? getProduct(productId) : null),
    enabled: productId !== null,
  });
}

export function useMovements(productId?: string) {
  return useQuery<InventoryMovement[]>({
    queryKey: movementsKey(productId),
    queryFn: () => inventoryService.listMovements(productId),
  });
}

export function usePurchaseOrders() {
  return useQuery<PurchaseOrder[]>({
    queryKey: PURCHASE_ORDERS_KEY,
    queryFn: () => inventoryService.listPurchaseOrders(),
  });
}

export function useRegisterPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      items,
      note,
    }: {
      items: { productId: string; qty: number }[];
      note?: string;
    }) => inventoryService.registerPurchaseOrder(items, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEY });
      qc.invalidateQueries({ queryKey: PURCHASE_ORDERS_KEY });
    },
  });
}

export function useReceivePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      poId,
      productId,
    }: {
      poId: string;
      productId: string;
    }) => inventoryService.receivePurchaseOrder(poId, productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEY });
      qc.invalidateQueries({ queryKey: PURCHASE_ORDERS_KEY });
      qc.invalidateQueries({ queryKey: MOVEMENTS_KEY });
    },
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (poId) => inventoryService.deletePurchaseOrder(poId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PURCHASE_ORDERS_KEY });
      qc.invalidateQueries({ queryKey: INVENTORY_KEY }); // opBestelling totals on the inventory rows
    },
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      delta,
      reason,
    }: {
      productId: string;
      delta: number;
      reason: string;
    }) => inventoryService.adjustStock(productId, delta, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEY });
      qc.invalidateQueries({ queryKey: MOVEMENTS_KEY });
    },
  });
}

/**
 * Mutation hook for shipment-driven stock deductions. Exported here so the
 * order-shipping flow can compose it later — not yet wired in by this step.
 */
export function useDeductForShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      picks,
    }: {
      orderId: string;
      picks: { productId: string; qty: number }[];
    }) => inventoryService.deductForShipment(orderId, picks),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEY });
      qc.invalidateQueries({ queryKey: MOVEMENTS_KEY });
    },
  });
}
