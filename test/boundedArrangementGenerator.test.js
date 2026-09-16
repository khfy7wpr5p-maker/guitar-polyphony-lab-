import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BoundedArrangementGeneratorError,
  generateBoundedArrangementAlternatives,
} from '../src/arrangement/boundedArrangementGenerator.js';

function pianoEightSource() {
  const midis = [40, 45, 50, 55, 59, 64, 67, 72];
  const events = midis.map((midi, index) => ({
    sourceEventId: `e${index + 1}`,
    midi,
    voice: index < 4 ? '1' : '2',
    staff: index < 4 ? 1 : 2,
  }));
  return {
    partId: 'P1',
    events,
    groups: [{
      sourceGroupId: 'piano-8',
      sourceEventIds: events.map((event) => event.sourceEventId),
    }],
  };
}

test('reduces an eight-note piano sonority without losing source provenance', () => {
  const source = pianoEightSource();
  const result = generateBoundedArrangementAlternatives(source, {
    sourceGroupId: 'piano-8',
    allowedTransforms: ['CHORD_REDUCED'],
    priorityEventIds: ['e1', 'e6'],
    maxAlternatives: 8,
    maxKeptNotes: 6,
    minKeptNotes: 6,
  });

  assert.equal(result.productionAuthority, false);
  assert.equal(result.automaticProductionTransformationAuthority, false);
  assert.equal(result.learnedRankingAuthority, false);
  assert.equal(result.alternativeSet.source.eventCount, 8);
  assert.equal(result.alternativeSet.nBestSemantics.qualityRankingNotImplied, true);

  const strict = result.validations.find((item) => item.alternativeId === 'a2:strict-source');
  assert.equal(strict.physical.status, 'INFEASIBLE');
  assert.equal(strict.physical.reason, 'ACTIVE_NOTE_COUNT_EXCEEDS_STRING_COUNT');

  const reduction = result.alternativeSet.alternatives.find((alternative) => (
    alternative.decisions.some((decision) => (
      decision.decisionType === 'CHORD_REDUCED'
      && decision.target.survivingSourceEventIds.join(',') === 'e1,e2,e3,e4,e5,e6'
    ))
  ));
  assert.ok(reduction);
  assert.equal(reduction.sourceCoverageComplete, true);
  assert.equal(reduction.reviewRequired, true);

  const reductionValidation = result.validations.find(
    (item) => item.alternativeId === reduction.alternativeId,
  );
  assert.equal(reductionValidation.physical.status, 'FEASIBLE');
  assert.equal(reductionValidation.physical.realizedEventCount, 6);
  assert.ok(reductionValidation.physical.witness);
});

test('priority events are retained in every generated reduction candidate', () => {
  const source = pianoEightSource();
  const result = generateBoundedArrangementAlternatives(source, {
    sourceGroupId: 'piano-8',
    allowedTransforms: ['CHORD_REDUCED'],
    priorityEventIds: ['e1', 'e8'],
    maxAlternatives: 12,
    maxKeptNotes: 6,
    minKeptNotes: 5,
  });

  for (const alternative of result.alternativeSet.alternatives) {
    const reduction = alternative.decisions.find((decision) => decision.decisionType === 'CHORD_REDUCED');
    if (!reduction) continue;
    assert.ok(reduction.target.survivingSourceEventIds.includes('e1'));
    assert.ok(reduction.target.survivingSourceEventIds.includes('e8'));
  }
});

test('candidate bound produces PARTIAL_LIMIT instead of a false impossibility conclusion', () => {
  const source = pianoEightSource();
  const result = generateBoundedArrangementAlternatives(source, {
    sourceGroupId: 'piano-8',
    allowedTransforms: ['CHORD_REDUCED'],
    priorityEventIds: [],
    maxAlternatives: 2,
    maxKeptNotes: 6,
    minKeptNotes: 4,
  });

  assert.equal(result.generation.status, 'PARTIAL_LIMIT');
  assert.equal(result.generation.candidateSpaceComplete, false);
  assert.equal(result.alternativeSet.alternativeCount, 2);
  assert.equal(result.generation.candidateOrderIsPreferenceRank, false);
});

test('octave displacement can recover a pitch that is outside the standard guitar range', () => {
  const source = {
    partId: 'P1',
    events: [
      { sourceEventId: 'low-e', midi: 28, voice: '1', staff: 1 },
      { sourceEventId: 'a2', midi: 45, voice: '1', staff: 1 },
    ],
    groups: [{ sourceGroupId: 'g1', sourceEventIds: ['low-e', 'a2'] }],
  };
  const result = generateBoundedArrangementAlternatives(source, {
    sourceGroupId: 'g1',
    allowedTransforms: ['OCTAVE_DISPLACED'],
    priorityEventIds: [],
    maxAlternatives: 4,
    octaveSemitoneDeltas: [12],
  });

  const strict = result.validations.find((item) => item.alternativeId === 'a2:strict-source');
  assert.equal(strict.physical.status, 'INFEASIBLE');
  assert.equal(strict.physical.reason, 'NO_EXACT_FRETBOARD_CANDIDATE');

  const recovered = result.validations.find((item) => item.alternativeId === 'a2:octave:low-e:12');
  assert.ok(recovered);
  assert.equal(recovered.physical.status, 'FEASIBLE');
});

test('A2 initial generator rejects transforms it cannot physically revalidate yet', () => {
  const source = pianoEightSource();
  assert.throws(
    () => generateBoundedArrangementAlternatives(source, {
      sourceGroupId: 'piano-8',
      allowedTransforms: ['ARPEGGIATED'],
      priorityEventIds: [],
      maxAlternatives: 4,
    }),
    (error) => error instanceof BoundedArrangementGeneratorError
      && error.code === 'UNSUPPORTED_A2_TRANSFORM',
  );
});

test('priority policy cannot silently discard its own priority events', () => {
  const source = pianoEightSource();
  assert.throws(
    () => generateBoundedArrangementAlternatives(source, {
      sourceGroupId: 'piano-8',
      allowedTransforms: ['CHORD_REDUCED'],
      priorityEventIds: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'],
      maxAlternatives: 8,
      maxKeptNotes: 6,
    }),
    (error) => error instanceof BoundedArrangementGeneratorError
      && error.code === 'A2_PRIORITY_EXCEEDS_KEEP_BOUND',
  );
});
