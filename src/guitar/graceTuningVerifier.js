import { types as utilTypes } from 'node:util';

import {
  generateFretboardCandidates,
  positionToMidi,
  spelledPitchToMidi,
} from './fretboardCandidates.js';
import {
  STANDARD_TUNING_CONFIGURATION,
  resolveGuitarTuningConfiguration,
  tuningConfigurationToGuitarFacts,
} from './tuningConfiguration.js';

const { isProxy } = utilTypes;
const MAX_GRACE_NOTES = 2;

export const GRACE_TUNING_VERIFIER_VERSION = '1.0.0';
export const GRACE_TUNING_VERIFIER_POLICY = 'HELD_STRINGS_RESERVED_THEN_LEXICOGRAPHIC_POSITION_PATH_1.0';

export class GraceTuningVerifierError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'GraceTuningVerifierError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new GraceTuningVerifierError(code, message, details);
}

function plainObject(value, path) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail('INVALID_GRACE_RESEARCH_INPUT', `${path} must be a non-proxy plain object.`, { path });
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = descriptors[key];
    if (
      typeof key !== 'string'
      || !descriptor
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')
    ) {
      fail('INVALID_GRACE_RESEARCH_INPUT', `${path} must use enumerable data properties.`, {
        path,
        field: typeof key === 'symbol' ? key.toString() : key,
      });
    }
  }
  return descriptors;
}

function denseArray(value, path, maximumLength) {
  if (
    !Array.isArray(value)
    || isProxy(value)
    || Object.getPrototypeOf(value) !== Array.prototype
    || value.length > maximumLength
  ) {
    fail('INVALID_GRACE_RESEARCH_INPUT', `${path} must be a bounded native array.`, { path });
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      fail('INVALID_GRACE_RESEARCH_INPUT', `${path} must be dense.`, { path, index });
    }
  }
  return value;
}

function requirePitch(value, path) {
  if (typeof value !== 'string' || value.length === 0) {
    fail('INVALID_GRACE_RESEARCH_INPUT', `${path} must be a non-empty pitch string.`, { path });
  }
  spelledPitchToMidi(value);
  return value;
}

function requirePosition(value, path, configuration, expectedPitch = null) {
  const descriptors = plainObject(value, path);
  const allowed = new Set(['string', 'fret', 'pitch']);
  for (const key of Reflect.ownKeys(value)) {
    if (!allowed.has(key)) {
      fail('INVALID_GRACE_RESEARCH_INPUT', `${path} contains an unknown field.`, { path, field: key });
    }
  }
  if (!Object.hasOwn(descriptors, 'string') || !Object.hasOwn(descriptors, 'fret')) {
    fail('INVALID_GRACE_RESEARCH_INPUT', `${path} must contain string and fret.`, { path });
  }
  const position = Object.freeze({
    string: descriptors.string.value,
    fret: descriptors.fret.value,
  });
  let observedMidi;
  try {
    observedMidi = positionToMidi(position, configuration);
  } catch (error) {
    fail('INVALID_GRACE_RESEARCH_INPUT', `${path} is not a valid guitar position.`, {
      path,
      causeCode: error?.code || null,
    });
  }
  const pitch = Object.hasOwn(descriptors, 'pitch')
    ? requirePitch(descriptors.pitch.value, `${path}.pitch`)
    : expectedPitch;
  if (pitch !== null && observedMidi !== spelledPitchToMidi(pitch)) {
    fail('POSITION_PITCH_MISMATCH', `${path} does not round-trip to its exact pitch.`, {
      path,
      pitch,
      observedMidi,
    });
  }
  return Object.freeze({ ...position, pitch });
}

function compareNumberArrays(left, right) {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index] === undefined ? Number.POSITIVE_INFINITY : left[index];
    const b = right[index] === undefined ? Number.POSITIVE_INFINITY : right[index];
    if (a !== b) return a - b;
  }
  return 0;
}

function transitionCost(positions, anchorPosition) {
  let stringChanges = 0;
  let fretDistance = 0;
  let maximumFret = anchorPosition.fret;
  let fretSum = anchorPosition.fret;
  let stringSum = anchorPosition.string;
  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index];
    maximumFret = Math.max(maximumFret, position.fret);
    fretSum += position.fret;
    stringSum += position.string;
    const next = index + 1 < positions.length ? positions[index + 1] : anchorPosition;
    if (position.string !== next.string) stringChanges += 1;
    fretDistance += Math.abs(position.fret - next.fret);
  }
  return Object.freeze([stringChanges, fretDistance, maximumFret, fretSum, stringSum]);
}

function blocked(configuration, reason, details = {}) {
  return Object.freeze({
    documentType: 'GraceTuningVerificationResult',
    contractVersion: GRACE_TUNING_VERIFIER_VERSION,
    authority: 'RESEARCH_VERIFICATION_ONLY',
    policy: GRACE_TUNING_VERIFIER_POLICY,
    status: 'BLOCKED',
    reason,
    details: Object.freeze({ ...details }),
    guitar: tuningConfigurationToGuitarFacts(configuration),
    anchorPosition: null,
    reservedHeldStrings: Object.freeze([]),
    notes: Object.freeze([]),
    transitionCost: null,
  });
}

export function verifyGraceTransitionWithTuning(
  request,
  tuningConfiguration = STANDARD_TUNING_CONFIGURATION,
) {
  const configuration = resolveGuitarTuningConfiguration(tuningConfiguration);
  const descriptors = plainObject(request, 'request');
  const allowed = new Set(['anchorPitch', 'anchorPosition', 'heldPositions', 'notes']);
  for (const key of Reflect.ownKeys(request)) {
    if (!allowed.has(key)) {
      fail('INVALID_GRACE_RESEARCH_INPUT', 'request contains an unknown field.', { field: key });
    }
  }
  for (const required of allowed) {
    if (!Object.hasOwn(descriptors, required)) {
      fail('INVALID_GRACE_RESEARCH_INPUT', `request is missing ${required}.`, { field: required });
    }
  }

  const anchorPitch = requirePitch(descriptors.anchorPitch.value, 'request.anchorPitch');
  const anchorPosition = requirePosition(
    descriptors.anchorPosition.value,
    'request.anchorPosition',
    configuration,
    anchorPitch,
  );
  const heldPositions = denseArray(descriptors.heldPositions.value, 'request.heldPositions', 5)
    .map((position, index) => requirePosition(
      position,
      `request.heldPositions[${index}]`,
      configuration,
      null,
    ));
  const reservedStrings = new Set();
  for (const held of heldPositions) {
    if (reservedStrings.has(held.string)) {
      fail('INVALID_GRACE_RESEARCH_INPUT', 'Held positions must occupy unique strings.', {
        string: held.string,
      });
    }
    reservedStrings.add(held.string);
  }
  if (reservedStrings.has(anchorPosition.string)) {
    return blocked(configuration, 'ANCHOR_OCCUPIES_HELD_STRING', {
      string: anchorPosition.string,
    });
  }

  const notes = denseArray(descriptors.notes.value, 'request.notes', MAX_GRACE_NOTES);
  if (notes.length < 1) {
    fail('INVALID_GRACE_RESEARCH_INPUT', 'request.notes must contain one or two grace notes.');
  }
  const normalizedNotes = notes.map((note, index) => {
    const path = `request.notes[${index}]`;
    const noteDescriptors = plainObject(note, path);
    const noteAllowed = new Set(['graceEventId', 'pitch']);
    for (const key of Reflect.ownKeys(note)) {
      if (!noteAllowed.has(key)) {
        fail('INVALID_GRACE_RESEARCH_INPUT', `${path} contains an unknown field.`, { path, field: key });
      }
    }
    if (!Object.hasOwn(noteDescriptors, 'graceEventId') || !Object.hasOwn(noteDescriptors, 'pitch')) {
      fail('INVALID_GRACE_RESEARCH_INPUT', `${path} must contain graceEventId and pitch.`, { path });
    }
    const graceEventId = noteDescriptors.graceEventId.value;
    if (typeof graceEventId !== 'string' || graceEventId.length === 0 || graceEventId.length > 256) {
      fail('INVALID_GRACE_RESEARCH_INPUT', `${path}.graceEventId must be a bounded string.`, { path });
    }
    const pitch = requirePitch(noteDescriptors.pitch.value, `${path}.pitch`);
    return Object.freeze({ graceEventId, pitch });
  });

  const layers = [];
  for (const note of normalizedNotes) {
    const candidates = generateFretboardCandidates(note.pitch, configuration)
      .filter((candidate) => !reservedStrings.has(candidate.string))
      .map((candidate) => Object.freeze({ string: candidate.string, fret: candidate.fret }));
    if (candidates.length === 0) {
      return blocked(configuration, 'NO_EXACT_GRACE_POSITION', {
        graceEventId: note.graceEventId,
        pitch: note.pitch,
        reservedHeldStrings: Object.freeze([...reservedStrings].sort((a, b) => a - b)),
      });
    }
    layers.push(Object.freeze(candidates));
  }

  const paths = [];
  const working = new Array(layers.length);
  function visit(noteIndex) {
    if (noteIndex === layers.length) {
      const positions = Object.freeze(working.map((position) => position));
      const cost = transitionCost(positions, anchorPosition);
      const signature = positions.map((position) => `${position.string}:${position.fret}`).join(';');
      paths.push(Object.freeze({ positions, cost, signature }));
      return;
    }
    for (const candidate of layers[noteIndex]) {
      working[noteIndex] = candidate;
      visit(noteIndex + 1);
    }
  }
  visit(0);
  paths.sort((left, right) => {
    const numeric = compareNumberArrays(left.cost, right.cost);
    return numeric !== 0 ? numeric : left.signature.localeCompare(right.signature);
  });
  if (paths.length === 0) {
    return blocked(configuration, 'NO_GRACE_PATH');
  }

  const selected = paths[0];
  const selectedNotes = normalizedNotes.map((note, index) => {
    const position = selected.positions[index];
    if (positionToMidi(position, configuration) !== spelledPitchToMidi(note.pitch)) {
      fail('INTERNAL_GRACE_ROUND_TRIP_FAILURE', 'Selected grace position failed exact pitch round-trip.', {
        graceEventId: note.graceEventId,
      });
    }
    return Object.freeze({
      graceEventId: note.graceEventId,
      pitch: note.pitch,
      string: position.string,
      fret: position.fret,
    });
  });

  return Object.freeze({
    documentType: 'GraceTuningVerificationResult',
    contractVersion: GRACE_TUNING_VERIFIER_VERSION,
    authority: 'RESEARCH_VERIFICATION_ONLY',
    policy: GRACE_TUNING_VERIFIER_POLICY,
    status: 'PASS',
    reason: null,
    details: Object.freeze({}),
    guitar: tuningConfigurationToGuitarFacts(configuration),
    anchorPosition: Object.freeze({
      pitch: anchorPitch,
      string: anchorPosition.string,
      fret: anchorPosition.fret,
    }),
    reservedHeldStrings: Object.freeze([...reservedStrings].sort((a, b) => a - b)),
    notes: Object.freeze(selectedNotes),
    transitionCost: Object.freeze({
      stringChanges: selected.cost[0],
      fretDistance: selected.cost[1],
      maximumFret: selected.cost[2],
      fretSum: selected.cost[3],
      stringSum: selected.cost[4],
    }),
  });
}
