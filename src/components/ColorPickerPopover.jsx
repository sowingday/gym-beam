import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../lib/i18n';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
  '#8b5cf6', '#ec4899', '#212121', '#6b7280', '#d1d5db', '#ffffff',
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '').trim();
  const safe = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized.padEnd(6, '0').slice(0, 6);
  const int = parseInt(safe, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = 60 * (((gn - bn) / delta) % 6);
        break;
      case gn:
        h = 60 * (((bn - rn) / delta) + 2);
        break;
      default:
        h = 60 * (((rn - gn) / delta) + 4);
        break;
    }
  }

  return { h: Math.round((h + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h, s, l) {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hn < 60) [r1, g1, b1] = [c, x, 0];
  else if (hn < 120) [r1, g1, b1] = [x, c, 0];
  else if (hn < 180) [r1, g1, b1] = [0, c, x];
  else if (hn < 240) [r1, g1, b1] = [0, x, c];
  else if (hn < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
}

function hexToHsl(hex) {
  return rgbToHsl(...Object.values(hexToRgb(hex)));
}

function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

function Slider({ label, value, min, max, onChange, background }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full" style={{ background }} />
    </label>
  );
}

export default function ColorPickerPopover({ color, onChange, onClose }) {
  const { language, t } = useI18n();
  const ref = useRef(null);
  const [draftHsl, setDraftHsl] = useState(() => hexToHsl(color?.startsWith('#') ? color : '#212121'));
  const [position, setPosition] = useState({ top: 0, left: 0, ready: false });

  useEffect(() => {
    setDraftHsl(hexToHsl(color?.startsWith('#') ? color : '#212121'));
  }, [color]);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [onClose]);

  const draftColor = useMemo(() => hslToHex(draftHsl.h, draftHsl.s, draftHsl.l), [draftHsl.h, draftHsl.l, draftHsl.s]);
  const setDraftColor = (hex) => setDraftHsl(hexToHsl(hex));
  const applyColor = () => {
    onChange(draftColor);
    onClose();
  };

  useLayoutEffect(() => {
    const updatePosition = () => {
      if (!ref.current?.parentElement) return;
      const anchorRect = ref.current.parentElement.getBoundingClientRect();
      const popoverRect = ref.current.getBoundingClientRect();
      const margin = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = anchorRect.left + (anchorRect.width / 2) - (popoverRect.width / 2);
      let top = anchorRect.bottom + 10;
      left = clamp(left, margin, viewportWidth - popoverRect.width - margin);
      if (top + popoverRect.height > viewportHeight - margin) top = anchorRect.top - popoverRect.height - 10;
      top = clamp(top, margin, viewportHeight - popoverRect.height - margin);
      setPosition({ top, left, ready: true });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed z-[9999] w-56 rounded-xl border border-border bg-card p-3 shadow-2xl"
      style={{ top: `${position.top}px`, left: `${position.left}px`, visibility: position.ready ? 'visible' : 'hidden' }}
      onClick={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="h-10 w-10 shrink-0 rounded-full ring-1 ring-black/15" style={{ backgroundColor: draftColor }} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('common.preview')}</div>
          <div className="truncate text-sm font-medium text-foreground">{draftColor}</div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-6 gap-1.5">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setDraftColor(preset)}
            className="h-5 w-5 rounded-full ring-1 ring-black/15 transition-transform hover:scale-110 active:scale-95"
            style={{ backgroundColor: preset, outline: draftColor.toLowerCase() === preset.toLowerCase() ? '2px solid hsl(var(--primary))' : 'none', outlineOffset: 2 }}
            aria-label={`Preset ${preset}`}
          />
        ))}
      </div>

      <div className="space-y-3">
        <Slider label="Hue" value={draftHsl.h} min={0} max={360} onChange={(value) => setDraftHsl((current) => ({ ...current, h: value }))} background="linear-gradient(90deg, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)" />
        <Slider label={language === 'en' ? 'Saturation' : 'Saettigung'} value={draftHsl.s} min={0} max={100} onChange={(value) => setDraftHsl((current) => ({ ...current, s: value }))} background={`linear-gradient(90deg, ${hslToHex(draftHsl.h, 0, draftHsl.l)} 0%, ${hslToHex(draftHsl.h, 100, draftHsl.l)} 100%)`} />
        <Slider label={language === 'en' ? 'Brightness' : 'Helligkeit'} value={draftHsl.l} min={0} max={100} onChange={(value) => setDraftHsl((current) => ({ ...current, l: value }))} background={`linear-gradient(90deg, ${hslToHex(draftHsl.h, draftHsl.s, 0)} 0%, ${hslToHex(draftHsl.h, draftHsl.s, 50)} 50%, ${hslToHex(draftHsl.h, draftHsl.s, 100)} 100%)`} />
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
          {language === 'en' ? 'Cancel' : 'Abbrechen'}
        </button>
        <button type="button" onClick={applyColor} className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          {language === 'en' ? 'Apply' : 'Uebernehmen'}
        </button>
      </div>
    </div>
  );
}
