import {
  AlertCircle,
  ArrowDownUp,
  Building2,
  History,
  Loader2,
  Package2,
  ShoppingCart,
} from 'lucide-react';
import { useInventory, useProduct } from '@/hooks/useInventory';
import { formatDateTime } from '@/lib/format';
import { StockAdjustForm } from './StockAdjustForm';
import { OpenPurchaseOrders } from './OpenPurchaseOrders';
import { PurchaseOrderForm } from './PurchaseOrderForm';
import { MovementsList } from './MovementsList';

interface Props {
  productId: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  tracker: 'Tracker',
  'tracker-accessory': 'Accessoire',
  'bike-security': 'Fietsbeveiliging',
  sensor: 'Sensor',
};

export function InventoryDetail({ productId }: Props) {
  const { data: product, isLoading: productLoading } = useProduct(productId);
  const { data: inventory, isLoading: inventoryLoading } = useInventory();

  if (productLoading || inventoryLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-900 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-900">
        <div className="flex items-center gap-2 text-rose-300">
          <AlertCircle className="h-5 w-5" />
          <span>Kon product niet laden</span>
        </div>
      </div>
    );
  }

  const item = inventory?.find((i) => i.productId === productId);
  const opVoorraad = item?.opVoorraad ?? 0;
  const opBestelling = item?.opBestelling ?? 0;
  const totaalVerwacht = opVoorraad + opBestelling;
  const lastMovementAt = item?.lastMovementAt ?? null;

  return (
    <div className="scroll-thin flex h-full flex-col overflow-y-auto bg-surface-900">
      <header className="border-b border-surface-700 bg-surface-850/60 px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-semibold text-slate-50">
                {product.name}
              </h1>
              <span className="rounded-md border border-surface-700 bg-surface-800 px-2 py-0.5 font-mono text-xs text-slate-300">
                {product.sku}
              </span>
            </div>
            <dl className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Package2 className="h-3.5 w-3.5" />
                <span>{CATEGORY_LABEL[product.category] ?? product.category}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>{product.supplier}</span>
              </div>
              {lastMovementAt && (
                <div className="text-slate-500">
                  Laatste mutatie: {formatDateTime(lastMovementAt)}
                </div>
              )}
            </dl>
          </div>
          <div className="grid grid-cols-3 gap-3 text-right">
            <Stat label="Op voorraad" value={opVoorraad} tone={opVoorraad <= 5 ? 'warning' : 'default'} />
            <Stat label="Op bestelling" value={opBestelling} />
            <Stat label="Totaal verwacht" value={totaalVerwacht} tone="accent" />
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-6 px-8 py-6">
        <section>
          <SectionHeader icon={ArrowDownUp} title="Voorraad aanpassen" />
          <StockAdjustForm productId={productId} productName={product.name} />
        </section>

        <section>
          <SectionHeader icon={ShoppingCart} title="Openstaande inkooporders" />
          <OpenPurchaseOrders productId={productId} />
        </section>

        <section>
          <SectionHeader icon={ShoppingCart} title="Inkooporder registreren" />
          <PurchaseOrderForm productId={productId} productName={product.name} />
        </section>

        <section>
          <SectionHeader icon={History} title="Mutaties" />
          <MovementsList productId={productId} />
        </section>
      </div>
    </div>
  );
}

interface StatProps {
  label: string;
  value: number;
  tone?: 'default' | 'accent' | 'warning';
}

function Stat({ label, value, tone = 'default' }: StatProps) {
  const valueClass =
    tone === 'accent'
      ? 'text-accent'
      : tone === 'warning'
        ? 'text-rose-300'
        : 'text-slate-100';
  return (
    <div className="rounded-lg border border-surface-700 bg-surface-850 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`font-mono text-xl font-semibold ${valueClass}`}>
        {value}
      </div>
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
