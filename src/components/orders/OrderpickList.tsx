import type { OrderpickItem } from '@/types/order';
import { getProduct } from '@/lib/productStrategy';

interface Props {
  items: OrderpickItem[];
}

export function OrderpickList({ items }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-surface-700 bg-surface-850">
      <table className="w-full text-sm">
        <thead className="bg-surface-800/60 text-left text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Product</th>
            <th className="w-24 px-4 py-2.5 text-right font-semibold">Aantal</th>
            <th className="px-4 py-2.5 font-semibold">Notitie</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-700">
          {items.map((item, idx) => {
            const product = getProduct(item.productId);
            return (
              <tr key={`${item.productId}-${idx}`}>
                <td className="px-4 py-2.5 text-slate-200">
                  {product?.name ?? item.productId}
                  {!product?.hasIMEI && (
                    <span className="ml-2 inline-flex rounded border border-surface-600 bg-surface-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                      geen IMEI
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-200">
                  {item.quantity}×
                </td>
                <td className="px-4 py-2.5 text-slate-400">
                  {item.note || <span className="text-slate-600">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
