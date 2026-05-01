import { AlertTriangle, User, Clock } from 'lucide-react';
import type { OrderNote, OrderSource } from '@/types/order';
import { formatDateTime } from '@/lib/format';

interface Props {
  notes: OrderNote[];
  /**
   * Drives the panel header. Sales-originated orders show "Notitie van
   * sales" so logistics treats it as a hand-off message; logistics-created
   * orders just show "Interne notitie" so we don't lie about the author.
   */
  source: OrderSource;
}

export function NotesPanel({ notes, source }: Props) {
  if (notes.length === 0) return null;

  const headerLabel = (() => {
    if (notes.length > 1) return `Notities (${notes.length})`;
    return source === 'logistics' ? 'Interne notitie' : 'Notitie van sales';
  })();

  return (
    <div
      role="alert"
      className="overflow-hidden rounded-lg border border-amber-500/40 bg-amber-500/10 shadow-sm"
    >
      <header className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
          {headerLabel}
        </span>
      </header>
      <ul className="divide-y divide-amber-500/20">
        {notes.map((note) => (
          <li key={note.id} className="px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-50">
              {note.content}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-amber-200/70">
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {note.author}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDateTime(note.createdAt)}
                {note.modifiedAt && note.modifiedAt !== note.createdAt && (
                  <span className="italic text-amber-200/50">
                    · bewerkt {formatDateTime(note.modifiedAt)}
                  </span>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
