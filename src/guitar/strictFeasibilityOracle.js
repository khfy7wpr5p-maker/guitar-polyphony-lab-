import { types as utilTypes } from 'node:util';

import {
  generateFretboardCandidates,
  spelledPitchToMidi,
} from './fretboardCandidates.js';
import { enumerateSonorityAssignments } from './sonorityAssignments.js';
import {
  STANDARD_TUNING_CONFIGURATION,
  resolveGuitarTuningConfiguration,
  tuningConfigurationToGuitarFacts,
} from './tuningConfiguration.js';

const { isProxy } = utilTypes;

export const STRICT_FEASIBILITY_ORACLE_VERSION = '1.0.0';
export const STRICT_FEASIBILITY_ORACLE_POLICY = 'EXHAUSTIVE_DISTINCT_STRING_SUSTAIN_REACHABILITY_1.0';

const MAX_POINTS = 10_000;
const MAX_NOTES_PER_POINT = 64;
const MAX_GUITAR_STRINGS = 6;
const DEFAULT_MAX_STATES_PER_POINT = 720;
const HARD_MAX_STATES_PER_POINT = 720;

export class StrictFeasibilityOracleError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'StrictFeasibilityOracleError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new StrictFeasibilityOracleError(code, message, details);
}

function plainObject(value, path) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail('INVALID_ORACLE_INPUT', `${path} must be a non-proxy plain object.`, { path });
  }
  return value;
}

function requireString(value, path) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256) {
    fail('INVALID_ORACLE_INPUT', `${path} must be a bounded non-empty string.`, { path });
  }
  return value;
}

function denseArray(value, path, maximumLength) {
  if (
    !Array.isArray(value)
    || isProxy(value)
    || Object.getPrototypeOf(value) !== Array.prototype
    || value.length > maximumLength
  ) {
    fail('INVALID_ORACLE_INPUT', `${path} must be a bounded native array.`, { path });
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      fail('INVALID_ORACLE_INPUT', `${path} must be dense.`, { path, index });
    }
  }
  return value;
}

function normalizeNote(note, pointIndex, noteIndex) {
  const path = `points[${pointIndex}].notes[${noteIndex}]`;
  plainObject(note, path);
  const allowed = new Set([
    'logicalNoteId', 'sustainId', 'pitch', 'disposition', 'tie', 'voice', 'staff',
  ]);
  for (const key of Object.keys(note)) {
    if (!allowed.has(key)) {
      fail('INVALID_ORACLE_INPUT', `${path} contains an unknown field.`, { path, field: key });
    }
  }
  const logicalNoteId = requireString(note.logicalNoteId, `${path}.logicalNoteId`);
  const sustainId = requireString(note.sustainId, `${path}.sustainId`);
  const pitch = requireString(note.pitch, `${path}.pitch`);
  spelledPitchToMidi(pitch);
  if (note.disposition !== 'ATTACK' && note.disposition !== 'HOLD') {
    fail('INVALID_ORACLE_INPUT', `${path}.disposition must be ATTACK or HOLD.`, {
      path,
      disposition: note.disposition,
    });
  }
  const tie = note.tie ?? null;
  if (tie !== null && !['START', 'CONTINUE', 'STOP'].includes(tie)) {
    fail('INVALID_ORACLE_INPUT', `${path}.tie is invalid.`, { path, tie });
  }
  const voice = note.voice ?? null;
  if (voice !== null) requireString(voice, `${path}.voice`);
  const staff = note.staff ?? null;
  if (staff !== null && (!Number.isSafeInteger(staff) || staff < 1 || staff > 64)) {
    fail('INVALID_ORACLE_INPUT', `${path}.staff must be an integer in the range 1..64.`, {
      path,
      staff,
    });
  }
  return Object.freeze({
    logicalNoteId,
    sustainId,
    pitch,
    disposition: note.disposition,
    tie,
    voice,
    staff,
  });
}

function normalizePoint(point, pointIndex) {
  const path = `points[${pointIndex}]`;
  plainObject(point, path);
  const allowed = new Set(['pointId', 'measureIndex', 'timeDivisions', 'notes']);
  for (const key of Object.keys(point)) {
    if (!allowed.has(key)) {
      fail('INVALID_ORACLE_INPUT', `${path} contains an unknown field.`, { path, field: key });
    }
  }
  const pointId = requireString(point.pointId, `${path}.pointId`);
  if (!Number.isSafeInteger(point.measureIndex) || point.measureIndex < 0) {
    fail('INVALID_ORACLE_INPUT', `${path}.measureIndex must be a non-negative integer.`, {
      path,
      measureIndex: point.measureIndex,
    });
  }
  if (!Number.isSafeInteger(point.timeDivisions) || point.timeDivisions < 0) {
    fail('INVALID_ORACLE_INPUT', `${path}.timeDivisions must be a non-negative integer.`, {
      path,
      timeDivisions: point.timeDivisions,
    });
  }
  const notes = denseArray(point.notes, `${path}.notes`, MAX_NOTES_PER_POINT)
    .map((note, noteIndex) => normalizeNote(note, pointIndex, noteIndex));
  const logicalIds = new Set();
  const sustainIds = new Set();
  for (const note of notes) {
    if (logicalIds.has(note.logicalNoteId)) {
      fail('INVALID_ORACLE_INPUT', 'Logical note ids must be unique per point.', {
        pointId,
        logicalNoteId: note.logicalNoteId,
      });
    }
    if (sustainIds.has(note.sustainId)) {
      fail('INVALID_ORACLE_INPUT', 'Sustain ids must be unique per point.', {
        pointId,
        sustainId: note.sustainId,
      });
    }
    logicalIds.add(note.logicalNoteId);
    sustainIds.add(note.sustainId);
  }
  return Object.freeze({
    pointId,
    measureIndex: point.measureIndex,
    timeDivisions: point.timeDivisions,
    notes: Object.freeze(notes),
  });
}

function parseOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    fail('INVALID_ORACLE_OPTIONS', 'options must be an object.');
  }
  const maxStatesPerPoint = options.maxStatesPerPoint ?? DEFAULT_MAX_STATES_PER_POINT;
  if (
    !Number.isSafeInteger(maxStatesPerPoint)
    || maxStatesPerPoint <= 0
    || maxStatesPerPoint > HARD_MAX_STATES_PER_POINT
  ) {
    fail('INVALID_ORACLE_OPTIONS', 'maxStatesPerPoint is outside the supported bound.', {
      maxStatesPerPoint,
      hardMaximum: HARD_MAX_STATES_PER_POINT,
    });
  }
  return Object.freeze({ maxStatesPerPoint });
}

function resultBase(configuration) {
  return {
    documentType: 'StrictGuitarFeasibilityOracleResult',
    contractVersion: STRICT_FEASIBILITY_ORACLE_VERSION,
    authority: 'RESEARCH_VERIFICATION_ONLY',
    productionAuthority: false,
    policy: STRICT_FEASIBILITY_ORACLE_POLICY,
    guitar: tuningConfigurationToGuitarFacts(configuration),
    physicalScope: Object.freeze({
      exactPitch: true,
      distinctStrings: true,
      maximumSimultaneousStrings: MAX_GUITAR_STRINGS,
      sustainStringFretStable: true,
      leftHandFingering: 'NOT_MODELED',
      barreFeasibility: 'NOT_MODELED',
      ergonomicReach: 'NOT_MODELED',
      arrangementTransforms: 'FORBIDDEN',
    }),
  };
}

function infeasible(configuration, point, reason, details, stateCounts) {
  return Object.freeze({
    ...resultBase(configuration),
    status: 'INFEASIBLE',
    reason,
    details: Object.freeze({ ...details }),
    decisiveScope: Object.freeze({
      pointId: point.pointId,
      measureIndex: point.measureIndex,
      timeDivisions: point.timeDivisions,
    }),
    stateCounts: Object.freeze([...stateCounts]),
    witness: null,
  });
}

function indeterminate(configuration, point, reason, details, stateCounts) {
  return Object.freeze({
    ...resultBase(configuration),
    status: 'INDETERMINATE_LIMIT',
    reason,
    details: Object.freeze({ ...details }),
    decisiveScope: Object.freeze({
      pointId: point.pointId,
      measureIndex: point.measureIndex,
      timeDivisions: point.timeDivisions,
    }),
    stateCounts: Object.freeze([...stateCounts]),
    witness: null,
  });
}

function stateSignature(active) {
  return [...active.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([sustainId, value]) => `${sustainId}:${value.pitch}@${value.string}:${value.fret}`)
    .join('|');
}

function assignmentState(point, assignment, predecessor) {
  const byLogicalId = new Map(assignment.map((entry) => [entry.noteId, entry]));
  const active = new Map();
  const selectedPositions = point.notes.map((note) => {
    const selected = byLogicalId.get(note.logicalNoteId);
    if (!selected) {
      fail('INTERNAL_ORACLE_ASSIGNMENT_LOSS', 'Assignment lost a logical note identity.', {
        pointId: point.pointId,
        logicalNoteId: note.logicalNoteId,
      });
    }
    active.set(note.sustainId, Object.freeze({
      pitch: note.pitch,
      string: selected.string,
      fret: selected.fret,
    }));
    return Object.freeze({
      logicalNoteId: note.logicalNoteId,
      sustainId: note.sustainId,
      pitch: note.pitch,
      disposition: note.disposition,
      string: selected.string,
      fret: selected.fret,
    });
  });
  return Object.freeze({
    signature: stateSignature(active),
    active,
    predecessor,
    pointEvidence: Object.freeze({
      pointId: point.pointId,
      measureIndex: point.measureIndex,
      timeDivisions: point.timeDivisions,
      selectedPositions: Object.freeze(selectedPositions),
    }),
  });
}

function fixedHoldCandidate(note, predecessor, configuration, point) {
  if (!predecessor) {
    fail('INVALID_ORACLE_INPUT', 'First reachable point cannot contain HOLD without prior state.', {
      pointId: point.pointId,
      sustainId: note.sustainId,
    });
  }
  const previous = predecessor.active.get(note.sustainId);
  if (!previous) {
    fail('INVALID_ORACLE_INPUT', 'HOLD note has no previous sustain state.', {
      pointId: point.pointId,
      sustainId: note.sustainId,
    });
  }
  if (previous.pitch !== note.pitch) {
    fail('INVALID_ORACLE_INPUT', 'A HOLD sustain changed pitch identity.', {
      pointId: point.pointId,
      sustainId: note.sustainId,
      previousPitch: previous.pitch,
      currentPitch: note.pitch,
    });
  }
  const exact = generateFretboardCandidates(note.pitch, configuration).find((candidate) => (
    candidate.string === previous.string && candidate.fret === previous.fret
  ));
  if (!exact) return Object.freeze([]);
  return Object.freeze([exact]);
}

function notesForPredecessor(point, predecessor, configuration) {
  const notes = [];
  for (const note of point.notes) {
    const candidates = note.disposition === 'HOLD'
      ? fixedHoldCandidate(note, predecessor, configuration, point)
      : generateFretboardCandidates(note.pitch, configuration);
    notes.push(Object.freeze({
      id: note.logicalNoteId,
      pitch: note.pitch,
      ...(note.voice !== null ? { voice: note.voice } : {}),
      ...(note.staff !== null ? { staff: note.staff } : {}),
      fretboardCandidates: candidates,
    }));
  }
  return Object.freeze(notes);
}

function staticSonorityStatus(point, configuration) {
  for (const note of point.notes) {
    const candidates = generateFretboardCandidates(note.pitch, configuration);
    if (candidates.length === 0) {
      return Object.freeze({
        playable: false,
        reason: 'NO_EXACT_FRETBOARD_CANDIDATE',
        details: Object.freeze({
          logicalNoteId: note.logicalNoteId,
          sustainId: note.sustainId,
          pitch: note.pitch,
        }),
      });
    }
  }
  if (point.notes.length > MAX_GUITAR_STRINGS) {
    return Object.freeze({
      playable: false,
      reason: 'ACTIVE_NOTE_COUNT_EXCEEDS_STRING_COUNT',
      details: Object.freeze({
        activeNoteCount: point.notes.length,
        maxStrings: MAX_GUITAR_STRINGS,
      }),
    });
  }
  const staticNotes = point.notes.map((note) => Object.freeze({
    id: note.logicalNoteId,
    pitch: note.pitch,
    fretboardCandidates: generateFretboardCandidates(note.pitch, configuration),
  }));
  const assignments = enumerateSonorityAssignments(staticNotes);
  if (assignments.length === 0) {
    return Object.freeze({
      playable: false,
      reason: 'NO_DISTINCT_STRING_ASSIGNMENT',
      details: Object.freeze({ activeNoteCount: point.notes.length }),
    });
  }
  return Object.freeze({ playable: true, assignmentCount: assignments.length });
}

function reconstructWitness(finalState) {
  const points = [];
  let cursor = finalState;
  while (cursor) {
    points.push(cursor.pointEvidence);
    cursor = cursor.predecessor;
  }
  points.reverse();
  return Object.freeze({ points: Object.freeze(points) });
}

export function evaluateStrictGuitarFeasibility(
  inputPoints,
  guitarConfiguration = STANDARD_TUNING_CONFIGURATION,
  options = {},
) {
  const configuration = resolveGuitarTuningConfiguration(guitarConfiguration);
  const resolvedOptions = parseOptions(options);
  const points = denseArray(inputPoints, 'points', MAX_POINTS)
    .map((point, pointIndex) => normalizePoint(point, pointIndex));

  if (points.length === 0) {
    return Object.freeze({
      ...resultBase(configuration),
      status: 'FEASIBLE',
      reason: null,
      details: Object.freeze({}),
      decisiveScope: null,
      stateCounts: Object.freeze([]),
      witness: Object.freeze({ points: Object.freeze([]) }),
    });
  }

  let states = Object.freeze([null]);
  const stateCounts = [];

  for (const point of points) {
    const staticStatus = staticSonorityStatus(point, configuration);
    if (!staticStatus.playable) {
      return infeasible(
        configuration,
        point,
        staticStatus.reason,
        staticStatus.details,
        stateCounts,
      );
    }

    const nextBySignature = new Map();
    for (const predecessor of states) {
      const notesWithCandidates = notesForPredecessor(point, predecessor, configuration);
      if (notesWithCandidates.some((note) => note.fretboardCandidates.length === 0)) continue;
      const assignments = enumerateSonorityAssignments(notesWithCandidates);
      for (const assignment of assignments) {
        const next = assignmentState(point, assignment, predecessor);
        if (!nextBySignature.has(next.signature)) nextBySignature.set(next.signature, next);
        if (nextBySignature.size > resolvedOptions.maxStatesPerPoint) {
          return indeterminate(
            configuration,
            point,
            'STATE_SPACE_LIMIT_EXCEEDED',
            {
              maxStatesPerPoint: resolvedOptions.maxStatesPerPoint,
              observedAtLeast: nextBySignature.size,
            },
            stateCounts,
          );
        }
      }
    }

    if (nextBySignature.size === 0) {
      return infeasible(
        configuration,
        point,
        'NO_SUSTAINED_PATH',
        {
          predecessorStateCount: states.filter(Boolean).length,
          staticAssignmentCount: staticStatus.assignmentCount,
        },
        stateCounts,
      );
    }

    states = Object.freeze([...nextBySignature.values()]);
    stateCounts.push(Object.freeze({
      pointId: point.pointId,
      reachableStateCount: states.length,
    }));
  }

  const finalState = states[0];
  return Object.freeze({
    ...resultBase(configuration),
    status: 'FEASIBLE',
    reason: null,
    details: Object.freeze({
      finalReachableStateCount: states.length,
    }),
    decisiveScope: null,
    stateCounts: Object.freeze(stateCounts),
    witness: reconstructWitness(finalState),
  });
}

export const STRICT_FEASIBILITY_ORACLE_LIMITS = Object.freeze({
  maxPoints: MAX_POINTS,
  maxNotesPerPoint: MAX_NOTES_PER_POINT,
  maxGuitarStrings: MAX_GUITAR_STRINGS,
  defaultMaxStatesPerPoint: DEFAULT_MAX_STATES_PER_POINT,
  hardMaxStatesPerPoint: HARD_MAX_STATES_PER_POINT,
});
