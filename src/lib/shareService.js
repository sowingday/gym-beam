/**
 * lib/shareService.js
 *
 * Zentrale Share-Funktion für die App.
 * Kapselt die Web Share API mit sauberem Fallback (Clipboard).
 *
 * TODO (Capacitor): Ersetze navigator.share durch:
 *   import { Share } from '@capacitor/share';
 *   await Share.share({ text });
 */

import { toast } from 'sonner';

/**
 * Teile einen Text extern (Messenger etc.)
 * Gibt true zurück wenn Share erfolgreich (oder Clipboard-Copy), false bei Fehler.
 *
 * @param {string} text - Der zu teilende Text
 * @param {string} [fallbackLabel] - Label für die Toast-Meldung wenn Clipboard-Fallback genutzt wird
 */
export async function shareText(text, fallbackLabel = 'Text') {
  // Web Share API verfügbar (Mobile Browser / PWA)
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return true;
    } catch (err) {
      // AbortError = User hat Teilen-Dialog geschlossen → kein Fehler, kein Toast
      if (err?.name === 'AbortError') return false;
      // Anderer Fehler → Fallback auf Clipboard
    }
  }

  // Clipboard-Fallback (Desktop, localhost, nicht-HTTPS)
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${fallbackLabel} wurde in die Zwischenablage kopiert!`);
    return true;
  } catch (_) {
    toast.error('Teilen und Kopieren nicht möglich.');
    return false;
  }
}