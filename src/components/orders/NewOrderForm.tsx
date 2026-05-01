import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  ListPlus,
  Loader2,
  MapPin,
  Plus,
  Send,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import type { Product } from '@/types/product';
import { useCatalog } from '@/hooks/useInventory';
import { useCreateOrder } from '@/hooks/useOrders';
import { ProductPicker } from '@/components/ProductPicker';

interface Props {
  onCreated: (orderId: string) => void;
  onCancel: () => void;
}

interface DraftLine {
  /** Local row id for stable React keys + remove handlers. */
  rowId: string;
  product: Product | null;
  quantity: string;
  note: string;
}

function newRow(): DraftLine {
  return {
    rowId: crypto.randomUUID().slice(0, 8),
    product: null,
    quantity: '1',
    note: '',
  };
}

export function NewOrderForm({ onCreated, onCancel }: Props) {
  const catalog = useCatalog();
  const createOrder = useCreateOrder();

  const [recipient, setRecipient] = useState('');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [city, setCity] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([newRow()]);

  const products = catalog.data ?? [];

  const totalItems = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const q = Number(l.quantity);
        return sum + (Number.isFinite(q) && q > 0 ? q : 0);
      }, 0),
    [lines],
  );

  const addLine = () => setLines((curr) => [...curr, newRow()]);

  const removeLine = (rowId: string) =>
    setLines((curr) =>
      curr.length === 1 ? curr : curr.filter((l) => l.rowId !== rowId),
    );

  const updateLine = (rowId: string, patch: Partial<DraftLine>) =>
    setLines((curr) =>
      curr.map((l) => (l.rowId === rowId ? { ...l, ...patch } : l)),
    );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!recipient.trim()) {
      toast.error('Ontvanger is verplicht');
      return;
    }
    if (!address.trim() || !postcode.trim() || !city.trim()) {
      toast.error('Verzendadres is verplicht', {
        description: 'Vul straat, postcode en stad in.',
      });
      return;
    }

    const validLines = lines.filter((l) => l.product !== null);
    if (validLines.length === 0) {
      toast.error('Voeg ten minste één product toe');
      return;
    }
    for (const line of validLines) {
      const q = Number(line.quantity);
      if (!Number.isFinite(q) || q <= 0) {
        toast.error('Aantal ongeldig', {
          description: `Vul een aantal > 0 in bij ${line.product!.name}.`,
        });
        return;
      }
    }

    try {
      const order = await createOrder.mutateAsync({
        recipient: recipient.trim(),
        address: address.trim(),
        postcode: postcode.trim(),
        city: city.trim(),
        note: note.trim() || undefined,
        orderpick: validLines.map((l) => ({
          productId: l.product!.id,
          quantity: Number(l.quantity),
          note: l.note.trim(),
        })),
      });
      toast.success(`${order.orderNumber} aangemaakt`, {
        description: order.units.length
          ? `${order.units.length} units om IMEI's te scannen`
          : 'Klaar om te versturen',
      });
      onCreated(order.id);
    } catch (err) {
      toast.error('Aanmaken mislukt', {
        description: err instanceof Error ? err.message : 'Onbekende fout',
      });
    }
  };

  const busy = createOrder.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="scroll-thin flex h-full flex-col overflow-y-auto bg-surface-900"
    >
      <header className="flex items-start justify-between gap-4 border-b border-surface-700 bg-surface-850/60 px-8 py-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Logistiek-order aanmaken
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-50">
            Nieuwe order
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Voor verzendingen zonder sales-order. Krijgt een{' '}
            <span className="font-mono">LCO-…</span> nummer en doorloopt
            dezelfde IMEI- en voorraadflow als gewone orders.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md border border-surface-700 bg-surface-850 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-surface-800 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          Annuleren
        </button>
      </header>

      <div className="flex-1 space-y-6 px-8 py-6">
        <section>
          <SectionHeader icon={Building2} title="Ontvanger" />
          <input
            type="text"
            placeholder="Naam, bedrijf of team waar het naartoe gaat"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={busy}
            autoFocus
            className="w-full rounded-md border border-surface-700 bg-surface-850 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 disabled:opacity-50"
          />
        </section>

        <section>
          <SectionHeader icon={MapPin} title="Verzendadres" />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)]">
            <input
              type="text"
              placeholder="Straat + huisnummer"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={busy}
              className="rounded-md border border-surface-700 bg-surface-850 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 disabled:opacity-50"
            />
            <input
              type="text"
              placeholder="Postcode"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              disabled={busy}
              className="rounded-md border border-surface-700 bg-surface-850 px-3 py-2 font-mono text-sm uppercase text-slate-100 placeholder:text-slate-500 focus:border-accent/60 disabled:opacity-50"
            />
            <input
              type="text"
              placeholder="Stad"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={busy}
              className="rounded-md border border-surface-700 bg-surface-850 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 disabled:opacity-50"
            />
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <SectionHeader icon={ListPlus} title="Producten" />
            <span className="font-mono text-xs text-slate-400">
              {lines.filter((l) => l.product).length} regel
              {lines.filter((l) => l.product).length === 1 ? '' : 's'} ·{' '}
              {totalItems} items
            </span>
          </div>

          <ul className="space-y-2">
            {lines.map((line) => (
              <li
                key={line.rowId}
                className="rounded-lg border border-surface-700 bg-surface-850 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_100px_auto]">
                  <ProductPicker
                    value={line.product}
                    onChange={(p) => updateLine(line.rowId, { product: p })}
                    products={products}
                    isLoading={catalog.isLoading}
                    disabled={busy}
                    ariaLabel="Product kiezen"
                  />
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    aria-label="Aantal"
                    placeholder="Aantal"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.rowId, { quantity: e.target.value })
                    }
                    disabled={busy}
                    className="rounded-md border border-surface-700 bg-surface-900 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(line.rowId)}
                    disabled={busy || lines.length === 1}
                    aria-label="Regel verwijderen"
                    className="self-center rounded-md border border-surface-700 bg-surface-900 p-2 text-slate-400 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Optionele regel-notitie (bijv. luide variant)"
                  value={line.note}
                  onChange={(e) =>
                    updateLine(line.rowId, { note: e.target.value })
                  }
                  disabled={busy}
                  className="mt-2 w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-accent/60 disabled:opacity-50"
                />
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={addLine}
            disabled={busy}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-dashed border-surface-600 bg-surface-850/50 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-surface-850 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Regel toevoegen
          </button>
        </section>

        <section>
          <SectionHeader icon={StickyNote} title="Interne notitie (optioneel)" />
          <textarea
            rows={2}
            placeholder="Voor logistiek zelf — verschijnt op de order als notitie."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
            className="w-full resize-y rounded-md border border-surface-700 bg-surface-850 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 disabled:opacity-50"
          />
        </section>
      </div>

      <footer className="sticky bottom-0 border-t border-surface-700 bg-surface-900/95 px-8 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-slate-400">
            Order krijgt status{' '}
            <span className="font-mono text-slate-200">Nieuw</span> en wordt
            direct geopend om te prepen.
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-surface-950 shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-slate-500"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Order aanmaken
          </button>
        </div>
      </footer>
    </form>
  );
}

interface SectionHeaderProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
}

function SectionHeader({ title, icon: Icon }: SectionHeaderProps) {
  return (
    <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {title}
    </h2>
  );
}
