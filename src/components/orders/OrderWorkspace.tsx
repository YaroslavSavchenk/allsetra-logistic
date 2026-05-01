import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Calendar,
  FileText,
  Loader2,
  MapPin,
  Package,
  Printer,
  Send,
  User,
  Building2,
  AlertCircle,
} from 'lucide-react';
import type { Order, Unit } from '@/types/order';
import {
  InsufficientStockError,
  useMarkAsPacked,
  useOrder,
  useShipOrder,
  useUpdateOrderUnits,
} from '@/hooks/useOrders';
import { formatDateTime } from '@/lib/format';
import { StatusBadge } from './StatusBadge';
import { NotesPanel } from './NotesPanel';
import { OrderpickList } from './OrderpickList';
import { UnitsTable, computeRowValidations } from './UnitsTable';
import { WaybillViewer } from '@/components/waybill/WaybillViewer';
import { buildWaybillHtml } from '@/components/waybill/buildWaybillHtml';

interface Props {
  orderId: string;
  onShipped: () => void;
}

export function OrderWorkspace({ orderId, onShipped }: Props) {
  const { data: order, isLoading, error } = useOrder(orderId);
  const updateUnits = useUpdateOrderUnits();
  const markAsPacked = useMarkAsPacked();
  const shipOrder = useShipOrder();

  const [units, setUnits] = useState<Unit[]>([]);
  const [dirty, setDirty] = useState(false);
  // Modal viewer is only used by the post-ship toast. The in-workspace
  // pakbon is rendered inline below — it stays attached to an Ingepakt
  // order across navigation.
  const [waybillOrder, setWaybillOrder] = useState<Order | null>(null);
  const inlineWaybillRef = useRef<HTMLIFrameElement>(null);

  // `packed` is now derived from the order's status, which persists on the
  // server. This way, navigating away and back to an Ingepakt order keeps
  // the waybill visible and the Versturen button armed - no need to redo
  // the inpakken-stap.
  const packed = order?.status === 'Ingepakt';

  useEffect(() => {
    if (order) {
      setUnits(order.units);
      setDirty(false);
    }
    // Reset only when switching to a different order - not on refetch of the
    // same order, which would clobber in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  const validations = useMemo(() => computeRowValidations(units), [units]);
  const validCount = validations.filter((v) => v.validation.state === 'valid').length;
  // Orders without IMEI products (bike-security, sensors, accessoire-only)
  // have no Units - they're shippable as soon as the order is loaded.
  const allValid = units.length === 0 || validCount === units.length;

  // Pre-render the waybill HTML for the inline iframe. Recompute when the
  // order content changes; cached otherwise so the iframe srcDoc doesn't
  // re-mount on every render.
  const waybillHtml = useMemo(() => {
    if (!order || !packed) return '';
    return buildWaybillHtml(order);
  }, [order, packed]);

  const persistUnits = () => {
    if (!order || !dirty) return;
    updateUnits.mutate({ id: order.id, units });
    setDirty(false);
  };

  // Inpakken click: persist the units (defensive in case the user typed an
  // IMEI and never blurred), flip the order's status to Ingepakt, and let
  // the inline waybill render itself once the refetch lands.
  const handlePack = async () => {
    if (!order || !allValid) return;
    try {
      if (dirty) {
        await updateUnits.mutateAsync({ id: order.id, units });
      }
      if (order.status !== 'Ingepakt') {
        await markAsPacked.mutateAsync(order.id);
      }
    } catch (e) {
      toast.error('Inpakken mislukt', {
        description: e instanceof Error ? e.message : 'Onbekende fout',
      });
    }
  };

  // Print the inline waybill via the iframe's own contentWindow. Same
  // mechanism as the modal viewer.
  const handlePrintWaybill = () => {
    const iframe = inlineWaybillRef.current;
    if (!iframe) return;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Pakbon: print mislukt', err);
    }
  };

  const handleShip = async () => {
    if (!order || !allValid) return;
    try {
      await updateUnits.mutateAsync({ id: order.id, units });
      const picks = order.orderpick.map((p) => ({
        productId: p.productId,
        qty: p.quantity,
      }));
      const { order: shipped } = await shipOrder.mutateAsync({
        id: order.id,
        picks,
      });
      const unitsCount = shipped.units.length;
      const itemsCount = picks.reduce((sum, p) => sum + p.qty, 0);
      toast.success(`${shipped.orderNumber} verzonden`, {
        description:
          unitsCount > 0
            ? `${shipped.account} - ${unitsCount} units`
            : `${shipped.account} - ${itemsCount} items`,
        duration: 8000,
        action: {
          label: 'Pakbon openen',
          onClick: () => setWaybillOrder(shipped),
        },
      });
      onShipped();
    } catch (e) {
      if (e instanceof InsufficientStockError) {
        // Pre-flight check blocked the ship - name the products with their
        // actual numbers so logistics knows exactly what's short. Sonner
        // renders newlines in the description, but we fall back to " · "
        // separators for readability if a single line is preferred.
        const lines = e.shortfalls.map(
          (s) =>
            `${s.productName}: ${s.available} beschikbaar, ${s.requested} nodig`,
        );
        toast.error('Geen voorraad beschikbaar', {
          description: lines.join('\n'),
        });
        return;
      }
      toast.error('Versturen mislukt', {
        description: e instanceof Error ? e.message : 'Onbekende fout',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-900 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-900">
        <div className="flex items-center gap-2 text-rose-300">
          <AlertCircle className="h-5 w-5" />
          <span>Kon order niet laden</span>
        </div>
      </div>
    );
  }

  const shipping = shipOrder.isPending || updateUnits.isPending;
  const packing = markAsPacked.isPending || updateUnits.isPending;

  return (
    <div className="scroll-thin flex h-full flex-col overflow-y-auto bg-surface-900">
      <header className="border-b border-surface-700 bg-surface-850/60 px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="select-text font-mono text-2xl font-semibold text-slate-50">
                {order.orderNumber}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-1 select-text text-lg text-slate-200">{order.account}</div>
          </div>
          <dl className="flex flex-col gap-1 text-right text-xs text-slate-400">
            <div className="flex items-center justify-end gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>{order.quoteOwner}</span>
            </div>
          </dl>
        </div>
      </header>

      <div className="flex-1 space-y-6 px-8 py-6">
        <NotesPanel notes={order.notes} source={order.source} />

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div>
            <SectionHeader icon={MapPin} title="Verzendadres" />
            <div className="select-text rounded-lg border border-surface-700 bg-surface-850 px-4 py-3 text-sm leading-relaxed text-slate-200">
              <div className="whitespace-pre-wrap">{order.address}</div>
              <div className="mt-0.5 text-slate-300">
                {order.postcode} {order.city}
              </div>
            </div>
          </div>

          <div>
            <SectionHeader icon={Building2} title="Orderpick" />
            <OrderpickList items={order.orderpick} />
          </div>
        </section>

        {units.length > 0 && (
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <SectionHeader title="1. IMEI scannen" />
              <span className="font-mono text-xs text-slate-400">
                {validCount}/{units.length} geldig
              </span>
            </div>
            <UnitsTable
              units={units}
              disabled={shipping}
              onUnitsChange={(next) => {
                setUnits(next);
                setDirty(true);
              }}
              onBlur={persistUnits}
            />
          </section>
        )}

        {packed && (
          <section>
            <div className="mb-2 flex items-center justify-between gap-4">
              <SectionHeader icon={FileText} title="Pakbon" />
              <button
                type="button"
                onClick={handlePrintWaybill}
                className="inline-flex items-center gap-2 rounded-md border border-surface-600 bg-surface-800 px-3 py-1.5 text-xs font-semibold text-slate-100 transition-colors hover:bg-surface-700"
              >
                <Printer className="h-3.5 w-3.5" />
                Printen
              </button>
            </div>
            <p className="mb-2 text-xs text-slate-400">
              Pakbon is klaar. Voeg hem toe aan het verzendpakket. Kies in het
              printvenster "Microsoft Print to PDF" om als PDF op te slaan.
            </p>
            <div className="overflow-hidden rounded-lg border border-surface-700 bg-white">
              <iframe
                ref={inlineWaybillRef}
                title={`Pakbon ${order.orderNumber}`}
                srcDoc={waybillHtml}
                className="block h-[700px] w-full border-0"
              />
            </div>
          </section>
        )}
      </div>

      <footer className="sticky bottom-0 border-t border-surface-700 bg-surface-900/95 px-8 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-slate-400">
            {!allValid
              ? `${validCount}/${units.length} units klaar - vul de overige IMEI's in om in te pakken.`
              : !packed
                ? units.length === 0
                  ? 'Geen IMEI-producten - klaar om in te pakken.'
                  : 'Alle units gecontroleerd - klaar om in te pakken.'
                : 'Pakbon staat klaar - klaar om te versturen.'}
          </div>
          <button
            type="button"
            onClick={packed ? handleShip : handlePack}
            disabled={!allValid || shipping || packing}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-surface-950 shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-slate-500"
          >
            {shipping || packing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : packed ? (
              <Send className="h-4 w-4" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            {packed
              ? 'Versturen'
              : allValid
                ? 'Inpakken'
                : `Inpakken (${validCount}/${units.length})`}
          </button>
        </div>
      </footer>

      {waybillOrder && (
        <WaybillViewer
          order={waybillOrder}
          isOpen={waybillOrder !== null}
          onClose={() => setWaybillOrder(null)}
        />
      )}
    </div>
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
