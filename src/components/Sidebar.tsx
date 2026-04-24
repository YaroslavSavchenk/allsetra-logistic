import { useMemo, useState } from 'react';
import { Search, Truck, Loader2 } from 'lucide-react';
import type { Order } from '@/types/order';
import { StatusBadge } from './StatusBadge';

interface Props {
  orders: Order[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

function filledCount(order: Order): number {
  return order.units.filter((u) => u.imei.trim().length > 0).length;
}

export function Sidebar({ orders, selectedId, onSelect, isLoading }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return orders;
    const q = query.trim().toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.account.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q),
    );
  }, [orders, query]);

  return (
    <aside className="flex w-80 flex-shrink-0 flex-col border-r border-surface-700 bg-surface-900">
      <div className="flex items-center gap-2 border-b border-surface-700 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Truck className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            RouteConnect
          </div>
          <div className="text-sm font-semibold text-slate-100">Logistiek</div>
        </div>
      </div>

      <div className="border-b border-surface-700 px-4 py-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Openstaande orders
          </span>
          <span className="font-mono text-sm font-semibold text-accent">
            {orders.length}
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Zoek ordernr, klant, stad…"
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
        {!isLoading && filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            {query ? 'Geen orders gevonden' : 'Geen openstaande orders'}
          </div>
        )}
        <ul className="divide-y divide-surface-800">
          {filtered.map((order) => (
            <OrderRow
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

function OrderRow({ order, isSelected, onClick }: RowProps) {
  const filled = filledCount(order);
  const total = order.units.length;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors ${
          isSelected
            ? 'bg-surface-800'
            : 'hover:bg-surface-850'
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
          <span>{order.city}</span>
          <span className="font-mono">
            {filled}/{total} units
          </span>
        </div>
      </button>
    </li>
  );
}
