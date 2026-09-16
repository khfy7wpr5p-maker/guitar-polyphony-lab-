import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ArrangementAlternativeContractError,
  createArrangementAlternativeSet,
} from '../src/arrangement/arrangementAlternativeSet.js';

const source = Object.freeze({
  partId: 'P1',
  events: Object.freeze([
    Object.freeze({ sourceEventId: 'e1', midi: 60, voice: '1', staff: 1 }),
    Object.freeze({ sourceEventId: 'e2', midi: 64, voice: '1', staff: 1 }),
    Object.freeze({ sourceEventId: 'e3', midi: 67, voice: '1', staff: 1 }),
    Object.freeze({ sourceEventId: 'e4', midi: 72, voice: '2', staff: 1 }),
  ]),
  groups: Object.freeze([
    Object.freeze({ sourceGroupId: 'g1', sourceEventIds: Object.freeze(['e1', 'e2', 'e3']) }),
  ]),
});

function preserved(id, eventId) {
  return {
    decisionId: id,
    decisionType: 'PRESERVED',
    sourceEventIds: [eventId],
    sourceGroupId: null,
    target: null,
    reasonCode: 'SOURCE_PRESERVED',
  };
}

function buildAlternatives() {
  return [
    {
      alternativeId: 'a0',
      strategyTags: ['MELODY_PRESERVATION'],
      decisions: [
        preserved('a0:d0', 'e1'),
        preserved('a0:d1', 'e2'),
        preserved('a0:d2', 'e3'),
        preserved('a0:d3', 'e4'),
      ],
    },
    {
      alternativeId: 'a1',
      strategyTags: ['REGISTER_COMPRESSION', 'VOICE_PRIORITY'],
      decisions: [
        {
          decisionId: 'a1:d0',
          decisionType: 'REVOICED',
          sourceEventIds: ['e1', 'e2', 'e3'],
          sourceGroupId: 'g1',
          target: { targetMidiBySourceEventId: { e1: 60, e2: 64, e3: 55 } },
          reasonCode: 'REGISTER_COMPRESSION_CANDIDATE',
        },
        {
          decisionId: 'a1:d1',
          decisionType: 'OCTAVE_DISPLACED',
          sourceEventIds: ['e4'],
          sourceGroupId: null,
          target: { semitoneDelta: -12 },
          reasonCode: 'MELODY_REGISTER_ADJUSTMENT',
        },
      ],
    },
  ];
}

test('builds immutable N-best alternatives without implying quality rank', () => {
  const alternatives = buildAlternatives();
  const result = createArrangementAlternativeSet(source, alternatives);

  assert.equal(result.documentType, 'GuitarArrangementAlternativeSet');
  assert.equal(result.contractVersion, '1.0.0');
  assert.equal(result.productionAuthority, false);
  assert.equal(result.automaticTransformationAuthority, false);
  assert.equal(result.learnedRankingAuthority, false);
  assert.equal(result.alternativeCount, 2);
  assert.equal(result.nBestSemantics.candidateOrderOnly, true);
  assert.equal(result.nBestSemantics.qualityRankingNotImplied, true);
  assert.equal(result.alternatives[0].candidateOrder, 0);
  assert.equal(result.alternatives[0].candidateOrderIsPreferenceRank, false);
  assert.equal(result.alternatives[0].reviewRequired, false);
  assert.equal(result.alternatives[1].reviewRequired, true);
  assert.equal(result.alternatives[1].decisions[1].target.targetMidi, 60);
  assert.deepEqual(result.alternatives[1].strategyTags, ['REGISTER_COMPRESSION', 'VOICE_PRIORITY']);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.alternatives), true);
  assert.equal(Object.isFrozen(result.alternatives[1].decisions), true);
});

test('does not mutate caller-owned source or alternatives', () => {
  const mutableSource = JSON.parse(JSON.stringify(source));
  const alternatives = buildAlternatives();
  const beforeSource = JSON.stringify(mutableSource);
  const beforeAlternatives = JSON.stringify(alternatives);

  createArrangementAlternativeSet(mutableSource, alternatives);

  assert.equal(JSON.stringify(mutableSource), beforeSource);
  assert.equal(JSON.stringify(alternatives), beforeAlternatives);
});

test('requires exact source coverage in every alternative', () => {
  const alternatives = buildAlternatives();
  alternatives[0].decisions.pop();

  assert.throws(
    () => createArrangementAlternativeSet(source, alternatives),
    (error) => error instanceof ArrangementAlternativeContractError
      && error.code === 'INCOMPLETE_ARRANGEMENT_SOURCE_COVERAGE',
  );
});

test('rejects overlapping source coverage', () => {
  const alternatives = buildAlternatives();
  alternatives[0].decisions.push(preserved('a0:d4', 'e1'));

  assert.throws(
    () => createArrangementAlternativeSet(source, alternatives),
    (error) => error instanceof ArrangementAlternativeContractError
      && error.code === 'OVERLAPPING_ARRANGEMENT_DECISIONS',
  );
});

test('requires exact group membership for group transforms', () => {
  const alternatives = buildAlternatives();
  alternatives[1].decisions[0].sourceEventIds = ['e1', 'e2'];
  alternatives[1].decisions[0].target = { targetMidiBySourceEventId: { e1: 60, e2: 64 } };

  assert.throws(
    () => createArrangementAlternativeSet(source, alternatives),
    (error) => error instanceof ArrangementAlternativeContractError
      && error.code === 'ARRANGEMENT_GROUP_MEMBERSHIP_MISMATCH',
  );
});

test('octave displacement accepts only whole octaves', () => {
  const alternatives = buildAlternatives();
  alternatives[1].decisions[1].target = { semitoneDelta: -7 };

  assert.throws(
    () => createArrangementAlternativeSet(source, alternatives),
    (error) => error instanceof ArrangementAlternativeContractError
      && error.code === 'INVALID_OCTAVE_DISPLACEMENT',
  );
});

test('revoicing V1 preserves pitch class and changes only register', () => {
  const alternatives = buildAlternatives();
  alternatives[1].decisions[0].target.targetMidiBySourceEventId.e3 = 58;

  assert.throws(
    () => createArrangementAlternativeSet(source, alternatives),
    (error) => error instanceof ArrangementAlternativeContractError
      && error.code === 'INVALID_REVOICING',
  );
});

test('arpeggiation requires an exact group permutation and explicit spread', () => {
  const alternatives = [{
    alternativeId: 'arp',
    strategyTags: ['ARPEGGIATION'],
    decisions: [
      {
        decisionId: 'arp:d0',
        decisionType: 'ARPEGGIATED',
        sourceEventIds: ['e1', 'e2', 'e3'],
        sourceGroupId: 'g1',
        target: { orderedSourceEventIds: ['e3', 'e2', 'e1'], spreadDivisions: 2 },
        reasonCode: 'ARPEGGIATE_DENSE_GROUP',
      },
      preserved('arp:d1', 'e4'),
    ],
  }];

  const result = createArrangementAlternativeSet(source, alternatives);
  assert.deepEqual(
    result.alternatives[0].decisions[0].target.orderedSourceEventIds,
    ['e3', 'e2', 'e1'],
  );
  assert.equal(result.alternatives[0].reviewRequired, true);
});

test('chord reduction records surviving source IDs instead of silently dropping notes', () => {
  const alternatives = [{
    alternativeId: 'reduce',
    strategyTags: ['INNER_VOICE_REDUCTION'],
    decisions: [
      {
        decisionId: 'reduce:d0',
        decisionType: 'CHORD_REDUCED',
        sourceEventIds: ['e1', 'e2', 'e3'],
        sourceGroupId: 'g1',
        target: { survivingSourceEventIds: ['e1', 'e3'] },
        reasonCode: 'REDUCE_DENSE_CHORD',
      },
      preserved('reduce:d1', 'e4'),
    ],
  }];

  const result = createArrangementAlternativeSet(source, alternatives);
  assert.deepEqual(
    result.alternatives[0].decisions[0].target.survivingSourceEventIds,
    ['e1', 'e3'],
  );
  assert.equal(result.alternatives[0].sourceCoverageComplete, true);
});

test('unknown automatic strategy or decision types fail closed', () => {
  const alternatives = buildAlternatives();
  alternatives[0].strategyTags = ['MAKE_IT_PLAYABLE'];

  assert.throws(
    () => createArrangementAlternativeSet(source, alternatives),
    (error) => error instanceof ArrangementAlternativeContractError
      && error.code === 'UNKNOWN_ARRANGEMENT_STRATEGY_TAG',
  );
});
