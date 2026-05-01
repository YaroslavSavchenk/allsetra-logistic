import { Loader2, ArrowDown, ArrowUp, PencilLine } from 'lucide-react';
import { useMovements } from '@/hooks/useInventory';
import { formatDateTime } from '@/lib/format';
import type { InventoryMovementKind } from '@/types/inventory';

interface Props {
  productId: string;
}

const KIND_LABEL: Record<InventoryMovementKind, string> = {
  'purchase-received': 'Inkoop ontvangen',
  'shipment-deducted': 'Verzonden',
  'manual-adjust': 'Handmatige aanpassing',
};

function KindIcon({ kind }: { kind: InventoryMovementKind }) {
  const cls = 'h-3.5 w-3.5';
  if (kind === 'purchase-received') return <ArrowUp className={cls} />;
  if (kind === 'shipment-deducted') return <ArrowDown className={cls} />;
  return <PencilLine className={cls} />;
}

/**
 * Audit trail for a single product. Newest first. Always displays signed
 * delta with colour cue, the human-friendly kind label, the reason, and any
 * linked customer order id.
 */
export function MovementsList({ productId }: Props) {
  const { data: movements, isLoading } = useMovements(productId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-850 px-4 py-3 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Laden…
      </div>
    );
  }

  if (!movements || movements.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-700 bg-surface-850/50 px-4 py-3 text-sm text-slate-500">
        Nog geen mutaties voor dit product.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-surface-800 overflow-hidden rounded-lg border border-surface-700 bg-surface-850">
      {movements.map((m) => {
        const positive = m.delta > 0;
        return (
          <li key={m.id} className="flex items-start gap-3 px-4 py-3">
            <div
              className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                positive
                  ? 'bg-emerald-400/15 text-emerald-300'
                  : 'bg-rose-400/15 text-rose-300'
              }`}
            >
              <KindIcon kind={m.kind} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className={`font-mono text-sm font-semibold ${
                    positive ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {positive ? '+' : ''}
                  {m.delta}
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {KIND_LABEL[m.kind]}
                </span>
                <span className="ml-auto text-xs text-slate-500">
                  {formatDateTime(m.createdAt)}
                </span>
              </div>
              {m.reason && (
                <div className="text-sm text-slate-300">{m.reason}</div>
              )}
              {m.linkedOrderId && (
                <div className="font-mono text-xs text-slate-500">
                  Order: {m.linkedOrderId}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
