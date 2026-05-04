// musicPlayer.js - plays real MP3 tracks from /assets/data/musicCatalog.json
// No oscillator/synth/beep fallback. If no tracks are found for a style: silent.

const STYLE_ALIASES = {
  none: 'none',
  deep_house: 'deep house',
  'deep house': 'deep house',
  nu_disco: 'nu disco',
  'nu disco': 'nu disco',
  tech_house: 'tech house',
  'tech house': 'tech house',
  synthwave: 'synthwave',
  edm: 'edm',
  techno: 'techno',
  lofi_hiphop: 'lo-fi hip hop',
  'lo-fi hip hop': 'lo-fi hip hop',
  ambient: 'ambient',
};

let audioEl = null;
let trackQueue = [];
let trackIndex = 0;
let loopMode = false;
let previewTimeout = null;
let catalogCache = null;

async function loadCatalog() {
  if (catalogCache) return catalogCache;
  try {
    const res = await fetch('/assets/data/musicCatalog.json');
    if (res.ok) {
      catalogCache = await res.json();
      console.log('[Music] musicCatalog geladen:', catalogCache);
      return catalogCache;
    }
    console.warn('[Music] musicCatalog.json konnte nicht geladen werden:', res.status);
  } catch (err) {
    console.warn('[Music] Fehler beim Laden von musicCatalog.json:', err);
  }
  return null;
}

function normalizeStyle(style) {
  if (!style) return null;
  const raw = String(style).trim().toLowerCase().replace(/[_-]+/g, ' ');
  return STYLE_ALIASES[raw] || raw;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getTrackSrc(track) {
  const src = track?.src || track?.url || null;
  return src ? encodeURI(src) : null;
}

function ensureAudioEl() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.volume = 0.7;
  }
  return audioEl;
}

async function getTracksForStyle(style, loop) {
  const catalog = await loadCatalog();
  if (!catalog) return [];

  const normalizedStyle = normalizeStyle(style);
  let tracks = [];

  if (Array.isArray(catalog.tracks)) {
    tracks = catalog.tracks.filter((track) => {
      const candidates = [
        track.style,
        track.musicStyle,
        ...(Array.isArray(track.styles) ? track.styles : []),
      ]
        .filter(Boolean)
        .map(normalizeStyle);
      return candidates.includes(normalizedStyle);
    });
  } else if (catalog.tracksByStyle) {
    const matchingKey = Object.keys(catalog.tracksByStyle).find(
      (key) => normalizeStyle(key) === normalizedStyle,
    );
    if (matchingKey && Array.isArray(catalog.tracksByStyle[matchingKey])) {
      tracks = catalog.tracksByStyle[matchingKey];
    }
  }

  console.log(
    `[Music] Stil: "${style}" -> "${normalizedStyle}", Gefundene Tracks: ${tracks.length}`,
    tracks.map((track) => getTrackSrc(track)),
  );

  if (tracks.length === 0) {
    console.warn(`[Music] Keine Tracks fuer Stil "${style}" gefunden - stumm bleiben.`);
    return [];
  }

  const loopableTracks = loop
    ? tracks.filter((track) => track.loopable === true || track.loop === true)
    : tracks;
  const finalTracks = loop && loopableTracks.length > 0 ? loopableTracks : tracks;

  return shuffle(finalTracks);
}

function playTrack(track) {
  const src = getTrackSrc(track);
  if (!src) {
    console.warn('[Music] Track hat keine src/url:', track);
    return;
  }

  const el = ensureAudioEl();
  el.src = src;
  el.loop = loopMode;
  el.onended = loopMode
    ? null
    : () => {
        trackIndex += 1;
        if (trackIndex < trackQueue.length) {
          playTrack(trackQueue[trackIndex]);
        } else {
          trackIndex = 0;
          playTrack(trackQueue[0]);
        }
      };

  console.log('[Music] Spiele Track:', src);
  el.play().catch((err) => {
    console.warn('[Music] audio.play() fehlgeschlagen:', err);
  });
}

function stopAudioEl() {
  if (!audioEl) return;
  audioEl.pause();
  audioEl.onended = null;
  audioEl.src = '';
}

async function primeAudioGesture(style, loop) {
  const tracks = await getTracksForStyle(style, loop);
  if (tracks.length === 0) return false;

  trackQueue = tracks;
  trackIndex = 0;
  loopMode = loop;

  const src = getTrackSrc(trackQueue[0]);
  if (!src) return false;

  const el = ensureAudioEl();
  el.src = src;
  el.loop = loop;
  el.volume = 0;

  try {
    await el.play();
    el.pause();
    el.currentTime = 0;
    el.volume = 0.7;
    console.log('[Music] Audio fuer spaeteren Start vorbereitet:', src);
    return true;
  } catch (err) {
    el.volume = 0.7;
    console.warn('[Music] prepareMusic() fehlgeschlagen:', err);
    return false;
  }
}

export async function startMusic(style, loop = false) {
  stopMusic();
  if (!style || style === 'none') return;

  console.log(`[Music] startMusic() - Stil: "${style}", Loop: ${loop}`);
  const tracks = await getTracksForStyle(style, loop);
  if (tracks.length === 0) return;

  trackQueue = tracks;
  trackIndex = 0;
  loopMode = loop;
  playTrack(trackQueue[0]);
}

export function stopMusic() {
  if (previewTimeout) {
    clearTimeout(previewTimeout);
    previewTimeout = null;
  }
  stopAudioEl();
  trackQueue = [];
  trackIndex = 0;
}

export async function previewMusic(style, duration = 4000, loop = false) {
  stopMusic();
  if (!style || style === 'none') return;
  await startMusic(style, loop);
  previewTimeout = setTimeout(() => stopMusic(), duration);
}

export function setMuted(muted) {
  if (audioEl) audioEl.volume = muted ? 0 : 0.7;
}

export async function prepareMusic(style, loop = false) {
  stopMusic();
  if (!style || style === 'none') return false;
  return primeAudioGesture(style, loop);
}
