import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ARRANGEMENT_ALTERNATIVE_SET_VERSION,
  createArrangementAlternativeSet,
} from '../src/arrangement/arrangementAlternativeSet.js';

const eventIds = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'];
const source = {
  partId: 'P1',
  events: eventIds.map((sourceEventId, index) => ({
    sourceEventId,
    midi: 48 + index * 3,
    voice: index < 4 ? '1' : '2',
    staff: index < 4 ? 1 : 2,
  })),
  groups: [{ sourceGroupId: 'piano-sonority-8', sourceEventIds: eventIds }],
};

test('source groups may exceed six events because source truth is not bounded by guitar strings', () => {
  const result = createArrangementAlternativeSet(source, [{
    alternativeId: 'reduce-to-six',
    strategyTags: ['INNER_VOICE_REDUCTION'],
    decisions: [{
      decisionId: 'reduce-to-six:d0',
      decisionType: 'CHORD_REDUCED',
      sourceEventIds: eventIds,
      sourceGroupId: 'piano-sonority-8',
      target: { survivingSourceEventIds: eventIds.slice(0, 6) },
      reasonCode: 'PIANO_SONORITY_REDUCTION_CANDIDATE',
    }],
  }]);

  assert.equal(ARRANGEMENT_ALTERNATIVE_SET_VERSION, '1.1.0');
  assert.equal(result.source.eventCount, 8);
  assert.equal(result.alternatives[0].sourceCoverageComplete, true);
  assert.deepEqual(
    result.alternatives[0].decisions[0].target.survivingSourceEventIds,
    eventIds.slice(0, 6),
  );
});
