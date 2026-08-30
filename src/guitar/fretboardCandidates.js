import {
  STANDARD_TUNING_CONFIGURATION,
  resolveGuitarTuningConfiguration,
  spelledPitchToMidi,
} from './tuningConfiguration.js';

const MAX_FRET = 24;

export const STANDARD_GUITAR_PROFILE = Object.freeze({
  id: 'STANDARD_E2_E4_24_FRET_1.0',
  maxFret: MAX_FRET,
  strings: Object.freeze(
    STANDARD_TUNING_CONFIGURATION.strings.map((entry) => Object.freeze({
      string: entry.string,
      openPitch: entry.pitch,
      openMidi: entry.midi,
    })),
  ),
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

export { spelledPitchToMidi };

function validatePitchMidi(midi) {
  if (!Number.isSafeInteger(midi) || midi < 0 || midi > 127) {
    fail('INVALID_PITCH_MIDI', 'Pitch MIDI must be an integer in the range 0..127.', { midi });
  }
  return midi;
}

function profileId(configuration) {
  if (configuration.preset === 'STANDARD') return STANDARD_GUITAR_PROFILE.id;
  const pitches = configuration.strings.map((entry) => entry.pitch).join('_');
  return `CUSTOM_TUNING_${configuration.preset}_${pitches}_${MAX_FRET}_FRET_1.0`;
}

export function getPositionCandidates(
  pitchMidi,
  tuningConfiguration = STANDARD_TUNING_CONFIGURATION,
) {
  validatePitchMidi(pitchMidi);
  const configuration = resolveGuitarTuningConfiguration(tuningConfiguration);
  const candidates = [];

  for (const stringProfile of configuration.strings) {
    const fret = pitchMidi - stringProfile.midi;
    if (fret < 0 || fret > MAX_FRET) continue;
    candidates.push(Object.freeze({
      string: stringProfile.string,
      fret,
      pitchMidi,
      openPitch: stringProfile.pitch,
      openMidi: stringProfile.midi,
    }));
  }

  return Object.freeze(candidates);
}

export function positionToMidi(
  position,
  tuningConfiguration = STANDARD_TUNING_CONFIGURATION,
) {
  if (
    !position
    || typeof position !== 'object'
    || Array.isArray(position)
    || !Number.isSafeInteger(position.string)
    || !Number.isSafeInteger(position.fret)
    || position.string < 1
    || position.string > 6
    || position.fret < 0
    || position.fret > MAX_FRET
  ) {
    fail('INVALID_POSITION', 'Position must contain a string 1..6 and fret 0..24.', { position });
  }
  const configuration = resolveGuitarTuningConfiguration(tuningConfiguration);
  const stringDefinition = configuration.strings[position.string - 1];
  const midi = stringDefinition.midi + position.fret;
  return validatePitchMidi(midi);
}

export function generateFretboardCandidates(
  pitch,
  tuningConfiguration = STANDARD_TUNING_CONFIGURATION,
) {
  let pitchMidi;
  try {
    pitchMidi = spelledPitchToMidi(pitch);
  } catch (error) {
    if (error && error.code === 'INVALID_PITCH') {
      fail('INVALID_PITCH', error.message, error.details);
    }
    throw error;
  }

  return Object.freeze(
    getPositionCandidates(pitchMidi, tuningConfiguration).map((candidate) => Object.freeze({
      ...candidate,
      pitch,
    })),
  );
}

export function attachFretboardCandidates(
  noteIntervals,
  tuningConfiguration = STANDARD_TUNING_CONFIGURATION,
) {
  if (!Array.isArray(noteIntervals)) {
    fail('INVALID_NOTE_INTERVALS', 'noteIntervals must be an array.');
  }
  const configuration = resolveGuitarTuningConfiguration(tuningConfiguration);

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

    const fretboardCandidates = generateFretboardCandidates(note.pitch, configuration);
    return Object.freeze({
      ...note,
      fretboardCandidates,
      playableOnProfile: fretboardCandidates.length > 0,
      fretboardProfileId: profileId(configuration),
      tuningPreset: configuration.preset,
    });
  });

  return Object.freeze(result);
}
