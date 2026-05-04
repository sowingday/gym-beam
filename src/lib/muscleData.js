import { MUSCLE_KEY_MAP, getMuscleImagePath } from './assetResolver';

/**
 * region: 'upper' | 'core' | 'lower' | 'back'
 * Maps German display names → latin name + body region
 */
export const MUSCLE_DATA = {
  'Schultern':             { latin: 'Musculus deltoideus', region: 'upper' },
  'Hintere Schultern':     { latin: 'Musculus deltoideus (Pars spinalis)', region: 'upper' },
  'Vordere Schultern':     { latin: 'Musculus deltoideus (Pars clavicularis)', region: 'upper' },
  'Seitliche Schultern':   { latin: 'Musculus deltoideus (Pars acromialis)', region: 'upper' },
  'Brust':                 { latin: 'Musculus pectoralis major', region: 'upper' },
  'Brustmuskeln':          { latin: 'Musculus pectoralis major', region: 'upper' },
  'Trizeps':               { latin: 'Musculus triceps brachii', region: 'upper' },
  'Bizeps':                { latin: 'Musculus biceps brachii', region: 'upper' },
  'Rotatorenmanschette':   { latin: 'Musculi rotatorii humeri', region: 'upper' },
  'Nacken':                { latin: 'Musculus trapezius (Pars descendens)', region: 'upper' },
  'Core':                  { latin: 'Musculus rectus abdominis / Transversus abdominis', region: 'core' },
  'Bauchmuskeln':          { latin: 'Musculus rectus abdominis', region: 'core' },
  'Untere Bauchmuskeln':   { latin: 'Musculus rectus abdominis (Pars inferior)', region: 'core' },
  'Schräge Bauchmuskeln':  { latin: 'Musculus obliquus externus abdominis', region: 'core' },
  'Rücken':                { latin: 'Musculus trapezius / Musculus latissimus dorsi', region: 'back' },
  'Unterer Rücken':        { latin: 'Musculus erector spinae', region: 'back' },
  'Oberer Rücken':         { latin: 'Musculus trapezius / Musculi rhomboidei', region: 'back' },
  'Latissimus':            { latin: 'Musculus latissimus dorsi', region: 'back' },
  'Trapezius':             { latin: 'Musculus trapezius', region: 'back' },
  'Wirbelsäule':           { latin: 'Musculus erector spinae', region: 'back' },
  'Gesäß':                 { latin: 'Musculus gluteus maximus', region: 'lower' },
  'Hüftabduktoren':        { latin: 'Musculus gluteus medius / Minimus', region: 'lower' },
  'Hüftbeuger':            { latin: 'Musculus iliopsoas', region: 'lower' },
  'Hüftadduktoren':        { latin: 'Musculi adductores', region: 'lower' },
  'Hüftrotatoren':         { latin: 'Musculi rotatorii coxae', region: 'lower' },
  'Piriformis':            { latin: 'Musculus piriformis', region: 'lower' },
  'Leiste':                { latin: 'Musculi adductores / Ligamentum inguinale', region: 'lower' },
  'Quadrizeps':            { latin: 'Musculus quadriceps femoris', region: 'lower' },
  'Hamstrings':            { latin: 'Musculi ischiocrurale', region: 'lower' },
  'Waden':                 { latin: 'Musculus gastrocnemius / Soleus', region: 'lower' },
  'Schienbeinmuskulatur':  { latin: 'Musculus tibialis anterior', region: 'lower' },
  'Beinmuskulatur':        { latin: 'Musculi membri inferioris', region: 'lower' },
  'Fußgelenk-Stabilisatoren': { latin: 'Musculi peronei / M. tibialis posterior', region: 'lower' },
  'IT-Band':               { latin: 'Tractus iliotibialis', region: 'lower' },
};

/**
 * English canonical key → latin + region (for new exercise data format)
 */
export const MUSCLE_DATA_EN = {
  'chest':             { latin: 'Musculus pectoralis major', region: 'upper' },
  'triceps':           { latin: 'Musculus triceps brachii', region: 'upper' },
  'biceps':            { latin: 'Musculus biceps brachii', region: 'upper' },
  'shoulders':         { latin: 'Musculus deltoideus', region: 'upper' },
  'shoulders-rear':    { latin: 'Musculus deltoideus (Pars spinalis)', region: 'upper' },
  'shoulders-front':   { latin: 'Musculus deltoideus (Pars clavicularis)', region: 'upper' },
  'shoulders-lateral': { latin: 'Musculus deltoideus (Pars acromialis)', region: 'upper' },
  'rotator-cuff':      { latin: 'Musculi rotatorii humeri', region: 'upper' },
  'neck':              { latin: 'Musculus trapezius (Pars descendens)', region: 'upper' },
  'core':              { latin: 'Musculus rectus abdominis / Transversus abdominis', region: 'core' },
  'abs':               { latin: 'Musculus rectus abdominis', region: 'core' },
  'abs-lower':         { latin: 'Musculus rectus abdominis (Pars inferior)', region: 'core' },
  'obliques':          { latin: 'Musculus obliquus externus abdominis', region: 'core' },
  'back':              { latin: 'Musculus trapezius / Musculus latissimus dorsi', region: 'back' },
  'back-lower':        { latin: 'Musculus erector spinae', region: 'back' },
  'back-upper':        { latin: 'Musculus trapezius / Musculi rhomboidei', region: 'back' },
  'lats':              { latin: 'Musculus latissimus dorsi', region: 'back' },
  'traps':             { latin: 'Musculus trapezius', region: 'back' },
  'spine':             { latin: 'Musculus erector spinae', region: 'back' },
  'glutes':            { latin: 'Musculus gluteus maximus', region: 'lower' },
  'hip-abductors':     { latin: 'Musculus gluteus medius / Minimus', region: 'lower' },
  'hip-flexors':       { latin: 'Musculus iliopsoas', region: 'lower' },
  'hip-adductors':     { latin: 'Musculi adductores', region: 'lower' },
  'hip-rotators':      { latin: 'Musculi rotatorii coxae', region: 'lower' },
  'piriformis':        { latin: 'Musculus piriformis', region: 'lower' },
  'groin':             { latin: 'Musculi adductores / Ligamentum inguinale', region: 'lower' },
  'quadriceps':        { latin: 'Musculus quadriceps femoris', region: 'lower' },
  'hamstrings':        { latin: 'Musculi ischiocrurale', region: 'lower' },
  'calves':            { latin: 'Musculus gastrocnemius / Soleus', region: 'lower' },
  'tibialis':          { latin: 'Musculus tibialis anterior', region: 'lower' },
  'legs':              { latin: 'Musculi membri inferioris', region: 'lower' },
  'ankle-stabilizers': { latin: 'Musculi peronei / M. tibialis posterior', region: 'lower' },
  'it-band':           { latin: 'Tractus iliotibialis', region: 'lower' },
  'full-body':         { latin: 'Musculi corporis totius', region: 'lower' },
};

/**
 * Parse a muscles string (German, comma-separated) into an array of known names.
 * For legacy exercise data.
 */
export function parseMuscles(musclesString) {
  if (!musclesString) return [];
  return musclesString
    .split(',')
    .map(m => m.trim())
    .filter(m => m && MUSCLE_DATA[m]);
}

/**
 * Resolve muscles from new format (English array of canonical keys).
 * Returns array of { key, latin, region } objects.
 */
export function resolveMusclesEn(musclesArray) {
  if (!musclesArray || !Array.isArray(musclesArray)) return [];
  return musclesArray
    .map(key => {
      const data = MUSCLE_DATA_EN[key];
      if (!data) return null;
      return { key, latin: data.latin, region: data.region, imagePath: getMuscleImagePath(key) };
    })
    .filter(Boolean);
}