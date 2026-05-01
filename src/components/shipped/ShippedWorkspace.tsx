import { useState } from 'react';
import {
  Calendar,
  Eye,
  Loader2,
  MapPin,
  PackageCheck,
  User,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { useShippedOrder } from '@/hooks/useOrders';
import { formatDateTime } from '@/lib/format';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { NotesPanel } from '@/components/orders/NotesPanel';
import { OrderpickList } from '@/components/orders/OrderpickList';
import { UnitsTable } from '@/components/orders/UnitsTable';
import { WaybillViewer } from '@/components/waybill/WaybillViewer';

interface Props {
  orderId: string;
}

export function ShippedWorkspace({ orderId }: Props) {
  const { data: order, isLoading, error } = useShippedOrder(orderId);
  const [waybillOpen, setWaybillOpen] = useState(false);

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
            {order.shippedAt && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
                <PackageCheck className="h-3.5 w-3.5" />
                Verzonden op {formatDateTime(order.shippedAt)}
              </div>
            )}
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

        {order.units.length > 0 && (
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <SectionHeader title="Units" />
              <span className="font-mono text-xs text-slate-400">
                {order.units.length} units
              </span>
            </div>
            {/*
              Read-only unit overview: the inputs themselves are HTML-disabled
              (UnitsTable forwards `disabled` to the underlying <input>), and
              `onUnitsChange` is a no-op so the table stays controlled. This
              order is already shipped; mutations would be meaningless.
            */}
            <UnitsTable
              units={order.units}
              disabled
              onUnitsChange={() => {
                /* no-op: shipped orders are read-only */
              }}
            />
          </section>
        )}

        <section>
          <SectionHeader icon={PackageCheck} title="Pakbon" />
          <div className="flex items-center justify-between gap-4 rounded-lg border border-surface-700 bg-surface-850 px-4 py-4">
            <div className="text-sm text-slate-300">
              Pakbon voor deze order — open, print of download.
            </div>
            <button
              type="button"
              onClick={() => setWaybillOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-surface-950 transition-colors hover:bg-accent-hover"
            >
              <Eye className="h-4 w-4" />
              Pakbon openen
            </button>
          </div>
        </section>
      </div>

      <WaybillViewer
        order={order}
        isOpen={waybillOpen}
        onClose={() => setWaybillOpen(false)}
      />
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
