import { Share } from '@capacitor/share';
import { toast } from 'sonner';

export async function shareText(text, fallbackLabel = 'Text') {
  try {
    await Share.share({ text });
    return true;
  } catch (error) {
    if (error?.name === 'AbortError') return false;
    if (!String(error?.message || '').includes('Share API not available')) {
      // Fall through to web/native clipboard fallback for unsupported environments.
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ text });
      return true;
    } catch (error) {
      if (error?.name === 'AbortError') return false;
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${fallbackLabel} wurde in die Zwischenablage kopiert.`);
    return true;
  } catch (_) {
    toast.error('Teilen und Kopieren nicht moeglich.');
    return false;
  }
}
