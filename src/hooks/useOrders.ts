import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services';
import type { Order, Unit } from '@/types/order';

const OPEN_ORDERS_KEY = ['orders', 'open'] as const;
const orderKey = (id: string) => ['orders', 'byId', id] as const;

export function useOpenOrders() {
  return useQuery({
    queryKey: OPEN_ORDERS_KEY,
    queryFn: () => orderService.getOpenOrders(),
  });
}

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: id ? orderKey(id) : ['orders', 'byId', 'none'],
    queryFn: () => (id ? orderService.getOrderById(id) : null),
    enabled: id !== null,
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

export function useShipOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderService.markAsShipped(id),
    onSuccess: (order: Order) => {
      qc.setQueryData(orderKey(order.id), order);
      qc.invalidateQueries({ queryKey: OPEN_ORDERS_KEY });
    },
  });
}
