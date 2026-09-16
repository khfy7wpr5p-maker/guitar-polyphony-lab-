import { types as utilTypes } from 'node:util';

const { isProxy } = utilTypes;

export const ARRANGEMENT_ALTERNATIVE_SET_VERSION = '1.0.0';
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

const DECISION_TYPE_SET = new Set(ARRANGEMENT_DECISION_TYPES);
const STRATEGY_TAG_SET = new Set(ARRANGEMENT_STRATEGY_TAGS);
const MAX_ALTERNATIVES = 32;
const MAX_SOURCE_EVENTS = 4096;
const MAX_ID_LENGTH = 256;
const MAX_OCTAVE_SHIFT = 36;

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

function assertExactKeys(value, allowed, path) {
  assertPlainObject(value, path);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) {
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

function assertDenseArray(value, path, maximumLength = Infinity) {
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
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ID_LENGTH) {
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

function clonePrimitiveRecord(record, path) {
  assertPlainObject(record, path);
  const output = Object.create(null);
  for (const key of Object.keys(record).sort()) {
    const value = record[key];
    if (!['string', 'number', 'boolean'].includes(typeof value) && value !== null) {
      fail('INVALID_ARRANGEMENT_TARGET', `${path}.${key} must be scalar.`, { path, key });
    }
    output[key] = value;
  }
  return Object.freeze(output);
}

function normalizeSource(source) {
  assertExactKeys(source, ['partId', 'events', 'groups'], 'source');
  const partId = boundedId(source.partId, 'source.partId');
  assertDenseArray(source.events, 'source.events', MAX_SOURCE_EVENTS);
  assertDenseArray(source.groups, 'source.groups', MAX_SOURCE_EVENTS);

  const eventIds = new Set();
  const events = source.events.map((event, index) => {
    assertExactKeys(event, ['sourceEventId', 'midi', 'voice', 'staff'], `source.events[${index}]`);
    const sourceEventId = boundedId(event.sourceEventId, `source.events[${index}].sourceEventId`);
    if (eventIds.has(sourceEventId)) {
      fail('DUPLICATE_SOURCE_EVENT_ID', 'source event IDs must be unique.', { sourceEventId });
    }
    if (!Number.isSafeInteger(event.midi) || event.midi < 0 || event.midi > 127) {
      fail('INVALID_SOURCE_EVENT_FACT', 'source event MIDI must be an integer in 0..127.', { sourceEventId });
    }
    const voice = boundedVoice(event.voice, `source.events[${index}].voice`);
    if (!Number.isSafeInteger(event.staff) || event.staff < 1 || event.staff > 32) {
      fail('INVALID_SOURCE_EVENT_FACT', 'source event staff must be a positive bounded integer.', { sourceEventId });
    }
    eventIds.add(sourceEventId);
    return Object.freeze({ sourceEventId, midi: event.midi, voice, staff: event.staff });
  });

  const eventIndex = new Map(events.map((event) => [event.sourceEventId, event]));
  const groupIds = new Set();
  const groups = source.groups.map((group, index) => {
    assertExactKeys(group, ['sourceGroupId', 'sourceEventIds'], `source.groups[${index}]`);
    const sourceGroupId = boundedId(group.sourceGroupId, `source.groups[${index}].sourceGroupId`);
    if (groupIds.has(sourceGroupId)) {
      fail('DUPLICATE_SOURCE_GROUP_ID', 'source group IDs must be unique.', { sourceGroupId });
    }
    assertDenseArray(group.sourceEventIds, `source.groups[${index}].sourceEventIds`, 6);
    if (group.sourceEventIds.length < 2) {
      fail('INVALID_SOURCE_GROUP', 'source groups must contain at least two events.', { sourceGroupId });
    }
    const members = group.sourceEventIds.map((id, memberIndex) => boundedId(
      id,
      `source.groups[${index}].sourceEventIds[${memberIndex}]`,
    ));
    if (new Set(members).size !== members.length) {
      fail('INVALID_SOURCE_GROUP', 'source group members must be unique.', { sourceGroupId });
    }
    for (const sourceEventId of members) {
      if (!eventIndex.has(sourceEventId)) {
        fail('UNKNOWN_SOURCE_EVENT', 'source group references an unknown event.', { sourceGroupId, sourceEventId });
      }
    }
    groupIds.add(sourceGroupId);
    return Object.freeze({ sourceGroupId, sourceEventIds: Object.freeze([...members]) });
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
      fail('UNKNOWN_ARRANGEMENT_STRATEGY_TAG', 'Unknown arrangement strategy tag.', { path, index, tag });
    }
    return tag;
  });
  if (new Set(normalized).size !== normalized.length) {
    fail('DUPLICATE_ARRANGEMENT_STRATEGY_TAG', 'Strategy tags must be unique.', { path });
  }
  return Object.freeze([...normalized].sort());
}

function requireExactGroup(decision, source, path) {
  if (decision.sourceGroupId === null || decision.sourceGroupId === undefined) {
    fail('ARRANGEMENT_GROUP_REQUIRED', 'Group decision requires sourceGroupId.', { path });
  }
  const group = source.groupIndex.get(decision.sourceGroupId);
  if (!group) {
    fail('UNKNOWN_SOURCE_GROUP', 'Arrangement decision references an unknown source group.', {
      path,
      sourceGroupId: decision.sourceGroupId,
    });
  }
  if (
    group.sourceEventIds.length !== decision.sourceEventIds.length
    || group.sourceEventIds.some((id, index) => id !== decision.sourceEventIds[index])
  ) {
    fail('ARRANGEMENT_GROUP_MEMBERSHIP_MISMATCH', 'Group decision must reference exact canonical group membership.', {
      path,
      sourceGroupId: decision.sourceGroupId,
    });
  }
  return group;
}

function normalizeTarget(decisionType, target, decision, source, path) {
  if (decisionType === 'PRESERVED' || decisionType === 'OMITTED') {
    if (target !== null && target !== undefined) {
      fail('UNEXPECTED_ARRANGEMENT_TARGET', `${decisionType} decisions cannot carry target facts.`, { path });
    }
    return null;
  }

  assertPlainObject(target, `${path}.target`);

  if (decisionType === 'OCTAVE_DISPLACED') {
    assertExactKeys(target, ['semitoneDelta'], `${path}.target`);
    if (
      !Number.isSafeInteger(target.semitoneDelta)
      || target.semitoneDelta === 0
      || target.semitoneDelta % 12 !== 0
      || Math.abs(target.semitoneDelta) > MAX_OCTAVE_SHIFT
    ) {
      fail('INVALID_OCTAVE_DISPLACEMENT', 'Octave displacement must be a non-zero bounded multiple of 12 semitones.', {
        path,
        semitoneDelta: target.semitoneDelta,
      });
    }
    const sourceEvent = source.eventIndex.get(decision.sourceEventIds[0]);
    const targetMidi = sourceEvent.midi + target.semitoneDelta;
    if (targetMidi < 0 || targetMidi > 127) {
      fail('INVALID_OCTAVE_DISPLACEMENT', 'Octave displacement leaves MIDI range.', { path, targetMidi });
    }
    return Object.freeze({ semitoneDelta: target.semitoneDelta, targetMidi });
  }

  if (decisionType === 'VOICE_REDISTRIBUTED') {
    assertExactKeys(target, ['targetVoice'], `${path}.target`);
    return Object.freeze({ targetVoice: boundedVoice(target.targetVoice, `${path}.target.targetVoice`) });
  }

  if (decisionType === 'CHORD_REDUCED') {
    assertExactKeys(target, ['survivingSourceEventIds'], `${path}.target`);
    assertDenseArray(target.survivingSourceEventIds, `${path}.target.survivingSourceEventIds`, 6);
    const survivors = target.survivingSourceEventIds.map((id, index) => boundedId(
      id,
      `${path}.target.survivingSourceEventIds[${index}]`,
    ));
    if (survivors.length === 0 || survivors.length >= decision.sourceEventIds.length) {
      fail('INVALID_CHORD_REDUCTION', 'Chord reduction must keep a non-empty proper subset of the group.', { path });
    }
    if (new Set(survivors).size !== survivors.length) {
      fail('INVALID_CHORD_REDUCTION', 'Chord reduction survivors must be unique.', { path });
    }
    for (const id of survivors) {
      if (!decision.sourceEventIds.includes(id)) {
        fail('INVALID_CHORD_REDUCTION', 'Chord reduction survivor must belong to the source group.', { path, sourceEventId: id });
      }
    }
    return Object.freeze({ survivingSourceEventIds: Object.freeze([...survivors]) });
  }

  if (decisionType === 'REVOICED') {
    assertExactKeys(target, ['targetMidiBySourceEventId'], `${path}.target`);
    const mapping = clonePrimitiveRecord(target.targetMidiBySourceEventId, `${path}.target.targetMidiBySourceEventId`);
    const keys = Object.keys(mapping);
    if (keys.length !== decision.sourceEventIds.length || decision.sourceEventIds.some((id) => !Object.hasOwn(mapping, id))) {
      fail('INVALID_REVOICING', 'Revoicing target map must cover every source group member exactly once.', { path });
    }
    const normalized = Object.create(null);
    for (const id of decision.sourceEventIds) {
      const targetMidi = mapping[id];
      if (!Number.isSafeInteger(targetMidi) || targetMidi < 0 || targetMidi > 127) {
        fail('INVALID_REVOICING', 'Revoiced MIDI must be an integer in 0..127.', { path, sourceEventId: id });
      }
      const sourceMidi = source.eventIndex.get(id).midi;
      if ((targetMidi - sourceMidi) % 12 !== 0) {
        fail('INVALID_REVOICING', 'V1 revoicing may only change register by whole octaves.', { path, sourceEventId: id });
      }
      normalized[id] = targetMidi;
    }
    return Object.freeze({ targetMidiBySourceEventId: Object.freeze(normalized) });
  }

  if (decisionType === 'ARPEGGIATED') {
    assertExactKeys(target, ['orderedSourceEventIds', 'spreadDivisions'], `${path}.target`);
    assertDenseArray(target.orderedSourceEventIds, `${path}.target.orderedSourceEventIds`, 6);
    const order = target.orderedSourceEventIds.map((id, index) => boundedId(
      id,
      `${path}.target.orderedSourceEventIds[${index}]`,
    ));
    if (
      order.length !== decision.sourceEventIds.length
      || new Set(order).size !== order.length
      || decision.sourceEventIds.some((id) => !order.includes(id))
    ) {
      fail('INVALID_ARPEGGIATION', 'Arpeggiation order must be an exact permutation of the source group.', { path });
    }
    if (!Number.isSafeInteger(target.spreadDivisions) || target.spreadDivisions <= 0 || target.spreadDivisions > 4096) {
      fail('INVALID_ARPEGGIATION', 'spreadDivisions must be a positive bounded integer.', { path });
    }
    return Object.freeze({
      orderedSourceEventIds: Object.freeze([...order]),
      spreadDivisions: target.spreadDivisions,
    });
  }

  fail('UNKNOWN_ARRANGEMENT_DECISION_TYPE', 'Unsupported arrangement decision type.', { decisionType });
}

function normalizeDecision(input, source, alternativeIndex, decisionIndex) {
  const path = `alternatives[${alternativeIndex}].decisions[${decisionIndex}]`;
  assertExactKeys(input, ['decisionId', 'decisionType', 'sourceEventIds', 'sourceGroupId', 'target', 'reasonCode'], path);
  const decisionId = boundedId(input.decisionId, `${path}.decisionId`);
  if (typeof input.decisionType !== 'string' || !DECISION_TYPE_SET.has(input.decisionType)) {
    fail('UNKNOWN_ARRANGEMENT_DECISION_TYPE', 'Unknown arrangement decision type.', { path, decisionType: input.decisionType });
  }
  assertDenseArray(input.sourceEventIds, `${path}.sourceEventIds`, 6);
  if (input.sourceEventIds.length === 0) {
    fail('INVALID_ARRANGEMENT_DECISION', 'Arrangement decisions must cover at least one source event.', { path });
  }
  const sourceEventIds = input.sourceEventIds.map((id, index) => boundedId(id, `${path}.sourceEventIds[${index}]`));
  if (new Set(sourceEventIds).size !== sourceEventIds.length) {
    fail('DUPLICATE_ARRANGEMENT_SOURCE_REFERENCE', 'A decision cannot repeat a source event.', { path });
  }
  for (const sourceEventId of sourceEventIds) {
    if (!source.eventIndex.has(sourceEventId)) {
      fail('UNKNOWN_SOURCE_EVENT', 'Arrangement decision references an unknown source event.', { path, sourceEventId });
    }
  }

  const groupDecision = ['CHORD_REDUCED', 'REVOICED', 'ARPEGGIATED'].includes(input.decisionType);
  const singleDecision = ['PRESERVED', 'OMITTED', 'OCTAVE_DISPLACED', 'VOICE_REDISTRIBUTED'].includes(input.decisionType);
  if (singleDecision && sourceEventIds.length !== 1) {
    fail('INVALID_ARRANGEMENT_DECISION_CARDINALITY', `${input.decisionType} must reference exactly one source event.`, { path });
  }
  const normalizedSourceGroupId = input.sourceGroupId === null || input.sourceGroupId === undefined
    ? null
    : boundedId(input.sourceGroupId, `${path}.sourceGroupId`);
  const normalizedDecision = { sourceEventIds, sourceGroupId: normalizedSourceGroupId };
  if (groupDecision) {
    requireExactGroup(normalizedDecision, source, path);
  } else if (normalizedSourceGroupId !== null) {
    fail('UNEXPECTED_SOURCE_GROUP', `${input.decisionType} cannot carry sourceGroupId.`, { path });
  }

  const reasonCode = boundedId(input.reasonCode, `${path}.reasonCode`);
  const target = normalizeTarget(input.decisionType, input.target, normalizedDecision, source, path);
  return Object.freeze({
    decisionId,
    decisionType: input.decisionType,
    sourceEventIds: Object.freeze([...sourceEventIds]),
    sourceGroupId: normalizedSourceGroupId,
    target,
    reasonCode,
  });
}

function normalizeAlternative(input, source, alternativeIndex) {
  const path = `alternatives[${alternativeIndex}]`;
  assertExactKeys(input, ['alternativeId', 'strategyTags', 'decisions'], path);
  const alternativeId = boundedId(input.alternativeId, `${path}.alternativeId`);
  const strategyTags = normalizeStrategyTags(input.strategyTags, `${path}.strategyTags`);
  assertDenseArray(input.decisions, `${path}.decisions`, MAX_SOURCE_EVENTS);
  if (input.decisions.length === 0) {
    fail('EMPTY_ARRANGEMENT_ALTERNATIVE', 'Each arrangement alternative requires decisions.', { alternativeId });
  }

  const decisionIds = new Set();
  const covered = new Set();
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
      if (covered.has(sourceEventId)) {
        fail('OVERLAPPING_ARRANGEMENT_DECISIONS', 'Source events must be covered exactly once per alternative.', {
          alternativeId,
          sourceEventId,
        });
      }
      covered.add(sourceEventId);
    }
    return normalized;
  });

  if (covered.size !== source.events.length || source.events.some((event) => !covered.has(event.sourceEventId))) {
    const missingSourceEventIds = source.events
      .filter((event) => !covered.has(event.sourceEventId))
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
  assertDenseArray(alternativesInput, 'alternatives', MAX_ALTERNATIVES);
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
