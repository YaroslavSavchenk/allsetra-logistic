import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { useAdjustStock } from '@/hooks/useInventory';

interface Props {
  productId: string;
  productName: string;
}

/**
 * Manual stock correction form. Reason is mandatory. Submits a signed delta
 * via the `adjustStock` service call.
 */
export function StockAdjustForm({ productId, productName }: Props) {
  const adjust = useAdjustStock();
  const [delta, setDelta] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const reset = () => {
    setDelta('');
    setReason('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(delta);
    if (!Number.isFinite(parsed) || parsed === 0) {
      toast.error('Aanpassing ongeldig', {
        description: 'Vul een aantal anders dan 0 in.',
      });
      return;
    }
    if (!reason.trim()) {
      toast.error('Reden is verplicht');
      return;
    }
    try {
      await adjust.mutateAsync({ productId, delta: parsed, reason });
      toast.success(`${productName} aangepast`, {
        description: `${parsed > 0 ? '+' : ''}${parsed} • ${reason.trim()}`,
      });
      reset();
    } catch (err) {
      toast.error('Aanpassen mislukt', {
        description: err instanceof Error ? err.message : 'Onbekende fout',
      });
    }
  };

  const busy = adjust.isPending;

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
            step={1}
            inputMode="numeric"
            placeholder="bijv. -2"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            disabled={busy}
            className="rounded-md border border-surface-700 bg-surface-900 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Reden
          </span>
          <textarea
            rows={2}
            placeholder="bijv. telling, schade, gevonden bij retour…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy}
            className="resize-y rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 disabled:opacity-50"
          />
        </label>
      </div>
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={busy || !delta || !reason.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-surface-950 transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-slate-500"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Aanpassen
        </button>
      </div>
    </form>
  );
}
