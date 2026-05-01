import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import type { Product } from '@/types/product';
import { CATEGORY_LABEL } from '@/lib/productStrategy';

interface Props {
  value: Product | null;
  onChange: (product: Product | null) => void;
  products: Product[];
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Used by the parent form to associate a label. */
  ariaLabel?: string;
}

/**
 * Searchable single-select combobox over the product catalogue. Type to
 * filter by name or SKU; ArrowUp/Down navigate, Enter selects, Esc closes.
 * Selected products are shown as a read-only label until the user re-opens
 * the dropdown to change them.
 */
export function ProductPicker({
  value,
  onChange,
  products,
  isLoading,
  disabled,
  placeholder = 'Zoek op naam of SKU…',
  ariaLabel,
}: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [products, query]);

  // Keep the highlighted index in range as the filter changes.
  useEffect(() => {
    setHighlightedIndex((idx) =>
      filtered.length === 0 ? 0 : Math.min(idx, filtered.length - 1),
    );
  }, [filtered.length]);

  // Close on outside click.
  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isOpen]);

  const open = () => {
    if (disabled) return;
    setIsOpen(true);
    setHighlightedIndex(0);
    setQuery('');
  };

  const close = () => {
    setIsOpen(false);
    setQuery('');
  };

  const select = (product: Product) => {
    onChange(product);
    close();
    inputRef.current?.blur();
  };

  const clear = () => {
    onChange(null);
    setQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        open();
        return;
      }
      setHighlightedIndex((idx) =>
        filtered.length === 0 ? 0 : (idx + 1) % filtered.length,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        open();
        return;
      }
      setHighlightedIndex((idx) =>
        filtered.length === 0
          ? 0
          : (idx - 1 + filtered.length) % filtered.length,
      );
    } else if (e.key === 'Enter') {
      if (!isOpen) return;
      e.preventDefault();
      const product = filtered[highlightedIndex];
      if (product) select(product);
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        close();
      }
    }
  };

  const showQueryMode = isOpen || !value;
  const inputValue = showQueryMode ? query : value!.name;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">
          {showQueryMode ? (
            <Search className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4 text-emerald-300" />
          )}
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label={ariaLabel ?? 'Product kiezen'}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={inputValue}
          disabled={disabled}
          onFocus={open}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border border-surface-700 bg-surface-900 py-2 pl-8 pr-16 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 disabled:opacity-50"
        />
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Selectie wissen"
              onClick={clear}
              className="rounded p-1 text-slate-400 hover:bg-surface-800 hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Productlijst openen"
            onClick={() => (isOpen ? close() : open())}
            disabled={disabled}
            className="rounded p-1 text-slate-400 hover:bg-surface-800 hover:text-slate-200 disabled:opacity-50"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="scroll-thin absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-md border border-surface-700 bg-surface-850 shadow-lg"
        >
          {isLoading && (
            <li className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Catalogus laden…
            </li>
          )}
          {!isLoading && filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">
              {query.trim()
                ? `Geen producten gevonden voor "${query.trim()}"`
                : 'Geen producten beschikbaar'}
            </li>
          )}
          {!isLoading &&
            filtered.map((product, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const isSelected = value?.id === product.id;
              return (
                <li
                  key={product.id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    // Prevent input blur before click handler runs.
                    e.preventDefault();
                  }}
                  onClick={() => select(product)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                    isHighlighted
                      ? 'bg-surface-800 text-slate-100'
                      : 'text-slate-200 hover:bg-surface-800'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {product.name}
                      </span>
                      {product.hasIMEI && (
                        <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">
                          IMEI
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-mono">{product.sku}</span>
                      <span>·</span>
                      <span>{CATEGORY_LABEL[product.category]}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-300" />
                  )}
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
