import { types as utilTypes } from 'node:util';

import { getPositionCandidates } from '../guitar/fretboardCandidates.js';
import { evaluateIndependentLeftHandFeasibility } from '../guitar/leftHandFeasibilityOracle.js';
import { STANDARD_GUITAR_CONFIGURATION } from '../guitar/tuningConfiguration.js';

const { isProxy } = utilTypes;

export const TEMPORAL_ARPEGGIATION_VALIDATOR_VERSION = '1.0.0';
export const TEMPORAL_ARPEGGIATION_VALIDATOR_DOCUMENT_TYPE =
  'TemporalArpeggiationValidationResult';
export const TEMPORAL_ARPEGGIATION_POLICY =
  'ABSTRACT_SPREAD_SEQUENCE_EXACT_POSITION_PATH_1.0';

const MAX_SEQUENCE_EVENTS = 128;
const DEFAULT_LEFT_HAND_ASSIGNMENT_LIMIT = 4096;

export class TemporalArpeggiationValidatorError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'TemporalArpeggiationValidatorError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new TemporalArpeggiationValidatorError(code, message, details);
}

function plainObject(value, path) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail('INVALID_A2B_TEMPORAL_INPUT', `${path} must be a non-proxy plain object.`, { path });
  }
  return value;
}

function denseArray(value, path, maximumLength) {
  if (
    !Array.isArray(value)
    || isProxy(value)
    || Object.getPrototypeOf(value) !== Array.prototype
    || value.length > maximumLength
  ) {
    fail('INVALID_A2B_TEMPORAL_INPUT', `${path} must be a bounded native array.`, {
      path,
      maximumLength,
    });
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      fail('INVALID_A2B_TEMPORAL_INPUT', `${path} must be dense.`, { path, index });
    }
  }
  return value;
}

function resultBase() {
  return {
    documentType: TEMPORAL_ARPEGGIATION_VALIDATOR_DOCUMENT_TYPE,
    contractVersion: TEMPORAL_ARPEGGIATION_VALIDATOR_VERSION,
    authority: 'LAB_RESEARCH_VALIDATOR_ONLY',
    productionAuthority: false,
    exportAuthority: false,
    timingAuthority: false,
    policy: TEMPORAL_ARPEGGIATION_POLICY,
    temporalEvidence: Object.freeze({
      sequenceSemantics: 'ABSTRACT_SPREAD_SEQUENCE',
      sourceOnsetsAvailable: false,
      sourceDurationsAvailable: false,
      interStepDurationAvailable: false,
      interStepReachModeled: false,
      sustainAcrossStepsModeled: false,
      exactPitchPositionsModeled: true,
      perStepLeftHandModeled: true,
    }),
  };
}

function compareCost(left, right) {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? Number.POSITIVE_INFINITY;
    const b = right[index] ?? Number.POSITIVE_INFINITY;
    if (a !== b) return a - b;
  }
  return 0;
}

function extendCost(previous, from, to) {
  return Object.freeze([
    previous[0] + (from.string === to.string ? 0 : 1),
    previous[1] + Math.abs(from.fret - to.fret),
    Math.max(previous[2], to.fret),
    previous[3] + to.fret,
    previous[4] + to.string,
  ]);
}

function pathSignature(path) {
  return path.map((step) => `${step.string}:${step.fret}`).join(';');
}

function better(left, right) {
  const numeric = compareCost(left.cost, right.cost);
  if (numeric !== 0) return numeric < 0;
  return pathSignature(left.path).localeCompare(pathSignature(right.path)) < 0;
}

function indexSource(source) {
  plainObject(source, 'source');
  const events = denseArray(source.events, 'source.events', 4096);
  const eventIndex = new Map();
  for (let index = 0; index < events.length; index += 1) {
    const event = plainObject(events[index], `source.events[${index}]`);
    if (
      typeof event.sourceEventId !== 'string'
      || event.sourceEventId.length === 0
      || event.sourceEventId.length > 256
    ) {
      fail('INVALID_A2B_TEMPORAL_SOURCE_EVENT', 'sourceEventId must be a bounded non-empty string.', {
        index,
      });
    }
    if (eventIndex.has(event.sourceEventId)) {
      fail('DUPLICATE_SOURCE_EVENT_ID', 'Source event IDs must be unique.', {
        sourceEventId: event.sourceEventId,
      });
    }
    if (!Number.isSafeInteger(event.midi) || event.midi < 0 || event.midi > 127) {
      fail('INVALID_A2B_TEMPORAL_SOURCE_EVENT', 'Source event MIDI must be an integer in 0..127.', {
        sourceEventId: event.sourceEventId,
      });
    }
    eventIndex.set(event.sourceEventId, event);
  }
  return eventIndex;
}

function getArpeggiationDecision(alternative) {
  plainObject(alternative, 'alternative');
  const decisions = denseArray(alternative.decisions, 'alternative.decisions', 4096);
  const arpeggiations = decisions.filter((decision) => decision?.decisionType === 'ARPEGGIATED');
  if (arpeggiations.length === 0) return null;
  if (arpeggiations.length !== 1) {
    fail(
      'MULTIPLE_ARPEGGIATION_DECISIONS_UNSUPPORTED',
      'A2B temporal validation currently supports exactly one arpeggiated source group per alternative.',
      { count: arpeggiations.length },
    );
  }
  return arpeggiations[0];
}

function normalizeDecision(decision, eventIndex) {
  plainObject(decision, 'arpeggiationDecision');
  plainObject(decision.target, 'arpeggiationDecision.target');
  const order = denseArray(
    decision.target.orderedSourceEventIds,
    'arpeggiationDecision.target.orderedSourceEventIds',
    MAX_SEQUENCE_EVENTS,
  );
  if (order.length < 2) {
    fail('INVALID_A2B_ARPEGGIATION', 'Arpeggiation must contain at least two ordered events.');
  }
  if (new Set(order).size !== order.length) {
    fail('INVALID_A2B_ARPEGGIATION', 'Arpeggiation order must not repeat source events.');
  }
  for (const sourceEventId of order) {
    if (!eventIndex.has(sourceEventId)) {
      fail('UNKNOWN_SOURCE_EVENT', 'Arpeggiation references an unknown source event.', { sourceEventId });
    }
  }
  if (
    !Number.isSafeInteger(decision.target.spreadDivisions)
    || decision.target.spreadDivisions <= 0
    || decision.target.spreadDivisions > 4096
  ) {
    fail('INVALID_A2B_ARPEGGIATION', 'spreadDivisions must be a positive bounded integer.', {
      spreadDivisions: decision.target.spreadDivisions,
    });
  }
  return Object.freeze({
    sourceGroupId: decision.sourceGroupId ?? null,
    orderedSourceEventIds: Object.freeze([...order]),
    spreadDivisions: decision.target.spreadDivisions,
  });
}

function leftHandStepStatus(sourceEventId, position, maxAssignmentAttempts) {
  const result = evaluateIndependentLeftHandFeasibility([
    {
      positionId: sourceEventId,
      string: position.string,
      fret: position.fret,
    },
  ], { maxAssignmentAttempts });
  return result;
}

export function validateTemporalArpeggiationAlternative(
  source,
  alternative,
  options = {},
  guitarConfiguration = STANDARD_GUITAR_CONFIGURATION,
) {
  plainObject(options, 'options');
  const maxAssignmentAttempts = options.leftHandMaxAssignmentAttempts
    ?? DEFAULT_LEFT_HAND_ASSIGNMENT_LIMIT;
  if (
    !Number.isSafeInteger(maxAssignmentAttempts)
    || maxAssignmentAttempts <= 0
    || maxAssignmentAttempts > DEFAULT_LEFT_HAND_ASSIGNMENT_LIMIT
  ) {
    fail('INVALID_A2B_TEMPORAL_OPTIONS', 'leftHandMaxAssignmentAttempts is outside the supported bound.', {
      maxAssignmentAttempts,
    });
  }

  const eventIndex = indexSource(source);
  const rawDecision = getArpeggiationDecision(alternative);
  if (!rawDecision) {
    return Object.freeze({
      ...resultBase(),
      status: 'NOT_APPLICABLE',
      reason: 'NO_ARPEGGIATED_DECISION',
      reviewRequired: false,
      sourceGroupId: null,
      declaredSpreadDivisions: null,
      witness: null,
    });
  }
  const decision = normalizeDecision(rawDecision, eventIndex);

  const layers = [];
  for (const sourceEventId of decision.orderedSourceEventIds) {
    const event = eventIndex.get(sourceEventId);
    const candidates = getPositionCandidates(event.midi, guitarConfiguration);
    if (candidates.length === 0) {
      return Object.freeze({
        ...resultBase(),
        status: 'INFEASIBLE',
        reason: 'NO_EXACT_FRETBOARD_CANDIDATE',
        reviewRequired: true,
        sourceGroupId: decision.sourceGroupId,
        declaredSpreadDivisions: decision.spreadDivisions,
        decisiveSourceEventId: sourceEventId,
        decisiveMidi: event.midi,
        witness: null,
      });
    }
    layers.push(Object.freeze(candidates.map((candidate) => Object.freeze({
      string: candidate.string,
      fret: candidate.fret,
    }))));
  }

  let states = new Map();
  for (const position of layers[0]) {
    const key = `${position.string}:${position.fret}`;
    states.set(key, Object.freeze({
      position,
      cost: Object.freeze([0, 0, position.fret, position.fret, position.string]),
      path: Object.freeze([position]),
    }));
  }

  for (let layerIndex = 1; layerIndex < layers.length; layerIndex += 1) {
    const next = new Map();
    for (const candidate of layers[layerIndex]) {
      const key = `${candidate.string}:${candidate.fret}`;
      for (const previous of states.values()) {
        const proposal = Object.freeze({
          position: candidate,
          cost: extendCost(previous.cost, previous.position, candidate),
          path: Object.freeze([...previous.path, candidate]),
        });
        const incumbent = next.get(key);
        if (!incumbent || better(proposal, incumbent)) next.set(key, proposal);
      }
    }
    states = next;
  }

  const finalists = [...states.values()].sort((left, right) => {
    const numeric = compareCost(left.cost, right.cost);
    return numeric !== 0
      ? numeric
      : pathSignature(left.path).localeCompare(pathSignature(right.path));
  });
  if (finalists.length === 0) {
    return Object.freeze({
      ...resultBase(),
      status: 'INFEASIBLE',
      reason: 'NO_EXACT_POSITION_PATH',
      reviewRequired: true,
      sourceGroupId: decision.sourceGroupId,
      declaredSpreadDivisions: decision.spreadDivisions,
      witness: null,
    });
  }

  const selected = finalists[0];
  const steps = [];
  for (let index = 0; index < decision.orderedSourceEventIds.length; index += 1) {
    const sourceEventId = decision.orderedSourceEventIds[index];
    const event = eventIndex.get(sourceEventId);
    const position = selected.path[index];
    const leftHand = leftHandStepStatus(sourceEventId, position, maxAssignmentAttempts);
    if (leftHand.status === 'INDETERMINATE_LIMIT') {
      return Object.freeze({
        ...resultBase(),
        status: 'INDETERMINATE_LIMIT',
        reason: 'PER_STEP_LEFT_HAND_ASSIGNMENT_LIMIT_EXCEEDED',
        reviewRequired: true,
        sourceGroupId: decision.sourceGroupId,
        declaredSpreadDivisions: decision.spreadDivisions,
        decisiveSourceEventId: sourceEventId,
        witness: null,
      });
    }
    if (leftHand.status !== 'FEASIBLE') {
      return Object.freeze({
        ...resultBase(),
        status: 'INFEASIBLE',
        reason: 'PER_STEP_LEFT_HAND_INFEASIBLE',
        reviewRequired: true,
        sourceGroupId: decision.sourceGroupId,
        declaredSpreadDivisions: decision.spreadDivisions,
        decisiveSourceEventId: sourceEventId,
        witness: null,
      });
    }
    steps.push(Object.freeze({
      orderIndex: index,
      sourceEventId,
      midi: event.midi,
      string: position.string,
      fret: position.fret,
    }));
  }

  return Object.freeze({
    ...resultBase(),
    status: 'FEASIBLE',
    reason: null,
    reviewRequired: true,
    sourceGroupId: decision.sourceGroupId,
    declaredSpreadDivisions: decision.spreadDivisions,
    witness: Object.freeze({
      steps: Object.freeze(steps),
      transitionCost: Object.freeze({
        stringChanges: selected.cost[0],
        fretDistance: selected.cost[1],
        maximumFret: selected.cost[2],
        fretSum: selected.cost[3],
        stringSum: selected.cost[4],
      }),
    }),
  });
}
