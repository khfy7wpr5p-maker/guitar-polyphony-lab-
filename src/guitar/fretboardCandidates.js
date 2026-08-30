import {
  GUITAR_FRET_SEMANTICS,
  GUITAR_MAX_ABSOLUTE_FRET,
  STANDARD_GUITAR_CONFIGURATION,
  resolveGuitarConfiguration,
  spelledPitchToMidi,
} from './tuningConfiguration.js';

const MAX_FRET = GUITAR_MAX_ABSOLUTE_FRET;

export const STANDARD_GUITAR_PROFILE = Object.freeze({
  id: 'STANDARD_E2_E4_24_FRET_1.0',
  maxFret: MAX_FRET,
  fretSemantics: GUITAR_FRET_SEMANTICS,
  strings: Object.freeze(
    STANDARD_GUITAR_CONFIGURATION.tuning.map((entry) => Object.freeze({
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
  if (configuration.preset === 'STANDARD' && configuration.capoFret === 0) {
    return STANDARD_GUITAR_PROFILE.id;
  }
  const pitches = configuration.tuning.map((entry) => entry.pitch).join('_');
  return `GUITAR_${configuration.preset}_${pitches}_CAPO_${configuration.capoFret}_${MAX_FRET}_ABS_FRET_2.0`;
}

function maximumRelativeFret(configuration) {
  return MAX_FRET - configuration.capoFret;
}

export function getPositionCandidates(
  pitchMidi,
  guitarConfiguration = STANDARD_GUITAR_CONFIGURATION,
) {
  validatePitchMidi(pitchMidi);
  const configuration = resolveGuitarConfiguration(guitarConfiguration);
  const candidates = [];
  const maxRelativeFret = maximumRelativeFret(configuration);

  for (const stringProfile of configuration.tuning) {
    const soundingOpenMidi = stringProfile.midi + configuration.capoFret;
    const relativeFret = pitchMidi - soundingOpenMidi;
    if (relativeFret < 0 || relativeFret > maxRelativeFret) continue;
    candidates.push(Object.freeze({
      string: stringProfile.string,
      // The solver-facing `fret` field is explicitly relative from the capo.
      fret: relativeFret,
      relativeFret,
      absoluteFret: configuration.capoFret + relativeFret,
      fretSemantics: GUITAR_FRET_SEMANTICS,
      pitchMidi,
      openPitch: stringProfile.pitch,
      openMidi: stringProfile.midi,
      soundingOpenMidi,
      capoFret: configuration.capoFret,
    }));
  }

  return Object.freeze(candidates);
}

export function positionToMidi(
  position,
  guitarConfiguration = STANDARD_GUITAR_CONFIGURATION,
) {
  const configuration = resolveGuitarConfiguration(guitarConfiguration);
  const maxRelativeFret = maximumRelativeFret(configuration);
  if (
    !position
    || typeof position !== 'object'
    || Array.isArray(position)
    || !Number.isSafeInteger(position.string)
    || !Number.isSafeInteger(position.fret)
    || position.string < 1
    || position.string > 6
    || position.fret < 0
    || position.fret > maxRelativeFret
  ) {
    fail(
      'INVALID_POSITION',
      'Position must contain string 1..6 and a relative-from-capo fret within the remaining absolute fretboard.',
      {
        position,
        capoFret: configuration.capoFret,
        maximumRelativeFret: maxRelativeFret,
        fretSemantics: GUITAR_FRET_SEMANTICS,
      },
    );
  }
  const stringDefinition = configuration.tuning[position.string - 1];
  const midi = stringDefinition.midi + configuration.capoFret + position.fret;
  return validatePitchMidi(midi);
}

export function generateFretboardCandidates(
  pitch,
  guitarConfiguration = STANDARD_GUITAR_CONFIGURATION,
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
    getPositionCandidates(pitchMidi, guitarConfiguration).map((candidate) => Object.freeze({
      ...candidate,
      pitch,
    })),
  );
}

export function attachFretboardCandidates(
  noteIntervals,
  guitarConfiguration = STANDARD_GUITAR_CONFIGURATION,
) {
  if (!Array.isArray(noteIntervals)) {
    fail('INVALID_NOTE_INTERVALS', 'noteIntervals must be an array.');
  }
  const configuration = resolveGuitarConfiguration(guitarConfiguration);

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
      capoFret: configuration.capoFret,
      fretSemantics: configuration.fretSemantics,
    });
  });

  return Object.freeze(result);
}
