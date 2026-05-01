import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { Order } from '@/types/order';
import { useShippedOrders } from '@/hooks/useOrders';
import { relativeDateShort } from '@/lib/relativeDate';
import { StatusBadge } from '@/components/orders/StatusBadge';

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function pickQuantity(order: Order): number {
  return order.orderpick.reduce((sum, item) => sum + item.quantity, 0);
}

export function ShippedSidebar({ selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');
  // Server-side filter — the mock and Zoho impls both honour `search`. We
  // pass the trimmed query through; no client-side pre-filter needed.
  const trimmed = query.trim();
  const { data: orders, isLoading } = useShippedOrders(trimmed || undefined);

  const list = orders ?? [];

  return (
    <aside className="flex w-80 flex-shrink-0 flex-col border-r border-surface-700 bg-surface-900">
      <div className="border-b border-surface-700 px-4 py-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Verzonden orders
          </span>
          <span className="font-mono text-sm font-semibold text-accent">
            {list.length}
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Zoek ordernr of account…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-surface-700 bg-surface-850 py-2 pl-8 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60"
          />
        </div>
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Laden…
          </div>
        )}
        {!isLoading && list.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            {trimmed ? 'Geen orders gevonden' : 'Geen verzonden orders'}
          </div>
        )}
        <ul className="divide-y divide-surface-800">
          {list.map((order) => (
            <ShippedRow
              key={order.id}
              order={order}
              isSelected={order.id === selectedId}
              onClick={() => onSelect(order.id)}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}

interface RowProps {
  order: Order;
  isSelected: boolean;
  onClick: () => void;
}

function ShippedRow({ order, isSelected, onClick }: RowProps) {
  const total = order.units.length;
  const counter =
    total > 0 ? `${total} units` : `${pickQuantity(order)} items`;
  // shippedAt should always be set on a Verstuurd order, but fall back so a
  // misformed record can't crash the row.
  const when = order.shippedAt
    ? relativeDateShort(order.shippedAt)
    : relativeDateShort(order.createdAt);

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors ${
          isSelected ? 'bg-surface-800' : 'hover:bg-surface-850'
        }`}
      >
        {isSelected && (
          <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" aria-hidden />
        )}
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-semibold text-slate-100">
            {order.orderNumber}
          </span>
          <StatusBadge status={order.status} size="sm" />
        </div>
        <div className="truncate text-sm text-slate-300">{order.account}</div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="truncate">
            {order.city}
            <span className="mx-1.5 text-slate-700">·</span>
            <span>{when}</span>
          </span>
          <span className="font-mono">{counter}</span>
        </div>
      </button>
    </li>
  );
}
