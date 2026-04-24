import type { OrderStatus } from '@/types/order';

interface Props {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

const STYLES: Record<OrderStatus, string> = {
  'Ter goedkeuring': 'bg-slate-700/40 text-slate-300 border-slate-600/60',
  Nieuw: 'bg-sky-500/15 text-sky-300 border-sky-400/40',
  'In behandeling': 'bg-amber-500/15 text-amber-300 border-amber-400/40',
  Verstuurd: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
};

export function StatusBadge({ status, size = 'md' }: Props) {
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wider ${sizeClass} ${STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
