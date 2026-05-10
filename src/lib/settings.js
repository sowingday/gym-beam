const DEFAULTS = {
  break_duration: 10,
  music_style: 'none',
  total_dir: 'up',
  exercise_dir: 'down',
  show_total_dur: 'true',
  show_exercise_dur: 'true',
  break_beep: 'true',
  music_mode: 'all',
  countdown_start: 3,
  countdown_before_end: 0,
  today_highlight_color: '#ff8c00',
  today_highlight_enabled: 'true',
  plan_zoom: 1.15,
  app_language: 'de',
};

export function getSetting(key) {
  const val = localStorage.getItem(`wb_${key}`);
  if (val === null || val === '') return DEFAULTS[key];
  if (key === 'break_duration') return Math.max(0, parseInt(val, 10) || 0);
  if (key === 'countdown_start') return Math.max(0, parseInt(val, 10) || 0);
  if (key === 'countdown_before_end') return Math.max(0, Math.min(10, parseInt(val, 10) || 0));
  return val;
}

export function setSetting(key, value) {
  localStorage.setItem(`wb_${key}`, String(value));
}

export const getBreakDuration = () => getSetting('break_duration');
export const getMusicStyle = () => getSetting('music_style');
export const getTotalDir = () => getSetting('total_dir');
export const getExerciseDir = () => getSetting('exercise_dir');
export const getShowTotalDur = () => getSetting('show_total_dur') === 'true';
export const getShowExerciseDur = () => getSetting('show_exercise_dur') === 'true';
export const getBreakBeep = () => getSetting('break_beep') === 'true';
export const getCountdownStart = () => getSetting('countdown_start');
export const getCountdownBeforeEnd = () => getSetting('countdown_before_end');
export const getMusicMode = () => getSetting('music_mode') || 'all';
export const getTodayHighlightColor = () => getSetting('today_highlight_color');
export const getTodayHighlightEnabled = () => getSetting('today_highlight_enabled') === 'true';
export const getAppLanguage = () => {
  const stored = localStorage.getItem('wb_app_language');
  if (stored === 'en' || stored === 'de') {
    return stored;
  }
  const browserLanguage = String(navigator.language || navigator.userLanguage || '').toLowerCase();
  const lang = browserLanguage.startsWith('en') ? 'en' : 'de';
  return lang === 'en' ? 'en' : 'de';
};
export const getPlanZoom = () => {
  const raw = getSetting('plan_zoom');
  const named = ['klein', 'mittel', 'gross', 'groß'];
  if (named.includes(raw)) {
    return raw === 'klein' ? 0.9 : raw === 'mittel' ? 1.15 : 1.4;
  }
  const n = parseFloat(raw);
  if (!Number.isNaN(n)) return Math.max(0.9, Math.min(1.4, n));
  return 1.15;
};
