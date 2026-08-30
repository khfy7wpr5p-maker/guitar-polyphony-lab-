const KINDS = new Set([
  'HAMMER_ON',
  'PULL_OFF',
  'SLIDE',
  'BEND',
  'HARMONIC',
  'MUTE',
  'LET_RING',
  'TAP',
  'POSITION',
  'OTHER',
]);

const STATES = new Set(['START', 'STOP', 'SINGLE', 'UNKNOWN']);
const CAPABILITY_CLASSES = new Set([
  'SAFE_METADATA_ONLY',
  'PHYSICAL_SEMANTICS_SUPPORTED',
  'BLOCKED_UNKNOWN_OR_AMBIGUOUS',
]);
const FORBIDDEN_MUSICAL_FACT_FIELDS = new Set([
  'pitch',
  'octave',
  'onset',
  'duration',
  'voice',
  'staff',
  'tie',
  'grace',
  'chordMembership',
  'candidate',
  'candidates',
  'ranking',
  'solverState',
]);

export class GuitarTechniqueProvenanceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'GuitarTechniqueProvenanceError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new GuitarTechniqueProvenanceError(code, message, details);
}

function boundedString(value, field, { min = 1, max = 256, pattern = null } = {}) {
  if (typeof value !== 'string' || value.length < min || value.length > max) {
    fail('INVALID_TECHNIQUE_PROVENANCE_FIELD', `${field} must be a bounded string.`, { field });
  }
  if (pattern && !pattern.test(value)) {
    fail('INVALID_TECHNIQUE_PROVENANCE_FIELD', `${field} has an invalid format.`, { field });
  }
  return value;
}

function boundedSourceAttributes(value) {
  if (value === undefined || value === null) return Object.freeze({});
  if (typeof value !== 'object' || Array.isArray(value)) {
    fail('INVALID_SOURCE_ATTRIBUTES', 'sourceAttributes must be a plain bounded object.');
  }

  const entries = Object.entries(value);
  if (entries.length > 16) {
    fail('SOURCE_ATTRIBUTES_LIMIT_EXCEEDED', 'sourceAttributes may contain at most 16 entries.');
  }

  const normalized = {};
  for (const [key, rawValue] of entries.sort(([left], [right]) => left.localeCompare(right))) {
    boundedString(key, 'sourceAttributes key', {
      max: 64,
      pattern: /^[A-Za-z_][A-Za-z0-9_.:-]*$/,
    });
    boundedString(rawValue, `sourceAttributes.${key}`, { min: 0, max: 256 });
    normalized[key] = rawValue;
  }
  return Object.freeze(normalized);
}

function normalizeOptionalSourceText(value) {
  if (value === undefined || value === null) return null;
  return boundedString(value, 'sourceText', { min: 0, max: 256 });
}

function rejectMusicalFactAuthority(input) {
  for (const field of FORBIDDEN_MUSICAL_FACT_FIELDS) {
    if (Object.hasOwn(input, field)) {
      fail(
        'MUSICAL_FACT_AUTHORITY_FORBIDDEN',
        'Guitar technique provenance must not carry or override source musical facts or solver state.',
        { field },
      );
    }
  }
}

function validatePairing({ state, pairingId, pairingBasis, sourcePairingToken }) {
  const hasAnyPairing = pairingId !== undefined || pairingBasis !== undefined || sourcePairingToken !== undefined;
  if (!hasAnyPairing) {
    return Object.freeze({ pairingId: null, pairingBasis: null, sourcePairingToken: null });
  }

  if (state !== 'START' && state !== 'STOP') {
    fail('PAIRING_NOT_ALLOWED_FOR_STATE', 'Only START or STOP provenance may carry deterministic pairing identity.', {
      state,
    });
  }
  boundedString(pairingId, 'pairingId', { max: 96, pattern: /^[A-Za-z0-9_.:-]+$/ });
  if (pairingBasis !== 'DETERMINISTIC_SOURCE_IDENTITY') {
    fail('NON_DETERMINISTIC_PAIRING_FORBIDDEN', 'pairingBasis must prove deterministic source identity.');
  }
  boundedString(sourcePairingToken, 'sourcePairingToken', { max: 128 });

  return Object.freeze({ pairingId, pairingBasis, sourcePairingToken });
}

export function createGuitarTechniqueProvenance(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('INVALID_TECHNIQUE_PROVENANCE_INPUT', 'Technique provenance input must be an object.');
  }
  rejectMusicalFactAuthority(input);

  const kind = input.kind;
  if (!KINDS.has(kind)) fail('UNKNOWN_TECHNIQUE_KIND', 'Unknown guitar technique kind.', { kind });

  const state = input.state;
  if (!STATES.has(state)) fail('UNKNOWN_TECHNIQUE_STATE', 'Unknown guitar technique state.', { state });

  const capabilityClass = input.capabilityClass;
  if (!CAPABILITY_CLASSES.has(capabilityClass)) {
    fail('UNKNOWN_CAPABILITY_CLASS', 'Unknown guitar technique capability class.', { capabilityClass });
  }
  if (capabilityClass === 'PHYSICAL_SEMANTICS_SUPPORTED') {
    fail(
      'LAB_PHYSICAL_SEMANTICS_FORBIDDEN',
      'LAB-TECH-02 may represent provenance only; physical solver authority requires a later explicitly approved stage.',
    );
  }

  const subtype = boundedString(input.subtype, 'subtype', { max: 96 });
  const sourcePath = boundedString(input.sourcePath, 'sourcePath', {
    max: 192,
    pattern: /^note(?:\/[A-Za-z][A-Za-z0-9_-]*)+$/,
  });
  const normalizedSemantics = boundedString(input.normalizedSemantics, 'normalizedSemantics', {
    max: 96,
    pattern: /^[A-Z][A-Z0-9_:-]*$/,
  });

  if (capabilityClass === 'BLOCKED_UNKNOWN_OR_AMBIGUOUS' && normalizedSemantics !== 'UNKNOWN') {
    fail(
      'BLOCKED_SEMANTICS_MUST_BE_UNKNOWN',
      'Blocked or ambiguous technique provenance must not claim normalized semantics.',
    );
  }

  const pairing = validatePairing({
    state,
    pairingId: input.pairingId,
    pairingBasis: input.pairingBasis,
    sourcePairingToken: input.sourcePairingToken,
  });

  return Object.freeze({
    documentType: 'GuitarTechniqueProvenance',
    contractVersion: '1.0.0',
    kind,
    subtype,
    state,
    sourcePath,
    sourceAttributes: boundedSourceAttributes(input.sourceAttributes),
    sourceText: normalizeOptionalSourceText(input.sourceText),
    pairingId: pairing.pairingId,
    pairingBasis: pairing.pairingBasis,
    sourcePairingToken: pairing.sourcePairingToken,
    normalizedSemantics,
    capabilityClass,
  });
}

export function assertDeterministicTechniquePair(start, stop) {
  if (!start || !stop || start.documentType !== 'GuitarTechniqueProvenance' || stop.documentType !== 'GuitarTechniqueProvenance') {
    fail('INVALID_TECHNIQUE_PAIR', 'Both pair members must be GuitarTechniqueProvenance records.');
  }
  if (start.state !== 'START' || stop.state !== 'STOP') {
    fail('INVALID_TECHNIQUE_PAIR_STATE', 'Technique pair must be ordered START then STOP.');
  }
  if (!start.pairingId || !stop.pairingId || start.pairingBasis !== 'DETERMINISTIC_SOURCE_IDENTITY' || stop.pairingBasis !== 'DETERMINISTIC_SOURCE_IDENTITY') {
    fail('UNPROVEN_TECHNIQUE_PAIR', 'Technique pair requires deterministic source pairing on both records.');
  }
  if (
    start.pairingId !== stop.pairingId
    || start.sourcePairingToken !== stop.sourcePairingToken
    || start.kind !== stop.kind
    || start.subtype !== stop.subtype
  ) {
    fail('CONFLICTING_TECHNIQUE_PAIR', 'Technique pair identities or semantic kinds conflict.');
  }

  return Object.freeze({
    documentType: 'GuitarTechniqueProvenancePair',
    contractVersion: '1.0.0',
    pairingId: start.pairingId,
    sourcePairingToken: start.sourcePairingToken,
    kind: start.kind,
    subtype: start.subtype,
    start,
    stop,
  });
}

export const guitarTechniqueProvenanceContract = Object.freeze({
  contractVersion: '1.0.0',
  kinds: Object.freeze([...KINDS]),
  states: Object.freeze([...STATES]),
  capabilityClasses: Object.freeze([...CAPABILITY_CLASSES]),
  physicalSemanticsEnabled: false,
});
