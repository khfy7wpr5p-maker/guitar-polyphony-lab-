import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LEFT_HAND_FEASIBILITY_POLICY,
  LeftHandFeasibilityOracleError,
  evaluateIndependentLeftHandFeasibility,
} from '../src/guitar/leftHandFeasibilityOracle.js';

function pos(positionId, string, fret, requiredFinger = null) {
  return {
    positionId,
    string,
    fret,
    ...(requiredFinger === null ? {} : { requiredFinger }),
  };
}

test('V3B accepts open strings without fretting fingers', () => {
  const result = evaluateIndependentLeftHandFeasibility([
    pos('s6', 6, 0),
    pos('s5', 5, 0),
    pos('s4', 4, 0),
    pos('s3', 3, 0),
    pos('s2', 2, 0),
    pos('s1', 1, 0),
  ]);
  assert.equal(result.status, 'FEASIBLE');
  assert.equal(result.policy, LEFT_HAND_FEASIBILITY_POLICY);
  assert.equal(result.productionAuthority, false);
  assert.equal(result.witness.usedFingerCount, 0);
});

test('V3B finds a playable compact C-major shape', () => {
  const result = evaluateIndependentLeftHandFeasibility([
    pos('c', 5, 3),
    pos('e', 4, 2),
    pos('g', 3, 0),
    pos('c-hi', 2, 1),
    pos('e-hi', 1, 0),
  ]);
  assert.equal(result.status, 'FEASIBLE');
  assert.ok(result.witness.usedFingerCount <= 4);
  assert.equal(result.witness.fretSpan, 2);
});

test('V3B supports valid barre assignments', () => {
  const result = evaluateIndependentLeftHandFeasibility([
    pos('f-low', 6, 1),
    pos('c', 5, 3),
    pos('f', 4, 3),
    pos('a', 3, 2),
    pos('c-hi', 2, 1),
    pos('f-hi', 1, 1),
  ]);
  assert.equal(result.status, 'FEASIBLE');
  assert.ok(result.witness.barres.length >= 1);
});

test('V3B proves excessive static fret span infeasible', () => {
  const result = evaluateIndependentLeftHandFeasibility([
    pos('low', 6, 1),
    pos('high', 1, 6),
  ]);
  assert.equal(result.status, 'INFEASIBLE');
  assert.equal(result.reason, 'FRET_SPAN_EXCEEDED');
});

test('V3B proves five distinct fretted frets impossible with four fretting fingers', () => {
  const result = evaluateIndependentLeftHandFeasibility([
    pos('a', 6, 1),
    pos('b', 5, 2),
    pos('c', 4, 3),
    pos('d', 3, 4),
    pos('e', 2, 5),
  ]);
  assert.equal(result.status, 'INFEASIBLE');
  assert.equal(result.reason, 'DISTINCT_FRET_COUNT_EXCEEDS_FINGER_COUNT');
});

test('V3B can prove a finger-reach rejection when explicit source fingering fixes the fingers', () => {
  const result = evaluateIndependentLeftHandFeasibility([
    pos('low', 6, 1, 1),
    pos('high', 1, 4, 2),
  ]);
  assert.equal(result.status, 'INFEASIBLE');
  assert.equal(result.reason, 'FINGER_REACH_EXCEEDED');
  assert.equal(result.structurallyValidShapeCount, 1);
});

test('V3B reports assignment limits as indeterminate, not physical impossibility', () => {
  const result = evaluateIndependentLeftHandFeasibility(
    [
      pos('a', 6, 1),
      pos('b', 5, 2),
      pos('c', 4, 3),
      pos('d', 3, 4),
    ],
    { maxAssignmentAttempts: 1 },
  );
  assert.equal(result.status, 'INDETERMINATE_LIMIT');
  assert.equal(result.reason, 'LEFT_HAND_ASSIGNMENT_LIMIT_EXCEEDED');
});

test('V3B rejects duplicate active strings as invalid evidence', () => {
  assert.throws(
    () => evaluateIndependentLeftHandFeasibility([
      pos('a', 1, 1),
      pos('b', 1, 3),
    ]),
    (error) => error instanceof LeftHandFeasibilityOracleError
      && error.code === 'INVALID_LEFT_HAND_ORACLE_INPUT',
  );
});
