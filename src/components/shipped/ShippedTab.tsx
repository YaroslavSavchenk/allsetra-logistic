import { useEffect, useState } from 'react';
import { PackageCheck } from 'lucide-react';
import { useShippedOrders } from '@/hooks/useOrders';
import { ShippedSidebar } from './ShippedSidebar';
import { ShippedWorkspace } from './ShippedWorkspace';

export function ShippedTab() {
  // Same fetch as the sidebar, no-search variant — used purely so we can
  // auto-select the first shipped order when the tab loads. React Query
  // dedupes the request because the sidebar uses the same key for an empty
  // search.
  const { data: orders } = useShippedOrders();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId !== null) return;
    if (!orders || orders.length === 0) return;
    setSelectedId(orders[0]!.id);
  }, [orders, selectedId]);

  return (
    <div className="flex h-full w-full">
      <ShippedSidebar selectedId={selectedId} onSelect={setSelectedId} />
      <main className="flex-1 overflow-hidden">
        {selectedId ? (
          <ShippedWorkspace orderId={selectedId} />
        ) : (
          <ShippedEmptyState />
        )}
      </main>
    </div>
  );
}

function ShippedEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-surface-900 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-800 text-slate-500">
        <PackageCheck className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-200">
          Geen verzonden order geselecteerd
        </h2>
        <p className="max-w-sm text-sm text-slate-400">
          Selecteer een order om de pakbon te bekijken.
        </p>
      </div>
    </div>
  );
}
