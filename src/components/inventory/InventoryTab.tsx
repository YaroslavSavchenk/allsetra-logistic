import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { InventoryTable } from './InventoryTable';
import { InventoryDetail } from './InventoryDetail';

/**
 * Top-level shell for the Voorraad (inventory) module. Holds the selected
 * product id in local state and renders the product list on the left + the
 * detail workspace on the right.
 *
 * App.tsx mounts this as a single `<InventoryTab />` with no props.
 */
export function InventoryTab() {
  const { data: inventory, isLoading } = useInventory();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );

  // Auto-select the first product once data lands so the right pane has
  // something useful immediately. Re-selects if the current selection drops
  // out of the list.
  useEffect(() => {
    if (!inventory || inventory.length === 0) {
      if (selectedProductId !== null) setSelectedProductId(null);
      return;
    }
    const stillExists = inventory.some(
      (i) => i.productId === selectedProductId,
    );
    if (!stillExists) {
      setSelectedProductId(inventory[0]!.productId);
    }
  }, [inventory, selectedProductId]);

  return (
    <div className="flex h-full w-full bg-surface-950 text-slate-100">
      <InventoryTable
        inventory={inventory ?? []}
        selectedProductId={selectedProductId}
        onSelect={setSelectedProductId}
        isLoading={isLoading}
      />
      <main className="flex-1 overflow-hidden">
        {selectedProductId ? (
          <InventoryDetail productId={selectedProductId} />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center bg-surface-900">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-800 text-slate-500">
          <Package className="h-6 w-6" />
        </div>
        <div className="text-sm text-slate-400">
          Selecteer een product om voorraad te beheren.
        </div>
      </div>
    </div>
  );
}
