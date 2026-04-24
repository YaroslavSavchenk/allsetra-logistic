import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { OrderWorkspace } from '@/components/OrderWorkspace';
import { EmptyState } from '@/components/EmptyState';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { useOpenOrders } from '@/hooks/useOrders';

export default function App() {
  const { data: orders, isLoading } = useOpenOrders();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!orders || orders.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    const stillExists = orders.some((o) => o.id === selectedId);
    if (!stillExists) {
      setSelectedId(orders[0]!.id);
    }
  }, [orders, selectedId]);

  const handleShipped = () => {
    if (!orders) return;
    const remaining = orders.filter((o) => o.id !== selectedId);
    setSelectedId(remaining[0]?.id ?? null);
  };

  return (
    <div className="flex h-full w-full bg-surface-950 text-slate-100">
      <Sidebar
        orders={orders ?? []}
        selectedId={selectedId}
        onSelect={setSelectedId}
        isLoading={isLoading}
      />
      <main className="flex-1 overflow-hidden">
        {selectedId ? (
          <OrderWorkspace orderId={selectedId} onShipped={handleShipped} />
        ) : (
          <EmptyState />
        )}
      </main>
      <UpdatePrompt />
    </div>
  );
}
