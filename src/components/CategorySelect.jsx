import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export default function CategorySelect({ value, onChange, options, placeholder, dark = false, className = '' }) {
  const { language } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const resolvedPlaceholder = placeholder || (language === 'en' ? 'Select' : 'Auswaehlen');

  useEffect(() => {
    if (!open) return;
    const handler = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const label = options.find((option) => option.value === value)?.label || resolvedPlaceholder;

  return (
    <div ref={ref} className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value_) => !value_)}
        className={`w-full px-3 pr-8 rounded-lg border text-left flex items-center transition-colors focus:outline-none focus:ring-2 ${
          dark
            ? 'h-8 text-xs bg-white/10 border-white/25 text-white hover:bg-white/20 focus:ring-white/40 shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]'
            : 'h-9 text-base md:text-sm bg-card border-border text-foreground hover:border-primary/50 focus:ring-primary shadow-[0_2px_8px_0_rgba(0,0,0,0.12)]'
        }`}
      >
        <span className="flex-1 truncate font-body">{label}</span>
        <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} ${dark ? 'text-white/60' : 'text-muted-foreground'}`} />
      </button>
      {open ? (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.22)] overflow-hidden max-h-64 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm font-body transition-colors ${value === option.value ? 'bg-primary text-primary-foreground font-semibold' : 'text-foreground hover:bg-primary/10'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
