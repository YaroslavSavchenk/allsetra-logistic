import { Package } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-surface-900 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-800 text-slate-500">
        <Package className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-200">Geen order geselecteerd</h2>
        <p className="max-w-sm text-sm text-slate-400">
          Selecteer een order in de lijst links om te beginnen met prepen.
        </p>
      </div>
    </div>
  );
}
