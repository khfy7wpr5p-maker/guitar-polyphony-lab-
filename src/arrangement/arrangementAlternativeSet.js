import { types as utilTypes } from 'node:util';

const { isProxy } = utilTypes;

export const ARRANGEMENT_ALTERNATIVE_SET_VERSION = '1.1.0';
export const ARRANGEMENT_ALTERNATIVE_SET_DOCUMENT_TYPE = 'GuitarArrangementAlternativeSet';
export const ARRANGEMENT_ALTERNATIVE_DOCUMENT_TYPE = 'GuitarArrangementAlternative';
export const ARRANGEMENT_DECISION_TYPES = Object.freeze([
  'PRESERVED',
  'OMITTED',
  'OCTAVE_DISPLACED',
  'VOICE_REDISTRIBUTED',
  'CHORD_REDUCED',
  'REVOICED',
  'ARPEGGIATED',
]);
export const ARRANGEMENT_STRATEGY_TAGS = Object.freeze([
  'MELODY_PRESERVATION',
  'BASS_PRESERVATION',
  'VOICE_PRIORITY',
  'INNER_VOICE_REDUCTION',
  'REGISTER_COMPRESSION',
  'ARPEGGIATION',
]);
export const ARRANGEMENT_CONTRACT_LIMITS = Object.freeze({
  maxAlternatives: 32,
  maxSourceEvents: 4096,
  maxSourceGroupEvents: 128,
  maxIdLength: 256,
  maxOctaveShiftSemitones: 36,
});

const DECISION_TYPE_SET = new Set(ARRANGEMENT_DECISION_TYPES);
const STRATEGY_TAG_SET = new Set(ARRANGEMENT_STRATEGY_TAGS);
const GROUP_DECISION_TYPES = new Set(['CHORD_REDUCED', 'REVOICED', 'ARPEGGIATED']);
const SINGLE_EVENT_DECISION_TYPES = new Set([
  'PRESERVED',
  'OMITTED',
  'OCTAVE_DISPLACED',
  'VOICE_REDISTRIBUTED',
]);

export class ArrangementAlternativeContractError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ArrangementAlternativeContractError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new ArrangementAlternativeContractError(code, message, details);
}

function assertPlainObject(value, path) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail('INVALID_ARRANGEMENT_CONTRACT_INPUT', `${path} must be a non-proxy plain object.`, { path });
  }
  return value;
}

function assertExactKeys(value, allowedKeys, path) {
  assertPlainObject(value, path);
  const allowed = new Set(allowedKeys);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.has(key)) {
      fail('INVALID_ARRANGEMENT_CONTRACT_FIELD', `${path} contains an unknown field.`, {
        path,
        field: typeof key === 'symbol' ? key.toString() : key,
      });
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      fail('HOSTILE_ARRANGEMENT_CONTRACT_INPUT', `${path} fields must be enumerable data properties.`, {
        path,
        field: key,
      });
    }
  }
}

function assertDenseArray(value, path, maximumLength) {
  if (
    !Array.isArray(value)
    || isProxy(value)
    || Object.getPrototypeOf(value) !== Array.prototype
    || value.length > maximumLength
  ) {
    fail('INVALID_ARRANGEMENT_CONTRACT_INPUT', `${path} must be a bounded native array.`, {
      path,
      maximumLength,
    });
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      fail('INVALID_ARRANGEMENT_CONTRACT_INPUT', `${path} must be dense.`, { path, index });
    }
  }
}

function boundedId(value, path) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > ARRANGEMENT_CONTRACT_LIMITS.maxIdLength
  ) {
    fail('INVALID_ARRANGEMENT_ID', `${path} must be a bounded non-empty string.`, { path });
  }
  return value;
}

function boundedVoice(value, path) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
    fail('INVALID_ARRANGEMENT_TARGET', `${path} must be a bounded non-empty voice identifier.`, { path });
  }
  return value;
}

function normalizeSource(sourceInput) {
  assertExactKeys(sourceInput, ['partId', 'events', 'groups'], 'source');
  const partId = boundedId(sourceInput.partId, 'source.partId');
  assertDenseArray(
    sourceInput.events,
    'source.events',
    ARRANGEMENT_CONTRACT_LIMITS.maxSourceEvents,
  );
  assertDenseArray(
    sourceInput.groups,
    'source.groups',
    ARRANGEMENT_CONTRACT_LIMITS.maxSourceEvents,
  );

  const eventIds = new Set();
  const events = sourceInput.events.map((event, index) => {
    const path = `source.events[${index}]`;
    assertExactKeys(event, ['sourceEventId', 'midi', 'voice', 'staff'], path);
    const sourceEventId = boundedId(event.sourceEventId, `${path}.sourceEventId`);
    if (eventIds.has(sourceEventId)) {
      fail('DUPLICATE_SOURCE_EVENT_ID', 'source event IDs must be unique.', { sourceEventId });
    }
    if (!Number.isSafeInteger(event.midi) || event.midi < 0 || event.midi > 127) {
      fail('INVALID_SOURCE_EVENT_FACT', 'source event MIDI must be an integer in 0..127.', {
        sourceEventId,
      });
    }
    const voice = boundedVoice(event.voice, `${path}.voice`);
    if (!Number.isSafeInteger(event.staff) || event.staff < 1 || event.staff > 32) {
      fail('INVALID_SOURCE_EVENT_FACT', 'source event staff must be a positive bounded integer.', {
        sourceEventId,
      });
    }
    eventIds.add(sourceEventId);
    return Object.freeze({ sourceEventId, midi: event.midi, voice, staff: event.staff });
  });

  const eventIndex = new Map(events.map((event) => [event.sourceEventId, event]));
  const groupIds = new Set();
  const groups = sourceInput.groups.map((group, index) => {
    const path = `source.groups[${index}]`;
    assertExactKeys(group, ['sourceGroupId', 'sourceEventIds'], path);
    const sourceGroupId = boundedId(group.sourceGroupId, `${path}.sourceGroupId`);
    if (groupIds.has(sourceGroupId)) {
      fail('DUPLICATE_SOURCE_GROUP_ID', 'source group IDs must be unique.', { sourceGroupId });
    }
    assertDenseArray(
      group.sourceEventIds,
      `${path}.sourceEventIds`,
      ARRANGEMENT_CONTRACT_LIMITS.maxSourceGroupEvents,
    );
    if (group.sourceEventIds.length < 2) {
      fail('INVALID_SOURCE_GROUP', 'source groups must contain at least two events.', {
        sourceGroupId,
      });
    }
    const sourceEventIds = group.sourceEventIds.map((id, memberIndex) => boundedId(
      id,
      `${path}.sourceEventIds[${memberIndex}]`,
    ));
    if (new Set(sourceEventIds).size !== sourceEventIds.length) {
      fail('INVALID_SOURCE_GROUP', 'source group members must be unique.', { sourceGroupId });
    }
    for (const sourceEventId of sourceEventIds) {
      if (!eventIndex.has(sourceEventId)) {
        fail('UNKNOWN_SOURCE_EVENT', 'source group references an unknown event.', {
          sourceGroupId,
          sourceEventId,
        });
      }
    }
    groupIds.add(sourceGroupId);
    return Object.freeze({
      sourceGroupId,
      sourceEventIds: Object.freeze([...sourceEventIds]),
    });
  });

  return Object.freeze({
    partId,
    events: Object.freeze(events),
    groups: Object.freeze(groups),
    eventIndex,
    groupIndex: new Map(groups.map((group) => [group.sourceGroupId, group])),
  });
}

function normalizeStrategyTags(tags, path) {
  assertDenseArray(tags, path, ARRANGEMENT_STRATEGY_TAGS.length);
  const normalized = tags.map((tag, index) => {
    if (typeof tag !== 'string' || !STRATEGY_TAG_SET.has(tag)) {
      fail('UNKNOWN_ARRANGEMENT_STRATEGY_TAG', 'Unknown arrangement strategy tag.', {
        path,
        index,
        tag,
      });
    }
    return tag;
  });
  if (new Set(normalized).size !== normalized.length) {
    fail('DUPLICATE_ARRANGEMENT_STRATEGY_TAG', 'Strategy tags must be unique.', { path });
  }
  return Object.freeze([...normalized].sort());
}

function normalizeSourceEventIds(value, path) {
  assertDenseArray(
    value,
    path,
    ARRANGEMENT_CONTRACT_LIMITS.maxSourceGroupEvents,
  );
  if (value.length === 0) {
    fail('INVALID_ARRANGEMENT_DECISION', 'Arrangement decisions must cover at least one source event.', {
      path,
    });
  }
  const ids = value.map((id, index) => boundedId(id, `${path}[${index}]`));
  if (new Set(ids).size !== ids.length) {
    fail('DUPLICATE_ARRANGEMENT_SOURCE_REFERENCE', 'A decision cannot repeat a source event.', {
      path,
    });
  }
  return ids;
}

function requireKnownSourceEvents(sourceEventIds, source, path) {
  for (const sourceEventId of sourceEventIds) {
    if (!source.eventIndex.has(sourceEventId)) {
      fail('UNKNOWN_SOURCE_EVENT', 'Arrangement decision references an unknown source event.', {
        path,
        sourceEventId,
      });
    }
  }
}

function requireExactGroup(sourceEventIds, sourceGroupId, source, path) {
  if (sourceGroupId === null) {
    fail('ARRANGEMENT_GROUP_REQUIRED', 'Group decision requires sourceGroupId.', { path });
  }
  const group = source.groupIndex.get(sourceGroupId);
  if (!group) {
    fail('UNKNOWN_SOURCE_GROUP', 'Arrangement decision references an unknown source group.', {
      path,
      sourceGroupId,
    });
  }
  if (
    group.sourceEventIds.length !== sourceEventIds.length
    || group.sourceEventIds.some((id, index) => id !== sourceEventIds[index])
  ) {
    fail('ARRANGEMENT_GROUP_MEMBERSHIP_MISMATCH', 'Group decision must reference exact canonical group membership.', {
      path,
      sourceGroupId,
    });
  }
}

function normalizeOctaveTarget(target, sourceEventId, source, path) {
  assertExactKeys(target, ['semitoneDelta'], path);
  const delta = target.semitoneDelta;
  if (
    !Number.isSafeInteger(delta)
    || delta === 0
    || delta % 12 !== 0
    || Math.abs(delta) > ARRANGEMENT_CONTRACT_LIMITS.maxOctaveShiftSemitones
  ) {
    fail('INVALID_OCTAVE_DISPLACEMENT', 'Octave displacement must be a non-zero bounded multiple of 12 semitones.', {
      path,
      semitoneDelta: delta,
    });
  }
  const targetMidi = source.eventIndex.get(sourceEventId).midi + delta;
  if (targetMidi < 0 || targetMidi > 127) {
    fail('INVALID_OCTAVE_DISPLACEMENT', 'Octave displacement leaves MIDI range.', {
      path,
      targetMidi,
    });
  }
  return Object.freeze({ semitoneDelta: delta, targetMidi });
}

function normalizeChordReductionTarget(target, sourceEventIds, path) {
  assertExactKeys(target, ['survivingSourceEventIds'], path);
  assertDenseArray(
    target.survivingSourceEventIds,
    `${path}.survivingSourceEventIds`,
    ARRANGEMENT_CONTRACT_LIMITS.maxSourceGroupEvents,
  );
  const survivors = target.survivingSourceEventIds.map((id, index) => boundedId(
    id,
    `${path}.survivingSourceEventIds[${index}]`,
  ));
  if (survivors.length === 0 || survivors.length >= sourceEventIds.length) {
    fail('INVALID_CHORD_REDUCTION', 'Chord reduction must keep a non-empty proper subset of the group.', {
      path,
    });
  }
  if (new Set(survivors).size !== survivors.length) {
    fail('INVALID_CHORD_REDUCTION', 'Chord reduction survivors must be unique.', { path });
  }
  for (const sourceEventId of survivors) {
    if (!sourceEventIds.includes(sourceEventId)) {
      fail('INVALID_CHORD_REDUCTION', 'Chord reduction survivor must belong to the source group.', {
        path,
        sourceEventId,
      });
    }
  }
  return Object.freeze({ survivingSourceEventIds: Object.freeze([...survivors]) });
}

function normalizeRevoicingTarget(target, sourceEventIds, source, path) {
  assertExactKeys(target, ['targetMidiBySourceEventId'], path);
  assertPlainObject(target.targetMidiBySourceEventId, `${path}.targetMidiBySourceEventId`);
  const keys = Object.keys(target.targetMidiBySourceEventId);
  if (
    keys.length !== sourceEventIds.length
    || sourceEventIds.some((id) => !Object.hasOwn(target.targetMidiBySourceEventId, id))
  ) {
    fail('INVALID_REVOICING', 'Revoicing target map must cover every source group member exactly once.', {
      path,
    });
  }
  const mapping = Object.create(null);
  for (const sourceEventId of sourceEventIds) {
    const targetMidi = target.targetMidiBySourceEventId[sourceEventId];
    if (!Number.isSafeInteger(targetMidi) || targetMidi < 0 || targetMidi > 127) {
      fail('INVALID_REVOICING', 'Revoiced MIDI must be an integer in 0..127.', {
        path,
        sourceEventId,
      });
    }
    const sourceMidi = source.eventIndex.get(sourceEventId).midi;
    if ((targetMidi - sourceMidi) % 12 !== 0) {
      fail('INVALID_REVOICING', 'V1 revoicing may only change register by whole octaves.', {
        path,
        sourceEventId,
      });
    }
    mapping[sourceEventId] = targetMidi;
  }
  return Object.freeze({ targetMidiBySourceEventId: Object.freeze(mapping) });
}

function normalizeArpeggiationTarget(target, sourceEventIds, path) {
  assertExactKeys(target, ['orderedSourceEventIds', 'spreadDivisions'], path);
  assertDenseArray(
    target.orderedSourceEventIds,
    `${path}.orderedSourceEventIds`,
    ARRANGEMENT_CONTRACT_LIMITS.maxSourceGroupEvents,
  );
  const order = target.orderedSourceEventIds.map((id, index) => boundedId(
    id,
    `${path}.orderedSourceEventIds[${index}]`,
  ));
  if (
    order.length !== sourceEventIds.length
    || new Set(order).size !== order.length
    || sourceEventIds.some((id) => !order.includes(id))
  ) {
    fail('INVALID_ARPEGGIATION', 'Arpeggiation order must be an exact permutation of the source group.', {
      path,
    });
  }
  if (
    !Number.isSafeInteger(target.spreadDivisions)
    || target.spreadDivisions <= 0
    || target.spreadDivisions > 4096
  ) {
    fail('INVALID_ARPEGGIATION', 'spreadDivisions must be a positive bounded integer.', { path });
  }
  return Object.freeze({
    orderedSourceEventIds: Object.freeze([...order]),
    spreadDivisions: target.spreadDivisions,
  });
}

function normalizeTarget(decisionType, target, sourceEventIds, source, path) {
  if (decisionType === 'PRESERVED' || decisionType === 'OMITTED') {
    if (target !== null && target !== undefined) {
      fail('UNEXPECTED_ARRANGEMENT_TARGET', `${decisionType} decisions cannot carry target facts.`, {
        path,
      });
    }
    return null;
  }

  assertPlainObject(target, `${path}.target`);
  if (decisionType === 'OCTAVE_DISPLACED') {
    return normalizeOctaveTarget(target, sourceEventIds[0], source, `${path}.target`);
  }
  if (decisionType === 'VOICE_REDISTRIBUTED') {
    assertExactKeys(target, ['targetVoice'], `${path}.target`);
    return Object.freeze({
      targetVoice: boundedVoice(target.targetVoice, `${path}.target.targetVoice`),
    });
  }
  if (decisionType === 'CHORD_REDUCED') {
    return normalizeChordReductionTarget(target, sourceEventIds, `${path}.target`);
  }
  if (decisionType === 'REVOICED') {
    return normalizeRevoicingTarget(target, sourceEventIds, source, `${path}.target`);
  }
  if (decisionType === 'ARPEGGIATED') {
    return normalizeArpeggiationTarget(target, sourceEventIds, `${path}.target`);
  }
  fail('UNKNOWN_ARRANGEMENT_DECISION_TYPE', 'Unsupported arrangement decision type.', { decisionType });
}

function normalizeDecision(input, source, alternativeIndex, decisionIndex) {
  const path = `alternatives[${alternativeIndex}].decisions[${decisionIndex}]`;
  assertExactKeys(
    input,
    ['decisionId', 'decisionType', 'sourceEventIds', 'sourceGroupId', 'target', 'reasonCode'],
    path,
  );
  const decisionId = boundedId(input.decisionId, `${path}.decisionId`);
  if (typeof input.decisionType !== 'string' || !DECISION_TYPE_SET.has(input.decisionType)) {
    fail('UNKNOWN_ARRANGEMENT_DECISION_TYPE', 'Unknown arrangement decision type.', {
      path,
      decisionType: input.decisionType,
    });
  }

  const sourceEventIds = normalizeSourceEventIds(input.sourceEventIds, `${path}.sourceEventIds`);
  requireKnownSourceEvents(sourceEventIds, source, path);

  if (SINGLE_EVENT_DECISION_TYPES.has(input.decisionType) && sourceEventIds.length !== 1) {
    fail('INVALID_ARRANGEMENT_DECISION_CARDINALITY', `${input.decisionType} must reference exactly one source event.`, {
      path,
    });
  }

  const sourceGroupId = input.sourceGroupId === null || input.sourceGroupId === undefined
    ? null
    : boundedId(input.sourceGroupId, `${path}.sourceGroupId`);
  if (GROUP_DECISION_TYPES.has(input.decisionType)) {
    requireExactGroup(sourceEventIds, sourceGroupId, source, path);
  } else if (sourceGroupId !== null) {
    fail('UNEXPECTED_SOURCE_GROUP', `${input.decisionType} cannot carry sourceGroupId.`, { path });
  }

  const target = normalizeTarget(input.decisionType, input.target, sourceEventIds, source, path);
  return Object.freeze({
    decisionId,
    decisionType: input.decisionType,
    sourceEventIds: Object.freeze([...sourceEventIds]),
    sourceGroupId,
    target,
    reasonCode: boundedId(input.reasonCode, `${path}.reasonCode`),
  });
}

function normalizeAlternative(input, source, alternativeIndex) {
  const path = `alternatives[${alternativeIndex}]`;
  assertExactKeys(input, ['alternativeId', 'strategyTags', 'decisions'], path);
  const alternativeId = boundedId(input.alternativeId, `${path}.alternativeId`);
  const strategyTags = normalizeStrategyTags(input.strategyTags, `${path}.strategyTags`);
  assertDenseArray(
    input.decisions,
    `${path}.decisions`,
    ARRANGEMENT_CONTRACT_LIMITS.maxSourceEvents,
  );
  if (input.decisions.length === 0) {
    fail('EMPTY_ARRANGEMENT_ALTERNATIVE', 'Each arrangement alternative requires decisions.', {
      alternativeId,
    });
  }

  const decisionIds = new Set();
  const coveredSourceEvents = new Set();
  const decisions = input.decisions.map((decision, decisionIndex) => {
    const normalized = normalizeDecision(decision, source, alternativeIndex, decisionIndex);
    if (decisionIds.has(normalized.decisionId)) {
      fail('DUPLICATE_ARRANGEMENT_DECISION_ID', 'Arrangement decision IDs must be unique inside an alternative.', {
        alternativeId,
        decisionId: normalized.decisionId,
      });
    }
    decisionIds.add(normalized.decisionId);
    for (const sourceEventId of normalized.sourceEventIds) {
      if (coveredSourceEvents.has(sourceEventId)) {
        fail('OVERLAPPING_ARRANGEMENT_DECISIONS', 'Source events must be covered exactly once per alternative.', {
          alternativeId,
          sourceEventId,
        });
      }
      coveredSourceEvents.add(sourceEventId);
    }
    return normalized;
  });

  if (
    coveredSourceEvents.size !== source.events.length
    || source.events.some((event) => !coveredSourceEvents.has(event.sourceEventId))
  ) {
    const missingSourceEventIds = source.events
      .filter((event) => !coveredSourceEvents.has(event.sourceEventId))
      .map((event) => event.sourceEventId);
    fail('INCOMPLETE_ARRANGEMENT_SOURCE_COVERAGE', 'Every source event must be covered exactly once.', {
      alternativeId,
      missingSourceEventIds,
    });
  }

  const musicalContentChanged = decisions.some((decision) => decision.decisionType !== 'PRESERVED');
  return Object.freeze({
    documentType: ARRANGEMENT_ALTERNATIVE_DOCUMENT_TYPE,
    contractVersion: ARRANGEMENT_ALTERNATIVE_SET_VERSION,
    alternativeId,
    candidateOrder: alternativeIndex,
    candidateOrderIsPreferenceRank: false,
    strategyTags,
    reviewRequired: musicalContentChanged,
    musicalContentChanged,
    sourceCoverageComplete: true,
    productionAuthority: false,
    exportAuthority: false,
    decisionCount: decisions.length,
    decisions: Object.freeze(decisions),
  });
}

export function createArrangementAlternativeSet(sourceInput, alternativesInput) {
  const source = normalizeSource(sourceInput);
  assertDenseArray(
    alternativesInput,
    'alternatives',
    ARRANGEMENT_CONTRACT_LIMITS.maxAlternatives,
  );
  if (alternativesInput.length === 0) {
    fail('EMPTY_ARRANGEMENT_ALTERNATIVE_SET', 'At least one arrangement alternative is required.');
  }

  const alternativeIds = new Set();
  const alternatives = alternativesInput.map((alternative, index) => {
    const normalized = normalizeAlternative(alternative, source, index);
    if (alternativeIds.has(normalized.alternativeId)) {
      fail('DUPLICATE_ARRANGEMENT_ALTERNATIVE_ID', 'Arrangement alternative IDs must be unique.', {
        alternativeId: normalized.alternativeId,
      });
    }
    alternativeIds.add(normalized.alternativeId);
    return normalized;
  });

  return Object.freeze({
    documentType: ARRANGEMENT_ALTERNATIVE_SET_DOCUMENT_TYPE,
    contractVersion: ARRANGEMENT_ALTERNATIVE_SET_VERSION,
    authority: 'RESEARCH_CONTRACT_ONLY',
    productionAuthority: false,
    automaticTransformationAuthority: false,
    learnedRankingAuthority: false,
    source: Object.freeze({
      partId: source.partId,
      eventCount: source.events.length,
      groupCount: source.groups.length,
      sourceEventIds: Object.freeze(source.events.map((event) => event.sourceEventId)),
      sourceGroupIds: Object.freeze(source.groups.map((group) => group.sourceGroupId)),
    }),
    alternativeCount: alternatives.length,
    nBestSemantics: Object.freeze({
      candidateOrderOnly: true,
      qualityRankingNotImplied: true,
      sourceTruthRemainsExternalAndImmutable: true,
    }),
    alternatives: Object.freeze(alternatives),
  });
}
