export const V2_FAILURE_INTELLIGENCE_CONTRACT_VERSION = '1.0.0';
export const V2_FAILURE_INTELLIGENCE_ERROR_CODE = 'INVALID_V2_FAILURE_INTELLIGENCE_INPUT';

const PROVIDERS = new Set(['LAB', 'ENGINE']);
const PHASES = new Set(['RAW_INPUT', 'SEMANTIC_PROBE']);
const PROGRESSIVE_STATES = new Set(['REVIEW_REQUIRED', 'UNSUPPORTED_LOCAL', 'BLOCKED_GLOBAL']);

const TAXONOMY = Object.freeze({
  'LAB:RAW_INPUT:DOCTYPE_NOT_ALLOWED': Object.freeze({
    failureFamily: 'INPUT_SECURITY',
    layer: 'TRUST_BOUNDARY',
    scopeClass: 'SCORE_INPUT',
    handlingClass: 'GLOBAL_TRUST_REJECT',
    progressiveStateCandidate: 'BLOCKED_GLOBAL',
    refinementRequired: false,
    evidencePrecision: 'EXACT_CODE',
    sourceAnchors: Object.freeze([
      Object.freeze({ repository: 'LAB', path: 'src/musicxml/inputGate.js' }),
    ]),
  }),
  'ENGINE:RAW_INPUT:UNSAFE_XML_DECLARATION': Object.freeze({
    failureFamily: 'INPUT_SECURITY',
    layer: 'TRUST_BOUNDARY',
    scopeClass: 'SCORE_INPUT',
    handlingClass: 'GLOBAL_TRUST_REJECT',
    progressiveStateCandidate: 'BLOCKED_GLOBAL',
    refinementRequired: false,
    evidencePrecision: 'EXACT_CODE',
    sourceAnchors: Object.freeze([
      Object.freeze({ repository: 'ENGINE', path: 'src/validation/xmlSafety.js' }),
    ]),
  }),
  'LAB:SEMANTIC_PROBE:PART_SELECTION_REQUIRED': Object.freeze({
    failureFamily: 'SOURCE_SELECTION',
    layer: 'SEMANTIC_COMPARISON_INPUT',
    scopeClass: 'PART_SET',
    handlingClass: 'EXPLICIT_SELECTION_REQUIRED',
    progressiveStateCandidate: 'REVIEW_REQUIRED',
    refinementRequired: false,
    evidencePrecision: 'EXACT_CODE',
    sourceAnchors: Object.freeze([
      Object.freeze({ repository: 'LAB', path: 'src/verification/semanticComparator.js' }),
    ]),
  }),
  'LAB:SEMANTIC_PROBE:UNSUPPORTED_GRACE_NOTE': Object.freeze({
    failureFamily: 'SOURCE_SEMANTIC_CAPABILITY',
    layer: 'LAB_SEMANTIC_EXTRACTION',
    scopeClass: 'EVENT',
    handlingClass: 'LOCAL_SEMANTIC_DEFER',
    progressiveStateCandidate: 'REVIEW_REQUIRED',
    refinementRequired: false,
    evidencePrecision: 'EXACT_CODE_WITH_LOCATION_CAPABLE_ERROR',
    sourceAnchors: Object.freeze([
      Object.freeze({ repository: 'LAB', path: 'src/musicxml/partwiseParser.js' }),
    ]),
  }),
  'ENGINE:SEMANTIC_PROBE:UNSUPPORTED_POLYPHONIC_TRIPLET_TIME_MODIFICATION': Object.freeze({
    failureFamily: 'RHYTHM_COMPATIBILITY',
    layer: 'COMPATIBILITY_NORMALIZATION',
    scopeClass: 'RHYTHMIC_EVENT_REGION',
    handlingClass: 'LOCAL_RHYTHM_RECOVERY_CANDIDATE',
    progressiveStateCandidate: 'REVIEW_REQUIRED',
    refinementRequired: false,
    evidencePrecision: 'EXACT_CODE',
    sourceAnchors: Object.freeze([
      Object.freeze({ repository: 'ENGINE', path: 'src/parser/polyphonicTripletTimeModificationNormalizer.js' }),
    ]),
  }),
  'ENGINE:SEMANTIC_PROBE:UNSUPPORTED_POLYPHONIC_GRACE_ORNAMENT': Object.freeze({
    failureFamily: 'ORNAMENT_COMPATIBILITY',
    layer: 'COMPATIBILITY_NORMALIZATION',
    scopeClass: 'ORNAMENT_EVENT_REGION',
    handlingClass: 'LOCAL_ORNAMENT_RECOVERY_CANDIDATE',
    progressiveStateCandidate: 'REVIEW_REQUIRED',
    refinementRequired: false,
    evidencePrecision: 'EXACT_CODE',
    sourceAnchors: Object.freeze([
      Object.freeze({ repository: 'ENGINE', path: 'src/parser/polyphonicGraceOrnamentExtractor.js' }),
    ]),
  }),
  'ENGINE:SEMANTIC_PROBE:UNSUPPORTED_POLYPHONIC_REPEAT_BARLINE': Object.freeze({
    failureFamily: 'PLAYBACK_STRUCTURE',
    layer: 'COMPATIBILITY_NORMALIZATION',
    scopeClass: 'MEASURE_REGION',
    handlingClass: 'LOCAL_REPEAT_REVIEW_CANDIDATE',
    progressiveStateCandidate: 'REVIEW_REQUIRED',
    refinementRequired: false,
    evidencePrecision: 'EXACT_CODE_WITH_ENGINE_REVIEW_EVIDENCE',
    sourceAnchors: Object.freeze([
      Object.freeze({ repository: 'ENGINE', path: 'src/parser/polyphonicRepeatBarlineNormalizer.js' }),
      Object.freeze({ repository: 'ENGINE', path: 'src/app/musicXmlUploadRuntime.js' }),
    ]),
  }),
  'ENGINE:SEMANTIC_PROBE:UNSUPPORTED_POLYPHONIC_TIME_SIGNATURE_DISPLAY': Object.freeze({
    failureFamily: 'PRESENTATION_COMPATIBILITY',
    layer: 'COMPATIBILITY_NORMALIZATION',
    scopeClass: 'MEASURE_DISPLAY',
    handlingClass: 'LOCAL_PRESENTATION_NORMALIZATION_CANDIDATE',
    progressiveStateCandidate: 'REVIEW_REQUIRED',
    refinementRequired: false,
    evidencePrecision: 'EXACT_CODE_DISPLAY_AUTHORITY',
    sourceAnchors: Object.freeze([
      Object.freeze({ repository: 'ENGINE', path: 'src/parser/polyphonicTimeSignatureDisplayNormalizer.js' }),
    ]),
  }),
  'ENGINE:SEMANTIC_PROBE:UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE': Object.freeze({
    failureFamily: 'GENERIC_PROJECTION_CAPABILITY',
    layer: 'PROJECTION_OR_COMPATIBILITY',
    scopeClass: 'UNKNOWN_LOCAL',
    handlingClass: 'NEEDS_FEATURE_REFINEMENT',
    progressiveStateCandidate: 'UNSUPPORTED_LOCAL',
    refinementRequired: true,
    evidencePrecision: 'GENERIC_CODE_MULTIPLE_EMITTERS',
    sourceAnchors: Object.freeze([
      Object.freeze({ repository: 'ENGINE', path: 'src/parser/polyphonicMusicXmlProjector.js' }),
      Object.freeze({ repository: 'ENGINE', path: 'src/app/runtimeGuitarNotationNormalizer.js' }),
      Object.freeze({ repository: 'ENGINE', path: 'src/app/guitarTechniqueCompatibilityNormalizer.js' }),
    ]),
  }),
});

function invalid(message, details = {}) {
  const error = new Error(message);
  error.name = 'V2FailureIntelligenceError';
  error.code = V2_FAILURE_INTELLIGENCE_ERROR_CODE;
  error.details = Object.freeze({ ...details });
  throw error;
}

function boundedText(value, field, maxLength = 256) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    invalid(`${field} must be a bounded non-empty string.`, { field });
  }
  return value;
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    value.forEach(deepFreeze);
    return Object.freeze(value);
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }
  return value;
}

export function failureTaxonomyEntries() {
  return TAXONOMY;
}

export function classifyObservedFailure(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    invalid('Failure observation must be an object.');
  }
  const provider = boundedText(input.provider, 'provider', 32);
  const phase = boundedText(input.phase, 'phase', 32);
  const errorCode = boundedText(input.errorCode, 'errorCode', 256);
  if (!PROVIDERS.has(provider)) invalid('Unknown failure provider.', { provider });
  if (!PHASES.has(phase)) invalid('Unknown failure phase.', { phase });

  const key = `${provider}:${phase}:${errorCode}`;
  const taxonomy = TAXONOMY[key];
  if (!taxonomy) {
    return deepFreeze({
      contractVersion: V2_FAILURE_INTELLIGENCE_CONTRACT_VERSION,
      provider,
      phase,
      errorCode,
      failureFamily: 'UNCLASSIFIED_FAILURE',
      layer: 'UNKNOWN',
      scopeClass: 'UNKNOWN',
      handlingClass: 'NEEDS_TAXONOMY_ENTRY',
      progressiveStateCandidate: 'UNSUPPORTED_LOCAL',
      refinementRequired: true,
      evidencePrecision: 'UNMAPPED_CODE',
      sourceAnchors: [],
    });
  }
  if (!PROGRESSIVE_STATES.has(taxonomy.progressiveStateCandidate)) {
    invalid('Taxonomy entry has an invalid progressive state candidate.', { key });
  }
  return deepFreeze({
    contractVersion: V2_FAILURE_INTELLIGENCE_CONTRACT_VERSION,
    provider,
    phase,
    errorCode,
    ...structuredClone(taxonomy),
  });
}

export function assertNoSemanticGlobalBlock(classification) {
  if (
    classification.phase === 'SEMANTIC_PROBE'
    && classification.progressiveStateCandidate === 'BLOCKED_GLOBAL'
  ) {
    invalid('Semantic capability evidence must not be promoted to a global block by V2 taxonomy.', {
      provider: classification.provider,
      errorCode: classification.errorCode,
    });
  }
  return classification;
}
