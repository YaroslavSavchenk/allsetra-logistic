import { useMemo, useRef, type KeyboardEvent } from 'react';
import { Check, X, CircleDashed } from 'lucide-react';
import type { Unit } from '@/types/order';
import { IMEI_LENGTH, validateImei, type ImeiValidation } from '@/lib/imei';

interface Props {
  units: Unit[];
  onUnitsChange: (next: Unit[]) => void;
  onBlur?: () => void;
  disabled?: boolean;
}

export interface RowValidation {
  unitId: string;
  validation: ImeiValidation;
}

function sanitize(raw: string): string {
  return raw.replace(/\D+/g, '').slice(0, IMEI_LENGTH);
}

export function computeRowValidations(units: Unit[]): RowValidation[] {
  return units.map((unit, idx) => {
    const otherImeis = units
      .filter((_, i) => i !== idx)
      .map((u) => u.imei)
      .filter((imei) => imei.trim().length > 0);
    return {
      unitId: unit.id,
      validation: validateImei(unit.imei, {
        expectedType: unit.type,
        otherImeis,
      }),
    };
  });
}

export function UnitsTable({ units, onUnitsChange, onBlur, disabled }: Props) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const validations = useMemo(() => computeRowValidations(units), [units]);

  const handleChange = (idx: number, raw: string) => {
    const next = units.map((u, i) =>
      i === idx ? { ...u, imei: sanitize(raw) } : u,
    );
    onUnitsChange(next);
  };

  const focusNextEmpty = (fromIdx: number) => {
    for (let offset = 1; offset <= units.length; offset++) {
      const target = (fromIdx + offset) % units.length;
      const v = validations[target]?.validation;
      if (v && v.state !== 'valid') {
        inputRefs.current[target]?.focus();
        inputRefs.current[target]?.select();
        return;
      }
    }
    inputRefs.current[fromIdx]?.blur();
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      focusNextEmpty(idx);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-surface-700 bg-surface-850">
      <table className="w-full text-sm">
        <thead className="bg-surface-800/60 text-left text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th className="w-14 px-4 py-2.5 font-semibold">#</th>
            <th className="w-36 px-4 py-2.5 font-semibold">Verwacht type</th>
            <th className="px-4 py-2.5 font-semibold">IMEI</th>
            <th className="w-10 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-700">
          {units.map((unit, idx) => {
            const rowValidation = validations[idx]!.validation;
            return (
              <UnitRow
                key={unit.id}
                index={idx}
                unit={unit}
                validation={rowValidation}
                disabled={disabled ?? false}
                inputRef={(el) => {
                  inputRefs.current[idx] = el;
                }}
                onChange={(raw) => handleChange(idx, raw)}
                onBlur={onBlur}
                onKeyDown={(e) => handleKeyDown(idx, e)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface RowProps {
  index: number;
  unit: Unit;
  validation: ImeiValidation;
  disabled: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onChange: (raw: string) => void;
  onBlur?: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

function UnitRow({
  index,
  unit,
  validation,
  disabled,
  inputRef,
  onChange,
  onBlur,
  onKeyDown,
}: RowProps) {
  const rowBg =
    validation.state === 'valid'
      ? 'bg-emerald-500/5'
      : validation.state === 'invalid'
        ? 'bg-rose-500/5'
        : '';

  const borderColor =
    validation.state === 'valid'
      ? 'border-emerald-500/50 focus:border-emerald-400'
      : validation.state === 'invalid'
        ? 'border-rose-500/60 focus:border-rose-400'
        : 'border-surface-600 focus:border-accent/60';

  return (
    <tr className={rowBg}>
      <td className="px-4 py-2.5 align-top font-mono text-slate-400">
        {String(index + 1).padStart(2, '0')}
      </td>
      <td className="px-4 py-2.5 align-top">
        <span className="inline-flex rounded border border-surface-600 bg-surface-800 px-2 py-1 font-mono text-xs text-slate-200">
          {unit.type}
        </span>
      </td>
      <td className="px-4 py-2.5 align-top">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="15 cijfers…"
          value={unit.imei}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          aria-label={`IMEI voor unit ${index + 1}`}
          aria-invalid={validation.state === 'invalid'}
          className={`w-full rounded-md border bg-surface-900 px-3 py-2 font-mono text-base tracking-wide text-slate-100 placeholder:text-slate-600 disabled:opacity-60 ${borderColor}`}
        />
        {validation.state === 'invalid' && (
          <p className="mt-1 text-xs text-rose-300">{validation.reason}</p>
        )}
        {validation.state === 'valid' && (
          <p className="mt-1 text-xs text-emerald-300">
            Herkend als {validation.detectedType}
          </p>
        )}
      </td>
      <td className="px-4 py-2.5 align-top">
        <ValidationIcon state={validation.state} />
      </td>
    </tr>
  );
}

function ValidationIcon({ state }: { state: ImeiValidation['state'] }) {
  if (state === 'valid') {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300"
        aria-label="Geldig"
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'invalid') {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/20 text-rose-300"
        aria-label="Ongeldig"
      >
        <X className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center text-slate-600"
      aria-label="Nog niet ingevuld"
    >
      <CircleDashed className="h-4 w-4" />
    </span>
  );
}
