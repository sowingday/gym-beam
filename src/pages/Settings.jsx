import React, { useState, useEffect } from 'react';
import { Settings2, Play, Square, ArrowUp, ArrowDown, Check, X } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { Input } from '@/components/ui/input';
import { getSetting, setSetting } from '../lib/settings';
import { previewMusic, stopMusic } from '../lib/musicPlayer';
import { useI18n } from '../lib/i18n';

const MUSIC_MODES = {
  de: [
    { id: 'loop', label: 'Ein loopfaehiges Lied wiederholen' },
    { id: 'all', label: 'Alle passenden Lieder abspielen' },
  ],
  en: [
    { id: 'loop', label: 'Repeat one loopable track' },
    { id: 'all', label: 'Play all matching tracks' },
  ],
};

const MUSIC_STYLES = {
  de: [
    { id: 'none', name: 'Ruhe', desc: null, empty: 'Keine Hintergrundmusik' },
    { id: 'deep_house', name: 'Deep House', desc: 'Ruhiger, fliessender House-Sound mit warmem Groove.' },
    { id: 'nu_disco', name: 'Nu Disco', desc: 'Positiver, grooviger Dance-Sound mit leichter Funk-Note.' },
    { id: 'tech_house', name: 'Tech House', desc: 'Treibender Club-Sound mit stabilem Rhythmus.' },
    { id: 'synthwave', name: 'Synthwave', desc: 'Melodischer Electro-Sound mit moderner Retro-Atmosphaere.' },
    { id: 'edm', name: 'EDM', desc: 'Energiegeladener elektronischer Sound ohne extreme Drops.' },
    { id: 'techno', name: 'Techno', desc: 'Geradliniger Beat mit konstantem Drive.' },
    { id: 'lofi_hiphop', name: 'Lo-fi Hip Hop', desc: 'Entspannter Groove fuer ruhige Trainingsphasen.' },
    { id: 'ambient', name: 'Ambient', desc: 'Ruhiger Hintergrundsound fuer Stretching und Cooldown.' },
  ],
  en: [
    { id: 'none', name: 'Silence', desc: null, empty: 'No background music' },
    { id: 'deep_house', name: 'Deep House', desc: 'Calm, flowing house sound with a warm groove.' },
    { id: 'nu_disco', name: 'Nu Disco', desc: 'Positive dance sound with a light funky feel.' },
    { id: 'tech_house', name: 'Tech House', desc: 'Driving club sound with a steady rhythm.' },
    { id: 'synthwave', name: 'Synthwave', desc: 'Melodic electronic sound with a modern retro vibe.' },
    { id: 'edm', name: 'EDM', desc: 'High-energy electronic sound without extreme drops.' },
    { id: 'techno', name: 'Techno', desc: 'Straight beat with constant drive.' },
    { id: 'lofi_hiphop', name: 'Lo-fi Hip Hop', desc: 'Relaxed groove for calmer training phases.' },
    { id: 'ambient', name: 'Ambient', desc: 'Soft background sound for stretching and cooldown.' },
  ],
};

const RECOMMENDATIONS = {
  de: [
    ['Warm-up', 'Deep House, Nu Disco'],
    ['Workout / moderat', 'Tech House, Synthwave'],
    ['Intensiv / Power', 'EDM, Techno'],
    ['Cooldown / Stretching', 'Lo-fi Hip Hop, Ambient'],
  ],
  en: [
    ['Warm-up', 'Deep House, Nu Disco'],
    ['Workout / moderate', 'Tech House, Synthwave'],
    ['Intense / power', 'EDM, Techno'],
    ['Cooldown / stretching', 'Lo-fi Hip Hop, Ambient'],
  ],
};

const TOGGLE_ICONS = {
  up: ArrowUp,
  down: ArrowDown,
  true: Check,
  false: X,
};

function Toggle({ value, onChange, options }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-border w-fit">
      {options.map(({ label, val }) => {
        const Icon = TOGGLE_ICONS[val];
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            title={label}
            className={`px-2.5 py-1.5 transition-colors flex items-center justify-center ${value === val ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`}
          >
            {Icon ? <Icon className="w-4 h-4" /> : <span className="text-xs font-body">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0">
      <div>
        <span className="text-sm font-body text-foreground">{label}</span>
        {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function GroupTitle({ children }) {
  return (
    <h2 className="font-body font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-1">{children}</h2>
  );
}

export default function Settings() {
  const { language, setLanguage, t } = useI18n();
  const [breakDuration, setBreakDuration] = useState(getSetting('break_duration'));
  const [musicStyle, setMusicStyle] = useState(getSetting('music_style'));
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [musicMode, setMusicMode] = useState(getSetting('music_mode') || 'all');
  const [totalDir, setTotalDir] = useState(getSetting('total_dir'));
  const [exerciseDir, setExerciseDir] = useState(getSetting('exercise_dir'));
  const [showTotalDur, setShowTotalDur] = useState(getSetting('show_total_dur'));
  const [showExerciseDur, setShowExerciseDur] = useState(getSetting('show_exercise_dur'));
  const [breakBeep, setBreakBeep] = useState(getSetting('break_beep'));
  const [showGreeting, setShowGreeting] = useState(getSetting('show_greeting'));
  const [countdownStart, setCountdownStart] = useState(getSetting('countdown_start'));
  const rawZoom = String(getSetting('plan_zoom'));
  const normalizedZoom = ['klein', 'mittel', 'gross', 'groß'].includes(rawZoom) ? rawZoom.replace('groß', 'gross') : 'mittel';
  const [planZoom, setPlanZoom] = useState(normalizedZoom);

  const copy = {
    de: {
      timesTitle: 'Trainingsmodus - Zeiten',
      countdownTitle: 'Trainingsmodus - Countdown',
      musicTitle: 'Trainingsmodus - Hintergrundmusik',
      totalDuration: 'Gesamttrainingsdauer anzeigen',
      exerciseDuration: 'Uebungsdauer anzeigen',
      totalCounter: 'Zaehler Gesamttrainingsdauer',
      exerciseCounter: 'Zaehler Uebungsdauer',
      breakBetween: 'Pause zwischen Uebungen',
      countdownSound: 'Countdown-Ton',
      countdownStart: 'Countdown beim Start',
      yes: 'ja',
      no: 'nein',
      up: 'hoch',
      down: 'runter',
      on: 'an',
      off: 'aus',
      musicHint: 'Beim Training werden zufaellig Lieder passend zum gewaehlten Musikstil abgespielt.',
      preview: 'Vorschau',
    },
    en: {
      timesTitle: 'Training mode - timing',
      countdownTitle: 'Training mode - countdown',
      musicTitle: 'Training mode - background music',
      totalDuration: 'Show total workout duration',
      exerciseDuration: 'Show exercise duration',
      totalCounter: 'Total duration counter',
      exerciseCounter: 'Exercise duration counter',
      breakBetween: 'Break between exercises',
      countdownSound: 'Countdown sound',
      countdownStart: 'Countdown at start',
      yes: 'yes',
      no: 'no',
      up: 'up',
      down: 'down',
      on: 'on',
      off: 'off',
      musicHint: 'During training, random songs that match the selected style are played.',
      preview: 'Preview',
    },
  }[language];

  useEffect(() => () => stopMusic(), []);

  const handleBreakChange = (val) => {
    const num = Math.max(0, Math.min(999, parseInt(val, 10) || 0));
    setBreakDuration(num);
    setSetting('break_duration', num);
  };

  const handleCountdownChange = (val) => {
    const num = Math.max(0, Math.min(60, parseInt(val, 10) || 0));
    setCountdownStart(num);
    setSetting('countdown_start', num);
  };

  const handleMusicSelect = (id) => {
    setMusicStyle(id);
    setSetting('music_style', id);
    if (isPreviewing) {
      stopMusic();
      if (id !== 'none') previewMusic(id, 99999, musicMode === 'loop');
    }
  };

  const handleMusicModeChange = (mode) => {
    setMusicMode(mode);
    setSetting('music_mode', mode);
    if (isPreviewing) {
      stopMusic();
      if (musicStyle !== 'none') previewMusic(musicStyle, 99999, mode === 'loop');
    }
  };

  const togglePreview = () => {
    if (isPreviewing) {
      stopMusic();
      setIsPreviewing(false);
      return;
    }

    setIsPreviewing(true);
    if (musicStyle !== 'none') previewMusic(musicStyle, 99999, musicMode === 'loop');
  };

  const setStored = (key, setter) => (val) => {
    setter(val);
    setSetting(key, val);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-8">
          <Settings2 className="w-7 h-7 text-primary" />
          <h1 className="font-display text-4xl tracking-wide text-foreground drop-shadow-[0_4px_12px_rgba(0,0,0,0.18)]">{t('settings.title')}</h1>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 mb-4 shadow-[0_8px_40px_0_rgba(0,0,0,0.18)]">
          <GroupTitle>{copy.timesTitle}</GroupTitle>
          <div>
            <Row label={copy.totalDuration}>
              <Toggle value={showTotalDur} onChange={setStored('show_total_dur', setShowTotalDur)} options={[{ label: copy.yes, val: 'true' }, { label: copy.no, val: 'false' }]} />
            </Row>
            <Row label={copy.exerciseDuration}>
              <Toggle value={showExerciseDur} onChange={setStored('show_exercise_dur', setShowExerciseDur)} options={[{ label: copy.yes, val: 'true' }, { label: copy.no, val: 'false' }]} />
            </Row>
            <Row label={copy.totalCounter}>
              <Toggle value={totalDir} onChange={setStored('total_dir', setTotalDir)} options={[{ label: copy.up, val: 'up' }, { label: copy.down, val: 'down' }]} />
            </Row>
            <Row label={copy.exerciseCounter}>
              <Toggle value={exerciseDir} onChange={setStored('exercise_dir', setExerciseDir)} options={[{ label: copy.up, val: 'up' }, { label: copy.down, val: 'down' }]} />
            </Row>
            <Row label={copy.breakBetween}>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={999} value={breakDuration} onChange={(e) => handleBreakChange(e.target.value)} className="w-20 text-center text-base font-display" />
                <span className="text-muted-foreground font-body text-sm">{t('common.seconds')}</span>
              </div>
            </Row>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 mb-4 shadow-[0_8px_40px_0_rgba(0,0,0,0.18)]">
          <GroupTitle>{copy.countdownTitle}</GroupTitle>
          <div>
            <Row label={copy.countdownSound}>
              <Toggle value={breakBeep} onChange={setStored('break_beep', setBreakBeep)} options={[{ label: copy.on, val: 'true' }, { label: copy.off, val: 'false' }]} />
            </Row>
            <Row label={copy.countdownStart}>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={60} value={countdownStart} onChange={(e) => handleCountdownChange(e.target.value)} className="w-20 text-center text-base font-display" />
                <span className="text-muted-foreground font-body text-sm">{t('common.seconds')}</span>
              </div>
            </Row>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 mb-4 shadow-[0_8px_40px_0_rgba(0,0,0,0.18)]">
          <GroupTitle>{copy.musicTitle}</GroupTitle>

          <p className="text-xs text-muted-foreground font-body mb-2 leading-snug">{copy.musicHint}</p>

          <select
            value={musicMode}
            onChange={(e) => handleMusicModeChange(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-ring mb-3 appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', paddingRight: '2.25rem' }}
          >
            {MUSIC_MODES[language].map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
          </select>

          <div className="mb-3">
            <button
              onClick={togglePreview}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-body font-semibold transition-colors ${isPreviewing ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-muted/40 border-border text-foreground hover:bg-muted/60'}`}
            >
              {isPreviewing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {copy.preview}
            </button>
          </div>

          <div className="space-y-1">
            {MUSIC_STYLES[language].map((style) => (
              <button
                key={style.id}
                onClick={() => handleMusicSelect(style.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors border ${musicStyle === style.id ? 'bg-primary/10 border-primary/30' : 'border-transparent hover:bg-muted/40'}`}
              >
                <div className={`font-body font-semibold text-sm ${musicStyle === style.id ? 'text-primary' : 'text-foreground'}`}>{style.name}</div>
                {style.desc ? <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{style.desc}</div> : null}
                {style.id === 'none' ? <div className="text-xs text-muted-foreground mt-0.5">{style.empty}</div> : null}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground font-body space-y-1 leading-relaxed">
            {RECOMMENDATIONS[language].map(([label, value]) => (
              <p key={label}>
                · <strong className="text-foreground font-semibold">{label}:</strong> {value}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-[0_8px_40px_0_rgba(0,0,0,0.18)]">
          <GroupTitle>{t('settings.misc')}</GroupTitle>
          <div>
            <Row label={t('settings.showGreeting')}>
              <div className="shrink-0">
                <Toggle value={showGreeting} onChange={setStored('show_greeting', setShowGreeting)} options={[{ label: copy.yes, val: 'true' }, { label: copy.no, val: 'false' }]} />
              </div>
            </Row>
            <Row label={t('settings.planZoom')}>
              <select
                value={planZoom}
                onChange={(e) => {
                  const next = e.target.value;
                  setPlanZoom(next);
                  setSetting('plan_zoom', next);
                }}
                className="h-9 rounded-md border border-input bg-card px-3 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="klein">{t('settings.small')}</option>
                <option value="mittel">{t('settings.medium')}</option>
                <option value="gross">{t('settings.large')}</option>
              </select>
            </Row>
            <Row label={t('settings.languageLabel')} hint={t('settings.languageHint')}>
              <div className="shrink-0">
                <Toggle value={language} onChange={setLanguage} options={[{ label: 'DE', val: 'de' }, { label: 'EN', val: 'en' }]} />
              </div>
            </Row>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
