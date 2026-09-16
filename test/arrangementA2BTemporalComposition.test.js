import assert from 'node:assert/strict';
import test from 'node:test';

import { createArrangementAlternativeSet } from '../src/arrangement/arrangementAlternativeSet.js';
import { validateTemporalArpeggiationAlternative } from '../src/arrangement/temporalArpeggiationValidator.js';
import { composeDisjointArrangementTransforms } from '../src/arrangement/disjointTransformComposition.js';

const source = Object.freeze({
  partId: 'P1',
  events: Object.freeze([
    Object.freeze({ sourceEventId: 'e1', midi: 60, voice: '1', staff: 1 }),
    Object.freeze({ sourceEventId: 'e2', midi: 64, voice: '1', staff: 1 }),
    Object.freeze({ sourceEventId: 'e3', midi: 67, voice: '1', staff: 1 }),
    Object.freeze({ sourceEventId: 'e4', midi: 40, voice: '2', staff: 2 }),
  ]),
  groups: Object.freeze([
    Object.freeze({ sourceGroupId: 'g1', sourceEventIds: Object.freeze(['e1', 'e2', 'e3']) }),
  ]),
});

function preserved(id, sourceEventId) {
  return {
    decisionId: id,
    decisionType: 'PRESERVED',
    sourceEventIds: [sourceEventId],
    sourceGroupId: null,
    target: null,
    reasonCode: 'TEST_PRESERVE',
  };
}

function normalized(raw) {
  return createArrangementAlternativeSet(source, [raw]).alternatives[0];
}

function arpeggioAlternative() {
  return normalized({
    alternativeId: 'arp',
    strategyTags: ['ARPEGGIATION'],
    decisions: [
      {
        decisionId: 'arp:g1',
        decisionType: 'ARPEGGIATED',
        sourceEventIds: ['e1', 'e2', 'e3'],
        sourceGroupId: 'g1',
        target: {
          orderedSourceEventIds: ['e3', 'e2', 'e1'],
          spreadDivisions: 2,
        },
        reasonCode: 'TEST_ARPEGGIATE',
      },
      preserved('arp:e4', 'e4'),
    ],
  });
}

function reductionAlternative() {
  return normalized({
    alternativeId: 'reduce',
    strategyTags: ['INNER_VOICE_REDUCTION'],
    decisions: [
      {
        decisionId: 'reduce:g1',
        decisionType: 'CHORD_REDUCED',
        sourceEventIds: ['e1', 'e2', 'e3'],
        sourceGroupId: 'g1',
        target: { survivingSourceEventIds: ['e1', 'e3'] },
        reasonCode: 'TEST_REDUCTION',
      },
      preserved('reduce:e4', 'e4'),
    ],
  });
}

function octaveAlternative(sourceEventId) {
  const decisions = source.events.map((event) => {
    if (event.sourceEventId !== sourceEventId) {
      return preserved(`oct:${event.sourceEventId}`, event.sourceEventId);
    }
    return {
      decisionId: `oct:${sourceEventId}:transform`,
      decisionType: 'OCTAVE_DISPLACED',
      sourceEventIds: [sourceEventId],
      sourceGroupId: null,
      target: { semitoneDelta: 12 },
      reasonCode: 'TEST_OCTAVE',
    };
  });
  return normalized({
    alternativeId: `oct:${sourceEventId}`,
    strategyTags: ['REGISTER_COMPRESSION'],
    decisions,
  });
}

test('A2B validates explicit arpeggiation as an abstract exact-position sequence without claiming score timing', () => {
  const result = validateTemporalArpeggiationAlternative(source, arpeggioAlternative());

  assert.equal(result.status, 'FEASIBLE');
  assert.equal(result.timingAuthority, false);
  assert.equal(result.reviewRequired, true);
  assert.equal(result.temporalEvidence.sequenceSemantics, 'ABSTRACT_SPREAD_SEQUENCE');
  assert.equal(result.temporalEvidence.sourceOnsetsAvailable, false);
  assert.equal(result.temporalEvidence.sourceDurationsAvailable, false);
  assert.equal(result.temporalEvidence.interStepReachModeled, false);
  assert.equal(result.declaredSpreadDivisions, 2);
  assert.deepEqual(
    result.witness.steps.map((step) => step.sourceEventId),
    ['e3', 'e2', 'e1'],
  );
  assert.ok(result.witness.steps.every((step) => Number.isInteger(step.string)));
  assert.ok(result.witness.steps.every((step) => Number.isInteger(step.fret)));
});

test('A2B temporal validator returns NOT_APPLICABLE when an alternative is static', () => {
  const result = validateTemporalArpeggiationAlternative(source, octaveAlternative('e4'));
  assert.equal(result.status, 'NOT_APPLICABLE');
  assert.equal(result.reason, 'NO_ARPEGGIATED_DECISION');
  assert.equal(result.reviewRequired, false);
});

test('A2B temporal validator proves an arpeggio infeasible when one ordered pitch has no guitar position', () => {
  const lowSource = {
    partId: 'P1',
    events: [
      { sourceEventId: 'low', midi: 20, voice: '1', staff: 1 },
      { sourceEventId: 'high', midi: 64, voice: '1', staff: 1 },
    ],
    groups: [{ sourceGroupId: 'gLow', sourceEventIds: ['low', 'high'] }],
  };
  const lowAlternative = createArrangementAlternativeSet(lowSource, [{
    alternativeId: 'low-arp',
    strategyTags: ['ARPEGGIATION'],
    decisions: [{
      decisionId: 'low-arp:g',
      decisionType: 'ARPEGGIATED',
      sourceEventIds: ['low', 'high'],
      sourceGroupId: 'gLow',
      target: { orderedSourceEventIds: ['low', 'high'], spreadDivisions: 1 },
      reasonCode: 'TEST_LOW_ARPEGGIO',
    }],
  }]).alternatives[0];

  const result = validateTemporalArpeggiationAlternative(lowSource, lowAlternative);
  assert.equal(result.status, 'INFEASIBLE');
  assert.equal(result.reason, 'NO_EXACT_FRETBOARD_CANDIDATE');
  assert.equal(result.decisiveSourceEventId, 'low');
  assert.equal(result.timingAuthority, false);
});

test('A2B composes transforms only when their source-event scopes are disjoint', () => {
  const result = composeDisjointArrangementTransforms(
    source,
    [reductionAlternative(), octaveAlternative('e4')],
    { alternativeId: 'composed:reduction-plus-octave' },
  );

  assert.equal(result.status, 'COMPOSED');
  assert.equal(result.productionAuthority, false);
  assert.equal(result.automaticProductionTransformationAuthority, false);
  assert.equal(result.transformedSourceEventCount, 4);
  assert.equal(result.alternativeSet.alternativeCount, 1);

  const decisionTypes = result.alternativeSet.alternatives[0].decisions
    .map((decision) => decision.decisionType)
    .sort();
  assert.deepEqual(decisionTypes, ['CHORD_REDUCED', 'OCTAVE_DISPLACED']);
  assert.equal(result.alternativeSet.alternatives[0].sourceCoverageComplete, true);
});

test('A2B refuses overlapping transform composition instead of silently rewriting one transform', () => {
  const result = composeDisjointArrangementTransforms(
    source,
    [reductionAlternative(), octaveAlternative('e2')],
  );

  assert.equal(result.status, 'OVERLAPPING_SCOPE');
  assert.equal(result.reason, 'SOURCE_EVENT_TRANSFORMED_MORE_THAN_ONCE');
  assert.equal(result.overlap.sourceEventId, 'e2');
  assert.equal(result.alternativeSet, null);
});
