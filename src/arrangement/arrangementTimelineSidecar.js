import { types as utilTypes } from 'node:util';

import { buildMeasureTimeline } from '../polyphony/measureTimeline.js';
import { spelledPitchToMidi } from '../guitar/fretboardCandidates.js';

const { isProxy } = utilTypes;

export const ARRANGEMENT_TIMELINE_SIDECAR_VERSION = '1.0.0';
export const ARRANGEMENT_TIMELINE_SIDECAR_DOCUMENT_TYPE = 'ArrangementTimelineSidecar';

const MAX_EVENTS = 4096;
const MAX_ID_LENGTH = 256;

export class ArrangementTimelineSidecarError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ArrangementTimelineSidecarError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new ArrangementTimelineSidecarError(code, message, details);
}

function plainObject(value, path) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail('INVALID_A2C_TIMELINE_INPUT', `${path} must be a non-proxy plain object.`, { path });
  }
  return value;
}

function denseArray(value, path, maxLength) {
  if (
    !Array.isArray(value)
    || isProxy(value)
    || Object.getPrototypeOf(value) !== Array.prototype
    || value.length > maxLength
  ) {
    fail('INVALID_A2C_TIMELINE_INPUT', `${path} must be a bounded native array.`, {
      path,
      maxLength,
    });
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      fail('INVALID_A2C_TIMELINE_INPUT', `${path} must be dense.`, { path, index });
    }
  }
  return value;
}

function boundedId(value, path) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ID_LENGTH) {
    fail('INVALID_A2C_TIMELINE_ID', `${path} must be a bounded non-empty string.`, { path });
  }
  return value;
}

function normalizeExplicitMap(value) {
  if (value === undefined) return Object.freeze(Object.create(null));
  plainObject(value, 'options.sourceEventIdToP0NoteId');
  const output = Object.create(null);
  for (const key of Object.keys(value).sort()) {
    const sourceEventId = boundedId(key, 'options.sourceEventIdToP0NoteId key');
    output[sourceEventId] = boundedId(
      value[key],
      `options.sourceEventIdToP0NoteId.${sourceEventId}`,
    );
  }
  return Object.freeze(output);
}

function buildP0Index(parsedPart) {
  plainObject(parsedPart, 'parsedPart');
  const measures = denseArray(parsedPart.measures, 'parsedPart.measures', 10_000);
  const noteIndex = new Map();
  const measureRecords = [];

  for (let measureOffset = 0; measureOffset < measures.length; measureOffset += 1) {
    const measure = plainObject(measures[measureOffset], `parsedPart.measures[${measureOffset}]`);
    if (!Number.isSafeInteger(measure.divisions) || measure.divisions <= 0) {
      fail('INVALID_A2C_DIVISIONS', 'Parsed measure divisions must be a positive safe integer.', {
        measureIndex: measureOffset + 1,
      });
    }
    const events = denseArray(
      measure.events,
      `parsedPart.measures[${measureOffset}].events`,
      10_000,
    );
    const timeline = buildMeasureTimeline(events);
    const record = Object.freeze({
      measureIndex: measureOffset + 1,
      measureNumber: String(measure.number ?? measureOffset + 1),
      divisions: measure.divisions,
      measureEndDivisions: timeline.measureEnd,
    });
    measureRecords.push(record);

    for (const note of timeline.notes) {
      if (noteIndex.has(note.id)) {
        fail('DUPLICATE_P0_NOTE_ID', 'P0 note IDs must be unique across the parsed part.', {
          noteId: note.id,
        });
      }
      noteIndex.set(note.id, Object.freeze({
        noteId: note.id,
        pitch: note.pitch,
        midi: spelledPitchToMidi(note.pitch),
        voice: note.voice,
        staff: note.staff,
        measureIndex: record.measureIndex,
        measureNumber: record.measureNumber,
        divisions: record.divisions,
        onsetDivisions: note.onset,
        durationDivisions: note.duration,
        endDivisions: note.end,
        tieStart: note.tieStart === true,
        tieStop: note.tieStop === true,
      }));
    }
  }

  return Object.freeze({
    noteIndex,
    measures: Object.freeze(measureRecords),
  });
}

function verifySourceFact(sourceEvent, p0Note) {
  if (sourceEvent.midi !== p0Note.midi) {
    fail('A2C_SOURCE_PITCH_MISMATCH', 'Arrangement source MIDI disagrees with P0 timing evidence.', {
      sourceEventId: sourceEvent.sourceEventId,
      sourceMidi: sourceEvent.midi,
      p0Midi: p0Note.midi,
      p0NoteId: p0Note.noteId,
    });
  }
  if (String(sourceEvent.voice) !== String(p0Note.voice)) {
    fail('A2C_SOURCE_VOICE_MISMATCH', 'Arrangement source voice disagrees with P0 timing evidence.', {
      sourceEventId: sourceEvent.sourceEventId,
      sourceVoice: sourceEvent.voice,
      p0Voice: p0Note.voice,
      p0NoteId: p0Note.noteId,
    });
  }
  if (sourceEvent.staff !== p0Note.staff) {
    fail('A2C_SOURCE_STAFF_MISMATCH', 'Arrangement source staff disagrees with P0 timing evidence.', {
      sourceEventId: sourceEvent.sourceEventId,
      sourceStaff: sourceEvent.staff,
      p0Staff: p0Note.staff,
      p0NoteId: p0Note.noteId,
    });
  }
}

export function buildArrangementTimelineSidecar(parsedPart, source, options = {}) {
  plainObject(source, 'source');
  plainObject(options, 'options');
  const sourceEvents = denseArray(source.events, 'source.events', MAX_EVENTS);
  const explicitMap = normalizeExplicitMap(options.sourceEventIdToP0NoteId);
  const p0 = buildP0Index(parsedPart);

  const entries = [];
  const unresolvedSourceEventIds = [];
  const usedP0NoteIds = new Set();
  const seenSourceIds = new Set();

  for (let index = 0; index < sourceEvents.length; index += 1) {
    const event = plainObject(sourceEvents[index], `source.events[${index}]`);
    const sourceEventId = boundedId(event.sourceEventId, `source.events[${index}].sourceEventId`);
    if (seenSourceIds.has(sourceEventId)) {
      fail('DUPLICATE_SOURCE_EVENT_ID', 'Arrangement source event IDs must be unique.', { sourceEventId });
    }
    seenSourceIds.add(sourceEventId);

    const explicitNoteId = explicitMap[sourceEventId];
    const p0NoteId = explicitNoteId ?? sourceEventId;
    const p0Note = p0.noteIndex.get(p0NoteId);
    if (!p0Note) {
      unresolvedSourceEventIds.push(sourceEventId);
      continue;
    }
    if (usedP0NoteIds.has(p0NoteId)) {
      fail('A2C_P0_NOTE_REUSED', 'One P0 note cannot authorize timing for multiple source events.', {
        p0NoteId,
        sourceEventId,
      });
    }
    usedP0NoteIds.add(p0NoteId);
    verifySourceFact(event, p0Note);

    entries.push(Object.freeze({
      sourceEventId,
      p0NoteId,
      matchBasis: explicitNoteId ? 'EXPLICIT_SOURCE_TO_P0_MAP' : 'EXACT_IDENTITY',
      midi: p0Note.midi,
      voice: String(p0Note.voice),
      staff: p0Note.staff,
      measureIndex: p0Note.measureIndex,
      measureNumber: p0Note.measureNumber,
      divisions: p0Note.divisions,
      onsetDivisions: p0Note.onsetDivisions,
      durationDivisions: p0Note.durationDivisions,
      endDivisions: p0Note.endDivisions,
      tieStart: p0Note.tieStart,
      tieStop: p0Note.tieStop,
    }));
  }

  entries.sort((left, right) => left.sourceEventId.localeCompare(right.sourceEventId));
  unresolvedSourceEventIds.sort();

  const complete = unresolvedSourceEventIds.length === 0;
  return Object.freeze({
    documentType: ARRANGEMENT_TIMELINE_SIDECAR_DOCUMENT_TYPE,
    contractVersion: ARRANGEMENT_TIMELINE_SIDECAR_VERSION,
    authority: 'P0_DERIVED_SOURCE_TIMING_EVIDENCE',
    productionAuthority: false,
    sourceTimingAuthority: complete,
    targetTimingAuthority: false,
    status: complete ? 'COMPLETE' : 'PARTIAL',
    partId: String(parsedPart.id ?? source.partId ?? ''),
    entryCount: entries.length,
    unresolvedCount: unresolvedSourceEventIds.length,
    entries: Object.freeze(entries),
    unresolvedSourceEventIds: Object.freeze(unresolvedSourceEventIds),
    measures: p0.measures,
    matchingPolicy: Object.freeze({
      exactIdentityAllowed: true,
      explicitMapAllowed: true,
      pitchOnlyGuessingAllowed: false,
      voiceStaffPitchFactsMustMatch: true,
    }),
  });
}
