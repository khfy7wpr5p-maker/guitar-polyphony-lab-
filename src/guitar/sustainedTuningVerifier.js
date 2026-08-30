import { types as utilTypes } from 'node:util';

import {
  generateFretboardCandidates,
  positionToMidi,
  spelledPitchToMidi,
} from './fretboardCandidates.js';
import { enumerateSonorityAssignments } from './sonorityAssignments.js';
import {
  STANDARD_TUNING_CONFIGURATION,
  resolveGuitarTuningConfiguration,
  tuningConfigurationToGuitarFacts,
} from './tuningConfiguration.js';

const { isProxy } = utilTypes;

export const SUSTAINED_TUNING_VERIFIER_VERSION = '1.0.0';
export const SUSTAINED_TUNING_VERIFIER_POLICY = 'LEXICOGRAPHIC_DISTINCT_STRING_RESEARCH_BASELINE_1.0';

export class SustainedTuningVerifierError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'SustainedTuningVerifierError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new SustainedTuningVerifierError(code, message, details);
}

function plainObject(value, path) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail('INVALID_RESEARCH_POLYPHONY_INPUT', `${path} must be a non-proxy plain object.`, { path });
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
      fail('INVALID_RESEARCH_POLYPHONY_INPUT', `${path} must use enumerable data properties.`, {
        path,
        field: typeof key === 'symbol' ? key.toString() : key,
      });
    }
  }
  return descriptors;
}

function nativeDenseArray(value, path, maximumLength = 10_000) {
  if (
    !Array.isArray(value)
    || isProxy(value)
    || Object.getPrototypeOf(value) !== Array.prototype
    || value.length > maximumLength
  ) {
    fail('INVALID_RESEARCH_POLYPHONY_INPUT', `${path} must be a bounded native array.`, { path });
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      fail('INVALID_RESEARCH_POLYPHONY_INPUT', `${path} must be dense.`, { path, index });
    }
  }
  return value;
}

function requireString(value, path) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256) {
    fail('INVALID_RESEARCH_POLYPHONY_INPUT', `${path} must be a bounded non-empty string.`, { path });
  }
  return value;
}

function normalizeNote(note, noteIndex, pointIndex) {
  const path = `points[${pointIndex}].notes[${noteIndex}]`;
  const descriptors = plainObject(note, path);
  const allowed = new Set([
    'logicalNoteId', 'sustainId', 'pitch', 'disposition', 'tie', 'voice', 'staff',
  ]);
  for (const key of Reflect.ownKeys(note)) {
    if (!allowed.has(key)) {
      fail('INVALID_RESEARCH_POLYPHONY_INPUT', `${path} contains an unknown field.`, { path, field: key });
    }
  }
  for (const required of ['logicalNoteId', 'sustainId', 'pitch', 'disposition']) {
    if (!Object.hasOwn(descriptors, required)) {
      fail('INVALID_RESEARCH_POLYPHONY_INPUT', `${path} is missing ${required}.`, { path, field: required });
    }
  }
  const logicalNoteId = requireString(descriptors.logicalNoteId.value, `${path}.logicalNoteId`);
  const sustainId = requireString(descriptors.sustainId.value, `${path}.sustainId`);
  const pitch = requireString(descriptors.pitch.value, `${path}.pitch`);
  spelledPitchToMidi(pitch);
  const disposition = descriptors.disposition.value;
  if (disposition !== 'ATTACK' && disposition !== 'HOLD') {
    fail('INVALID_RESEARCH_POLYPHONY_INPUT', `${path}.disposition must be ATTACK or HOLD.`, {
      path,
      disposition,
    });
  }
  const tie = Object.hasOwn(descriptors, 'tie') ? descriptors.tie.value : null;
  if (tie !== null && !['START', 'CONTINUE', 'STOP'].includes(tie)) {
    fail('INVALID_RESEARCH_POLYPHONY_INPUT', `${path}.tie is invalid.`, { path, tie });
  }
  const voice = Object.hasOwn(descriptors, 'voice') ? descriptors.voice.value : null;
  if (voice !== null) requireString(voice, `${path}.voice`);
  const staff = Object.hasOwn(descriptors, 'staff') ? descriptors.staff.value : null;
  if (staff !== null && (!Number.isSafeInteger(staff) || staff < 1 || staff > 64)) {
    fail('INVALID_RESEARCH_POLYPHONY_INPUT', `${path}.staff must be an integer in the range 1..64.`, {
      path,
      staff,
    });
  }
  return Object.freeze({
    logicalNoteId,
    sustainId,
    pitch,
    disposition,
    tie,
    voice,
    staff,
  });
}

function normalizePoint(point, pointIndex) {
  const path = `points[${pointIndex}]`;
  const descriptors = plainObject(point, path);
  const allowed = new Set(['pointId', 'measureIndex', 'timeDivisions', 'notes']);
  for (const key of Reflect.ownKeys(point)) {
    if (!allowed.has(key)) {
      fail('INVALID_RESEARCH_POLYPHONY_INPUT', `${path} contains an unknown field.`, { path, field: key });
    }
  }
  for (const required of ['pointId', 'measureIndex', 'timeDivisions', 'notes']) {
    if (!Object.hasOwn(descriptors, required)) {
      fail('INVALID_RESEARCH_POLYPHONY_INPUT', `${path} is missing ${required}.`, { path, field: required });
    }
  }
  const pointId = requireString(descriptors.pointId.value, `${path}.pointId`);
  const measureIndex = descriptors.measureIndex.value;
  const timeDivisions = descriptors.timeDivisions.value;
  if (!Number.isSafeInteger(measureIndex) || measureIndex < 0) {
    fail('INVALID_RESEARCH_POLYPHONY_INPUT', `${path}.measureIndex must be a non-negative integer.`, {
      path,
      measureIndex,
    });
  }
  if (!Number.isSafeInteger(timeDivisions) || timeDivisions < 0) {
    fail('INVALID_RESEARCH_POLYPHONY_INPUT', `${path}.timeDivisions must be a non-negative integer.`, {
      path,
      timeDivisions,
    });
  }
  const notes = nativeDenseArray(descriptors.notes.value, `${path}.notes`, 6)
    .map((note, noteIndex) => normalizeNote(note, noteIndex, pointIndex));
  const logicalIds = new Set();
  const sustainIds = new Set();
  for (const note of notes) {
    if (logicalIds.has(note.logicalNoteId) || sustainIds.has(note.sustainId)) {
      fail('INVALID_RESEARCH_POLYPHONY_INPUT', 'Logical note and sustain identities must be unique per point.', {
        pointId,
        logicalNoteId: note.logicalNoteId,
        sustainId: note.sustainId,
      });
    }
    logicalIds.add(note.logicalNoteId);
    sustainIds.add(note.sustainId);
  }
  return Object.freeze({ pointId, measureIndex, timeDivisions, notes: Object.freeze(notes) });
}

function blocked(configuration, points, point, reason, details = {}) {
  return Object.freeze({
    documentType: 'SustainedTuningVerificationResult',
    contractVersion: SUSTAINED_TUNING_VERIFIER_VERSION,
    authority: 'RESEARCH_VERIFICATION_ONLY',
    policy: SUSTAINED_TUNING_VERIFIER_POLICY,
    status: 'BLOCKED',
    reason,
    details: Object.freeze({ ...details }),
    guitar: tuningConfigurationToGuitarFacts(configuration),
    points: Object.freeze(points),
    blockedAt: Object.freeze({
      pointId: point.pointId,
      measureIndex: point.measureIndex,
      timeDivisions: point.timeDivisions,
    }),
  });
}

export function verifySustainedPolyphonyWithTuning(
  inputPoints,
  tuningConfiguration = STANDARD_TUNING_CONFIGURATION,
) {
  const configuration = resolveGuitarTuningConfiguration(tuningConfiguration);
  const points = nativeDenseArray(inputPoints, 'points', 10_000)
    .map((point, pointIndex) => normalizePoint(point, pointIndex));

  const selectedPoints = [];
  let activeBySustainId = new Map();

  for (const point of points) {
    const notesWithCandidates = [];
    for (const note of point.notes) {
      let candidates;
      if (note.disposition === 'HOLD') {
        const previous = activeBySustainId.get(note.sustainId);
        if (!previous) {
          fail('HOLD_WITHOUT_PREVIOUS_POSITION', 'HOLD note has no previous physical sustain state.', {
            pointId: point.pointId,
            sustainId: note.sustainId,
          });
        }
        if (previous.pitch !== note.pitch) {
          fail('SUSTAIN_PITCH_IDENTITY_CHANGED', 'A sustained note changed source pitch identity.', {
            pointId: point.pointId,
            sustainId: note.sustainId,
            previousPitch: previous.pitch,
            currentPitch: note.pitch,
          });
        }
        if (positionToMidi(previous.position, configuration) !== spelledPitchToMidi(note.pitch)) {
          return blocked(
            configuration,
            selectedPoints,
            point,
            'HOLD_POSITION_NO_LONGER_MATCHES_PITCH',
            { sustainId: note.sustainId },
          );
        }
        candidates = Object.freeze([Object.freeze({
          string: previous.position.string,
          fret: previous.position.fret,
          pitch: note.pitch,
          pitchMidi: spelledPitchToMidi(note.pitch),
        })]);
      } else {
        candidates = generateFretboardCandidates(note.pitch, configuration);
      }

      if (candidates.length === 0) {
        return blocked(configuration, selectedPoints, point, 'NO_EXACT_FRETBOARD_CANDIDATE', {
          logicalNoteId: note.logicalNoteId,
          sustainId: note.sustainId,
          pitch: note.pitch,
        });
      }

      notesWithCandidates.push(Object.freeze({
        id: note.logicalNoteId,
        pitch: note.pitch,
        ...(note.voice !== null ? { voice: note.voice } : {}),
        ...(note.staff !== null ? { staff: note.staff } : {}),
        fretboardCandidates: candidates,
      }));
    }

    const assignments = enumerateSonorityAssignments(notesWithCandidates);
    if (assignments.length === 0) {
      return blocked(configuration, selectedPoints, point, 'NO_DISTINCT_STRING_ASSIGNMENT', {
        activeNoteCount: point.notes.length,
      });
    }

    const assignment = assignments[0];
    const selectedByLogicalId = new Map(assignment.map((entry) => [entry.noteId, entry]));
    const nextActive = new Map();
    const positions = point.notes.map((note) => {
      const selected = selectedByLogicalId.get(note.logicalNoteId);
      if (!selected) {
        fail('INTERNAL_ASSIGNMENT_IDENTITY_LOSS', 'Research assignment lost logical-note identity.', {
          pointId: point.pointId,
          logicalNoteId: note.logicalNoteId,
        });
      }
      const position = Object.freeze({ string: selected.string, fret: selected.fret });
      if (positionToMidi(position, configuration) !== spelledPitchToMidi(note.pitch)) {
        fail('INTERNAL_POSITION_ROUND_TRIP_FAILURE', 'Selected position failed exact pitch round-trip.', {
          pointId: point.pointId,
          logicalNoteId: note.logicalNoteId,
        });
      }
      nextActive.set(note.sustainId, Object.freeze({ pitch: note.pitch, position }));
      return Object.freeze({
        logicalNoteId: note.logicalNoteId,
        sustainId: note.sustainId,
        pitch: note.pitch,
        disposition: note.disposition,
        tie: note.tie,
        voice: note.voice,
        staff: note.staff,
        string: position.string,
        fret: position.fret,
      });
    });

    selectedPoints.push(Object.freeze({
      pointId: point.pointId,
      measureIndex: point.measureIndex,
      timeDivisions: point.timeDivisions,
      activeNoteCount: point.notes.length,
      candidateAssignmentCount: assignments.length,
      selectedPositions: Object.freeze(positions),
    }));
    activeBySustainId = nextActive;
  }

  return Object.freeze({
    documentType: 'SustainedTuningVerificationResult',
    contractVersion: SUSTAINED_TUNING_VERIFIER_VERSION,
    authority: 'RESEARCH_VERIFICATION_ONLY',
    policy: SUSTAINED_TUNING_VERIFIER_POLICY,
    status: 'PASS',
    reason: null,
    details: Object.freeze({}),
    guitar: tuningConfigurationToGuitarFacts(configuration),
    points: Object.freeze(selectedPoints),
    blockedAt: null,
  });
}
