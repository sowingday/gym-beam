/**
 * Central asset resolver functions.
 * After Capacitor export, only these functions need to be adapted —
 * e.g. using Capacitor.convertFileSrc() for local file paths.
 *
 * Convention:
 *   Animations: /assets/animations/{index}.json  (e.g. 10000.json)
 *   Muscle images: /assets/muscles/{key}.png
 *   Muscle-group images: /assets/muscle-groups/{key}.png
 */

// ---------------------------------------------------------------------------
// Animation resolver
// ---------------------------------------------------------------------------

/**
 * Returns the path to the animation JSON file for a given exercise index.
 * @param {number} index - The exercise index (e.g. 10000)
 * @returns {string} Path to the animation file
 */
export function getAnimationPath(index) {
  if (!index && index !== 0) return null;
  return `/assets/animations/${index}.json`;
}

// ---------------------------------------------------------------------------
// Muscle image resolver
// ---------------------------------------------------------------------------

/**
 * Canonical muscle keys (lowercase, English, single word or hyphen).
 * Maps from display names (German or English) to a stable asset key.
 */
export const MUSCLE_KEY_MAP = {
  // German names
  'Schultern':               'shoulders',
  'Hintere Schultern':       'shoulders-rear',
  'Vordere Schultern':       'shoulders-front',
  'Seitliche Schultern':     'shoulders-lateral',
  'Brust':                   'chest',
  'Brustmuskeln':            'chest',
  'Trizeps':                 'triceps',
  'Bizeps':                  'biceps',
  'Rotatorenmanschette':     'rotator-cuff',
  'Nacken':                  'neck',
  'Core':                    'core',
  'Bauchmuskeln':            'abs',
  'Untere Bauchmuskeln':     'abs-lower',
  'Schräge Bauchmuskeln':    'obliques',
  'Rücken':                  'back',
  'Unterer Rücken':          'back-lower',
  'Oberer Rücken':           'back-upper',
  'Latissimus':              'lats',
  'Trapezius':               'traps',
  'Wirbelsäule':             'spine',
  'Gesäß':                   'glutes',
  'Hüftabduktoren':          'hip-abductors',
  'Hüftbeuger':              'hip-flexors',
  'Hüftadduktoren':          'hip-adductors',
  'Hüftrotatoren':           'hip-rotators',
  'Piriformis':              'piriformis',
  'Leiste':                  'groin',
  'Quadrizeps':              'quadriceps',
  'Hamstrings':              'hamstrings',
  'Waden':                   'calves',
  'Schienbeinmuskulatur':    'tibialis',
  'Beinmuskulatur':          'legs',
  'Fußgelenk-Stabilisatoren':'ankle-stabilizers',
  'IT-Band':                 'it-band',
  'Ganzkörper':              'full-body',
  // English names (used in new exercise data format)
  'chest':                   'chest',
  'triceps':                 'triceps',
  'biceps':                  'biceps',
  'shoulders':               'shoulders',
  'back':                    'back',
  'abs':                     'abs',
  'core':                    'core',
  'glutes':                  'glutes',
  'quadriceps':              'quadriceps',
  'hamstrings':              'hamstrings',
  'calves':                  'calves',
  'obliques':                'obliques',
  'lats':                    'lats',
  'traps':                   'traps',
  'hip-flexors':             'hip-flexors',
  'hip-abductors':           'hip-abductors',
  'rotator-cuff':            'rotator-cuff',
  'full-body':               'full-body',
};

/**
 * Returns the path to the image for a specific muscle key.
 * @param {string} muscleNameOrKey - Display name or canonical key
 * @returns {string|null} Image path, or null if not resolved
 */
export function getMuscleImagePath(muscleNameOrKey) {
  if (!muscleNameOrKey) return null;
  const key = MUSCLE_KEY_MAP[muscleNameOrKey] || muscleNameOrKey.toLowerCase().replace(/\s+/g, '-');
  return `/assets/muscles/${key}.png`;
}

// ---------------------------------------------------------------------------
// Muscle-group image resolver
// ---------------------------------------------------------------------------

/**
 * Canonical muscle-group keys.
 */
export const MUSCLE_GROUP_KEYS = {
  upper:   'upper',
  core:    'core',
  back:    'back',
  lower:   'lower',
};

/**
 * Returns the path to the muscle-group image.
 * @param {string} groupKey - One of 'upper', 'core', 'back', 'lower'
 * @returns {string|null}
 */
export function getMuscleGroupImagePath(groupKey) {
  if (!groupKey) return null;
  return `/assets/muscle-groups/${groupKey}.png`;
}