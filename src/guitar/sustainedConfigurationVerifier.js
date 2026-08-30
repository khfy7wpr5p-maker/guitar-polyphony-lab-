import { verifySustainedPolyphonyWithTuning } from './sustainedTuningVerifier.js';

export const SUSTAINED_CONFIGURATION_VERIFIER_POLICY =
  'LEXICOGRAPHIC_DISTINCT_STRING_RESEARCH_BASELINE_1.0';

// The underlying TUNING-LAB-01 verifier deliberately keeps its ranking policy.
// Its physical primitives now resolve the single capo-aware GuitarConfiguration.
export function verifySustainedPolyphonyWithConfiguration(points, guitarConfiguration) {
  return verifySustainedPolyphonyWithTuning(points, guitarConfiguration);
}
