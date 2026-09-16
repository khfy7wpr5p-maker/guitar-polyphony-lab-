import { types as utilTypes } from 'node:util';

import {
  ARRANGEMENT_CONTRACT_LIMITS,
  createArrangementAlternativeSet,
} from './arrangementAlternativeSet.js';
import { getPositionCandidates } from '../guitar/fretboardCandidates.js';
import {
  SonorityAssignmentError,
  enumerateSonorityAssignments,
} from '../guitar/sonorityAssignments.js';
import { evaluateIndependentLeftHandFeasibility } from '../guitar/leftHandFeasibilityOracle.js';
import { STANDARD_GUITAR_CONFIGURATION } from '../guitar/tuningConfiguration.js';

const { isProxy } = utilTypes;

export const BOUNDED_ARRANGEMENT_GENERATOR_VERSION = '1.0.0';
export const BOUNDED_ARRANGEMENT_GENERATOR_DOCUMENT_TYPE = 'BoundedGuitarArrangementGeneration';
export const A2_SUPPORTED_TRANSFORMS = Object.freeze([
  'CHORD_REDUCED',
  'OCTAVE_DISPLACED',
]);

const SUPPORTED_TRANSFORMS = new Set(A2_SUPPORTED_TRANSFORMS);
const DEFAULT_MAX_ALTERNATIVES = 16;
const DEFAULT_MAX_ASSIGNMENTS = 720;
const DEFAULT_LEFT_HAND_ASSIGNMENT_LIMIT = 4096;

export class BoundedArrangementGeneratorError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'BoundedArrangementGeneratorError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new BoundedArrangementGeneratorError(code, message, details);
}

function plainObject(value, path) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail('INVALID_A2_INPUT', `${path} must be a non-proxy plain object.`, { path });
  }
  return value;
}

function exactKeys(value, keys, path) {
  plainObject(value, path);
  const allowed = new Set(keys);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.has(key)) {
      fail('INVALID_A2_FIELD', `${path} contains an unknown field.`, {
        path,
        field: typeof key === 'symbol' ? key.toString() : key,
      });
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      fail('HOSTILE_A2_INPUT', `${path} fields must be enumerable data properties.`, {
        path,
        field: key,
      });
    }
  }
}

function denseArray(value, path, maximumLength) {
  if (
    !Array.isArray(value)
    || isProxy(value)
    || Object.getPrototypeOf(value) !== Array.prototype
    || value.length > maximumLength
  ) {
    fail('INVALID_A2_INPUT', `${path} must be a bounded native array.`, {
      path,
      maximumLength,
    });
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      fail('INVALID_A2_INPUT', `${path} must be dense.`, { path, index });
    }
  }
}

function boundedId(value, path) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > ARRANGEMENT_CONTRACT_LIMITS.maxIdLength
  ) {
    fail('INVALID_A2_ID', `${path} must be a bounded non-empty string.`, { path });
  }
  return value;
}

function boundedInteger(value, fallback, minimum, maximum, path) {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < minimum || resolved > maximum) {
    fail('INVALID_A2_POLICY', `${path} is outside the supported bound.`, {
      path,
      value: resolved,
      minimum,
      maximum,
    });
  }
  return resolved;
}

function indexSource(source) {
  plainObject(source, 'source');
  denseArray(source.events, 'source.events', ARRANGEMENT_CONTRACT_LIMITS.maxSourceEvents);
  denseArray(source.groups, 'source.groups', ARRANGEMENT_CONTRACT_LIMITS.maxSourceEvents);

  const eventIndex = new Map();
  for (let index = 0; index < source.events.length; index += 1) {
    const event = source.events[index];
    plainObject(event, `source.events[${index}]`);
    const id = boundedId(event.sourceEventId, `source.events[${index}].sourceEventId`);
    if (eventIndex.has(id)) fail('DUPLICATE_SOURCE_EVENT_ID', 'A2 source event IDs must be unique.', { id });
    if (!Number.isSafeInteger(event.midi) || event.midi < 0 || event.midi > 127) {
      fail('INVALID_A2_SOURCE_EVENT', 'A2 source MIDI must be an integer in 0..127.', { id });
    }
    eventIndex.set(id, event);
  }

  const groupIndex = new Map();
  for (let index = 0; index < source.groups.length; index += 1) {
    const group = source.groups[index];
    plainObject(group, `source.groups[${index}]`);
    const id = boundedId(group.sourceGroupId, `source.groups[${index}].sourceGroupId`);
    denseArray(
      group.sourceEventIds,
      `source.groups[${index}].sourceEventIds`,
      ARRANGEMENT_CONTRACT_LIMITS.maxSourceGroupEvents,
    );
    if (groupIndex.has(id)) fail('DUPLICATE_SOURCE_GROUP_ID', 'A2 source group IDs must be unique.', { id });
    for (const eventId of group.sourceEventIds) {
      if (!eventIndex.has(eventId)) {
        fail('UNKNOWN_SOURCE_EVENT', 'A2 source group references an unknown event.', {
          sourceGroupId: id,
          sourceEventId: eventId,
        });
      }
    }
    groupIndex.set(id, group);
  }
  return { eventIndex, groupIndex };
}

function normalizePolicy(input, indexes) {
  exactKeys(
    input,
    [
      'sourceGroupId',
      'allowedTransforms',
      'priorityEventIds',
      'maxAlternatives',
      'maxKeptNotes',
      'minKeptNotes',
      'octaveSemitoneDeltas',
      'maxAssignments',
      'leftHandMaxAssignmentAttempts',
    ],
    'policy',
  );

  const sourceGroupId = boundedId(input.sourceGroupId, 'policy.sourceGroupId');
  const group = indexes.groupIndex.get(sourceGroupId);
  if (!group) fail('UNKNOWN_SOURCE_GROUP', 'A2 policy references an unknown source group.', { sourceGroupId });

  denseArray(input.allowedTransforms, 'policy.allowedTransforms', A2_SUPPORTED_TRANSFORMS.length);
  const allowedTransforms = input.allowedTransforms.map((transform, index) => {
    if (typeof transform !== 'string' || !SUPPORTED_TRANSFORMS.has(transform)) {
      fail('UNSUPPORTED_A2_TRANSFORM', 'A2 initial generator received an unsupported transform.', {
        index,
        transform,
        supported: A2_SUPPORTED_TRANSFORMS,
      });
    }
    return transform;
  });
  if (new Set(allowedTransforms).size !== allowedTransforms.length) {
    fail('INVALID_A2_POLICY', 'allowedTransforms must not contain duplicates.');
  }

  const priorityInput = input.priorityEventIds ?? [];
  denseArray(priorityInput, 'policy.priorityEventIds', 32);
  const priorityEventIds = priorityInput.map((id, index) => boundedId(
    id,
    `policy.priorityEventIds[${index}]`,
  ));
  if (new Set(priorityEventIds).size !== priorityEventIds.length) {
    fail('INVALID_A2_POLICY', 'priorityEventIds must not contain duplicates.');
  }
  for (const eventId of priorityEventIds) {
    if (!group.sourceEventIds.includes(eventId)) {
      fail('A2_PRIORITY_OUTSIDE_GROUP', 'Priority events must belong to the target source group.', {
        sourceGroupId,
        sourceEventId: eventId,
      });
    }
  }

  const maxAlternatives = boundedInteger(
    input.maxAlternatives,
    DEFAULT_MAX_ALTERNATIVES,
    1,
    ARRANGEMENT_CONTRACT_LIMITS.maxAlternatives,
    'policy.maxAlternatives',
  );
  const maximumPossibleKeep = Math.min(6, group.sourceEventIds.length);
  const maxKeptNotes = boundedInteger(
    input.maxKeptNotes,
    maximumPossibleKeep,
    1,
    maximumPossibleKeep,
    'policy.maxKeptNotes',
  );
  if (priorityEventIds.length > maxKeptNotes) {
    fail('A2_PRIORITY_EXCEEDS_KEEP_BOUND', 'Priority event count exceeds maxKeptNotes.', {
      priorityCount: priorityEventIds.length,
      maxKeptNotes,
    });
  }
  const minKeptNotes = boundedInteger(
    input.minKeptNotes,
    Math.max(1, priorityEventIds.length),
    1,
    maxKeptNotes,
    'policy.minKeptNotes',
  );

  const octaveInput = input.octaveSemitoneDeltas ?? [-12, 12];
  denseArray(octaveInput, 'policy.octaveSemitoneDeltas', 6);
  const octaveSemitoneDeltas = octaveInput.map((delta, index) => {
    if (
      !Number.isSafeInteger(delta)
      || delta === 0
      || delta % 12 !== 0
      || Math.abs(delta) > ARRANGEMENT_CONTRACT_LIMITS.maxOctaveShiftSemitones
    ) {
      fail('INVALID_A2_POLICY', 'octaveSemitoneDeltas must contain bounded non-zero whole octaves.', {
        index,
        delta,
      });
    }
    return delta;
  });
  if (new Set(octaveSemitoneDeltas).size !== octaveSemitoneDeltas.length) {
    fail('INVALID_A2_POLICY', 'octaveSemitoneDeltas must not contain duplicates.');
  }

  return Object.freeze({
    sourceGroupId,
    allowedTransforms: Object.freeze([...allowedTransforms]),
    priorityEventIds: Object.freeze([...priorityEventIds]),
    maxAlternatives,
    maxKeptNotes,
    minKeptNotes,
    octaveSemitoneDeltas: Object.freeze([...octaveSemitoneDeltas]),
    maxAssignments: boundedInteger(
      input.maxAssignments,
      DEFAULT_MAX_ASSIGNMENTS,
      1,
      DEFAULT_MAX_ASSIGNMENTS,
      'policy.maxAssignments',
    ),
    leftHandMaxAssignmentAttempts: boundedInteger(
      input.leftHandMaxAssignmentAttempts,
      DEFAULT_LEFT_HAND_ASSIGNMENT_LIMIT,
      1,
      DEFAULT_LEFT_HAND_ASSIGNMENT_LIMIT,
      'policy.leftHandMaxAssignmentAttempts',
    ),
  });
}

function preserve(alternativeId, eventId, ordinal) {
  return {
    decisionId: `${alternativeId}:preserve:${ordinal}`,
    decisionType: 'PRESERVED',
    sourceEventIds: [eventId],
    sourceGroupId: null,
    target: null,
    reasonCode: 'SOURCE_PRESERVED',
  };
}

function strictAlternative(source) {
  const alternativeId = 'a2:strict-source';
  return {
    alternativeId,
    strategyTags: [],
    decisions: source.events.map((event, index) => preserve(alternativeId, event.sourceEventId, index)),
  };
}

function preserveOutsideGroup(source, memberSet, alternativeId) {
  const decisions = [];
  let ordinal = 1;
  for (const event of source.events) {
    if (memberSet.has(event.sourceEventId)) continue;
    decisions.push(preserve(alternativeId, event.sourceEventId, ordinal));
    ordinal += 1;
  }
  return decisions;
}

function enumerateCombinations(values, choose, required, visit) {
  const requiredSet = new Set(required);
  const optional = values.filter((value) => !requiredSet.has(value));
  const optionalNeeded = choose - required.length;
  if (optionalNeeded < 0 || optionalNeeded > optional.length) return true;
  if (optionalNeeded === 0) return visit(values.filter((value) => requiredSet.has(value))) !== false;

  const selected = [];
  let complete = true;
  function walk(start) {
    if (!complete) return;
    if (selected.length === optionalNeeded) {
      const chosen = new Set(required);
      for (const index of selected) chosen.add(optional[index]);
      complete = visit(values.filter((value) => chosen.has(value))) !== false;
      return;
    }
    const remaining = optionalNeeded - selected.length;
    for (let index = start; index <= optional.length - remaining; index += 1) {
      selected.push(index);
      walk(index + 1);
      selected.pop();
      if (!complete) return;
    }
  }
  walk(0);
  return complete;
}

function generateReductions(source, group, policy, add) {
  if (!policy.allowedTransforms.includes('CHORD_REDUCED')) return true;
  if (group.sourceEventIds.length <= policy.minKeptNotes) return true;
  const members = new Set(group.sourceEventIds);
  const largestKeep = Math.min(policy.maxKeptNotes, group.sourceEventIds.length - 1);

  for (let keepCount = largestKeep; keepCount >= policy.minKeptNotes; keepCount -= 1) {
    const complete = enumerateCombinations(
      group.sourceEventIds,
      keepCount,
      policy.priorityEventIds,
      (survivors) => {
        const alternativeId = `a2:reduce:${keepCount}:${survivors.join('+')}`;
        return add({
          alternativeId,
          strategyTags: [
            'INNER_VOICE_REDUCTION',
            ...(policy.priorityEventIds.length > 0 ? ['VOICE_PRIORITY'] : []),
          ],
          decisions: [{
            decisionId: `${alternativeId}:group`,
            decisionType: 'CHORD_REDUCED',
            sourceEventIds: [...group.sourceEventIds],
            sourceGroupId: group.sourceGroupId,
            target: { survivingSourceEventIds: [...survivors] },
            reasonCode: 'BOUNDED_EXPLICIT_POLICY_REDUCTION',
          }, ...preserveOutsideGroup(source, members, alternativeId)],
        });
      },
    );
    if (!complete) return false;
  }
  return true;
}

function generateOctaves(source, group, policy, indexes, add) {
  if (!policy.allowedTransforms.includes('OCTAVE_DISPLACED')) return true;
  for (const eventId of group.sourceEventIds) {
    const event = indexes.eventIndex.get(eventId);
    for (const semitoneDelta of policy.octaveSemitoneDeltas) {
      const targetMidi = event.midi + semitoneDelta;
      if (targetMidi < 0 || targetMidi > 127) continue;
      const alternativeId = `a2:octave:${eventId}:${semitoneDelta}`;
      const decisions = [{
        decisionId: `${alternativeId}:transform`,
        decisionType: 'OCTAVE_DISPLACED',
        sourceEventIds: [eventId],
        sourceGroupId: null,
        target: { semitoneDelta },
        reasonCode: 'BOUNDED_EXPLICIT_POLICY_OCTAVE_CANDIDATE',
      }];
      let ordinal = 1;
      for (const sourceEvent of source.events) {
        if (sourceEvent.sourceEventId === eventId) continue;
        decisions.push(preserve(alternativeId, sourceEvent.sourceEventId, ordinal));
        ordinal += 1;
      }
      if (add({
        alternativeId,
        strategyTags: ['REGISTER_COMPRESSION'],
        decisions,
      }) === false) return false;
    }
  }
  return true;
}

function realize(source, alternative) {
  const eventIndex = new Map(source.events.map((event) => [event.sourceEventId, event]));
  const events = [];
  for (const decision of alternative.decisions) {
    if (decision.decisionType === 'PRESERVED' || decision.decisionType === 'VOICE_REDISTRIBUTED') {
      const event = eventIndex.get(decision.sourceEventIds[0]);
      events.push({ sourceEventId: event.sourceEventId, midi: event.midi });
    } else if (decision.decisionType === 'OCTAVE_DISPLACED') {
      events.push({ sourceEventId: decision.sourceEventIds[0], midi: decision.target.targetMidi });
    } else if (decision.decisionType === 'CHORD_REDUCED') {
      for (const eventId of decision.target.survivingSourceEventIds) {
        events.push({ sourceEventId: eventId, midi: eventIndex.get(eventId).midi });
      }
    } else if (decision.decisionType === 'REVOICED') {
      for (const eventId of decision.sourceEventIds) {
        events.push({ sourceEventId: eventId, midi: decision.target.targetMidiBySourceEventId[eventId] });
      }
    } else if (decision.decisionType === 'OMITTED') {
      // Explicit omission produces no realized note but remains covered in provenance.
    } else if (decision.decisionType === 'ARPEGGIATED') {
      return { status: 'INDETERMINATE_TRANSFORM_SCOPE', reason: 'TEMPORAL_REVALIDATION_REQUIRED', events: [] };
    } else {
      fail('UNSUPPORTED_A2_REALIZATION', 'A2 cannot statically realize this decision type.', {
        decisionType: decision.decisionType,
      });
    }
  }
  return { status: 'REALIZED_STATIC_SONORITY', reason: null, events };
}

function physical(status, reason, extra = {}) {
  return Object.freeze({
    status,
    reason,
    validationAuthority: 'LAB_RESEARCH_ONLY',
    productionAuthority: false,
    ...extra,
  });
}

export function validateStaticArrangementAlternative(
  source,
  alternative,
  options = {},
  guitarConfiguration = STANDARD_GUITAR_CONFIGURATION,
) {
  const realization = realize(source, alternative);
  if (realization.status !== 'REALIZED_STATIC_SONORITY') {
    return physical(realization.status, realization.reason, { realizedEventCount: 0, witness: null });
  }
  if (realization.events.length > 6) {
    return physical('INFEASIBLE', 'ACTIVE_NOTE_COUNT_EXCEEDS_STRING_COUNT', {
      realizedEventCount: realization.events.length,
      witness: null,
    });
  }
  if (realization.events.length === 0) {
    return physical('FEASIBLE', null, {
      realizedEventCount: 0,
      witness: Object.freeze({ assignment: Object.freeze([]), leftHand: null }),
    });
  }

  const notes = [];
  for (const event of realization.events) {
    const candidates = getPositionCandidates(event.midi, guitarConfiguration);
    if (candidates.length === 0) {
      return physical('INFEASIBLE', 'NO_EXACT_FRETBOARD_CANDIDATE', {
        realizedEventCount: realization.events.length,
        sourceEventId: event.sourceEventId,
        midi: event.midi,
        witness: null,
      });
    }
    notes.push({ id: event.sourceEventId, pitch: `MIDI_${event.midi}`, fretboardCandidates: candidates });
  }

  const maxAssignments = options.maxAssignments ?? DEFAULT_MAX_ASSIGNMENTS;
  let assignments;
  try {
    assignments = enumerateSonorityAssignments(notes, { maxAssignments });
  } catch (error) {
    if (error instanceof SonorityAssignmentError && error.code === 'ASSIGNMENT_LIMIT_EXCEEDED') {
      return physical('INDETERMINATE_LIMIT', 'SONORITY_ASSIGNMENT_LIMIT_EXCEEDED', {
        realizedEventCount: realization.events.length,
        maxAssignments,
        witness: null,
      });
    }
    throw error;
  }
  if (assignments.length === 0) {
    return physical('INFEASIBLE', 'NO_DISTINCT_STRING_ASSIGNMENT', {
      realizedEventCount: realization.events.length,
      witness: null,
    });
  }

  const leftHandLimit = options.leftHandMaxAssignmentAttempts ?? DEFAULT_LEFT_HAND_ASSIGNMENT_LIMIT;
  let sawIndeterminate = false;
  for (const assignment of assignments) {
    const positions = assignment.map((position) => ({
      positionId: position.noteId,
      string: position.string,
      fret: position.fret,
    }));
    const leftHand = evaluateIndependentLeftHandFeasibility(positions, {
      maxAssignmentAttempts: leftHandLimit,
    });
    if (leftHand.status === 'FEASIBLE') {
      return physical('FEASIBLE', null, {
        realizedEventCount: realization.events.length,
        assignmentCountObserved: assignments.length,
        witness: Object.freeze({
          assignment: Object.freeze(assignment.map((position) => Object.freeze({
            sourceEventId: position.noteId,
            string: position.string,
            fret: position.fret,
          }))),
          leftHand: leftHand.witness,
        }),
      });
    }
    if (leftHand.status === 'INDETERMINATE_LIMIT') sawIndeterminate = true;
  }

  return sawIndeterminate
    ? physical('INDETERMINATE_LIMIT', 'LEFT_HAND_ASSIGNMENT_LIMIT_EXCEEDED', {
      realizedEventCount: realization.events.length,
      assignmentCountObserved: assignments.length,
      witness: null,
    })
    : physical('INFEASIBLE', 'NO_LEFT_HAND_FEASIBLE_ASSIGNMENT', {
      realizedEventCount: realization.events.length,
      assignmentCountObserved: assignments.length,
      witness: null,
    });
}

export function generateBoundedArrangementAlternatives(
  source,
  policyInput,
  guitarConfiguration = STANDARD_GUITAR_CONFIGURATION,
) {
  const indexes = indexSource(source);
  const policy = normalizePolicy(policyInput, indexes);
  const group = indexes.groupIndex.get(policy.sourceGroupId);
  const rawAlternatives = [strictAlternative(source)];
  let limitReached = rawAlternatives.length >= policy.maxAlternatives;
  let attemptedCandidateCount = rawAlternatives.length;

  function add(alternative) {
    attemptedCandidateCount += 1;
    if (rawAlternatives.length >= policy.maxAlternatives) {
      limitReached = true;
      return false;
    }
    rawAlternatives.push(alternative);
    return true;
  }

  if (!limitReached && !generateReductions(source, group, policy, add)) limitReached = true;
  if (!limitReached && !generateOctaves(source, group, policy, indexes, add)) limitReached = true;

  const alternativeSet = createArrangementAlternativeSet(source, rawAlternatives);
  const validations = alternativeSet.alternatives.map((alternative) => Object.freeze({
    alternativeId: alternative.alternativeId,
    physical: validateStaticArrangementAlternative(
      source,
      alternative,
      {
        maxAssignments: policy.maxAssignments,
        leftHandMaxAssignmentAttempts: policy.leftHandMaxAssignmentAttempts,
      },
      guitarConfiguration,
    ),
  }));

  return Object.freeze({
    documentType: BOUNDED_ARRANGEMENT_GENERATOR_DOCUMENT_TYPE,
    contractVersion: BOUNDED_ARRANGEMENT_GENERATOR_VERSION,
    authority: 'LAB_RESEARCH_GENERATOR_ONLY',
    productionAuthority: false,
    automaticProductionTransformationAuthority: false,
    learnedRankingAuthority: false,
    policy,
    generation: Object.freeze({
      status: limitReached ? 'PARTIAL_LIMIT' : 'COMPLETE',
      candidateSpaceComplete: !limitReached,
      maxAlternatives: policy.maxAlternatives,
      emittedAlternativeCount: alternativeSet.alternativeCount,
      attemptedCandidateCountLowerBound: attemptedCandidateCount,
      candidateOrderIsPreferenceRank: false,
      singleTransformPerAlternativeResearchSlice: true,
    }),
    alternativeSet,
    validations: Object.freeze(validations),
  });
}
