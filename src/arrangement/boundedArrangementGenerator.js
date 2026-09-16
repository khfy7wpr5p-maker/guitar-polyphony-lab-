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

const SUPPORTED_TRANSFORM_SET = new Set(A2_SUPPORTED_TRANSFORMS);
const MAX_PRIORITY_EVENTS = 32;
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

function exactKeys(value, allowedKeys, path) {
  plainObject(value, path);
  const allowed = new Set(allowedKeys);
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

function sourceIndexes(source) {
  plainObject(source, 'source');
  denseArray(source.events, 'source.events', ARRANGEMENT_CONTRACT_LIMITS.maxSourceEvents);
  denseArray(source.groups, 'source.groups', ARRANGEMENT_CONTRACT_LIMITS.maxSourceEvents);
  const eventIndex = new Map();
  for (let index = 0; index < source.events.length; index += 1) {
    const event = source.events[index];
    plainObject(event, `source.events[${index}]`);
    const sourceEventId = boundedId(event.sourceEventId, `source.events[${index}].sourceEventId`);
    if (eventIndex.has(sourceEventId)) {
      fail('DUPLICATE_SOURCE_EVENT_ID', 'A2 source event IDs must be unique.', { sourceEventId });
    }
    if (!Number.isSafeInteger(event.midi) || event.midi < 0 || event.midi > 127) {
      fail('INVALID_A2_SOURCE_EVENT', 'A2 source MIDI must be an integer in 0..127.', {
        sourceEventId,
      });
    }
    eventIndex.set(sourceEventId, event);
  }
  const groupIndex = new Map();
  for (let index = 0; index < source.groups.length; index += 1) {
    const group = source.groups[index];
    plainObject(group, `source.groups[${index}]`);
    const sourceGroupId = boundedId(group.sourceGroupId, `source.groups[${index}].sourceGroupId`);
    denseArray(
      group.sourceEventIds,
      `source.groups[${index}].sourceEventIds`,
      ARRANGEMENT_CONTRACT_LIMITS.maxSourceGroupEvents,
    );
    if (groupIndex.has(sourceGroupId)) {
      fail('DUPLICATE_SOURCE_GROUP_ID', 'A2 source group IDs must be unique.', { sourceGroupId });
    }
    for (const sourceEventId of group.sourceEventIds) {
      if (!eventIndex.has(sourceEventId)) {
        fail('UNKNOWN_SOURCE_EVENT', 'A2 source group references an unknown event.', {
          sourceGroupId,
          sourceEventId,
        });
      }
    }
    groupIndex.set(sourceGroupId, group);
  }
  return { eventIndex, groupIndex };
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

function normalizePolicy(policyInput, source, indexes) {
  exactKeys(
    policyInput,
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

  const sourceGroupId = boundedId(policyInput.sourceGroupId, 'policy.sourceGroupId');
  const group = indexes.groupIndex.get(sourceGroupId);
  if (!group) {
    fail('UNKNOWN_SOURCE_GROUP', 'A2 policy references an unknown source group.', { sourceGroupId });
  }

  denseArray(policyInput.allowedTransforms, 'policy.allowedTransforms', A2_SUPPORTED_TRANSFORMS.length);
  const allowedTransforms = policyInput.allowedTransforms.map((transform, index) => {
    if (typeof transform !== 'string' || !SUPPORTED_TRANSFORM_SET.has(transform)) {
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

  const priorityInput = policyInput.priorityEventIds ?? [];
  denseArray(priorityInput, 'policy.priorityEventIds', MAX_PRIORITY_EVENTS);
  const priorityEventIds = priorityInput.map((id, index) => boundedId(
    id,
    `policy.priorityEventIds[${index}]`,
  ));
  if (new Set(priorityEventIds).size !== priorityEventIds.length) {
    fail('INVALID_A2_POLICY', 'priorityEventIds must not contain duplicates.');
  }
  for (const sourceEventId of priorityEventIds) {
    if (!group.sourceEventIds.includes(sourceEventId)) {
      fail('A2_PRIORITY_OUTSIDE_GROUP', 'Priority events must belong to the target source group.', {
        sourceGroupId,
        sourceEventId,
      });
    }
  }

  const maxAlternatives = boundedInteger(
    policyInput.maxAlternatives,
    DEFAULT_MAX_ALTERNATIVES,
    1,
    ARRANGEMENT_CONTRACT_LIMITS.maxAlternatives,
    'policy.maxAlternatives',
  );
  const maxKeptNotes = boundedInteger(
    policyInput.maxKeptNotes,
    6,
    1,
    Math.min(6, group.sourceEventIds.length),
    'policy.maxKeptNotes',
  );
  const minKeptNotes = boundedInteger(
    policyInput.minKeptNotes,
    Math.max(1, priorityEventIds.length),
    1,
    maxKeptNotes,
    'policy.minKeptNotes',
  );
  if (priorityEventIds.length > maxKeptNotes) {
    fail('A2_PRIORITY_EXCEEDS_KEEP_BOUND', 'Priority event count exceeds maxKeptNotes.', {
      priorityCount: priorityEventIds.length,
      maxKeptNotes,
    });
  }

  const octaveInput = policyInput.octaveSemitoneDeltas ?? [-12, 12];
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

  const maxAssignments = boundedInteger(
    policyInput.maxAssignments,
    DEFAULT_MAX_ASSIGNMENTS,
    1,
    DEFAULT_MAX_ASSIGNMENTS,
    'policy.maxAssignments',
  );
  const leftHandMaxAssignmentAttempts = boundedInteger(
    policyInput.leftHandMaxAssignmentAttempts,
    DEFAULT_LEFT_HAND_ASSIGNMENT_LIMIT,
    1,
    DEFAULT_LEFT_HAND_ASSIGNMENT_LIMIT,
    'policy.leftHandMaxAssignmentAttempts',
  );

  return Object.freeze({
    sourceGroupId,
    allowedTransforms: Object.freeze([...allowedTransforms]),
    priorityEventIds: Object.freeze([...priorityEventIds]),
    maxAlternatives,
    maxKeptNotes,
    minKeptNotes,
    octaveSemitoneDeltas: Object.freeze([...octaveSemitoneDeltas]),
    maxAssignments,
    leftHandMaxAssignmentAttempts,
  });
}

function preservedDecision(alternativeId, sourceEventId, ordinal) {
  return {
    decisionId: `${alternativeId}:preserve:${ordinal}`,
    decisionType: 'PRESERVED',
    sourceEventIds: [sourceEventId],
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
    decisions: source.events.map((event, index) => preservedDecision(
      alternativeId,
      event.sourceEventId,
      index,
    )),
  };
}

function outsideGroupPreservedDecisions(source, groupMemberSet, alternativeId, offset = 1) {
  const decisions = [];
  let ordinal = offset;
  for (const event of source.events) {
    if (groupMemberSet.has(event.sourceEventId)) continue;
    decisions.push(preservedDecision(alternativeId, event.sourceEventId, ordinal));
    ordinal += 1;
  }
  return decisions;
}

function combinations(values, choose, required, visit) {
  const requiredSet = new Set(required);
  const optional = values.filter((value) => !requiredSet.has(value));
  const optionalNeeded = choose - required.length;
  if (optionalNeeded < 0) return true;
  if (optionalNeeded === 0) return visit(values.filter((value) => requiredSet.has(value)));
  if (optionalNeeded > optional.length) return true;

  const selectedIndexes = [];
  let complete = true;
  function walk(start) {
    if (!complete) return;
    if (selectedIndexes.length === optionalNeeded) {
      const selected = new Set(required);
      for (const index of selectedIndexes) selected.add(optional[index]);
      const ordered = values.filter((value) => selected.has(value));
      complete = visit(ordered) !== false;
      return;
    }
    const remaining = optionalNeeded - selectedIndexes.length;
    for (let index = start; index <= optional.length - remaining; index += 1) {
      selectedIndexes.push(index);
      walk(index + 1);
      selectedIndexes.pop();
      if (!complete) return;
    }
  }
  walk(0);
  return complete;
}

function generateReductionAlternatives(source, group, policy, addAlternative) {
  if (!policy.allowedTransforms.includes('CHORD_REDUCED')) return true;
  if (group.sourceEventIds.length <= policy.minKeptNotes) return true;

  const groupMemberSet = new Set(group.sourceEventIds);
  const largestKeep = Math.min(policy.maxKeptNotes, group.sourceEventIds.length - 1);
  for (let keepCount = largestKeep; keepCount >= policy.minKeptNotes; keepCount -= 1) {
    const complete = combinations(
      group.sourceEventIds,
      keepCount,
      policy.priorityEventIds,
      (survivors) => {
        const alternativeId = `a2:reduce:${keepCount}:${survivors.join('+')}`;
        const decisions = [{
          decisionId: `${alternativeId}:group`,
          decisionType: 'CHORD_REDUCED',
          sourceEventIds: [...group.sourceEventIds],
          sourceGroupId: group.sourceGroupId,
          target: { survivingSourceEventIds: [...survivors] },
          reasonCode: 'BOUNDED_EXPLICIT_POLICY_REDUCTION',
        }, ...outsideGroupPreservedDecisions(source, groupMemberSet, alternativeId)];
        return addAlternative({
          alternativeId,
          strategyTags: [
            'INNER_VOICE_REDUCTION',
            ...(policy.priorityEventIds.length > 0 ? ['VOICE_PRIORITY'] : []),
          ],
          decisions,
        });
      },
    );
    if (!complete) return false;
  }
  return true;
}

function generateOctaveAlternatives(source, group, policy, indexes, addAlternative) {
  if (!policy.allowedTransforms.includes('OCTAVE_DISPLACED')) return true;
  const groupMemberSet = new Set(group.sourceEventIds);

  for (const sourceEventId of group.sourceEventIds) {
    const sourceEvent = indexes.eventIndex.get(sourceEventId);
    for (const semitoneDelta of policy.octaveSemitoneDeltas) {
      const targetMidi = sourceEvent.midi + semitoneDelta;
      if (targetMidi < 0 || targetMidi > 127) continue;
      const alternativeId = `a2:octave:${sourceEventId}:${semitoneDelta}`;
      const decisions = [{
        decisionId: `${alternativeId}:transform`,
        decisionType: 'OCTAVE_DISPLACED',
        sourceEventIds: [sourceEventId],
        sourceGroupId: null,
        target: { semitoneDelta },
        reasonCode: 'BOUNDED_EXPLICIT_POLICY_OCTAVE_CANDIDATE',
      }];
      let ordinal = 1;
      for (const event of source.events) {
        if (event.sourceEventId === sourceEventId) continue;
        decisions.push(preservedDecision(alternativeId, event.sourceEventId, ordinal));
        ordinal += 1;
      }
      if (addAlternative({
        alternativeId,
        strategyTags: ['REGISTER_COMPRESSION'],
        decisions,
      }) === false) return false;
    }
  }
  void groupMemberSet;
  return true;
}

function realizeAlternative(source, alternative) {
  const eventIndex = new Map(source.events.map((event) => [event.sourceEventId, event]));
  const realized = [];
  for (const decision of alternative.decisions) {
    if (decision.decisionType === 'PRESERVED' || decision.decisionType === 'VOICE_REDISTRIBUTED') {
      const sourceEvent = eventIndex.get(decision.sourceEventIds[0]);
      realized.push({ sourceEventId: sourceEvent.sourceEventId, midi: sourceEvent.midi });
      continue;
    }
    if (decision.decisionType === 'OMITTED') continue;
    if (decision.decisionType === 'OCTAVE_DISPLACED') {
      realized.push({
        sourceEventId: decision.sourceEventIds[0],
        midi: decision.target.targetMidi,
      });
      continue;
    }
    if (decision.decisionType === 'CHORD_REDUCED') {
      for (const sourceEventId of decision.target.survivingSourceEventIds) {
        realized.push({ sourceEventId, midi: eventIndex.get(sourceEventId).midi });
      }
      continue;
    }
    if (decision.decisionType === 'REVOICED') {
      for (const sourceEventId of decision.sourceEventIds) {
        realized.push({
          sourceEventId,
          midi: decision.target.targetMidiBySourceEventId[sourceEventId],
        });
      }
      continue;
    }
    if (decision.decisionType === 'ARPEGGIATED') {
      return Object.freeze({
        status: 'INDETERMINATE_TRANSFORM_SCOPE',
        reason: 'TEMPORAL_REVALIDATION_REQUIRED',
        realizedEvents: Object.freeze([]),
      });
    }
    fail('UNSUPPORTED_A2_REALIZATION', 'A2 cannot realize this decision type for static validation.', {
      decisionType: decision.decisionType,
    });
  }
  return Object.freeze({
    status: 'REALIZED_STATIC_SONORITY',
    reason: null,
    realizedEvents: Object.freeze(realized.map((event) => Object.freeze(event))),
  });
}

function physicalResult(status, reason, extra = {}) {
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
  const realization = realizeAlternative(source, alternative);
  if (realization.status !== 'REALIZED_STATIC_SONORITY') {
    return physicalResult(realization.status, realization.reason, {
      realizedEventCount: 0,
      witness: null,
    });
  }

  const realizedEvents = realization.realizedEvents;
  if (realizedEvents.length > 6) {
    return physicalResult('INFEASIBLE', 'ACTIVE_NOTE_COUNT_EXCEEDS_STRING_COUNT', {
      realizedEventCount: realizedEvents.length,
      witness: null,
    });
  }
  if (realizedEvents.length === 0) {
    return physicalResult('FEASIBLE', null, {
      realizedEventCount: 0,
      witness: Object.freeze({ assignment: Object.freeze([]), leftHand: null }),
    });
  }

  const notesWithCandidates = [];
  for (const event of realizedEvents) {
    const candidates = getPositionCandidates(event.midi, guitarConfiguration);
    if (candidates.length === 0) {
      return physicalResult('INFEASIBLE', 'NO_EXACT_FRETBOARD_CANDIDATE', {
        realizedEventCount: realizedEvents.length,
        sourceEventId: event.sourceEventId,
        midi: event.midi,
        witness: null,
      });
    }
    notesWithCandidates.push({
      id: event.sourceEventId,
      pitch: `MIDI_${event.midi}`,
      fretboardCandidates: candidates,
    });
  }

  const maxAssignments = options.maxAssignments ?? DEFAULT_MAX_ASSIGNMENTS;
  let assignments;
  try {
    assignments = enumerateSonorityAssignments(notesWithCandidates, { maxAssignments });
  } catch (error) {
    if (error instanceof SonorityAssignmentError && error.code === 'ASSIGNMENT_LIMIT_EXCEEDED') {
      return physicalResult('INDETERMINATE_LIMIT', 'SONORITY_ASSIGNMENT_LIMIT_EXCEEDED', {
        realizedEventCount: realizedEvents.length,
        maxAssignments,
        witness: null,
      });
    }
    throw error;
  }

  if (assignments.length === 0) {
    return physicalResult('INFEASIBLE', 'NO_DISTINCT_STRING_ASSIGNMENT', {
      realizedEventCount: realizedEvents.length,
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
      return physicalResult('FEASIBLE', null, {
        realizedEventCount: realizedEvents.length,
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

  if (sawIndeterminate) {
    return physicalResult('INDETERMINATE_LIMIT', 'LEFT_HAND_ASSIGNMENT_LIMIT_EXCEEDED', {
      realizedEventCount: realizedEvents.length,
      assignmentCountObserved: assignments.length,
      witness: null,
    });
  }
  return physicalResult('INFEASIBLE', 'NO_LEFT_HAND_FEASIBLE_ASSIGNMENT', {
    realizedEventCount: realizedEvents.length,
    assignmentCountObserved: assignments.length,
    witness: null,
  });
}

export function generateBoundedArrangementAlternatives(
  source,
  policyInput,
  guitarConfiguration = STANDARD_GUITAR_CONFIGURATION,
) {
  const indexes = sourceIndexes(source);
  const policy = normalizePolicy(policyInput, source, indexes);
  const group = indexes.groupIndex.get(policy.sourceGroupId);

  const rawAlternatives = [strictAlternative(source)];
  let limitReached = rawAlternatives.length >= policy.maxAlternatives;
  let attemptedCandidateCount = rawAlternatives.length;

  function addAlternative(alternative) {
    attemptedCandidateCount += 1;
    if (rawAlternatives.length >= policy.maxAlternatives) {
      limitReached = true;
      return false;
    }
    rawAlternatives.push(alternative);
    return true;
  }

  if (!limitReached) {
    const reductionsComplete = generateReductionAlternatives(
      source,
      group,
      policy,
      addAlternative,
    );
    if (!reductionsComplete) limitReached = true;
  }
  if (!limitReached) {
    const octavesComplete = generateOctaveAlternatives(
      source,
      group,
      policy,
      indexes,
      addAlternative,
    );
    if (!octavesComplete) limitReached = true;
  }

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
