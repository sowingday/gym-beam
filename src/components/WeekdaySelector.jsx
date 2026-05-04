import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '../lib/i18n';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const COLORS = ['#212121', '#1565C0', '#6A1B9A', '#2E7D32', '#FFE000', '#FF4500', '#6D4C41', '#C62828', '#00B8C4', '#FF007F'];

export default function WeekdaySelector({ weekdays = [], color = '#212121', onChangeWeekdays, onChangeColor }) {
  const { language } = useI18n();
  const toggleDay = (day) => {
    const next = weekdays.includes(day) ? weekdays.filter((item) => item !== day) : [...weekdays, day];
    onChangeWeekdays(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} style={{ backgroundColor: color }} className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 transition-opacity hover:opacity-90">
          {weekdays.length > 0 ? (
            <span className="text-white font-bold leading-none" style={{ fontSize: weekdays.length === 1 ? '1.1rem' : '0.6rem', lineHeight: 1 }}>
              {weekdays.length === 1 ? weekdays[0] : weekdays.join(' ')}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{language === 'en' ? 'Weekdays' : 'Wochentage'}</p>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className="text-xs h-8 rounded-md font-medium transition-colors"
              style={weekdays.includes(day) ? { backgroundColor: color, color: 'white' } : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
            >
              {day}
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{language === 'en' ? 'Color' : 'Farbe'}</p>
        <div className="grid grid-cols-5 gap-1.5">
          {COLORS.map((entry) => (
            <button key={entry} onClick={() => onChangeColor(entry)} style={{ backgroundColor: entry }} className={`w-8 h-8 rounded-md transition-transform hover:scale-110 ${color === entry ? 'ring-2 ring-offset-1 ring-foreground' : ''}`} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
