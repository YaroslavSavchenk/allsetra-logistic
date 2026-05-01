import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { OrderWorkspace } from './OrderWorkspace';
import { EmptyState } from './EmptyState';
import { NewOrderForm } from './NewOrderForm';
import { useOpenOrders } from '@/hooks/useOrders';

export function OrdersTab() {
  const { data: orders, isLoading } = useOpenOrders();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Auto-selection only kicks in when we're not in create mode — otherwise
    // it would steal the workspace from a logistics medewerker filling out
    // the form. Also only auto-select when nothing is selected: stomping an
    // existing `selectedId` is dangerous because right after `useCreateOrder`
    // succeeds the new order's id is set BEFORE the OPEN_ORDERS refetch
    // lands, so a "stillExists" check would briefly fail and bounce the
    // user back to the oldest open order. handleShipped is the explicit
    // handler that picks the next order after a ship.
    if (isCreating) return;
    if (selectedId !== null) return;
    if (!orders || orders.length === 0) return;
    setSelectedId(orders[0]!.id);
  }, [orders, selectedId, isCreating]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setIsCreating(false);
  };

  const handleCreateClick = () => {
    setIsCreating(true);
    setSelectedId(null);
  };

  const handleCreated = (orderId: string) => {
    setIsCreating(false);
    setSelectedId(orderId);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
  };

  const handleShipped = () => {
    if (!orders) return;
    const remaining = orders.filter((o) => o.id !== selectedId);
    setSelectedId(remaining[0]?.id ?? null);
  };

  return (
    <div className="flex h-full w-full">
      <Sidebar
        orders={orders ?? []}
        selectedId={selectedId}
        onSelect={handleSelect}
        isLoading={isLoading}
        isCreating={isCreating}
        onCreateClick={handleCreateClick}
      />
      <main className="flex-1 overflow-hidden">
        {isCreating ? (
          <NewOrderForm
            onCreated={handleCreated}
            onCancel={handleCancelCreate}
          />
        ) : selectedId ? (
          <OrderWorkspace orderId={selectedId} onShipped={handleShipped} />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
