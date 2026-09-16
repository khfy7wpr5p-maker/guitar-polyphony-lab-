import { types as utilTypes } from 'node:util';

import {
  ARRANGEMENT_CONTRACT_LIMITS,
  createArrangementAlternativeSet,
} from './arrangementAlternativeSet.js';

const { isProxy } = utilTypes;

export const DISJOINT_TRANSFORM_COMPOSITION_VERSION = '1.0.0';
export const DISJOINT_TRANSFORM_COMPOSITION_DOCUMENT_TYPE =
  'DisjointArrangementTransformComposition';

const MAX_INPUT_ALTERNATIVES = 8;

export class DisjointTransformCompositionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'DisjointTransformCompositionError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new DisjointTransformCompositionError(code, message, details);
}

function plainObject(value, path) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail('INVALID_A2B_COMPOSITION_INPUT', `${path} must be a non-proxy plain object.`, { path });
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
    fail('INVALID_A2B_COMPOSITION_INPUT', `${path} must be a bounded native array.`, {
      path,
      maximumLength,
    });
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      fail('INVALID_A2B_COMPOSITION_INPUT', `${path} must be dense.`, { path, index });
    }
  }
  return value;
}

function boundedId(value, path) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > ARRANGEMENT_CONTRACT_LIMITS.maxIdLength
  ) {
    fail('INVALID_A2B_COMPOSITION_ID', `${path} must be a bounded non-empty string.`, { path });
  }
  return value;
}

function rawTargetForDecision(decision) {
  if (decision.target === null || decision.target === undefined) return null;

  if (decision.decisionType === 'OCTAVE_DISPLACED') {
    return { semitoneDelta: decision.target.semitoneDelta };
  }
  if (decision.decisionType === 'VOICE_REDISTRIBUTED') {
    return { targetVoice: decision.target.targetVoice };
  }
  if (decision.decisionType === 'CHORD_REDUCED') {
    return { survivingSourceEventIds: [...decision.target.survivingSourceEventIds] };
  }
  if (decision.decisionType === 'REVOICED') {
    return {
      targetMidiBySourceEventId: { ...decision.target.targetMidiBySourceEventId },
    };
  }
  if (decision.decisionType === 'ARPEGGIATED') {
    return {
      orderedSourceEventIds: [...decision.target.orderedSourceEventIds],
      spreadDivisions: decision.target.spreadDivisions,
    };
  }
  if (decision.decisionType === 'OMITTED' || decision.decisionType === 'PRESERVED') {
    return null;
  }

  fail('UNSUPPORTED_A2B_COMPOSITION_TRANSFORM', 'Unsupported decision type in A2B composition.', {
    decisionType: decision.decisionType,
  });
}

function preserve(alternativeId, sourceEventId, ordinal) {
  return {
    decisionId: `${alternativeId}:preserve:${ordinal}`,
    decisionType: 'PRESERVED',
    sourceEventIds: [sourceEventId],
    sourceGroupId: null,
    target: null,
    reasonCode: 'SOURCE_PRESERVED_AFTER_DISJOINT_COMPOSITION',
  };
}

function transformedDecisions(alternative, alternativeIndex) {
  plainObject(alternative, `alternatives[${alternativeIndex}]`);
  const decisions = denseArray(
    alternative.decisions,
    `alternatives[${alternativeIndex}].decisions`,
    ARRANGEMENT_CONTRACT_LIMITS.maxSourceEvents,
  );
  return decisions.filter((decision) => decision?.decisionType !== 'PRESERVED');
}

export function composeDisjointArrangementTransforms(
  source,
  alternatives,
  options = {},
) {
  plainObject(source, 'source');
  const sourceEvents = denseArray(
    source.events,
    'source.events',
    ARRANGEMENT_CONTRACT_LIMITS.maxSourceEvents,
  );
  denseArray(alternatives, 'alternatives', MAX_INPUT_ALTERNATIVES);
  plainObject(options, 'options');
  if (alternatives.length < 2) {
    fail('A2B_COMPOSITION_REQUIRES_MULTIPLE_INPUTS', 'At least two alternatives are required.');
  }

  const alternativeId = boundedId(
    options.alternativeId ?? 'a2b:disjoint-composition',
    'options.alternativeId',
  );

  const sourceIds = new Set();
  for (let index = 0; index < sourceEvents.length; index += 1) {
    const event = plainObject(sourceEvents[index], `source.events[${index}]`);
    if (typeof event.sourceEventId !== 'string' || event.sourceEventId.length === 0) {
      fail('INVALID_A2B_COMPOSITION_SOURCE', 'Every source event requires sourceEventId.', { index });
    }
    if (sourceIds.has(event.sourceEventId)) {
      fail('DUPLICATE_SOURCE_EVENT_ID', 'Source event IDs must be unique.', {
        sourceEventId: event.sourceEventId,
      });
    }
    sourceIds.add(event.sourceEventId);
  }

  const occupiedBy = new Map();
  const selected = [];
  const strategyTags = new Set();
  for (let alternativeIndex = 0; alternativeIndex < alternatives.length; alternativeIndex += 1) {
    const alternative = alternatives[alternativeIndex];
    for (const tag of alternative.strategyTags ?? []) strategyTags.add(tag);
    const transformed = transformedDecisions(alternative, alternativeIndex);
    if (transformed.length === 0) {
      fail('A2B_COMPOSITION_INPUT_HAS_NO_TRANSFORM', 'Every input alternative must contribute a transform.', {
        alternativeIndex,
      });
    }
    for (const decision of transformed) {
      const sourceEventIds = denseArray(
        decision.sourceEventIds,
        `alternatives[${alternativeIndex}].decision.sourceEventIds`,
        ARRANGEMENT_CONTRACT_LIMITS.maxSourceGroupEvents,
      );
      for (const sourceEventId of sourceEventIds) {
        if (!sourceIds.has(sourceEventId)) {
          fail('UNKNOWN_SOURCE_EVENT', 'Composition decision references an unknown source event.', {
            alternativeIndex,
            sourceEventId,
          });
        }
        if (occupiedBy.has(sourceEventId)) {
          return Object.freeze({
            documentType: DISJOINT_TRANSFORM_COMPOSITION_DOCUMENT_TYPE,
            contractVersion: DISJOINT_TRANSFORM_COMPOSITION_VERSION,
            authority: 'LAB_RESEARCH_COMPOSITION_ONLY',
            productionAuthority: false,
            automaticProductionTransformationAuthority: false,
            status: 'OVERLAPPING_SCOPE',
            reason: 'SOURCE_EVENT_TRANSFORMED_MORE_THAN_ONCE',
            overlap: Object.freeze({
              sourceEventId,
              firstAlternativeIndex: occupiedBy.get(sourceEventId),
              secondAlternativeIndex: alternativeIndex,
            }),
            alternativeSet: null,
          });
        }
        occupiedBy.set(sourceEventId, alternativeIndex);
      }
      selected.push(decision);
    }
  }

  const decisions = selected.map((decision, index) => ({
    decisionId: `${alternativeId}:transform:${index + 1}`,
    decisionType: decision.decisionType,
    sourceEventIds: [...decision.sourceEventIds],
    sourceGroupId: decision.sourceGroupId ?? null,
    target: rawTargetForDecision(decision),
    reasonCode: `DISJOINT_COMPOSITION:${decision.reasonCode}`,
  }));

  let preserveOrdinal = 1;
  for (const event of sourceEvents) {
    if (occupiedBy.has(event.sourceEventId)) continue;
    decisions.push(preserve(alternativeId, event.sourceEventId, preserveOrdinal));
    preserveOrdinal += 1;
  }

  const alternativeSet = createArrangementAlternativeSet(source, [{
    alternativeId,
    strategyTags: [...strategyTags].sort(),
    decisions,
  }]);

  return Object.freeze({
    documentType: DISJOINT_TRANSFORM_COMPOSITION_DOCUMENT_TYPE,
    contractVersion: DISJOINT_TRANSFORM_COMPOSITION_VERSION,
    authority: 'LAB_RESEARCH_COMPOSITION_ONLY',
    productionAuthority: false,
    automaticProductionTransformationAuthority: false,
    status: 'COMPOSED',
    reason: null,
    transformedSourceEventCount: occupiedBy.size,
    inputAlternativeCount: alternatives.length,
    overlappingTransformsSupported: false,
    alternativeSet,
  });
}
