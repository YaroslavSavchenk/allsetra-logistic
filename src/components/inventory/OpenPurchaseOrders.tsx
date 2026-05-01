import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCheck, Loader2, PackageCheck, Trash2 } from 'lucide-react';
import {
  useDeletePurchaseOrder,
  usePurchaseOrders,
  useReceivePurchaseOrder,
} from '@/hooks/useInventory';
import { useHasRole } from '@/contexts/CurrentUserContext';
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
 *
 * The trash icon next to "Ontvangen" wipes the entire PO (all lines,
 * including any sister products on the same PO). Logistics gets an inline
 * confirm bar before the destructive call goes through — no modals, no
 * native dialogs.
 */
export function OpenPurchaseOrders({ productId }: Props) {
  const { data: purchaseOrders, isLoading } = usePurchaseOrders();
  const receive = useReceivePurchaseOrder();
  const remove = useDeletePurchaseOrder();
  const isBeheer = useHasRole('beheer');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

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

  const handleDelete = async (poId: string) => {
    try {
      await remove.mutateAsync(poId);
      setConfirmingId(null);
      toast.success('Inkooporder verwijderd');
    } catch (err) {
      toast.error('Verwijderen mislukt', {
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
        const receiveBusy = receive.isPending;
        const deleteBusy =
          remove.isPending && remove.variables === po.id;
        const isConfirming = confirmingId === po.id;
        return (
          <li
            key={`${po.id}-${line.productId}`}
            className="flex flex-col gap-2 px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-3">
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
                  <div className="truncate text-xs text-slate-400">
                    {po.note}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleReceive(po.id, line.qty)}
                disabled={receiveBusy || deleteBusy || isConfirming}
                className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {receiveBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                Ontvangen
              </button>
              {/* Trash is beheer-only — wiping a PO is destructive and there
                  is no undo, so logistiek can receive but not delete. */}
              {isBeheer && (
                <button
                  type="button"
                  onClick={() => setConfirmingId(po.id)}
                  disabled={receiveBusy || deleteBusy || isConfirming}
                  aria-label="Inkooporder verwijderen"
                  className="inline-flex items-center justify-center rounded-md p-1.5 text-rose-300 transition-colors hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {isConfirming && isBeheer && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
                <span>
                  Weet je zeker dat je deze inkooporder wilt verwijderen?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    disabled={deleteBusy}
                    className="rounded-md border border-surface-700 bg-surface-900 px-3 py-1 font-semibold text-slate-200 transition-colors hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Annuleren
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(po.id)}
                    disabled={deleteBusy}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-400/40 bg-rose-400/20 px-3 py-1 font-semibold text-rose-200 transition-colors hover:bg-rose-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleteBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Verwijderen
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
