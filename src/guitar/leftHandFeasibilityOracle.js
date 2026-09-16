import { types as utilTypes } from 'node:util';

import {
  GUITAR_MAX_ABSOLUTE_FRET,
  GUITAR_STRING_COUNT,
} from './tuningConfiguration.js';

const { isProxy } = utilTypes;

export const LEFT_HAND_FEASIBILITY_ORACLE_VERSION = '1.0.0';
export const LEFT_HAND_FEASIBILITY_POLICY = 'INDEPENDENT_CONSERVATIVE_STATIC_LEFT_HAND_1.0';
export const LEFT_HAND_MAXIMUM_STATIC_FRET_SPAN = 4;
export const LEFT_HAND_MAXIMUM_EXTRA_FRET_REACH = 1;
export const LEFT_HAND_MAX_ASSIGNMENT_ATTEMPTS = 4 ** GUITAR_STRING_COUNT;

const MIN_FRETTING_FINGER = 1;
const MAX_FRETTING_FINGER = 4;
const OPEN_STRING_FINGER = 0;

export class LeftHandFeasibilityOracleError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'LeftHandFeasibilityOracleError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new LeftHandFeasibilityOracleError(code, message, details);
}

function plainObject(value, path) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail('INVALID_LEFT_HAND_ORACLE_INPUT', `${path} must be a non-proxy plain object.`, { path });
  }
  return value;
}

function boundedId(value, path) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256) {
    fail('INVALID_LEFT_HAND_ORACLE_INPUT', `${path} must be a bounded non-empty string.`, { path });
  }
  return value;
}

function normalizePositions(input) {
  if (
    !Array.isArray(input)
    || isProxy(input)
    || Object.getPrototypeOf(input) !== Array.prototype
    || input.length > GUITAR_STRING_COUNT
  ) {
    fail('INVALID_LEFT_HAND_ORACLE_INPUT', 'positions must be a native array with at most six entries.');
  }
  const positions = [];
  const usedStrings = new Set();
  const usedIds = new Set();
  for (let index = 0; index < input.length; index += 1) {
    if (!Object.hasOwn(input, index)) {
      fail('INVALID_LEFT_HAND_ORACLE_INPUT', 'positions must be dense.', { index });
    }
    const item = plainObject(input[index], `positions[${index}]`);
    const allowed = new Set(['positionId', 'string', 'fret', 'requiredFinger']);
    for (const key of Object.keys(item)) {
      if (!allowed.has(key)) {
        fail('INVALID_LEFT_HAND_ORACLE_INPUT', 'Position contains an unknown field.', {
          index,
          field: key,
        });
      }
    }
    const positionId = boundedId(item.positionId, `positions[${index}].positionId`);
    if (usedIds.has(positionId)) {
      fail('INVALID_LEFT_HAND_ORACLE_INPUT', 'positionId values must be unique.', { positionId });
    }
    if (!Number.isSafeInteger(item.string) || item.string < 1 || item.string > GUITAR_STRING_COUNT) {
      fail('INVALID_LEFT_HAND_ORACLE_INPUT', 'string must be an integer in 1..6.', {
        index,
        string: item.string,
      });
    }
    if (usedStrings.has(item.string)) {
      fail('INVALID_LEFT_HAND_ORACLE_INPUT', 'Active positions must use distinct strings.', {
        index,
        string: item.string,
      });
    }
    if (!Number.isSafeInteger(item.fret) || item.fret < 0 || item.fret > GUITAR_MAX_ABSOLUTE_FRET) {
      fail('INVALID_LEFT_HAND_ORACLE_INPUT', 'fret is outside the bounded research fretboard.', {
        index,
        fret: item.fret,
      });
    }
    const requiredFinger = item.requiredFinger ?? null;
    if (item.fret === 0 && requiredFinger !== null) {
      fail('INVALID_LEFT_HAND_ORACLE_INPUT', 'Open strings cannot require a fretting finger.', {
        index,
        requiredFinger,
      });
    }
    if (
      requiredFinger !== null
      && (!Number.isSafeInteger(requiredFinger)
        || requiredFinger < MIN_FRETTING_FINGER
        || requiredFinger > MAX_FRETTING_FINGER)
    ) {
      fail('INVALID_LEFT_HAND_ORACLE_INPUT', 'requiredFinger must be null or an integer in 1..4.', {
        index,
        requiredFinger,
      });
    }
    usedIds.add(positionId);
    usedStrings.add(item.string);
    positions.push(Object.freeze({
      positionId,
      string: item.string,
      fret: item.fret,
      requiredFinger,
    }));
  }
  return Object.freeze(positions);
}

function normalizeOptions(options) {
  plainObject(options, 'options');
  const allowed = new Set(['maxAssignmentAttempts']);
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) {
      fail('INVALID_LEFT_HAND_ORACLE_OPTIONS', 'Unknown left-hand oracle option.', { field: key });
    }
  }
  const maxAssignmentAttempts = options.maxAssignmentAttempts ?? LEFT_HAND_MAX_ASSIGNMENT_ATTEMPTS;
  if (
    !Number.isSafeInteger(maxAssignmentAttempts)
    || maxAssignmentAttempts <= 0
    || maxAssignmentAttempts > LEFT_HAND_MAX_ASSIGNMENT_ATTEMPTS
  ) {
    fail('INVALID_LEFT_HAND_ORACLE_OPTIONS', 'maxAssignmentAttempts is outside the supported bound.', {
      maxAssignmentAttempts,
      hardMaximum: LEFT_HAND_MAX_ASSIGNMENT_ATTEMPTS,
    });
  }
  return Object.freeze({ maxAssignmentAttempts });
}

function orderedFingerPolicy(positions, fingers) {
  const fingerToFret = new Map();
  const fretToFingers = new Map();

  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index];
    const finger = fingers[index];
    if (position.fret === 0) {
      if (finger !== OPEN_STRING_FINGER) return null;
      continue;
    }
    if (!Number.isSafeInteger(finger) || finger < MIN_FRETTING_FINGER || finger > MAX_FRETTING_FINGER) {
      return null;
    }
    if (position.requiredFinger !== null && position.requiredFinger !== finger) return null;

    const priorFret = fingerToFret.get(finger);
    if (priorFret !== undefined && priorFret !== position.fret) return null;
    fingerToFret.set(finger, position.fret);

    let fingersAtFret = fretToFingers.get(position.fret);
    if (!fingersAtFret) {
      fingersAtFret = new Set();
      fretToFingers.set(position.fret, fingersAtFret);
    }
    fingersAtFret.add(finger);
  }

  const frets = [...fretToFingers.keys()].sort((a, b) => a - b);
  for (let index = 1; index < frets.length; index += 1) {
    const lower = [...fretToFingers.get(frets[index - 1])];
    const higher = [...fretToFingers.get(frets[index])];
    if (Math.max(...lower) >= Math.min(...higher)) return null;
  }

  return { fingerToFret, fretToFingers };
}

function buildBarres(positions, fingers) {
  const byFinger = new Map();
  for (let index = 0; index < positions.length; index += 1) {
    const finger = fingers[index];
    if (finger === OPEN_STRING_FINGER) continue;
    let list = byFinger.get(finger);
    if (!list) {
      list = [];
      byFinger.set(finger, list);
    }
    list.push(positions[index]);
  }

  const barres = [];
  for (const [finger, entries] of byFinger) {
    if (entries.length < 2) continue;
    const fret = entries[0].fret;
    if (entries.some((entry) => entry.fret !== fret)) return null;
    const startString = Math.min(...entries.map((entry) => entry.string));
    const endString = Math.max(...entries.map((entry) => entry.string));

    for (let index = 0; index < positions.length; index += 1) {
      const position = positions[index];
      if (position.string < startString || position.string > endString) continue;
      if (position.fret < fret) return null;
      if (position.fret === fret && fingers[index] !== finger) return null;
    }

    barres.push(Object.freeze({
      finger,
      fret,
      startString,
      endString,
      stringSpan: endString - startString + 1,
      kind: startString === 1 && endString === GUITAR_STRING_COUNT
        ? 'FULL_BARRE'
        : 'PARTIAL_BARRE',
    }));
  }

  barres.sort((left, right) => (
    left.fret - right.fret
    || left.finger - right.finger
    || left.startString - right.startString
    || left.endString - right.endString
  ));
  return Object.freeze(barres);
}

function hasReachViolation(fingerToFret) {
  const entries = [...fingerToFret.entries()];
  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const [leftFinger, leftFret] = entries[leftIndex];
      const [rightFinger, rightFret] = entries[rightIndex];
      if (leftFret === rightFret) continue;
      const fretDistance = Math.abs(leftFret - rightFret);
      const fingerDistance = Math.abs(leftFinger - rightFinger);
      if (fretDistance > fingerDistance + LEFT_HAND_MAXIMUM_EXTRA_FRET_REACH) return true;
    }
  }
  return false;
}

function baseResult() {
  return {
    documentType: 'IndependentLeftHandFeasibilityResult',
    contractVersion: LEFT_HAND_FEASIBILITY_ORACLE_VERSION,
    policy: LEFT_HAND_FEASIBILITY_POLICY,
    authority: 'RESEARCH_VERIFICATION_ONLY',
    productionAuthority: false,
    configuration: Object.freeze({
      frettingFingerMinimum: MIN_FRETTING_FINGER,
      frettingFingerMaximum: MAX_FRETTING_FINGER,
      openStringFinger: OPEN_STRING_FINGER,
      maximumStaticFretSpan: LEFT_HAND_MAXIMUM_STATIC_FRET_SPAN,
      maximumExtraFretReach: LEFT_HAND_MAXIMUM_EXTRA_FRET_REACH,
    }),
  };
}

function witness(positions, fingers, barres, fretSpan) {
  return Object.freeze({
    assignments: Object.freeze(positions.map((position, index) => Object.freeze({
      positionId: position.positionId,
      string: position.string,
      fret: position.fret,
      finger: fingers[index],
    }))),
    barres,
    fretSpan,
    usedFingerCount: new Set(fingers.filter((finger) => finger !== OPEN_STRING_FINGER)).size,
  });
}

export function evaluateIndependentLeftHandFeasibility(inputPositions, options = {}) {
  const positions = normalizePositions(inputPositions);
  const resolvedOptions = normalizeOptions(options);
  const fretted = positions.filter((position) => position.fret > 0);
  const frets = [...new Set(fretted.map((position) => position.fret))].sort((a, b) => a - b);
  const fretSpan = frets.length === 0 ? 0 : frets[frets.length - 1] - frets[0];

  if (fretSpan > LEFT_HAND_MAXIMUM_STATIC_FRET_SPAN) {
    return Object.freeze({
      ...baseResult(),
      status: 'INFEASIBLE',
      reason: 'FRET_SPAN_EXCEEDED',
      details: Object.freeze({ fretSpan, maximumStaticFretSpan: LEFT_HAND_MAXIMUM_STATIC_FRET_SPAN }),
      assignmentAttempts: 0,
      structurallyValidShapeCount: 0,
      policyRejectedShapeCount: 0,
      witness: null,
    });
  }

  if (frets.length > MAX_FRETTING_FINGER) {
    return Object.freeze({
      ...baseResult(),
      status: 'INFEASIBLE',
      reason: 'DISTINCT_FRET_COUNT_EXCEEDS_FINGER_COUNT',
      details: Object.freeze({ distinctFrettedFretCount: frets.length, frettingFingerCount: MAX_FRETTING_FINGER }),
      assignmentAttempts: 0,
      structurallyValidShapeCount: 0,
      policyRejectedShapeCount: 0,
      witness: null,
    });
  }

  if (fretted.length === 0) {
    const fingers = positions.map(() => OPEN_STRING_FINGER);
    return Object.freeze({
      ...baseResult(),
      status: 'FEASIBLE',
      reason: null,
      details: Object.freeze({}),
      assignmentAttempts: 1,
      structurallyValidShapeCount: 1,
      policyRejectedShapeCount: 0,
      witness: witness(positions, fingers, Object.freeze([]), 0),
    });
  }

  const fingers = positions.map((position) => (position.fret === 0 ? OPEN_STRING_FINGER : null));
  const frettedIndexes = positions
    .map((position, index) => (position.fret > 0 ? index : null))
    .filter((index) => index !== null);

  let assignmentAttempts = 0;
  let structurallyValidShapeCount = 0;
  let policyRejectedShapeCount = 0;
  let reachRejectedShapeCount = 0;
  let barreRejectedAssignmentCount = 0;
  let foundWitness = null;
  let limitExceeded = false;

  function visit(depth) {
    if (foundWitness || limitExceeded) return;
    if (depth === frettedIndexes.length) {
      assignmentAttempts += 1;
      if (assignmentAttempts > resolvedOptions.maxAssignmentAttempts) {
        limitExceeded = true;
        return;
      }
      const policyFacts = orderedFingerPolicy(positions, fingers);
      if (!policyFacts) return;
      const barres = buildBarres(positions, fingers);
      if (barres === null) {
        barreRejectedAssignmentCount += 1;
        return;
      }
      structurallyValidShapeCount += 1;
      if (hasReachViolation(policyFacts.fingerToFret)) {
        policyRejectedShapeCount += 1;
        reachRejectedShapeCount += 1;
        return;
      }
      foundWitness = witness(positions, fingers, barres, fretSpan);
      return;
    }

    const positionIndex = frettedIndexes[depth];
    const position = positions[positionIndex];
    if (position.requiredFinger !== null) {
      fingers[positionIndex] = position.requiredFinger;
      visit(depth + 1);
      fingers[positionIndex] = null;
      return;
    }
    for (let finger = MIN_FRETTING_FINGER; finger <= MAX_FRETTING_FINGER; finger += 1) {
      fingers[positionIndex] = finger;
      visit(depth + 1);
      if (foundWitness || limitExceeded) break;
    }
    fingers[positionIndex] = null;
  }

  visit(0);

  if (foundWitness) {
    return Object.freeze({
      ...baseResult(),
      status: 'FEASIBLE',
      reason: null,
      details: Object.freeze({}),
      assignmentAttempts,
      structurallyValidShapeCount,
      policyRejectedShapeCount,
      witness: foundWitness,
    });
  }

  if (limitExceeded) {
    return Object.freeze({
      ...baseResult(),
      status: 'INDETERMINATE_LIMIT',
      reason: 'LEFT_HAND_ASSIGNMENT_LIMIT_EXCEEDED',
      details: Object.freeze({
        maxAssignmentAttempts: resolvedOptions.maxAssignmentAttempts,
        observedAtLeast: assignmentAttempts,
      }),
      assignmentAttempts,
      structurallyValidShapeCount,
      policyRejectedShapeCount,
      witness: null,
    });
  }

  let reason = 'NO_STATIC_LEFT_HAND_SHAPE';
  if (
    structurallyValidShapeCount > 0
    && reachRejectedShapeCount === structurallyValidShapeCount
  ) {
    reason = 'FINGER_REACH_EXCEEDED';
  } else if (
    structurallyValidShapeCount === 0
    && barreRejectedAssignmentCount > 0
  ) {
    reason = 'NO_BARRE_COMPATIBLE_ASSIGNMENT';
  }

  return Object.freeze({
    ...baseResult(),
    status: 'INFEASIBLE',
    reason,
    details: Object.freeze({
      barreRejectedAssignmentCount,
      reachRejectedShapeCount,
    }),
    assignmentAttempts,
    structurallyValidShapeCount,
    policyRejectedShapeCount,
    witness: null,
  });
}
