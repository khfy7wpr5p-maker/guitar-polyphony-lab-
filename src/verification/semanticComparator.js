import { parseMusicXmlPartwise } from '../musicxml/partwiseParser.js';
import { buildMeasureTimeline } from '../polyphony/measureTimeline.js';

export const SEMANTIC_SNAPSHOT_DOCUMENT_TYPE = 'GuitarPolyphonySemanticSnapshot';
export const SEMANTIC_SNAPSHOT_CONTRACT_VERSION = '1.0.0';
export const SEMANTIC_COMPARISON_DOCUMENT_TYPE = 'GuitarPolyphonySemanticComparisonReport';
export const SEMANTIC_COMPARISON_CONTRACT_VERSION = '1.0.0';

const MAX_TEXT_LENGTH = 256;
const MAX_MEASURES = 10_000;
const MAX_NOTES_PER_MEASURE = 10_000;
const MAX_SONORITIES_PER_MEASURE = 20_000;
const NOTE_FIELDS = Object.freeze([
  'pitch',
  'onsetDivisions',
  'durationDivisions',
  'voice',
  'staff',
  'tieStart',
  'tieStop',
]);

export class SemanticComparatorError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'SemanticComparatorError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new SemanticComparatorError(code, message, details);
}

function plainObject(value, field) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('INVALID_SEMANTIC_VALUE', `${field} must be a plain object.`, { field });
  }
  return value;
}

function boundedText(value, field) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_TEXT_LENGTH) {
    fail('INVALID_SEMANTIC_VALUE', `${field} must be a bounded non-empty string.`, { field });
  }
  return value;
}

function nonNegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) {
    fail('INVALID_SEMANTIC_VALUE', `${field} must be a non-negative safe integer.`, {
      field,
      value,
    });
  }
  return value;
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0 || Object.is(value, -0)) {
    fail('INVALID_SEMANTIC_VALUE', `${field} must be a positive safe integer.`, {
      field,
      value,
    });
  }
  return value;
}

function booleanValue(value, field) {
  if (typeof value !== 'boolean') {
    fail('INVALID_SEMANTIC_VALUE', `${field} must be boolean.`, { field });
  }
  return value;
}

function immutable(value) {
  if (Array.isArray(value)) {
    value.forEach(immutable);
    return Object.freeze(value);
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach(immutable);
    return Object.freeze(value);
  }
  return value;
}

function sourceNoteIndexByLabNoteId(events) {
  const indexes = new Map();
  let sourceNoteIndex = 0;

  for (const event of events) {
    if (event.type === 'note') {
      indexes.set(event.id, sourceNoteIndex);
      sourceNoteIndex += 1;
    } else if (event.type === 'forward' && event.sourceKind === 'rest') {
      sourceNoteIndex += 1;
    }
  }

  return indexes;
}

function canonicalSonorities(notes) {
  if (notes.length === 0) return [];

  const boundaries = [...new Set(notes.flatMap((note) => [
    note.onsetDivisions,
    note.onsetDivisions + note.durationDivisions,
  ]))].sort((a, b) => a - b);

  const sonorities = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startDivisions = boundaries[index];
    const endDivisions = boundaries[index + 1];
    if (endDivisions <= startDivisions) continue;

    const activeSourceNoteIndexes = notes
      .filter((note) => (
        note.onsetDivisions <= startDivisions
        && note.onsetDivisions + note.durationDivisions > startDivisions
      ))
      .map((note) => note.sourceNoteIndex)
      .sort((a, b) => a - b);

    if (activeSourceNoteIndexes.length === 0) continue;
    sonorities.push({ startDivisions, endDivisions, activeSourceNoteIndexes });
  }

  return sonorities;
}

function peakPolyphony(sonorities) {
  return sonorities.reduce(
    (maximum, sonority) => Math.max(maximum, sonority.activeSourceNoteIndexes.length),
    0,
  );
}

function makeSnapshot(producer, partId, measures) {
  return immutable({
    documentType: SEMANTIC_SNAPSHOT_DOCUMENT_TYPE,
    contractVersion: SEMANTIC_SNAPSHOT_CONTRACT_VERSION,
    producer,
    partId,
    measures,
  });
}

export function buildLabSemanticSnapshot(input, options = {}) {
  const parsed = parseMusicXmlPartwise(input, options);
  const requestedPartId = options.partId ?? null;
  let part;

  if (requestedPartId !== null) {
    boundedText(requestedPartId, 'options.partId');
    part = parsed.parts.find((candidate) => candidate.id === requestedPartId);
    if (!part) {
      fail('PART_NOT_FOUND', 'Requested MusicXML part was not found.', { partId: requestedPartId });
    }
  } else if (parsed.parts.length === 1) {
    [part] = parsed.parts;
  } else {
    fail('PART_SELECTION_REQUIRED', 'partId is required when MusicXML contains multiple parts.', {
      partCount: parsed.parts.length,
    });
  }

  const measures = part.measures.map((measure, measureIndex) => {
    const timeline = buildMeasureTimeline(measure.events);
    const sourceIndexes = sourceNoteIndexByLabNoteId(measure.events);
    const notes = timeline.notes.map((note) => {
      const sourceNoteIndex = sourceIndexes.get(note.id);
      if (sourceNoteIndex === undefined) {
        fail('LAB_SOURCE_IDENTITY_MISSING', 'P0 note is missing its P1B source identity.', {
          partId: part.id,
          measureIndex,
          noteId: note.id,
        });
      }
      return {
        sourceNoteIndex,
        pitch: note.pitch,
        onsetDivisions: note.onset,
        durationDivisions: note.duration,
        voice: note.voice,
        staff: note.staff,
        tieStart: note.tieStart,
        tieStop: note.tieStop,
      };
    }).sort((a, b) => a.sourceNoteIndex - b.sourceNoteIndex);

    const sonorities = canonicalSonorities(notes);
    return {
      measureIndex,
      measureNumber: measure.number,
      notes,
      sonorities,
      peakPolyphony: peakPolyphony(sonorities),
    };
  });

  return makeSnapshot('guitar-polyphony-lab', part.id, measures);
}

export function adaptEnginePolyphonicSourceModel(model) {
  plainObject(model, 'engineModel');
  if (model.documentType !== 'PolyphonicSourceModel' || model.contractVersion !== '1.0.0') {
    fail(
      'UNSUPPORTED_ENGINE_SOURCE_MODEL',
      'Engine evidence must be PolyphonicSourceModel 1.0.0.',
      { documentType: model.documentType, contractVersion: model.contractVersion },
    );
  }

  plainObject(model.source, 'engineModel.source');
  const partId = boundedText(model.source.partId, 'engineModel.source.partId');
  if (!Array.isArray(model.measures) || model.measures.length > MAX_MEASURES) {
    fail('INVALID_ENGINE_SOURCE_MODEL', 'engineModel.measures must be a bounded array.');
  }

  const measures = model.measures.map((measure, measureArrayIndex) => {
    plainObject(measure, `engineModel.measures[${measureArrayIndex}]`);
    const measureIndex = nonNegativeInteger(
      measure.index,
      `engineModel.measures[${measureArrayIndex}].index`,
    );
    const measureNumber = boundedText(
      measure.number,
      `engineModel.measures[${measureArrayIndex}].number`,
    );
    if (!Array.isArray(measure.events) || measure.events.length > MAX_NOTES_PER_MEASURE) {
      fail('INVALID_ENGINE_SOURCE_MODEL', 'Engine measure events must be a bounded array.', {
        measureIndex,
      });
    }

    const notes = [];
    for (let eventIndex = 0; eventIndex < measure.events.length; eventIndex += 1) {
      const event = plainObject(
        measure.events[eventIndex],
        `engineModel.measures[${measureArrayIndex}].events[${eventIndex}]`,
      );
      if (event.type === 'rest') continue;
      if (event.type !== 'note') {
        fail('INVALID_ENGINE_SOURCE_MODEL', 'Engine event type must be note or rest.', {
          measureIndex,
          eventIndex,
          type: event.type,
        });
      }
      const source = plainObject(event.source, `engineEvent[${eventIndex}].source`);
      if (source.partId !== partId || source.measureIndex !== measureIndex) {
        fail('ENGINE_PROVENANCE_MISMATCH', 'Engine source provenance disagrees with containment.', {
          measureIndex,
          eventIndex,
        });
      }
      const sourceNoteIndex = nonNegativeInteger(
        source.noteIndex,
        `engineEvent[${eventIndex}].source.noteIndex`,
      );
      const pitch = plainObject(event.pitch, `engineEvent[${eventIndex}].pitch`);
      notes.push({
        sourceNoteIndex,
        pitch: boundedText(pitch.written, `engineEvent[${eventIndex}].pitch.written`),
        onsetDivisions: nonNegativeInteger(
          event.onsetDivisions,
          `engineEvent[${eventIndex}].onsetDivisions`,
        ),
        durationDivisions: positiveInteger(
          event.durationDivisions,
          `engineEvent[${eventIndex}].durationDivisions`,
        ),
        voice: boundedText(event.voice, `engineEvent[${eventIndex}].voice`),
        staff: positiveInteger(event.staff, `engineEvent[${eventIndex}].staff`),
        tieStart: booleanValue(event.tieStart, `engineEvent[${eventIndex}].tieStart`),
        tieStop: booleanValue(event.tieStop, `engineEvent[${eventIndex}].tieStop`),
      });
    }

    notes.sort((a, b) => a.sourceNoteIndex - b.sourceNoteIndex);
    for (let index = 1; index < notes.length; index += 1) {
      if (notes[index - 1].sourceNoteIndex === notes[index].sourceNoteIndex) {
        fail('DUPLICATE_SOURCE_NOTE_IDENTITY', 'Engine snapshot contains duplicate source note identity.', {
          measureIndex,
          sourceNoteIndex: notes[index].sourceNoteIndex,
        });
      }
    }

    const sonorities = canonicalSonorities(notes);
    if (sonorities.length > MAX_SONORITIES_PER_MEASURE) {
      fail('SEMANTIC_SONORITY_LIMIT_EXCEEDED', 'Derived sonority count exceeds comparator limit.', {
        measureIndex,
      });
    }
    return {
      measureIndex,
      measureNumber,
      notes,
      sonorities,
      peakPolyphony: peakPolyphony(sonorities),
    };
  });

  measures.sort((a, b) => a.measureIndex - b.measureIndex);
  return makeSnapshot('musicxml-to-guitar-tab-engine', partId, measures);
}

function validateSnapshot(snapshot, label) {
  plainObject(snapshot, label);
  if (
    snapshot.documentType !== SEMANTIC_SNAPSHOT_DOCUMENT_TYPE
    || snapshot.contractVersion !== SEMANTIC_SNAPSHOT_CONTRACT_VERSION
  ) {
    fail('UNSUPPORTED_SEMANTIC_SNAPSHOT', `${label} has an unsupported semantic snapshot contract.`);
  }
  boundedText(snapshot.producer, `${label}.producer`);
  boundedText(snapshot.partId, `${label}.partId`);
  if (!Array.isArray(snapshot.measures) || snapshot.measures.length > MAX_MEASURES) {
    fail('INVALID_SEMANTIC_SNAPSHOT', `${label}.measures must be a bounded array.`);
  }
  return snapshot;
}

function mismatch(code, location, extra = {}) {
  return { code, ...location, ...extra };
}

function mapBy(items, key, context) {
  const map = new Map();
  for (const item of items) {
    const value = item[key];
    if (map.has(value)) {
      fail('DUPLICATE_SEMANTIC_IDENTITY', `Duplicate ${key} in semantic snapshot.`, {
        ...context,
        key,
        value,
      });
    }
    map.set(value, item);
  }
  return map;
}

function sonorityKey(sonority) {
  return `${sonority.startDivisions}:${sonority.endDivisions}`;
}

export function compareSemanticSnapshots(referenceSnapshot, candidateSnapshot) {
  const reference = validateSnapshot(referenceSnapshot, 'referenceSnapshot');
  const candidate = validateSnapshot(candidateSnapshot, 'candidateSnapshot');
  const mismatches = [];

  if (reference.partId !== candidate.partId) {
    mismatches.push(mismatch('PART_ID_MISMATCH', {}, {
      expected: reference.partId,
      actual: candidate.partId,
    }));
  }

  const referenceMeasures = mapBy(reference.measures, 'measureIndex', { side: 'reference' });
  const candidateMeasures = mapBy(candidate.measures, 'measureIndex', { side: 'candidate' });
  const measureIndexes = [...new Set([...referenceMeasures.keys(), ...candidateMeasures.keys()])]
    .sort((a, b) => a - b);

  let comparedNotes = 0;
  let comparedMeasures = 0;

  for (const measureIndex of measureIndexes) {
    const referenceMeasure = referenceMeasures.get(measureIndex);
    const candidateMeasure = candidateMeasures.get(measureIndex);
    if (!referenceMeasure) {
      mismatches.push(mismatch('UNEXPECTED_MEASURE', { measureIndex }));
      continue;
    }
    if (!candidateMeasure) {
      mismatches.push(mismatch('MISSING_MEASURE', { measureIndex }));
      continue;
    }
    comparedMeasures += 1;

    if (referenceMeasure.measureNumber !== candidateMeasure.measureNumber) {
      mismatches.push(mismatch('MEASURE_NUMBER_MISMATCH', { measureIndex }, {
        expected: referenceMeasure.measureNumber,
        actual: candidateMeasure.measureNumber,
      }));
    }

    const referenceNotes = mapBy(referenceMeasure.notes, 'sourceNoteIndex', {
      side: 'reference',
      measureIndex,
    });
    const candidateNotes = mapBy(candidateMeasure.notes, 'sourceNoteIndex', {
      side: 'candidate',
      measureIndex,
    });
    const noteIndexes = [...new Set([...referenceNotes.keys(), ...candidateNotes.keys()])]
      .sort((a, b) => a - b);

    for (const sourceNoteIndex of noteIndexes) {
      const referenceNote = referenceNotes.get(sourceNoteIndex);
      const candidateNote = candidateNotes.get(sourceNoteIndex);
      if (!referenceNote) {
        mismatches.push(mismatch('UNEXPECTED_NOTE', { measureIndex, sourceNoteIndex }));
        continue;
      }
      if (!candidateNote) {
        mismatches.push(mismatch('MISSING_NOTE', { measureIndex, sourceNoteIndex }));
        continue;
      }
      comparedNotes += 1;
      for (const field of NOTE_FIELDS) {
        if (referenceNote[field] !== candidateNote[field]) {
          mismatches.push(mismatch('NOTE_FIELD_MISMATCH', { measureIndex, sourceNoteIndex }, {
            field,
            expected: referenceNote[field],
            actual: candidateNote[field],
          }));
        }
      }
    }

    if (referenceMeasure.peakPolyphony !== candidateMeasure.peakPolyphony) {
      mismatches.push(mismatch('PEAK_POLYPHONY_MISMATCH', { measureIndex }, {
        expected: referenceMeasure.peakPolyphony,
        actual: candidateMeasure.peakPolyphony,
      }));
    }

    const referenceSonorities = mapBy(referenceMeasure.sonorities, 'startDivisions', {
      side: 'reference',
      measureIndex,
    });
    const candidateSonorities = mapBy(candidateMeasure.sonorities, 'startDivisions', {
      side: 'candidate',
      measureIndex,
    });
    const sonorityStarts = [...new Set([
      ...referenceSonorities.keys(),
      ...candidateSonorities.keys(),
    ])].sort((a, b) => a - b);

    for (const startDivisions of sonorityStarts) {
      const referenceSonority = referenceSonorities.get(startDivisions);
      const candidateSonority = candidateSonorities.get(startDivisions);
      if (!referenceSonority) {
        mismatches.push(mismatch('UNEXPECTED_SONORITY', { measureIndex, startDivisions }));
        continue;
      }
      if (!candidateSonority) {
        mismatches.push(mismatch('MISSING_SONORITY', { measureIndex, startDivisions }));
        continue;
      }

      if (
        referenceSonority.endDivisions !== candidateSonority.endDivisions
        || sonorityKey(referenceSonority) !== sonorityKey(candidateSonority)
        || referenceSonority.activeSourceNoteIndexes.length
          !== candidateSonority.activeSourceNoteIndexes.length
        || referenceSonority.activeSourceNoteIndexes.some(
          (value, index) => value !== candidateSonority.activeSourceNoteIndexes[index],
        )
      ) {
        mismatches.push(mismatch('SONORITY_MISMATCH', { measureIndex, startDivisions }, {
          expected: {
            endDivisions: referenceSonority.endDivisions,
            activeSourceNoteIndexes: [...referenceSonority.activeSourceNoteIndexes],
          },
          actual: {
            endDivisions: candidateSonority.endDivisions,
            activeSourceNoteIndexes: [...candidateSonority.activeSourceNoteIndexes],
          },
        }));
      }
    }
  }

  return immutable({
    documentType: SEMANTIC_COMPARISON_DOCUMENT_TYPE,
    contractVersion: SEMANTIC_COMPARISON_CONTRACT_VERSION,
    referenceProducer: reference.producer,
    candidateProducer: candidate.producer,
    partId: reference.partId,
    equal: mismatches.length === 0,
    comparedMeasures,
    comparedNotes,
    mismatchCount: mismatches.length,
    mismatches,
  });
}
