import { useMemo, useState } from 'react';
import { Loader2, Package, Search } from 'lucide-react';
import type { InventoryItem } from '@/types/inventory';
import { getProduct } from '@/lib/productStrategy';
import { formatDateTime } from '@/lib/format';

interface Props {
  inventory: InventoryItem[];
  selectedProductId: string | null;
  onSelect: (productId: string) => void;
  isLoading: boolean;
}

/**
 * Sidebar-style product list with search + per-row stock summary. Mirrors
 * the visual cues from `Sidebar` (selection stripe on the left, dense rows,
 * monospace numbers).
 */
export function InventoryTable({
  inventory,
  selectedProductId,
  onSelect,
  isLoading,
}: Props) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    return inventory
      .map((item) => ({ item, product: getProduct(item.productId) }))
      .filter((row) => row.product !== null);
  }, [inventory]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter(
      (row) =>
        row.product!.name.toLowerCase().includes(q) ||
        row.product!.sku.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <aside className="flex w-96 flex-shrink-0 flex-col border-r border-surface-700 bg-surface-900">
      <div className="flex items-center gap-2 border-b border-surface-700 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Package className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Voorraad
          </div>
          <div className="text-sm font-semibold text-slate-100">Producten</div>
        </div>
      </div>

      <div className="border-b border-surface-700 px-4 py-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Producten
          </span>
          <span className="font-mono text-sm font-semibold text-accent">
            {rows.length}
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Zoek op naam of SKU…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-surface-700 bg-surface-850 py-2 pl-8 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60"
          />
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_70px_70px_70px] gap-2 border-b border-surface-700 bg-surface-900 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <span>Product</span>
        <span className="text-right">Voorraad</span>
        <span className="text-right">Best.</span>
        <span className="text-right">Totaal</span>
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Laden…
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            {query ? 'Geen producten gevonden' : 'Geen voorraad'}
          </div>
        )}
        <ul className="divide-y divide-surface-800">
          {filtered.map(({ item, product }) => (
            <ProductRow
              key={item.productId}
              productId={item.productId}
              name={product!.name}
              sku={product!.sku}
              opVoorraad={item.opVoorraad}
              opBestelling={item.opBestelling}
              lastMovementAt={item.lastMovementAt}
              isSelected={item.productId === selectedProductId}
              onClick={() => onSelect(item.productId)}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}

interface RowProps {
  productId: string;
  name: string;
  sku: string;
  opVoorraad: number;
  opBestelling: number;
  lastMovementAt: string | null;
  isSelected: boolean;
  onClick: () => void;
}

function ProductRow({
  name,
  sku,
  opVoorraad,
  opBestelling,
  lastMovementAt,
  isSelected,
  onClick,
}: RowProps) {
  const totaal = opVoorraad + opBestelling;
  const lowStock = opVoorraad <= 5;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`group relative grid w-full grid-cols-[minmax(0,1fr)_70px_70px_70px] gap-2 px-4 py-3 text-left transition-colors ${
          isSelected ? 'bg-surface-800' : 'hover:bg-surface-850'
        }`}
      >
        {isSelected && (
          <span
            className="absolute inset-y-0 left-0 w-0.5 bg-accent"
            aria-hidden
          />
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-slate-100">
            {name}
          </span>
          <span className="truncate font-mono text-xs text-slate-500">
            {sku}
          </span>
          {lastMovementAt && (
            <span className="mt-0.5 truncate text-[10px] text-slate-500">
              {formatDateTime(lastMovementAt)}
            </span>
          )}
        </div>
        <span
          className={`self-center text-right font-mono text-sm ${
            lowStock ? 'text-rose-300' : 'text-slate-100'
          }`}
        >
          {opVoorraad}
        </span>
        <span className="self-center text-right font-mono text-sm text-slate-300">
          {opBestelling}
        </span>
        <span className="self-center text-right font-mono text-sm font-semibold text-accent">
          {totaal}
        </span>
      </button>
    </li>
  );
}
