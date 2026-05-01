import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Loader2, ShoppingCart } from 'lucide-react';
import { useRegisterPurchaseOrder } from '@/hooks/useInventory';

interface Props {
  productId: string;
  productName: string;
}

/**
 * Single-product purchase-order form scoped to one product. Lives inside the
 * inventory detail panel; logistics fills in qty + an optional note and the
 * `opBestelling` counter goes up immediately on success.
 *
 * Submitting is a two-stage flow: the first click validates the input and
 * flips the form into a confirm state; the second click on "Bevestigen"
 * actually registers the PO. Editing any field while confirming drops back
 * to the default state - we don't want users tweaking values while staring
 * at a "Weet je zeker?" prompt.
 */
export function PurchaseOrderForm({ productId, productName }: Props) {
  const register = useRegisterPurchaseOrder();
  const [qty, setQty] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [confirming, setConfirming] = useState<boolean>(false);

  const reset = () => {
    setQty('');
    setNote('');
    setConfirming(false);
  };

  const parsedQty = Number(qty);
  const qtyValid = Number.isInteger(parsedQty) && parsedQty > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!qtyValid) {
      toast.error('Aantal ongeldig', {
        description: 'Vul een geheel aantal groter dan 0 in.',
      });
      return;
    }
    if (!confirming) {
      setConfirming(true);
      return;
    }
    try {
      await register.mutateAsync({
        items: [{ productId, qty: parsedQty }],
        note: note.trim() || undefined,
      });
      toast.success('Inkooporder geregistreerd', {
        description: `${parsedQty} × ${productName}`,
      });
      reset();
    } catch (err) {
      toast.error('Registreren mislukt', {
        description: err instanceof Error ? err.message : 'Onbekende fout',
      });
      setConfirming(false);
    }
  };

  const busy = register.isPending;

  // Editing a field while confirming is confusing - drop back to default
  // state so the confirm prompt always reflects the current input.
  const handleQtyChange = (value: string) => {
    setQty(value);
    if (confirming) setConfirming(false);
  };

  const handleNoteChange = (value: string) => {
    setNote(value);
    if (confirming) setConfirming(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-surface-700 bg-surface-850 p-4"
    >
      <div className="mb-3 grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Aantal
          </span>
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="bijv. 25"
            value={qty}
            onChange={(e) => handleQtyChange(e.target.value)}
            disabled={busy}
            className="rounded-md border border-surface-700 bg-surface-900 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Notitie
          </span>
          <input
            type="text"
            placeholder="bijv. spoedbestelling Q2"
            value={note}
            onChange={(e) => handleNoteChange(e.target.value)}
            disabled={busy}
            className="rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 disabled:opacity-50"
          />
        </label>
      </div>
      {confirming ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-slate-100">
          <span>
            Weet je zeker? Je voegt{' '}
            <span className="font-mono font-semibold">{parsedQty}×</span>{' '}
            <span className="font-semibold">{productName}</span> toe als open
            inkooporder.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="rounded-md border border-surface-700 bg-surface-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-surface-950 transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-slate-500"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShoppingCart className="h-3.5 w-3.5" />
              )}
              Bevestigen
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={busy || !qty}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-surface-950 transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-slate-500"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            Inkooporder registreren
          </button>
        </div>
      )}
    </form>
  );
}
