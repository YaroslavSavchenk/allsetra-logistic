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
 */
export function PurchaseOrderForm({ productId, productName }: Props) {
  const register = useRegisterPurchaseOrder();
  const [qty, setQty] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const reset = () => {
    setQty('');
    setNote('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(qty);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      toast.error('Aantal ongeldig', {
        description: 'Vul een geheel aantal groter dan 0 in.',
      });
      return;
    }
    try {
      await register.mutateAsync({
        items: [{ productId, qty: parsed }],
        note: note.trim() || undefined,
      });
      toast.success('Inkooporder geregistreerd', {
        description: `${parsed} × ${productName}`,
      });
      reset();
    } catch (err) {
      toast.error('Registreren mislukt', {
        description: err instanceof Error ? err.message : 'Onbekende fout',
      });
    }
  };

  const busy = register.isPending;

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
            onChange={(e) => setQty(e.target.value)}
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
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
            className="rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 disabled:opacity-50"
          />
        </label>
      </div>
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
    </form>
  );
}
