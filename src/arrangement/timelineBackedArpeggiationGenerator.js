import { types as utilTypes } from 'node:util';

import {
  ARRANGEMENT_CONTRACT_LIMITS,
  createArrangementAlternativeSet,
} from './arrangementAlternativeSet.js';
import { validateTimelineBackedArpeggiation } from './timelineBackedArpeggiationValidator.js';
import { STANDARD_GUITAR_CONFIGURATION } from '../guitar/tuningConfiguration.js';

const { isProxy } = utilTypes;

export const TIMELINE_BACKED_ARPEGGIATION_GENERATOR_VERSION = '1.0.0';
export const TIMELINE_BACKED_ARPEGGIATION_GENERATOR_DOCUMENT_TYPE =
  'TimelineBackedArpeggiationGeneration';
export const A2C_ARPEGGIATION_ORDER_STRATEGIES = Object.freeze([
  'SOURCE_ORDER',
  'REVERSE_SOURCE_ORDER',
  'ASCENDING_PITCH',
  'DESCENDING_PITCH',
]);

const ORDER_STRATEGY_SET = new Set(A2C_ARPEGGIATION_ORDER_STRATEGIES);
const DEFAULT_ORDER_STRATEGIES = Object.freeze([
  'SOURCE_ORDER',
  'ASCENDING_PITCH',
  'DESCENDING_PITCH',
]);
const DEFAULT_MAX_ALTERNATIVES = 8;
const DEFAULT_LEFT_HAND_ASSIGNMENT_LIMIT = 4096;

export class TimelineBackedArpeggiationGeneratorError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'TimelineBackedArpeggiationGeneratorError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new TimelineBackedArpeggiationGeneratorError(code, message, details);
}

function plainObject(value, path) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail('INVALID_A2C_GENERATOR_INPUT', `${path} must be a non-proxy plain object.`, { path });
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
    fail('INVALID_A2C_GENERATOR_INPUT', `${path} must be a bounded native array.`, {
      path,
      maximumLength,
    });
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      fail('INVALID_A2C_GENERATOR_INPUT', `${path} must be dense.`, { path, index });
    }
  }
  return value;
}

function exactKeys(value, allowedKeys, path) {
  plainObject(value, path);
  const allowed = new Set(allowedKeys);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.has(key)) {
      fail('INVALID_A2C_GENERATOR_FIELD', `${path} contains an unknown field.`, {
        path,
        field: typeof key === 'symbol' ? key.toString() : key,
      });
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      fail('HOSTILE_A2C_GENERATOR_INPUT', `${path} fields must be enumerable data properties.`, {
        path,
        field: key,
      });
    }
  }
}

function boundedId(value, path) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > ARRANGEMENT_CONTRACT_LIMITS.maxIdLength
  ) {
    fail('INVALID_A2C_GENERATOR_ID', `${path} must be a bounded non-empty string.`, { path });
  }
  return value;
}

function boundedInteger(value, fallback, minimum, maximum, path) {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < minimum || resolved > maximum) {
    fail('INVALID_A2C_GENERATOR_POLICY', `${path} is outside the supported bound.`, {
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
  const events = denseArray(
    source.events,
    'source.events',
    ARRANGEMENT_CONTRACT_LIMITS.maxSourceEvents,
  );
  const groups = denseArray(
    source.groups,
    'source.groups',
    ARRANGEMENT_CONTRACT_LIMITS.maxSourceEvents,
  );

  const eventIndex = new Map();
  const sourceOrder = new Map();
  for (let index = 0; index < events.length; index += 1) {
    const event = plainObject(events[index], `source.events[${index}]`);
    const id = boundedId(event.sourceEventId, `source.events[${index}].sourceEventId`);
    if (eventIndex.has(id)) fail('DUPLICATE_SOURCE_EVENT_ID', 'Source event IDs must be unique.', { id });
    if (!Number.isSafeInteger(event.midi) || event.midi < 0 || event.midi > 127) {
      fail('INVALID_A2C_GENERATOR_SOURCE_EVENT', 'Source MIDI must be an integer in 0..127.', { id });
    }
    eventIndex.set(id, event);
    sourceOrder.set(id, index);
  }

  const groupIndex = new Map();
  for (let index = 0; index < groups.length; index += 1) {
    const group = plainObject(groups[index], `source.groups[${index}]`);
    const id = boundedId(group.sourceGroupId, `source.groups[${index}].sourceGroupId`);
    if (groupIndex.has(id)) fail('DUPLICATE_SOURCE_GROUP_ID', 'Source group IDs must be unique.', { id });
    denseArray(
      group.sourceEventIds,
      `source.groups[${index}].sourceEventIds`,
      ARRANGEMENT_CONTRACT_LIMITS.maxSourceGroupEvents,
    );
    if (group.sourceEventIds.length < 2) {
      fail('INVALID_A2C_GENERATOR_SOURCE_GROUP', 'Arpeggiation groups require at least two events.', {
        sourceGroupId: id,
      });
    }
    for (const eventId of group.sourceEventIds) {
      if (!eventIndex.has(eventId)) {
        fail('UNKNOWN_SOURCE_EVENT', 'Source group references an unknown event.', {
          sourceGroupId: id,
          sourceEventId: eventId,
        });
      }
    }
    groupIndex.set(id, group);
  }
  return { eventIndex, groupIndex, sourceOrder };
}

function normalizePolicy(policyInput, indexes) {
  exactKeys(
    policyInput,
    [
      'sourceGroupId',
      'spreadDivisions',
      'orderStrategies',
      'maxAlternatives',
      'leftHandMaxAssignmentAttempts',
    ],
    'policy',
  );
  const sourceGroupId = boundedId(policyInput.sourceGroupId, 'policy.sourceGroupId');
  if (!indexes.groupIndex.has(sourceGroupId)) {
    fail('UNKNOWN_SOURCE_GROUP', 'A2C policy references an unknown source group.', { sourceGroupId });
  }
  if (
    !Number.isSafeInteger(policyInput.spreadDivisions)
    || policyInput.spreadDivisions <= 0
    || policyInput.spreadDivisions > 4096
  ) {
    fail(
      'A2C_EXPLICIT_SPREAD_REQUIRED',
      'policy.spreadDivisions must be an explicit positive bounded integer; target timing is never inferred from source duration.',
      { spreadDivisions: policyInput.spreadDivisions ?? null },
    );
  }

  const orderInput = policyInput.orderStrategies ?? DEFAULT_ORDER_STRATEGIES;
  denseArray(orderInput, 'policy.orderStrategies', A2C_ARPEGGIATION_ORDER_STRATEGIES.length);
  if (orderInput.length === 0) {
    fail('INVALID_A2C_GENERATOR_POLICY', 'policy.orderStrategies must contain at least one strategy.');
  }
  const orderStrategies = orderInput.map((strategy, index) => {
    if (typeof strategy !== 'string' || !ORDER_STRATEGY_SET.has(strategy)) {
      fail('UNSUPPORTED_A2C_ORDER_STRATEGY', 'Unsupported A2C arpeggiation order strategy.', {
        index,
        strategy,
        supported: A2C_ARPEGGIATION_ORDER_STRATEGIES,
      });
    }
    return strategy;
  });
  if (new Set(orderStrategies).size !== orderStrategies.length) {
    fail('INVALID_A2C_GENERATOR_POLICY', 'policy.orderStrategies must not contain duplicates.');
  }

  return Object.freeze({
    sourceGroupId,
    spreadDivisions: policyInput.spreadDivisions,
    orderStrategies: Object.freeze([...orderStrategies]),
    maxAlternatives: boundedInteger(
      policyInput.maxAlternatives,
      DEFAULT_MAX_ALTERNATIVES,
      1,
      ARRANGEMENT_CONTRACT_LIMITS.maxAlternatives,
      'policy.maxAlternatives',
    ),
    leftHandMaxAssignmentAttempts: boundedInteger(
      policyInput.leftHandMaxAssignmentAttempts,
      DEFAULT_LEFT_HAND_ASSIGNMENT_LIMIT,
      1,
      DEFAULT_LEFT_HAND_ASSIGNMENT_LIMIT,
      'policy.leftHandMaxAssignmentAttempts',
    ),
  });
}

function indexTimelineSidecar(sidecar) {
  plainObject(sidecar, 'timelineSidecar');
  if (sidecar.documentType !== 'ArrangementTimelineSidecar') {
    fail('INVALID_A2C_TIMELINE_SIDECAR', 'Unsupported timeline sidecar document type.', {
      documentType: sidecar.documentType,
    });
  }
  const entries = denseArray(sidecar.entries, 'timelineSidecar.entries', ARRANGEMENT_CONTRACT_LIMITS.maxSourceEvents);
  const index = new Map();
  for (const entry of entries) {
    plainObject(entry, 'timelineSidecar entry');
    if (index.has(entry.sourceEventId)) {
      fail('DUPLICATE_A2C_TIMELINE_ENTRY', 'Timeline sidecar source event IDs must be unique.', {
        sourceEventId: entry.sourceEventId,
      });
    }
    index.set(entry.sourceEventId, entry);
  }
  return index;
}

function timelineEvidence(group, sidecarIndex) {
  const entries = [];
  const missing = [];
  for (const sourceEventId of group.sourceEventIds) {
    const entry = sidecarIndex.get(sourceEventId);
    if (!entry) missing.push(sourceEventId);
    else entries.push(entry);
  }
  if (missing.length > 0) {
    return Object.freeze({
      status: 'INDETERMINATE_TIMELINE_EVIDENCE',
      reason: 'MISSING_SOURCE_TIMING_EVIDENCE',
      missingSourceEventIds: Object.freeze([...missing].sort()),
      sourceGroupWasSimultaneous: null,
    });
  }

  const first = entries[0];
  const sameMeasure = entries.every((entry) => entry.measureIndex === first.measureIndex);
  const sameDivisions = entries.every((entry) => entry.divisions === first.divisions);
  const sameOnset = entries.every((entry) => entry.onsetDivisions === first.onsetDivisions);
  if (!sameMeasure || !sameDivisions || !sameOnset) {
    return Object.freeze({
      status: 'TIMELINE_CONFLICT',
      reason: !sameMeasure
        ? 'SOURCE_GROUP_SPANS_MULTIPLE_MEASURES'
        : !sameDivisions
          ? 'SOURCE_GROUP_DIVISION_BASIS_MISMATCH'
          : 'SOURCE_GROUP_NOT_SIMULTANEOUS',
      missingSourceEventIds: Object.freeze([]),
      sourceGroupWasSimultaneous: false,
    });
  }

  return Object.freeze({
    status: 'COMPLETE',
    reason: null,
    missingSourceEventIds: Object.freeze([]),
    sourceGroupWasSimultaneous: true,
    measureIndex: first.measureIndex,
    measureNumber: first.measureNumber,
    divisions: first.divisions,
    commonOnsetDivisions: first.onsetDivisions,
    minimumDurationDivisions: Math.min(...entries.map((entry) => entry.durationDivisions)),
    maximumEndDivisions: Math.max(...entries.map((entry) => entry.endDivisions)),
    tieEvidencePresent: entries.some((entry) => entry.tieStart || entry.tieStop),
  });
}

function orderedIds(strategy, group, indexes) {
  const canonical = [...group.sourceEventIds];
  if (strategy === 'SOURCE_ORDER') return canonical;
  if (strategy === 'REVERSE_SOURCE_ORDER') return canonical.reverse();
  const direction = strategy === 'ASCENDING_PITCH' ? 1 : -1;
  return canonical.sort((left, right) => {
    const midiDelta = indexes.eventIndex.get(left).midi - indexes.eventIndex.get(right).midi;
    if (midiDelta !== 0) return midiDelta * direction;
    return indexes.sourceOrder.get(left) - indexes.sourceOrder.get(right);
  });
}

function preserve(alternativeId, sourceEventId, ordinal) {
  return {
    decisionId: `${alternativeId}:preserve:${ordinal}`,
    decisionType: 'PRESERVED',
    sourceEventIds: [sourceEventId],
    sourceGroupId: null,
    target: null,
    reasonCode: 'SOURCE_PRESERVED_OUTSIDE_ARPEGGIATED_GROUP',
  };
}

function rawAlternative(source, group, order, strategy, policy, ordinal) {
  const alternativeId = `a2c:arp:${ordinal}:${strategy.toLowerCase()}`;
  const memberSet = new Set(group.sourceEventIds);
  const decisions = [{
    decisionId: `${alternativeId}:group`,
    decisionType: 'ARPEGGIATED',
    sourceEventIds: [...group.sourceEventIds],
    sourceGroupId: group.sourceGroupId,
    target: {
      orderedSourceEventIds: [...order],
      spreadDivisions: policy.spreadDivisions,
    },
    reasonCode: `A2C_EXPLICIT_POLICY_${strategy}`,
  }];
  let preserveOrdinal = 1;
  for (const event of source.events) {
    if (memberSet.has(event.sourceEventId)) continue;
    decisions.push(preserve(alternativeId, event.sourceEventId, preserveOrdinal));
    preserveOrdinal += 1;
  }
  return {
    alternativeId,
    strategyTags: ['ARPEGGIATION'],
    decisions,
  };
}

function emptyResult(policy, evidence, status) {
  return Object.freeze({
    documentType: TIMELINE_BACKED_ARPEGGIATION_GENERATOR_DOCUMENT_TYPE,
    contractVersion: TIMELINE_BACKED_ARPEGGIATION_GENERATOR_VERSION,
    authority: 'LAB_RESEARCH_GENERATOR_ONLY',
    productionAuthority: false,
    exportAuthority: false,
    automaticProductionTransformationAuthority: false,
    sourceNoteLossAllowed: false,
    targetTimingAuthority: false,
    policy,
    sourceTimelineEvidence: evidence,
    generation: Object.freeze({
      status,
      candidateSpaceComplete: false,
      emittedAlternativeCount: 0,
      attemptedOrderCount: 0,
      candidateOrderIsPreferenceRank: false,
    }),
    alternativeSet: null,
    validations: Object.freeze([]),
  });
}

export function generateTimelineBackedArpeggiationAlternatives(
  source,
  timelineSidecar,
  policyInput,
  guitarConfiguration = STANDARD_GUITAR_CONFIGURATION,
) {
  const indexes = indexSource(source);
  const policy = normalizePolicy(policyInput, indexes);
  const group = indexes.groupIndex.get(policy.sourceGroupId);
  const evidence = timelineEvidence(group, indexTimelineSidecar(timelineSidecar));
  if (evidence.status !== 'COMPLETE') {
    return emptyResult(policy, evidence, evidence.status);
  }

  const rawOrders = [];
  const seenOrders = new Set();
  let attemptedOrderCount = 0;
  let limitReached = false;
  for (const strategy of policy.orderStrategies) {
    attemptedOrderCount += 1;
    const order = orderedIds(strategy, group, indexes);
    const signature = order.join('\u0000');
    if (seenOrders.has(signature)) continue;
    seenOrders.add(signature);
    if (rawOrders.length >= policy.maxAlternatives) {
      limitReached = true;
      break;
    }
    rawOrders.push({ strategy, order });
  }

  const rawAlternatives = rawOrders.map((entry, index) => rawAlternative(
    source,
    group,
    entry.order,
    entry.strategy,
    policy,
    index + 1,
  ));
  const alternativeSet = createArrangementAlternativeSet(source, rawAlternatives);
  const validations = alternativeSet.alternatives.map((alternative) => Object.freeze({
    alternativeId: alternative.alternativeId,
    timelinePhysical: validateTimelineBackedArpeggiation(
      source,
      alternative,
      timelineSidecar,
      { leftHandMaxAssignmentAttempts: policy.leftHandMaxAssignmentAttempts },
      guitarConfiguration,
    ),
  }));

  const statusCounts = Object.create(null);
  for (const validation of validations) {
    const status = validation.timelinePhysical.status;
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }

  return Object.freeze({
    documentType: TIMELINE_BACKED_ARPEGGIATION_GENERATOR_DOCUMENT_TYPE,
    contractVersion: TIMELINE_BACKED_ARPEGGIATION_GENERATOR_VERSION,
    authority: 'LAB_RESEARCH_GENERATOR_ONLY',
    productionAuthority: false,
    exportAuthority: false,
    automaticProductionTransformationAuthority: false,
    sourceNoteLossAllowed: false,
    targetTimingAuthority: false,
    policy,
    sourceTimelineEvidence: evidence,
    generation: Object.freeze({
      status: limitReached ? 'PARTIAL_LIMIT' : 'COMPLETE',
      candidateSpaceComplete: !limitReached,
      emittedAlternativeCount: alternativeSet.alternativeCount,
      attemptedOrderCount,
      uniqueOrderCountObserved: seenOrders.size,
      candidateOrderIsPreferenceRank: false,
    }),
    alternativeSet,
    validations: Object.freeze(validations),
    validationStatusCounts: Object.freeze(statusCounts),
  });
}
