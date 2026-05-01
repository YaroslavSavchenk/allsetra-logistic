import { useEffect } from 'react';
import { Package } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { InventoryTable } from './InventoryTable';
import { InventoryDetail } from './InventoryDetail';

interface Props {
  /**
   * Currently selected product id, or `null` when nothing is picked yet.
   * Owned by App.tsx so external surfaces (LowStockReminder) can deep-link
   * into a specific product.
   */
  selectedProductId: string | null;
  /**
   * Setter the parent passes for both internal selection (clicking a row in
   * the table) and external navigation. Receives `null` when the current
   * product disappears from the inventory list.
   */
  onSelectedProductChange: (id: string | null) => void;
}

/**
 * Top-level shell for the Voorraad (inventory) module. Selection state lives
 * in App.tsx; this component is fully controlled. Renders the product list
 * on the left + the detail workspace on the right.
 */
export function InventoryTab({
  selectedProductId,
  onSelectedProductChange,
}: Props) {
  const { data: inventory, isLoading } = useInventory();

  // Auto-select the first product once data lands so the right pane has
  // something useful immediately. Also re-selects (or clears) if the current
  // selection drops out of the list - e.g. after a refresh that removed
  // the product. Critically, this effect must NOT clobber an externally
  // set selection: when App calls onSelectedProductChange('rc-eco5') from
  // the LowStockReminder, that id is in `inventory`, so `stillExists` is
  // true and we leave it alone.
  useEffect(() => {
    if (!inventory || inventory.length === 0) {
      if (selectedProductId !== null) onSelectedProductChange(null);
      return;
    }
    if (selectedProductId === null) {
      onSelectedProductChange(inventory[0]!.productId);
      return;
    }
    const stillExists = inventory.some(
      (i) => i.productId === selectedProductId,
    );
    if (!stillExists) {
      onSelectedProductChange(inventory[0]!.productId);
    }
  }, [inventory, selectedProductId, onSelectedProductChange]);

  return (
    <div className="flex h-full w-full bg-surface-950 text-slate-100">
      <InventoryTable
        inventory={inventory ?? []}
        selectedProductId={selectedProductId}
        onSelect={onSelectedProductChange}
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
