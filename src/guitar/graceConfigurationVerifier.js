import { verifyGraceTransitionWithTuning } from './graceTuningVerifier.js';

export const GRACE_CONFIGURATION_VERIFIER_POLICY =
  'HELD_STRINGS_RESERVED_THEN_LEXICOGRAPHIC_POSITION_PATH_1.0';

// TUNING-LAB-01 grace ranking is preserved. The shared fretboard primitives now
// interpret positions with the supplied capo-aware GuitarConfiguration.
export function verifyGraceTransitionWithConfiguration(request, guitarConfiguration) {
  return verifyGraceTransitionWithTuning(request, guitarConfiguration);
}
