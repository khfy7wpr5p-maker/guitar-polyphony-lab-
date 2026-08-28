const NATURAL_PITCH_CLASSES = Object.freeze({
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
});

const ACCIDENTAL_OFFSETS = Object.freeze({
  bb: -2,
  b: -1,
  '': 0,
  '#': 1,
  '##': 2,
});

export const STANDARD_GUITAR_PROFILE = Object.freeze({
  id: 'STANDARD_E2_E4_24_FRET_1.0',
  maxFret: 24,
  strings: Object.freeze([
    Object.freeze({ string: 1, openPitch: 'E4', openMidi: 64 }),
    Object.freeze({ string: 2, openPitch: 'B3', openMidi: 59 }),
    Object.freeze({ string: 3, openPitch: 'G3', openMidi: 55 }),
    Object.freeze({ string: 4, openPitch: 'D3', openMidi: 50 }),
    Object.freeze({ string: 5, openPitch: 'A2', openMidi: 45 }),
    Object.freeze({ string: 6, openPitch: 'E2', openMidi: 40 }),
  ]),
});

export class FretboardCandidateError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'FretboardCandidateError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new FretboardCandidateError(code, message, details);
}

export function spelledPitchToMidi(pitch) {
  if (typeof pitch !== 'string') {
    fail('INVALID_PITCH', 'Pitch must be a spelling-preserving string.', { pitch });
  }

  const match = /^([A-G])(bb|##|b|#)?([0-9])$/.exec(pitch.trim());
  if (!match) {
    fail('INVALID_PITCH', 'Pitch must match A..G with optional bb/b/#/## and octave 0..9.', {
      pitch,
    });
  }

  const [, step, accidental = '', octaveText] = match;
  const octave = Number(octaveText);
  const midi =
    (octave + 1) * 12 + NATURAL_PITCH_CLASSES[step] + ACCIDENTAL_OFFSETS[accidental];

  if (!Number.isInteger(midi) || midi < 0 || midi > 127) {
    fail('PITCH_OUTSIDE_MIDI_RANGE', 'Spelled pitch resolves outside MIDI note range 0..127.', {
      pitch,
      midi,
    });
  }

  return midi;
}

export function generateFretboardCandidates(pitch) {
  const pitchMidi = spelledPitchToMidi(pitch);
  const candidates = [];

  for (const stringProfile of STANDARD_GUITAR_PROFILE.strings) {
    const fret = pitchMidi - stringProfile.openMidi;
    if (fret < 0 || fret > STANDARD_GUITAR_PROFILE.maxFret) continue;

    candidates.push(
      Object.freeze({
        string: stringProfile.string,
        fret,
        pitch,
        pitchMidi,
        openPitch: stringProfile.openPitch,
      }),
    );
  }

  return Object.freeze(candidates);
}

export function attachFretboardCandidates(noteIntervals) {
  if (!Array.isArray(noteIntervals)) {
    fail('INVALID_NOTE_INTERVALS', 'noteIntervals must be an array.');
  }

  const seenIds = new Set();
  const result = noteIntervals.map((note, index) => {
    if (!note || typeof note !== 'object' || Array.isArray(note)) {
      fail('INVALID_NOTE_INTERVAL', 'Each note interval must be an object.', { index });
    }
    if (typeof note.id !== 'string' || note.id.length === 0) {
      fail('INVALID_NOTE_ID', 'Each note interval must carry a non-empty id.', { index });
    }
    if (seenIds.has(note.id)) {
      fail('DUPLICATE_NOTE_ID', 'Note interval ids must be unique.', {
        index,
        id: note.id,
      });
    }
    seenIds.add(note.id);

    const fretboardCandidates = generateFretboardCandidates(note.pitch);
    return Object.freeze({
      ...note,
      fretboardCandidates,
      playableOnProfile: fretboardCandidates.length > 0,
      fretboardProfileId: STANDARD_GUITAR_PROFILE.id,
    });
  });

  return Object.freeze(result);
}
