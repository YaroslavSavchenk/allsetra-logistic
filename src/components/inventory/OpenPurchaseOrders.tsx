import { toast } from 'sonner';
import { CheckCheck, Loader2, PackageCheck } from 'lucide-react';
import {
  usePurchaseOrders,
  useReceivePurchaseOrder,
} from '@/hooks/useInventory';
import { formatDateTime } from '@/lib/format';

interface Props {
  productId: string;
}

/**
 * Lists open purchase-order *lines* for the given product. A multi-product
 * PO surfaces here as one row per product line, and "Ontvangen" only
 * receives that line — sister products on the same PO stay open until
 * separately ticked off, so the user no longer accidentally receives
 * unrelated stock.
 */
export function OpenPurchaseOrders({ productId }: Props) {
  const { data: purchaseOrders, isLoading } = usePurchaseOrders();
  const receive = useReceivePurchaseOrder();

  const openLines = (purchaseOrders ?? [])
    .filter((po) => po.status === 'open')
    .flatMap((po) =>
      po.items
        .filter((line) => line.productId === productId && !line.receivedAt)
        .map((line) => ({ po, line })),
    );

  const handleReceive = async (poId: string, qty: number) => {
    try {
      await receive.mutateAsync({ poId, productId });
      toast.success('Inkooporder regel ontvangen', {
        description: `+${qty} toegevoegd aan voorraad`,
      });
    } catch (err) {
      toast.error('Ontvangen mislukt', {
        description: err instanceof Error ? err.message : 'Onbekende fout',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-850 px-4 py-3 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Laden…
      </div>
    );
  }

  if (openLines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-700 bg-surface-850/50 px-4 py-3 text-sm text-slate-500">
        Geen openstaande inkooporders voor dit product.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-surface-800 overflow-hidden rounded-lg border border-surface-700 bg-surface-850">
      {openLines.map(({ po, line }) => {
        const busy = receive.isPending;
        return (
          <li
            key={`${po.id}-${line.productId}`}
            className="flex flex-wrap items-center gap-3 px-4 py-3"
          >
            <PackageCheck className="h-4 w-4 flex-shrink-0 text-accent" />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2 text-sm text-slate-100">
                <span className="font-mono font-semibold">{line.qty}×</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-400">
                  {formatDateTime(po.createdAt)}
                </span>
              </div>
              {po.note && (
                <div className="truncate text-xs text-slate-400">{po.note}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleReceive(po.id, line.qty)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Ontvangen
            </button>
          </li>
        );
      })}
    </ul>
  );
}
