import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STRICT_FEASIBILITY_ORACLE_POLICY,
  StrictFeasibilityOracleError,
  evaluateStrictGuitarFeasibility,
} from '../src/guitar/strictFeasibilityOracle.js';
import { verifySustainedPolyphonyWithConfiguration } from '../src/guitar/sustainedConfigurationVerifier.js';

function note(logicalNoteId, sustainId, pitch, disposition = 'ATTACK') {
  return {
    logicalNoteId,
    sustainId,
    pitch,
    disposition,
    tie: disposition === 'HOLD' ? 'CONTINUE' : null,
    voice: '1',
    staff: 1,
  };
}

function point(pointId, notes, timeDivisions = 0) {
  return {
    pointId,
    measureIndex: 0,
    timeDivisions,
    notes,
  };
}

test('V3A oracle proves a simple exact-pitch sonority feasible and emits a witness', () => {
  const result = evaluateStrictGuitarFeasibility([
    point('p0', [
      note('n1', 's1', 'E2'),
      note('n2', 's2', 'A2'),
      note('n3', 's3', 'D3'),
      note('n4', 's4', 'G3'),
    ]),
  ]);

  assert.equal(result.status, 'FEASIBLE');
  assert.equal(result.policy, STRICT_FEASIBILITY_ORACLE_POLICY);
  assert.equal(result.productionAuthority, false);
  assert.equal(result.physicalScope.leftHandFingering, 'NOT_MODELED');
  assert.equal(result.witness.points.length, 1);
  assert.equal(result.witness.points[0].selectedPositions.length, 4);
});

test('V3A oracle distinguishes a greedy dead-end from true path infeasibility', () => {
  const points = [
    point('p0', [note('held-e4', 's-e4', 'E4')]),
    point('p1', [
      note('held-e4', 's-e4', 'E4', 'HOLD'),
      note('new-e6', 's-e6', 'E6'),
    ], 1),
  ];

  const greedy = verifySustainedPolyphonyWithConfiguration(points);
  assert.equal(greedy.status, 'BLOCKED');
  assert.equal(greedy.reason, 'NO_DISTINCT_STRING_ASSIGNMENT');

  const oracle = evaluateStrictGuitarFeasibility(points);
  assert.equal(oracle.status, 'FEASIBLE');
  assert.ok(oracle.stateCounts[0].reachableStateCount > 1);

  const firstPoint = oracle.witness.points[0];
  const secondPoint = oracle.witness.points[1];
  const firstHeld = firstPoint.selectedPositions.find((entry) => entry.sustainId === 's-e4');
  const secondHeld = secondPoint.selectedPositions.find((entry) => entry.sustainId === 's-e4');
  const highE = secondPoint.selectedPositions.find((entry) => entry.sustainId === 's-e6');
  assert.deepEqual(
    { string: secondHeld.string, fret: secondHeld.fret },
    { string: firstHeld.string, fret: firstHeld.fret },
  );
  assert.equal(highE.string, 1);
  assert.notEqual(firstHeld.string, 1);
});

test('V3A oracle proves a sustained-path impossibility even when the later sonority is statically playable', () => {
  const points = [
    point('forced-open-stack', [
      note('e4', 'held-e4', 'E4'),
      note('b3', 's-b3', 'B3'),
      note('g3', 's-g3', 'G3'),
      note('d3', 's-d3', 'D3'),
      note('a2', 's-a2', 'A2'),
      note('e2', 's-e2', 'E2'),
    ]),
    point('held-conflict', [
      note('e4', 'held-e4', 'E4', 'HOLD'),
      note('e6', 'new-e6', 'E6'),
    ], 1),
  ];

  const result = evaluateStrictGuitarFeasibility(points);
  assert.equal(result.status, 'INFEASIBLE');
  assert.equal(result.reason, 'NO_SUSTAINED_PATH');
  assert.equal(result.decisiveScope.pointId, 'held-conflict');
  assert.ok(result.details.staticAssignmentCount > 0);
});

test('V3A oracle separates hard pitch/string impossibility from search-limit indeterminacy', () => {
  const tooMany = evaluateStrictGuitarFeasibility([
    point('seven-notes', [
      note('n1', 's1', 'E2'),
      note('n2', 's2', 'F2'),
      note('n3', 's3', 'G2'),
      note('n4', 's4', 'A2'),
      note('n5', 's5', 'B2'),
      note('n6', 's6', 'C3'),
      note('n7', 's7', 'D3'),
    ]),
  ]);
  assert.equal(tooMany.status, 'INFEASIBLE');
  assert.equal(tooMany.reason, 'ACTIVE_NOTE_COUNT_EXCEEDS_STRING_COUNT');

  const outOfRange = evaluateStrictGuitarFeasibility([
    point('too-low', [note('low', 'low-s', 'C2')]),
  ]);
  assert.equal(outOfRange.status, 'INFEASIBLE');
  assert.equal(outOfRange.reason, 'NO_EXACT_FRETBOARD_CANDIDATE');

  const bounded = evaluateStrictGuitarFeasibility(
    [point('many-placements', [note('e4', 's-e4', 'E4')])],
    undefined,
    { maxStatesPerPoint: 1 },
  );
  assert.equal(bounded.status, 'INDETERMINATE_LIMIT');
  assert.equal(bounded.reason, 'STATE_SPACE_LIMIT_EXCEEDED');
});

test('V3A oracle rejects malformed HOLD evidence instead of calling it physical impossibility', () => {
  assert.throws(
    () => evaluateStrictGuitarFeasibility([
      point('bad-hold', [note('held', 'missing', 'E4', 'HOLD')]),
    ]),
    (error) => error instanceof StrictFeasibilityOracleError
      && error.code === 'INVALID_ORACLE_INPUT',
  );
});
