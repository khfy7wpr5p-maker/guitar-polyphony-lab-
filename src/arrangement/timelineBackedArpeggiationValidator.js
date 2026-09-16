import { types as utilTypes } from 'node:util';

import { validateTemporalArpeggiationAlternative } from './temporalArpeggiationValidator.js';
import { STANDARD_GUITAR_CONFIGURATION } from '../guitar/tuningConfiguration.js';

const { isProxy } = utilTypes;

export const TIMELINE_BACKED_ARPEGGIATION_VERSION = '1.0.0';
export const TIMELINE_BACKED_ARPEGGIATION_DOCUMENT_TYPE =
  'TimelineBackedArpeggiationValidationResult';

export class TimelineBackedArpeggiationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'TimelineBackedArpeggiationError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new TimelineBackedArpeggiationError(code, message, details);
}

function plainObject(value, path) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail('INVALID_A2C_ARPEGGIATION_INPUT', `${path} must be a non-proxy plain object.`, { path });
  }
  return value;
}

function getArpeggiationDecision(alternative) {
  plainObject(alternative, 'alternative');
  if (!Array.isArray(alternative.decisions)) {
    fail('INVALID_A2C_ARPEGGIATION_INPUT', 'alternative.decisions must be an array.');
  }
  const matches = alternative.decisions.filter((decision) => decision?.decisionType === 'ARPEGGIATED');
  if (matches.length === 0) return null;
  if (matches.length !== 1) {
    fail('MULTIPLE_ARPEGGIATION_DECISIONS_UNSUPPORTED', 'A2C currently validates one arpeggiated group per alternative.', {
      count: matches.length,
    });
  }
  return matches[0];
}

function indexSidecar(sidecar) {
  plainObject(sidecar, 'timelineSidecar');
  if (sidecar.documentType !== 'ArrangementTimelineSidecar') {
    fail('INVALID_A2C_TIMELINE_SIDECAR', 'Unsupported timeline sidecar document type.', {
      documentType: sidecar.documentType,
    });
  }
  if (!Array.isArray(sidecar.entries)) {
    fail('INVALID_A2C_TIMELINE_SIDECAR', 'timelineSidecar.entries must be an array.');
  }
  const index = new Map();
  for (const entry of sidecar.entries) {
    plainObject(entry, 'timelineSidecar entry');
    if (index.has(entry.sourceEventId)) {
      fail('DUPLICATE_A2C_TIMELINE_ENTRY', 'Timeline sidecar sourceEventId entries must be unique.', {
        sourceEventId: entry.sourceEventId,
      });
    }
    index.set(entry.sourceEventId, entry);
  }
  return index;
}

function baseResult() {
  return {
    documentType: TIMELINE_BACKED_ARPEGGIATION_DOCUMENT_TYPE,
    contractVersion: TIMELINE_BACKED_ARPEGGIATION_VERSION,
    authority: 'LAB_RESEARCH_TIMELINE_VALIDATOR_ONLY',
    productionAuthority: false,
    exportAuthority: false,
    sourceTimingAuthority: false,
    targetTimingAuthority: false,
    targetTimingInterpretation: 'UNRESOLVED_SPREAD_SEMANTICS',
  };
}

export function validateTimelineBackedArpeggiation(
  source,
  alternative,
  timelineSidecar,
  options = {},
  guitarConfiguration = STANDARD_GUITAR_CONFIGURATION,
) {
  plainObject(source, 'source');
  plainObject(options, 'options');
  const decision = getArpeggiationDecision(alternative);
  if (!decision) {
    return Object.freeze({
      ...baseResult(),
      status: 'NOT_APPLICABLE',
      reason: 'NO_ARPEGGIATED_DECISION',
      reviewRequired: false,
      sourceTimeline: null,
      physicalSequence: null,
    });
  }

  const entryIndex = indexSidecar(timelineSidecar);
  const orderedSourceEventIds = decision.target?.orderedSourceEventIds;
  if (!Array.isArray(orderedSourceEventIds) || orderedSourceEventIds.length < 2) {
    fail('INVALID_A2C_ARPEGGIATION_DECISION', 'ARPEGGIATED decision requires orderedSourceEventIds.');
  }

  const entries = [];
  const missing = [];
  for (const sourceEventId of orderedSourceEventIds) {
    const entry = entryIndex.get(sourceEventId);
    if (!entry) missing.push(sourceEventId);
    else entries.push(entry);
  }
  if (missing.length > 0) {
    return Object.freeze({
      ...baseResult(),
      status: 'INDETERMINATE_TIMELINE_EVIDENCE',
      reason: 'MISSING_SOURCE_TIMING_EVIDENCE',
      reviewRequired: true,
      missingSourceEventIds: Object.freeze([...missing].sort()),
      sourceTimeline: null,
      physicalSequence: null,
    });
  }

  const first = entries[0];
  const sameMeasure = entries.every((entry) => entry.measureIndex === first.measureIndex);
  const sameDivisions = entries.every((entry) => entry.divisions === first.divisions);
  const sameOnset = entries.every((entry) => entry.onsetDivisions === first.onsetDivisions);
  if (!sameMeasure || !sameDivisions || !sameOnset) {
    return Object.freeze({
      ...baseResult(),
      sourceTimingAuthority: true,
      status: 'TIMELINE_CONFLICT',
      reason: !sameMeasure
        ? 'SOURCE_GROUP_SPANS_MULTIPLE_MEASURES'
        : !sameDivisions
          ? 'SOURCE_GROUP_DIVISION_BASIS_MISMATCH'
          : 'SOURCE_GROUP_NOT_SIMULTANEOUS',
      reviewRequired: true,
      sourceTimeline: Object.freeze({
        sourceEventIds: Object.freeze([...orderedSourceEventIds]),
        entries: Object.freeze(entries.map((entry) => Object.freeze({
          sourceEventId: entry.sourceEventId,
          measureIndex: entry.measureIndex,
          divisions: entry.divisions,
          onsetDivisions: entry.onsetDivisions,
          durationDivisions: entry.durationDivisions,
          endDivisions: entry.endDivisions,
        }))),
      }),
      physicalSequence: null,
    });
  }

  const minimumDurationDivisions = Math.min(...entries.map((entry) => entry.durationDivisions));
  const maximumEndDivisions = Math.max(...entries.map((entry) => entry.endDivisions));
  const physical = validateTemporalArpeggiationAlternative(
    source,
    alternative,
    options,
    guitarConfiguration,
  );

  return Object.freeze({
    ...baseResult(),
    sourceTimingAuthority: true,
    status: physical.status,
    reason: physical.reason,
    reviewRequired: true,
    sourceTimeline: Object.freeze({
      sourceGroupWasSimultaneous: true,
      measureIndex: first.measureIndex,
      measureNumber: first.measureNumber,
      divisions: first.divisions,
      commonOnsetDivisions: first.onsetDivisions,
      minimumDurationDivisions,
      maximumEndDivisions,
      sourceEventIds: Object.freeze([...orderedSourceEventIds]),
      tieEvidencePresent: entries.some((entry) => entry.tieStart || entry.tieStop),
    }),
    declaredSpreadDivisions: decision.target?.spreadDivisions ?? null,
    physicalSequence: physical,
  });
}
