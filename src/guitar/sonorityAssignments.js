const MAX_GUITAR_STRINGS = 6;
const MAX_FRET = 24;
const HARD_MAX_ASSIGNMENTS = 720;

export class SonorityAssignmentError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'SonorityAssignmentError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new SonorityAssignmentError(code, message, details);
}

function parseAssignmentLimit(value) {
  if (value === undefined) return HARD_MAX_ASSIGNMENTS;
  if (!Number.isSafeInteger(value) || value <= 0 || value > HARD_MAX_ASSIGNMENTS) {
    fail(
      'INVALID_ASSIGNMENT_LIMIT',
      `maxAssignments must be a positive integer no greater than ${HARD_MAX_ASSIGNMENTS}.`,
      { value, hardMax: HARD_MAX_ASSIGNMENTS },
    );
  }
  return value;
}

function normalizeCandidate(note, candidate, noteIndex, candidateIndex, seenStrings) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    fail('INVALID_FRETBOARD_CANDIDATE', 'Each fretboard candidate must be an object.', {
      noteIndex,
      candidateIndex,
      noteId: note.id,
    });
  }

  const { string, fret } = candidate;
  if (!Number.isSafeInteger(string) || string < 1 || string > MAX_GUITAR_STRINGS) {
    fail('INVALID_CANDIDATE_STRING', 'Candidate string must be an integer in the range 1..6.', {
      noteIndex,
      candidateIndex,
      noteId: note.id,
      string,
    });
  }
  if (!Number.isSafeInteger(fret) || fret < 0 || fret > MAX_FRET) {
    fail('INVALID_CANDIDATE_FRET', 'Candidate fret must be an integer in the range 0..24.', {
      noteIndex,
      candidateIndex,
      noteId: note.id,
      fret,
    });
  }
  if (seenStrings.has(string)) {
    fail(
      'DUPLICATE_STRING_CANDIDATE',
      'One note may expose at most one candidate position per string in the bounded P2B contract.',
      { noteIndex, candidateIndex, noteId: note.id, string },
    );
  }
  seenStrings.add(string);

  if (candidate.pitch !== undefined && candidate.pitch !== note.pitch) {
    fail(
      'CANDIDATE_PITCH_MISMATCH',
      'Candidate pitch provenance must match the source note pitch.',
      {
        noteIndex,
        candidateIndex,
        noteId: note.id,
        notePitch: note.pitch,
        candidatePitch: candidate.pitch,
      },
    );
  }

  return Object.freeze({
    string,
    fret,
    ...(Number.isSafeInteger(candidate.pitchMidi) ? { pitchMidi: candidate.pitchMidi } : {}),
  });
}

function normalizeNotes(notesWithCandidates) {
  if (!Array.isArray(notesWithCandidates)) {
    fail('INVALID_SONORITY', 'notesWithCandidates must be an array.');
  }
  if (notesWithCandidates.length > MAX_GUITAR_STRINGS) {
    fail(
      'SONORITY_EXCEEDS_STRING_COUNT',
      'A standard six-string guitar cannot assign more than six simultaneous notes to distinct strings.',
      { noteCount: notesWithCandidates.length, maxStrings: MAX_GUITAR_STRINGS },
    );
  }

  const seenIds = new Set();
  return notesWithCandidates.map((note, noteIndex) => {
    if (!note || typeof note !== 'object' || Array.isArray(note)) {
      fail('INVALID_SONORITY_NOTE', 'Each sonority note must be an object.', { noteIndex });
    }
    if (typeof note.id !== 'string' || note.id.length === 0) {
      fail('INVALID_NOTE_ID', 'Each sonority note must carry a non-empty id.', { noteIndex });
    }
    if (seenIds.has(note.id)) {
      fail('DUPLICATE_NOTE_ID', 'Sonority note ids must be unique.', {
        noteIndex,
        id: note.id,
      });
    }
    seenIds.add(note.id);

    if (typeof note.pitch !== 'string' || note.pitch.length === 0) {
      fail('INVALID_NOTE_PITCH', 'Each sonority note must carry a non-empty pitch.', {
        noteIndex,
        id: note.id,
      });
    }
    if (!Array.isArray(note.fretboardCandidates)) {
      fail(
        'MISSING_FRETBOARD_CANDIDATES',
        'Each sonority note must carry a fretboardCandidates array from P2A.',
        { noteIndex, id: note.id },
      );
    }
    if (note.fretboardCandidates.length > MAX_GUITAR_STRINGS) {
      fail(
        'CANDIDATE_COUNT_EXCEEDED',
        'One pitch may expose at most one bounded candidate per guitar string.',
        { noteIndex, id: note.id, count: note.fretboardCandidates.length },
      );
    }

    const seenStrings = new Set();
    const candidates = note.fretboardCandidates
      .map((candidate, candidateIndex) =>
        normalizeCandidate(note, candidate, noteIndex, candidateIndex, seenStrings),
      )
      .sort((left, right) => left.string - right.string || left.fret - right.fret);

    return Object.freeze({
      id: note.id,
      pitch: note.pitch,
      ...(note.voice !== undefined ? { voice: note.voice } : {}),
      ...(note.staff !== undefined ? { staff: note.staff } : {}),
      candidates: Object.freeze(candidates),
    });
  });
}

function freezeAssignment(records) {
  return Object.freeze(records.map((record) => Object.freeze(record)));
}

export function enumerateSonorityAssignments(notesWithCandidates, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    fail('INVALID_OPTIONS', 'options must be an object.');
  }

  const maxAssignments = parseAssignmentLimit(options.maxAssignments);
  const notes = normalizeNotes(notesWithCandidates);

  if (notes.length === 0 || notes.some((note) => note.candidates.length === 0)) {
    return Object.freeze([]);
  }

  const assignments = [];
  const usedStrings = new Set();
  const current = [];

  function visit(noteIndex) {
    if (noteIndex === notes.length) {
      if (assignments.length >= maxAssignments) {
        fail(
          'ASSIGNMENT_LIMIT_EXCEEDED',
          'Full sonority assignment enumeration exceeds the requested bound; results are not truncated.',
          { maxAssignments },
        );
      }
      assignments.push(freezeAssignment(current));
      return;
    }

    const note = notes[noteIndex];
    for (const candidate of note.candidates) {
      if (usedStrings.has(candidate.string)) continue;

      usedStrings.add(candidate.string);
      current.push({
        noteId: note.id,
        pitch: note.pitch,
        ...(note.voice !== undefined ? { voice: note.voice } : {}),
        ...(note.staff !== undefined ? { staff: note.staff } : {}),
        string: candidate.string,
        fret: candidate.fret,
        ...(candidate.pitchMidi !== undefined ? { pitchMidi: candidate.pitchMidi } : {}),
      });
      visit(noteIndex + 1);
      current.pop();
      usedStrings.delete(candidate.string);
    }
  }

  visit(0);
  return Object.freeze(assignments);
}

export const SONORITY_ASSIGNMENT_LIMITS = Object.freeze({
  maxNotes: MAX_GUITAR_STRINGS,
  maxStrings: MAX_GUITAR_STRINGS,
  maxFret: MAX_FRET,
  hardMaxAssignments: HARD_MAX_ASSIGNMENTS,
});
