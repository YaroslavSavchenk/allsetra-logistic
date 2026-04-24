import { AlertTriangle } from 'lucide-react';

interface Props {
  note: string;
}

export function SalesNoteAlert({ note }: Props) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 shadow-sm"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">
          Notitie van sales
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-amber-100">
          {note}
        </p>
      </div>
    </div>
  );
}
