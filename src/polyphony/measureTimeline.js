const MAX_MEASURE_EVENTS = 10_000;
const MAX_TEXT_FIELD_LENGTH = 128;

export class PolyphonyModelError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'PolyphonyModelError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new PolyphonyModelError(code, message, details);
}

function assertPlainObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('INVALID_EVENT', `${label} must be a plain object.`);
  }
}

function requirePositiveInteger(value, field, index) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail('INVALID_DURATION', `${field} must be a positive safe integer.`, {
      index,
      field,
      value,
    });
  }
  return value;
}

function requireBoundedText(value, field, index) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_TEXT_FIELD_LENGTH
  ) {
    fail('INVALID_TEXT_FIELD', `${field} must be a non-empty bounded string.`, {
      index,
      field,
    });
  }
  return value;
}

function normalizeStaff(value, index) {
  const staff = value ?? 1;
  if (!Number.isSafeInteger(staff) || staff <= 0 || staff > 64) {
    fail('INVALID_STAFF', 'staff must be an integer in the range 1..64.', {
      index,
      value,
    });
  }
  return staff;
}

function normalizeBoolean(value) {
  return value === true;
}

function sortNotes(notes) {
  return [...notes].sort(
    (a, b) =>
      a.onset - b.onset ||
      a.staff - b.staff ||
      a.voice.localeCompare(b.voice) ||
      a.end - b.end ||
      a.id.localeCompare(b.id),
  );
}

export function buildSonoritySpans(notes) {
  if (!Array.isArray(notes)) {
    fail('INVALID_NOTES', 'notes must be an array.');
  }

  if (notes.length === 0) {
    return [];
  }

  const boundaries = [...new Set(notes.flatMap((note) => [note.onset, note.end]))].sort(
    (a, b) => a - b,
  );

  const spans = [];
  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    if (end <= start) continue;

    const activeNotes = sortNotes(
      notes.filter((note) => note.onset <= start && note.end > start),
    );

    if (activeNotes.length === 0) continue;

    spans.push({
      start,
      end,
      activeNoteIds: activeNotes.map((note) => note.id),
      activeNotes,
    });
  }

  return spans;
}

export function buildMeasureTimeline(events) {
  if (!Array.isArray(events)) {
    fail('INVALID_EVENTS', 'events must be an array.');
  }

  if (events.length > MAX_MEASURE_EVENTS) {
    fail('MEASURE_EVENT_LIMIT_EXCEEDED', 'measure event limit exceeded.', {
      limit: MAX_MEASURE_EVENTS,
      actual: events.length,
    });
  }

  const notes = [];
  const noteIds = new Set();
  let cursor = 0;
  let furthestCursor = 0;
  let lastAttackOnset = null;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    assertPlainObject(event, `events[${index}]`);

    if (event.type === 'backup') {
      const duration = requirePositiveInteger(event.duration, 'duration', index);
      const nextCursor = cursor - duration;
      if (nextCursor < 0) {
        fail('BACKUP_BEFORE_MEASURE_START', 'backup moves before measure start.', {
          index,
          cursor,
          duration,
        });
      }
      cursor = nextCursor;
      lastAttackOnset = null;
      continue;
    }

    if (event.type === 'forward') {
      const duration = requirePositiveInteger(event.duration, 'duration', index);
      cursor += duration;
      if (!Number.isSafeInteger(cursor)) {
        fail('TIMELINE_OVERFLOW', 'measure cursor exceeds safe integer range.', {
          index,
        });
      }
      furthestCursor = Math.max(furthestCursor, cursor);
      lastAttackOnset = null;
      continue;
    }

    if (event.type !== 'note') {
      fail('UNSUPPORTED_EVENT_TYPE', 'unsupported ordered measure event type.', {
        index,
        type: event.type,
      });
    }

    const id = requireBoundedText(event.id, 'id', index);
    if (noteIds.has(id)) {
      fail('DUPLICATE_NOTE_ID', 'note ids must be unique within a measure.', {
        index,
        id,
      });
    }
    noteIds.add(id);

    const pitch = requireBoundedText(event.pitch, 'pitch', index);
    const voice = requireBoundedText(event.voice ?? '1', 'voice', index);
    const staff = normalizeStaff(event.staff, index);
    const duration = requirePositiveInteger(event.duration, 'duration', index);
    const chord = normalizeBoolean(event.chord);

    if (chord && lastAttackOnset === null) {
      fail('CHORD_WITHOUT_ANCHOR', 'chord note requires a preceding attack note.', {
        index,
        id,
      });
    }

    const onset = chord ? lastAttackOnset : cursor;
    const end = onset + duration;
    if (!Number.isSafeInteger(end)) {
      fail('TIMELINE_OVERFLOW', 'note end exceeds safe integer range.', {
        index,
        id,
      });
    }

    notes.push({
      id,
      pitch,
      voice,
      staff,
      duration,
      onset,
      end,
      chord,
      tieStart: normalizeBoolean(event.tieStart),
      tieStop: normalizeBoolean(event.tieStop),
    });

    if (!chord) {
      lastAttackOnset = onset;
      cursor = end;
      furthestCursor = Math.max(furthestCursor, cursor);
    } else {
      furthestCursor = Math.max(furthestCursor, end);
    }
  }

  const sortedNotes = sortNotes(notes);
  const measureEnd = Math.max(furthestCursor, ...sortedNotes.map((note) => note.end), 0);

  return {
    notes: sortedNotes,
    sonoritySpans: buildSonoritySpans(sortedNotes),
    measureEnd,
  };
}

export const POLYPHONY_MODEL_LIMITS = Object.freeze({
  maxMeasureEvents: MAX_MEASURE_EVENTS,
  maxTextFieldLength: MAX_TEXT_FIELD_LENGTH,
});
