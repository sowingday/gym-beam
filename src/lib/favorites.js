/**
 * lib/favorites.js
 *
 * Favoriten-Verwaltung für Übungen.
 * Gespeichert im localStorage unter "wb_fav_exercises".
 * Schlüssel: exercise_index (Number), z.B. [10000, 10041]
 *
 * Normalisierung beim Laden: alte String-IDs / "undefined"-Werte werden herausgefiltert.
 */

const KEY = 'wb_fav_exercises';

/**
 * Gibt den stabilen Schlüssel einer Übung zurück (immer Number wenn möglich).
 * Nur index/exercise_index wird akzeptiert — KEIN Fallback auf id.
 */
function exerciseKey(indexOrExercise) {
  if (indexOrExercise === null || indexOrExercise === undefined) return null;
  // Wenn Objekt übergeben wurde
  if (typeof indexOrExercise === 'object') {
    const idx = indexOrExercise.index ?? indexOrExercise.exercise_index;
    if (idx == null) return null;
    return Number(idx);
  }
  // Direkt ein Zahlenwert oder String-Zahl
  const n = Number(indexOrExercise);
  if (!isNaN(n) && n > 0) return n;
  return null;
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return new Set();
    // Normalisierung: nur gültige positive Zahlen behalten, "undefined"/null/leere Werte rausfiltern
    const cleaned = raw
      .map(v => {
        const n = Number(v);
        return (!isNaN(n) && n > 0) ? n : null;
      })
      .filter(v => v !== null);
    return new Set(cleaned);
  } catch (_) {
    return new Set();
  }
}

function save(set) {
  localStorage.setItem(KEY, JSON.stringify([...set]));
}

/** Gibt alle Favoriten-Indizes als Set<number> zurück */
export function getFavoriteIds() {
  return load();
}

/** Prüft ob eine Übung (per index oder Objekt) favorisiert ist */
export function isFavorite(indexOrExercise) {
  const key = exerciseKey(indexOrExercise);
  if (key === null) return false;
  return load().has(key);
}

/** Toggelt den Favoriten-Status; gibt true zurück wenn jetzt favorisiert */
export function toggleFavorite(indexOrExercise) {
  const key = exerciseKey(indexOrExercise);
  if (key === null) return false; // ungültige Übung — nichts tun
  const favs = load();
  if (favs.has(key)) {
    favs.delete(key);
  } else {
    favs.add(key);
  }
  save(favs);
  return favs.has(key);
}

/** Überschreibe lokale Favoriten mit einem Array von Indizes */
export function setFavoriteIds(indices) {
  const cleaned = (indices || [])
    .map(v => { const n = Number(v); return (!isNaN(n) && n > 0) ? n : null; })
    .filter(v => v !== null);
  save(new Set(cleaned));
}