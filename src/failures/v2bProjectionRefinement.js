export const V2B_PROJECTION_REFINEMENT_CONTRACT_VERSION = '1.0.0';
export const V2B_PROJECTION_REFINEMENT_ERROR_CODE = 'INVALID_V2B_PROJECTION_REFINEMENT_INPUT';

const TARGET_CODE = 'UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE';

function invalid(message, details = {}) {
  const error = new Error(message);
  error.name = 'V2BProjectionRefinementError';
  error.code = V2B_PROJECTION_REFINEMENT_ERROR_CODE;
  error.details = Object.freeze({ ...details });
  throw error;
}

function boundedText(value, field, maxLength = 256) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    invalid(`${field} must be a bounded non-empty string.`, { field });
  }
  return value;
}

function frozen(value) {
  if (Array.isArray(value)) {
    value.forEach(frozen);
    return Object.freeze(value);
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach(frozen);
    return Object.freeze(value);
  }
  return value;
}

function normalizedOccurrenceLocations(sourceOccurrences) {
  return sourceOccurrences.map((item) => ({
    partIndex: Number.isInteger(item.partIndex) ? item.partIndex : null,
    partId: typeof item.partId === 'string' ? item.partId : null,
    measureIndex: Number.isInteger(item.measureIndex) ? item.measureIndex : null,
    measureNumber: typeof item.measureNumber === 'string' ? item.measureNumber : null,
    measureChildIndex: Number.isInteger(item.measureChildIndex) ? item.measureChildIndex : null,
    noteOrdinal: Number.isInteger(item.noteOrdinal) ? item.noteOrdinal : null,
    matchedPath: typeof item.matchedPath === 'string' ? item.matchedPath : null,
  }));
}

function sourceSubtypeEvidence(sourceOccurrences) {
  const values = [];
  for (const occurrence of sourceOccurrences) {
    for (const path of occurrence?.sourceShape?.nestedChildPaths || []) {
      if (typeof path === 'string' && path.length > 0 && path.length <= 256) values.push(path);
    }
  }
  return [...new Set(values)].sort();
}

export function refineGenericProjectionFailure(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    invalid('Projection refinement input must be an object.');
  }
  const errorCode = boundedText(input.errorCode, 'errorCode');
  if (errorCode !== TARGET_CODE) invalid('V2B only refines the pinned generic projection code.', { errorCode });
  const observedFeature = boundedText(input.observedFeature, 'observedFeature');
  const details = input.details && typeof input.details === 'object' && !Array.isArray(input.details)
    ? input.details
    : {};
  const sourceOccurrences = Array.isArray(input.sourceOccurrences) ? input.sourceOccurrences : [];
  if (sourceOccurrences.length > 64) invalid('sourceOccurrences exceeds the bounded V2B limit.');
  const locations = normalizedOccurrenceLocations(sourceOccurrences);
  const subtypeEvidence = sourceSubtypeEvidence(sourceOccurrences);

  let failureFamily = 'GENERIC_PROJECTION_CAPABILITY';
  let scopeClass = 'FEATURE_CLASS';
  let handlingClass = 'NEEDS_FEATURE_REFINEMENT';
  let progressiveStateCandidate = 'UNSUPPORTED_LOCAL';
  let refinementRequired = true;
  let evidencePrecision = 'ENGINE_FEATURE_ONLY';

  if (observedFeature === 'direction') {
    failureFamily = 'DIRECTION_COMPATIBILITY';
    handlingClass = 'LOCAL_DIRECTION_REVIEW_CANDIDATE';
    progressiveStateCandidate = 'REVIEW_REQUIRED';
    if (
      Number.isInteger(details.measureIndex)
      && Number.isInteger(details.measureChildIndex)
      && sourceOccurrences.length === 1
    ) {
      scopeClass = 'MEASURE_CHILD';
      refinementRequired = false;
      evidencePrecision = 'ENGINE_FEATURE_WITH_ENGINE_MEASURE_LOCATION';
    }
  } else if (observedFeature === 'notation:dynamics') {
    failureFamily = 'NOTATION_DYNAMICS_COMPATIBILITY';
    handlingClass = 'LOCAL_NOTATION_REVIEW_CANDIDATE';
    progressiveStateCandidate = 'REVIEW_REQUIRED';
    if (sourceOccurrences.length === 1 && Number.isInteger(sourceOccurrences[0]?.noteOrdinal)) {
      scopeClass = 'NOTE_EVENT';
      refinementRequired = false;
      evidencePrecision = 'ENGINE_FEATURE_WITH_UNIQUE_SOURCE_OCCURRENCE';
    }
  } else if (observedFeature === 'harmony') {
    failureFamily = 'HARMONY_COMPATIBILITY';
    handlingClass = 'LOCAL_HARMONY_REVIEW_CANDIDATE';
    progressiveStateCandidate = 'REVIEW_REQUIRED';
    if (sourceOccurrences.length === 1) {
      scopeClass = 'MEASURE_CHILD';
      refinementRequired = false;
      evidencePrecision = 'ENGINE_FEATURE_WITH_UNIQUE_SOURCE_OCCURRENCE';
    } else if (sourceOccurrences.length > 1) {
      scopeClass = 'FEATURE_REGION_SET';
      refinementRequired = true;
      evidencePrecision = 'ENGINE_FEATURE_WITH_SOURCE_OCCURRENCE_SET';
    }
  }

  if (progressiveStateCandidate === 'BLOCKED_GLOBAL') {
    invalid('V2B semantic projection refinement must never produce BLOCKED_GLOBAL.');
  }

  return frozen({
    contractVersion: V2B_PROJECTION_REFINEMENT_CONTRACT_VERSION,
    engineErrorCode: errorCode,
    observedFeature,
    failureFamily,
    layer: 'PROJECTION_OR_COMPATIBILITY',
    scopeClass,
    scopeLocations: locations,
    handlingClass,
    progressiveStateCandidate,
    refinementRequired,
    evidencePrecision,
    sourceSubtypeEvidence: subtypeEvidence,
    sourceSubtypeIsContextNotEngineCause: true,
    productionAuthority: false,
    automaticRecoveryAuthorized: false,
  });
}
