import {
  GUITAR_FRET_SEMANTICS,
  RESEARCH_MAX_CAPO_FRET,
  createGuitarConfiguration,
  resolveGuitarConfiguration,
  spelledPitchToMidi,
} from '../guitar/tuningConfiguration.js';
import { positionToMidi } from '../guitar/fretboardCandidates.js';
import {
  parseStaffTuningFragment,
  serializeStaffTuning,
} from './staffTuningSerializer.js';

export class GuitarConfigurationSerializationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'GuitarConfigurationSerializationError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new GuitarConfigurationSerializationError(code, message, details);
}

function validateBoundedXml(xml, path) {
  if (typeof xml !== 'string' || xml.length === 0 || xml.length > 32_768) {
    fail('INVALID_GUITAR_CONFIGURATION_XML', `${path} must be a bounded XML string.`);
  }
  if (/<!DOCTYPE|<!ENTITY|<xi:include\b/i.test(xml)) {
    fail('INVALID_GUITAR_CONFIGURATION_XML', 'DTD, entity and XInclude syntax is not accepted.');
  }
}

export function serializeStaffConfiguration(guitarConfiguration) {
  const configuration = resolveGuitarConfiguration(guitarConfiguration);
  const tuningOnly = serializeStaffTuning(configuration);
  const closing = '</staff-details>';
  const offset = tuningOnly.lastIndexOf(closing);
  if (offset < 0) {
    fail('INTERNAL_STAFF_CONFIGURATION_SERIALIZATION_FAILURE', 'staff-details closing tag is missing.');
  }
  return [
    tuningOnly.slice(0, offset).trimEnd(),
    `<capo>${configuration.capoFret}</capo>`,
    closing,
  ].join('\n');
}

export function parseStaffConfigurationFragment(xml) {
  validateBoundedXml(xml, 'staffConfigurationXml');
  const capoOpenTags = [...xml.matchAll(/<capo(?:\s|>)/g)];
  const capoMatches = [...xml.matchAll(/<capo>([^<]+)<\/capo>/g)];
  if (capoOpenTags.length !== capoMatches.length || capoMatches.length > 1) {
    fail('INVALID_CAPO_XML', 'MusicXML staff-details may contain at most one plain capo element.');
  }

  let capoFret = 0;
  if (capoMatches.length === 1) {
    const text = capoMatches[0][1].trim();
    if (!/^(?:0|[1-9]\d*)$/.test(text)) {
      fail('INVALID_CAPO_XML', 'MusicXML capo must be a non-negative integer.', { value: text });
    }
    capoFret = Number(text);
    if (!Number.isSafeInteger(capoFret) || capoFret > RESEARCH_MAX_CAPO_FRET) {
      fail('INVALID_CAPO_XML', 'MusicXML capo exceeds the bounded research fretboard.', {
        capoFret,
        maximumCapoFret: RESEARCH_MAX_CAPO_FRET,
      });
    }
  }

  const tuningConfiguration = parseStaffTuningFragment(xml);
  return createGuitarConfiguration({
    tuning: tuningConfiguration.tuning,
    capoFret,
  });
}

export function serializeTechnicalPosition(position, guitarConfiguration, expectedPitch = null) {
  const configuration = resolveGuitarConfiguration(guitarConfiguration);
  let midi;
  try {
    midi = positionToMidi(position, configuration);
  } catch (error) {
    fail('INVALID_TECHNICAL_POSITION', 'Position is invalid for the target GuitarConfiguration.', {
      causeCode: error?.code || null,
    });
  }
  if (expectedPitch !== null) {
    if (typeof expectedPitch !== 'string' || spelledPitchToMidi(expectedPitch) !== midi) {
      fail('TECHNICAL_POSITION_PITCH_MISMATCH', 'Technical position does not round-trip to source pitch.', {
        expectedPitch,
        observedMidi: midi,
      });
    }
  }
  return [
    '<technical>',
    `<string>${position.string}</string>`,
    // In this prototype, MusicXML fret is deliberately the solver's relative-from-capo fret.
    `<fret>${position.fret}</fret>`,
    '</technical>',
  ].join('');
}

export function parseTechnicalPositionFragment(xml, guitarConfiguration, expectedPitch = null) {
  validateBoundedXml(xml, 'technicalPositionXml');
  const match = /^<technical><string>([1-6])<\/string><fret>(0|[1-9]\d*)<\/fret><\/technical>$/.exec(xml);
  if (!match) {
    fail('INVALID_TECHNICAL_POSITION_XML', 'Expected one deterministic string/fret technical fragment.');
  }
  const position = Object.freeze({ string: Number(match[1]), fret: Number(match[2]) });
  const configuration = resolveGuitarConfiguration(guitarConfiguration);
  const midi = positionToMidi(position, configuration);
  if (expectedPitch !== null && midi !== spelledPitchToMidi(expectedPitch)) {
    fail('TECHNICAL_POSITION_PITCH_MISMATCH', 'Parsed technical position does not match source pitch.', {
      expectedPitch,
      observedMidi: midi,
    });
  }
  return Object.freeze({
    ...position,
    fretSemantics: GUITAR_FRET_SEMANTICS,
    absoluteFret: configuration.capoFret + position.fret,
    midi,
  });
}
