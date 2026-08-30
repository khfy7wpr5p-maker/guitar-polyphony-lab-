import { types as utilTypes } from 'node:util';

const { isProxy } = utilTypes;

export const GUITAR_CONFIGURATION_VERSION = '2.0.0';
export const GUITAR_TUNING_CONFIGURATION_VERSION = GUITAR_CONFIGURATION_VERSION;
export const GUITAR_STRING_COUNT = 6;
export const GUITAR_MAX_ABSOLUTE_FRET = 24;
export const RESEARCH_MAX_CAPO_FRET = GUITAR_MAX_ABSOLUTE_FRET;
export const GUITAR_FRET_SEMANTICS = 'RELATIVE_FROM_CAPO';
export const RESEARCH_MIN_OPEN_MIDI = 28;
export const RESEARCH_MAX_OPEN_MIDI = 76;
export const RESEARCH_MAX_ADJACENT_INTERVAL = 12;

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

const STANDARD_REQUEST = Object.freeze([
  Object.freeze({ string: 1, pitch: 'E4' }),
  Object.freeze({ string: 2, pitch: 'B3' }),
  Object.freeze({ string: 3, pitch: 'G3' }),
  Object.freeze({ string: 4, pitch: 'D3' }),
  Object.freeze({ string: 5, pitch: 'A2' }),
  Object.freeze({ string: 6, pitch: 'E2' }),
]);

const DROP_D_REQUEST = Object.freeze([
  Object.freeze({ string: 1, pitch: 'E4' }),
  Object.freeze({ string: 2, pitch: 'B3' }),
  Object.freeze({ string: 3, pitch: 'G3' }),
  Object.freeze({ string: 4, pitch: 'D3' }),
  Object.freeze({ string: 5, pitch: 'A2' }),
  Object.freeze({ string: 6, pitch: 'D2' }),
]);

export class TuningConfigurationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'TuningConfigurationError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export class GuitarConfigurationError extends TuningConfigurationError {
  constructor(code, message, details = {}) {
    super(code, message, details);
    this.name = 'GuitarConfigurationError';
  }
}

function fail(code, message, details = {}) {
  throw new GuitarConfigurationError(code, message, details);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || isProxy(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactDataDescriptors(value, allowed, path) {
  const tuningEntry = path.startsWith('tuning[');
  const hostileCode = tuningEntry
    ? 'HOSTILE_TUNING_INPUT'
    : 'HOSTILE_GUITAR_CONFIGURATION_INPUT';
  const unknownFieldCode = tuningEntry
    ? 'INVALID_TUNING_ENTRY'
    : 'INVALID_GUITAR_CONFIGURATION_FIELD';

  if (!isPlainObject(value)) {
    fail(hostileCode, `${path} must be a non-proxy plain object.`, { path });
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(value);
  for (const key of keys) {
    if (typeof key !== 'string' || !allowed.includes(key)) {
      fail(unknownFieldCode, `${path} contains an unknown field.`, {
        path,
        field: typeof key === 'symbol' ? key.toString() : key,
      });
    }
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      fail(hostileCode, `${path} fields must be enumerable data properties.`, {
        path,
        field: key,
      });
    }
  }
  return descriptors;
}

function assertNativeDenseArray(value, path) {
  if (
    !Array.isArray(value)
    || isProxy(value)
    || Object.getPrototypeOf(value) !== Array.prototype
  ) {
    fail('HOSTILE_TUNING_INPUT', `${path} must be a native non-proxy array.`, { path });
  }
  for (const key of Reflect.ownKeys(value)) {
    if (
      key !== 'length'
      && (
        typeof key !== 'string'
        || !/^(?:0|[1-9]\d*)$/.test(key)
        || Number(key) >= value.length
      )
    ) {
      fail('HOSTILE_TUNING_INPUT', `${path} contains an invalid array property.`, {
        path,
        field: typeof key === 'symbol' ? key.toString() : key,
      });
    }
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      fail('HOSTILE_TUNING_INPUT', `${path} must be dense.`, { path, index });
    }
  }
}

export function spelledPitchToMidi(pitch) {
  if (typeof pitch !== 'string') {
    fail('INVALID_PITCH', 'Pitch must be a scientific pitch string.', { pitch });
  }
  const normalized = pitch.trim();
  const match = /^([A-G])(bb|##|b|#)?([0-9])$/.exec(normalized);
  if (!match) {
    fail('INVALID_PITCH', 'Pitch must match A..G with optional bb/b/#/## and octave 0..9.', {
      pitch,
    });
  }
  const [, step, accidental = '', octaveText] = match;
  const midi = (
    (Number(octaveText) + 1) * 12
    + NATURAL_PITCH_CLASSES[step]
    + ACCIDENTAL_OFFSETS[accidental]
  );
  if (!Number.isSafeInteger(midi) || midi < 0 || midi > 127) {
    fail('INVALID_PITCH', 'Pitch resolves outside MIDI range 0..127.', { pitch, midi });
  }
  return midi;
}

function normalizePitch(value, path) {
  if (typeof value !== 'string') {
    fail('INVALID_PITCH', `${path} must be a pitch string.`, { path });
  }
  const pitch = value.trim();
  spelledPitchToMidi(pitch);
  return pitch;
}

function sameTuning(strings, request) {
  return strings.every((entry, index) => (
    entry.string === request[index].string
    && entry.pitch === request[index].pitch
  ));
}

function derivePreset(strings) {
  if (sameTuning(strings, STANDARD_REQUEST)) return 'STANDARD';
  if (sameTuning(strings, DROP_D_REQUEST)) return 'DROP_D';
  return 'CUSTOM';
}

function validateCapoFret(value) {
  if (!Number.isSafeInteger(value)) {
    fail('INVALID_CAPO_FRET', 'capoFret must be an integer.', { capoFret: value });
  }
  if (value < 0) {
    fail('INVALID_CAPO_FRET', 'capoFret cannot be negative.', { capoFret: value });
  }
  if (value > RESEARCH_MAX_CAPO_FRET) {
    fail('CAPO_OUT_OF_BOUNDS', 'capoFret exceeds the bounded research fretboard.', {
      capoFret: value,
      maximumCapoFret: RESEARCH_MAX_CAPO_FRET,
    });
  }
  return value;
}

function validatePhysicalBounds(strings, capoFret) {
  for (const entry of strings) {
    if (entry.midi < RESEARCH_MIN_OPEN_MIDI || entry.midi > RESEARCH_MAX_OPEN_MIDI) {
      fail(
        'PHYSICALLY_UNBOUNDED_TUNING',
        'Open-string pitch is outside the bounded six-string research range.',
        {
          string: entry.string,
          midi: entry.midi,
          minimumMidi: RESEARCH_MIN_OPEN_MIDI,
          maximumMidi: RESEARCH_MAX_OPEN_MIDI,
        },
      );
    }
    if (entry.midi + capoFret > 127) {
      fail('PHYSICALLY_UNBOUNDED_CONFIGURATION', 'Capo pushes an open string outside MIDI range.', {
        string: entry.string,
        openMidi: entry.midi,
        capoFret,
      });
    }
  }
  for (let index = 0; index < strings.length - 1; index += 1) {
    const higher = strings[index];
    const lower = strings[index + 1];
    const interval = higher.midi - lower.midi;
    if (interval <= 0 || interval > RESEARCH_MAX_ADJACENT_INTERVAL) {
      fail(
        'PHYSICALLY_UNBOUNDED_TUNING',
        'String 1..6 open pitches must descend strictly with a bounded adjacent interval.',
        {
          higherString: higher.string,
          higherMidi: higher.midi,
          lowerString: lower.string,
          lowerMidi: lower.midi,
          interval,
          maximumAdjacentInterval: RESEARCH_MAX_ADJACENT_INTERVAL,
        },
      );
    }
  }
}

function freezeStrings(strings) {
  return Object.freeze(strings.map((entry) => Object.freeze({ ...entry })));
}

function normalizeTuning(tuning) {
  assertNativeDenseArray(tuning, 'tuning');
  if (tuning.length !== GUITAR_STRING_COUNT) {
    fail('INVALID_STRING_COUNT', `Tuning must define exactly ${GUITAR_STRING_COUNT} strings.`, {
      observed: tuning.length,
    });
  }

  const seenStrings = new Set();
  const normalized = [];
  for (let index = 0; index < tuning.length; index += 1) {
    const path = `tuning[${index}]`;
    const descriptors = exactDataDescriptors(
      tuning[index],
      ['string', 'pitch', 'midi', 'writtenPitch'],
      path,
    );
    if (!Object.hasOwn(descriptors, 'string') || !Object.hasOwn(descriptors, 'pitch')) {
      fail('INVALID_TUNING_ENTRY', `${path} must contain string and pitch.`, { path });
    }

    const string = descriptors.string.value;
    if (!Number.isSafeInteger(string) || string < 1 || string > GUITAR_STRING_COUNT) {
      fail('INVALID_STRING_NUMBER', 'String number must be an integer in the range 1..6.', {
        path,
        string,
      });
    }
    if (seenStrings.has(string)) {
      fail('DUPLICATE_STRING', 'String numbers must be unique.', { path, string });
    }
    seenStrings.add(string);
    if (string !== index + 1) {
      fail('STRING_ORDER_MISMATCH', 'Tuning entries must be ordered explicitly from string 1 through 6.', {
        path,
        expectedString: index + 1,
        observedString: string,
      });
    }

    const pitch = normalizePitch(descriptors.pitch.value, `${path}.pitch`);
    const derivedMidi = spelledPitchToMidi(pitch);
    let midi = derivedMidi;
    if (Object.hasOwn(descriptors, 'midi')) {
      midi = descriptors.midi.value;
      if (!Number.isSafeInteger(midi) || midi < 0 || midi > 127) {
        fail('INVALID_MIDI', `${path}.midi must be an integer in the range 0..127.`, {
          path,
          midi,
        });
      }
      if (midi !== derivedMidi) {
        fail('PITCH_MIDI_MISMATCH', 'Pitch and MIDI must describe the same non-capo open-string pitch.', {
          path,
          pitch,
          midi,
          derivedMidi,
        });
      }
    }

    let writtenPitch = pitch;
    if (Object.hasOwn(descriptors, 'writtenPitch')) {
      writtenPitch = normalizePitch(descriptors.writtenPitch.value, `${path}.writtenPitch`);
      if (writtenPitch !== pitch) {
        fail(
          'WRITTEN_PITCH_MISMATCH',
          'The bounded prototype requires writtenPitch to preserve the exact requested pitch spelling.',
          { path, pitch, writtenPitch },
        );
      }
    }

    normalized.push({ string, pitch, midi, writtenPitch });
  }
  return normalized;
}

export function createGuitarConfiguration(request = {}) {
  const descriptors = exactDataDescriptors(request, ['tuning', 'capoFret'], 'configurationRequest');
  const tuning = Object.hasOwn(descriptors, 'tuning') ? descriptors.tuning.value : STANDARD_REQUEST;
  const capoFret = validateCapoFret(
    Object.hasOwn(descriptors, 'capoFret') ? descriptors.capoFret.value : 0,
  );
  const normalized = normalizeTuning(tuning);
  validatePhysicalBounds(normalized, capoFret);
  const frozenTuning = freezeStrings(normalized);

  return Object.freeze({
    documentType: 'GuitarConfiguration',
    contractVersion: GUITAR_CONFIGURATION_VERSION,
    stringCount: GUITAR_STRING_COUNT,
    preset: derivePreset(frozenTuning),
    capoFret,
    fretSemantics: GUITAR_FRET_SEMANTICS,
    tuning: frozenTuning,
    // Compatibility alias for TUNING-LAB-01 consumers. It is the same frozen array,
    // not a second physical model.
    strings: frozenTuning,
  });
}

export function createGuitarTuningConfiguration(tuning) {
  return createGuitarConfiguration({ tuning, capoFret: 0 });
}

function reconstructNewConfiguration(descriptors) {
  const required = [
    'documentType', 'contractVersion', 'stringCount', 'preset', 'capoFret',
    'fretSemantics', 'tuning', 'strings',
  ];
  if (required.some((field) => !Object.hasOwn(descriptors, field))) {
    fail('INVALID_GUITAR_CONFIGURATION', 'GuitarConfiguration is missing a required field.');
  }
  if (
    descriptors.documentType.value !== 'GuitarConfiguration'
    || descriptors.contractVersion.value !== GUITAR_CONFIGURATION_VERSION
    || descriptors.stringCount.value !== GUITAR_STRING_COUNT
    || descriptors.fretSemantics.value !== GUITAR_FRET_SEMANTICS
  ) {
    fail('INVALID_GUITAR_CONFIGURATION', 'Unsupported GuitarConfiguration header.');
  }
  if (descriptors.tuning.value !== descriptors.strings.value) {
    fail('AMBIGUOUS_FRET_OR_TUNING_SEMANTICS', 'tuning and compatibility strings must reference the same immutable tuning array.');
  }
  const normalized = createGuitarConfiguration({
    tuning: descriptors.tuning.value,
    capoFret: descriptors.capoFret.value,
  });
  if (normalized.preset !== descriptors.preset.value) {
    fail('INVALID_GUITAR_CONFIGURATION', 'Tuning preset provenance does not match the contained tuning.', {
      expectedPreset: normalized.preset,
      observedPreset: descriptors.preset.value,
    });
  }
  return normalized;
}

export function resolveGuitarConfiguration(value = STANDARD_GUITAR_CONFIGURATION) {
  if (Array.isArray(value)) return createGuitarConfiguration({ tuning: value, capoFret: 0 });
  if (!isPlainObject(value)) {
    fail('INVALID_GUITAR_CONFIGURATION', 'Expected a GuitarConfiguration, request object, or tuning array.');
  }

  const keys = Reflect.ownKeys(value);
  if (keys.includes('documentType')) {
    const descriptors = exactDataDescriptors(
      value,
      [
        'documentType', 'contractVersion', 'stringCount', 'preset', 'capoFret',
        'fretSemantics', 'tuning', 'strings',
      ],
      'configuration',
    );
    return reconstructNewConfiguration(descriptors);
  }

  const descriptors = exactDataDescriptors(value, ['tuning', 'capoFret'], 'configurationRequest');
  return createGuitarConfiguration({
    ...(Object.hasOwn(descriptors, 'tuning') ? { tuning: descriptors.tuning.value } : {}),
    ...(Object.hasOwn(descriptors, 'capoFret') ? { capoFret: descriptors.capoFret.value } : {}),
  });
}

export function resolveGuitarTuningConfiguration(value = STANDARD_TUNING_CONFIGURATION) {
  return resolveGuitarConfiguration(value);
}

export function guitarConfigurationToGuitarFacts(value = STANDARD_GUITAR_CONFIGURATION) {
  const configuration = resolveGuitarConfiguration(value);
  return Object.freeze({
    stringCount: GUITAR_STRING_COUNT,
    tuning: Object.freeze(configuration.tuning.map((entry) => Object.freeze({
      string: entry.string,
      pitch: entry.pitch,
      midi: entry.midi,
      writtenPitch: entry.writtenPitch,
      soundingOpenMidi: entry.midi + configuration.capoFret,
    }))),
    capoFret: configuration.capoFret,
    fretSemantics: GUITAR_FRET_SEMANTICS,
  });
}

export function tuningConfigurationToGuitarFacts(value = STANDARD_TUNING_CONFIGURATION) {
  return guitarConfigurationToGuitarFacts(value);
}

export function guitarConfigurationToWorkbenchRequest(value = STANDARD_GUITAR_CONFIGURATION) {
  const configuration = resolveGuitarConfiguration(value);
  return Object.freeze({
    guitar: Object.freeze({
      capoFret: configuration.capoFret,
      tuning: Object.freeze(configuration.tuning.map((entry) => Object.freeze({
        string: entry.string,
        pitch: entry.pitch,
      }))),
    }),
  });
}

// Compatibility helper for TUNING-LAB-01. New callers should use
// guitarConfigurationToWorkbenchRequest so capo provenance cannot be dropped.
export function tuningConfigurationToWorkbenchRequest(value = STANDARD_TUNING_CONFIGURATION) {
  const configuration = resolveGuitarConfiguration(value);
  return Object.freeze({
    guitar: Object.freeze({
      tuning: Object.freeze(configuration.tuning.map((entry) => Object.freeze({
        string: entry.string,
        pitch: entry.pitch,
      }))),
    }),
  });
}

export function withCapo(value, capoFret) {
  const configuration = resolveGuitarConfiguration(value);
  return createGuitarConfiguration({ tuning: configuration.tuning, capoFret });
}

export const STANDARD_GUITAR_CONFIGURATION = createGuitarConfiguration({
  tuning: STANDARD_REQUEST,
  capoFret: 0,
});
export const DROP_D_GUITAR_CONFIGURATION = createGuitarConfiguration({
  tuning: DROP_D_REQUEST,
  capoFret: 0,
});

export const STANDARD_TUNING_CONFIGURATION = STANDARD_GUITAR_CONFIGURATION;
export const DROP_D_TUNING_CONFIGURATION = DROP_D_GUITAR_CONFIGURATION;
