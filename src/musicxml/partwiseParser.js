import { SaxesParser } from 'saxes';

import { gateMusicXmlInput } from './inputGate.js';

const MAX_ELEMENT_DEPTH = 128;
const MAX_PARTS = 64;
const MAX_MEASURES_PER_PART = 10_000;
const MAX_EVENTS_PER_MEASURE = 10_000;
const MAX_CAPTURE_LENGTH = 256;
const MAX_SOURCE_TEXT_LENGTH = 128;

export class MusicXmlParseError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'MusicXmlParseError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new MusicXmlParseError(code, message, details);
}

function attr(node, name) {
  const value = node?.attributes?.[name];
  if (typeof value === 'string') return value;
  if (value && typeof value.value === 'string') return value.value;
  return undefined;
}

function requireBoundedText(value, field, details = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length === 0 || text.length > MAX_SOURCE_TEXT_LENGTH) {
    fail('INVALID_TEXT_FIELD', `${field} must be a non-empty bounded string.`, {
      ...details,
      field,
    });
  }
  return text;
}

function parsePositiveInteger(value, field, details = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^[0-9]+$/.test(text)) {
    fail('INVALID_POSITIVE_INTEGER', `${field} must be a positive integer.`, {
      ...details,
      field,
      value: text,
    });
  }
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    fail('INVALID_POSITIVE_INTEGER', `${field} must be a positive safe integer.`, {
      ...details,
      field,
      value: text,
    });
  }
  return parsed;
}

function parseStaff(value, details = {}) {
  const staff = parsePositiveInteger(value, 'staff', details);
  if (staff > 64) {
    fail('INVALID_STAFF', 'staff must be in the range 1..64.', {
      ...details,
      value: staff,
    });
  }
  return staff;
}

function parseAlter(value, details = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^-?[0-9]+$/.test(text)) {
    fail('UNSUPPORTED_ALTER', 'P1B supports only integer pitch alterations.', {
      ...details,
      value: text,
    });
  }
  const alter = Number(text);
  if (!Number.isSafeInteger(alter) || alter < -2 || alter > 2) {
    fail('UNSUPPORTED_ALTER', 'P1B supports pitch alterations in the range -2..2.', {
      ...details,
      value: text,
    });
  }
  return alter;
}

function parseOctave(value, details = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^[0-9]+$/.test(text)) {
    fail('INVALID_OCTAVE', 'octave must be an integer in the range 0..9.', {
      ...details,
      value: text,
    });
  }
  const octave = Number(text);
  if (!Number.isSafeInteger(octave) || octave < 0 || octave > 9) {
    fail('INVALID_OCTAVE', 'octave must be an integer in the range 0..9.', {
      ...details,
      value: text,
    });
  }
  return octave;
}

function formatPitch(step, alter, octave, details = {}) {
  const normalizedStep = typeof step === 'string' ? step.trim().toUpperCase() : '';
  if (!/^[A-G]$/.test(normalizedStep)) {
    fail('INVALID_PITCH_STEP', 'pitch step must be A..G.', {
      ...details,
      value: step,
    });
  }

  const suffix =
    alter === -2 ? 'bb' : alter === -1 ? 'b' : alter === 1 ? '#' : alter === 2 ? '##' : '';
  return `${normalizedStep}${suffix}${octave}`;
}

function closeName(node) {
  if (typeof node === 'string') return node;
  if (node && typeof node.name === 'string') return node.name;
  fail('PARSER_EVENT_SHAPE', 'Parser emitted an unsupported closing-tag event shape.');
}

function freezeResult(parts, byteLength, version) {
  for (const part of parts) {
    for (const measure of part.measures) {
      Object.freeze(measure.events);
      Object.freeze(measure);
    }
    Object.freeze(part.measures);
    Object.freeze(part);
  }
  Object.freeze(parts);
  return Object.freeze({
    rootKind: 'score-partwise',
    byteLength,
    musicXmlVersion: version ?? null,
    parts,
  });
}

export function parseMusicXmlPartwise(input, options = {}) {
  const gated = gateMusicXmlInput(input, options);
  const parts = [];
  const stack = [];

  let rootVersion;
  let xmlDeclarationVersion;
  let currentPart = null;
  let currentMeasure = null;
  let currentNote = null;
  let currentMove = null;
  let capture = null;
  let firstParserFailure = null;

  function context() {
    return {
      partIndex: currentPart?.index,
      measureIndex: currentMeasure?.index,
      noteOrdinal: currentNote?.ordinal,
    };
  }

  function recordParserFailure(code, message, details = {}) {
    if (firstParserFailure === null) {
      firstParserFailure = new MusicXmlParseError(code, message, details);
    }
  }

  function parserHasFailed() {
    return firstParserFailure !== null;
  }

  function beginCapture(target, field, tag) {
    if (capture !== null) {
      fail('NESTED_CAPTURE', 'Relevant MusicXML text fields may not nest.', {
        ...context(),
        field,
      });
    }
    capture = { target, field, tag, text: '' };
  }

  function setOnce(target, field, value) {
    if (target[field] !== undefined && target[field] !== null) {
      fail('DUPLICATE_SEMANTIC_FIELD', `Duplicate ${field} field is not supported.`, {
        ...context(),
        field,
      });
    }
    target[field] = value;
  }

  function appendEvent(event) {
    if (!currentMeasure) {
      fail('EVENT_OUTSIDE_MEASURE', 'Timed MusicXML event occurred outside a measure.');
    }
    if (currentMeasure.events.length >= MAX_EVENTS_PER_MEASURE) {
      fail('MEASURE_EVENT_LIMIT_EXCEEDED', 'Parsed measure event limit exceeded.', {
        ...context(),
        limit: MAX_EVENTS_PER_MEASURE,
      });
    }
    currentMeasure.events.push(event);
  }

  function finishCapture(name) {
    if (!capture || capture.tag !== name) return;
    const { target, field, text } = capture;
    capture = null;

    if (field === 'duration' || field === 'divisions') {
      setOnce(target, field, parsePositiveInteger(text, field, context()));
      return;
    }
    if (field === 'staff') {
      setOnce(target, field, parseStaff(text, context()));
      return;
    }
    if (field === 'alter') {
      setOnce(target, field, parseAlter(text, context()));
      return;
    }
    if (field === 'octave') {
      setOnce(target, field, parseOctave(text, context()));
      return;
    }
    setOnce(target, field, requireBoundedText(text, field, context()));
  }

  const parser = new SaxesParser({
    xmlns: false,
    fragment: false,
    position: true,
    defaultXMLVersion: '1.0',
  });

  parser.on('error', (error) => {
    recordParserFailure('MALFORMED_XML', 'MusicXML is not well-formed XML.', {
      line: parser.line,
      column: parser.column,
      cause: error instanceof Error ? error.message : String(error),
    });
  });

  parser.on('doctype', () => {
    recordParserFailure(
      'PARSER_DOCTYPE_REACHED',
      'DOCTYPE reached the parser despite the input gate.',
    );
  });

  parser.on('opentag', (node) => {
    if (parserHasFailed()) return;

    const name = node.name;
    const parent = stack.at(-1) ?? null;
    stack.push(name);

    if (stack.length > MAX_ELEMENT_DEPTH) {
      fail('ELEMENT_DEPTH_LIMIT_EXCEEDED', 'MusicXML element depth limit exceeded.', {
        limit: MAX_ELEMENT_DEPTH,
      });
    }

    if (stack.length === 1) {
      if (name !== 'score-partwise') {
        fail('UNSUPPORTED_ROOT', 'Parser accepts only score-partwise documents.');
      }
      const sourceVersion = attr(node, 'version');
      rootVersion =
        sourceVersion === undefined
          ? undefined
          : requireBoundedText(sourceVersion, 'score-partwise.version');
      xmlDeclarationVersion = parser.xmlDecl?.version;
      return;
    }

    if (name === 'part' && parent === 'score-partwise') {
      if (currentPart) fail('NESTED_PART', 'Nested part elements are not supported.');
      if (parts.length >= MAX_PARTS) {
        fail('PART_LIMIT_EXCEEDED', 'Part count limit exceeded.', { limit: MAX_PARTS });
      }
      currentPart = {
        id: requireBoundedText(attr(node, 'id'), 'part.id'),
        index: parts.length + 1,
        divisions: null,
        measures: [],
      };
      return;
    }

    if (name === 'measure' && parent === 'part') {
      if (!currentPart) fail('MEASURE_OUTSIDE_PART', 'Measure occurred outside a part.');
      if (currentMeasure) fail('NESTED_MEASURE', 'Nested measure elements are not supported.');
      if (currentPart.measures.length >= MAX_MEASURES_PER_PART) {
        fail('MEASURE_LIMIT_EXCEEDED', 'Measure count limit exceeded.', {
          partId: currentPart.id,
          limit: MAX_MEASURES_PER_PART,
        });
      }
      const index = currentPart.measures.length + 1;
      const sourceNumber = attr(node, 'number');
      currentMeasure = {
        index,
        number:
          sourceNumber === undefined
            ? String(index)
            : requireBoundedText(sourceNumber, 'measure.number'),
        divisions: null,
        events: [],
        noteOrdinal: 0,
      };
      return;
    }

    if (!currentMeasure) return;

    if (name === 'divisions' && parent === 'attributes') {
      beginCapture(currentMeasure, 'divisions', name);
      return;
    }

    if (name === 'note' && parent === 'measure') {
      if (currentNote || currentMove) {
        fail('NESTED_TIMED_EVENT', 'Timed MusicXML events may not nest.', context());
      }
      currentMeasure.noteOrdinal += 1;
      currentNote = {
        ordinal: currentMeasure.noteOrdinal,
        chord: false,
        rest: false,
        grace: false,
        cue: false,
        unpitched: false,
        alter: undefined,
        tieStart: false,
        tieStop: false,
      };
      return;
    }

    if ((name === 'backup' || name === 'forward') && parent === 'measure') {
      if (currentNote || currentMove) {
        fail('NESTED_TIMED_EVENT', 'Timed MusicXML events may not nest.', context());
      }
      currentMove = { kind: name };
      return;
    }

    if (currentMove) {
      if (name === 'duration' && (parent === 'backup' || parent === 'forward')) {
        beginCapture(currentMove, 'duration', name);
      } else if (name === 'voice' && parent === 'forward') {
        beginCapture(currentMove, 'voice', name);
      } else if (name === 'staff' && parent === 'forward') {
        beginCapture(currentMove, 'staff', name);
      }
      return;
    }

    if (!currentNote) return;

    if (name === 'chord' && parent === 'note') currentNote.chord = true;
    else if (name === 'rest' && parent === 'note') currentNote.rest = true;
    else if (name === 'grace' && parent === 'note') currentNote.grace = true;
    else if (name === 'cue' && parent === 'note') currentNote.cue = true;
    else if (name === 'unpitched' && parent === 'note') currentNote.unpitched = true;
    else if (name === 'step' && parent === 'pitch') beginCapture(currentNote, 'step', name);
    else if (name === 'alter' && parent === 'pitch') beginCapture(currentNote, 'alter', name);
    else if (name === 'octave' && parent === 'pitch') beginCapture(currentNote, 'octave', name);
    else if (name === 'duration' && parent === 'note') beginCapture(currentNote, 'duration', name);
    else if (name === 'voice' && parent === 'note') beginCapture(currentNote, 'voice', name);
    else if (name === 'staff' && parent === 'note') beginCapture(currentNote, 'staff', name);
    else if (name === 'tie' && parent === 'note') {
      const type = attr(node, 'type');
      if (type === 'start') currentNote.tieStart = true;
      else if (type === 'stop') currentNote.tieStop = true;
      else {
        fail('UNSUPPORTED_TIE_TYPE', 'Unsupported MusicXML tie type.', {
          ...context(),
          type,
        });
      }
    } else if (name === 'tied' && parent === 'notations') {
      const type = attr(node, 'type');
      if (type === 'start') currentNote.tieStart = true;
      else if (type === 'stop') currentNote.tieStop = true;
      else if (type === 'continue') {
        currentNote.tieStart = true;
        currentNote.tieStop = true;
      } else {
        fail('UNSUPPORTED_TIED_TYPE', 'Unsupported MusicXML tied type.', {
          ...context(),
          type,
        });
      }
    }
  });

  parser.on('text', (text) => {
    if (parserHasFailed() || !capture) return;
    capture.text += text;
    if (capture.text.length > MAX_CAPTURE_LENGTH) {
      fail('CAPTURE_LIMIT_EXCEEDED', 'Relevant MusicXML text field exceeds parser limit.', {
        ...context(),
        field: capture.field,
        limit: MAX_CAPTURE_LENGTH,
      });
    }
  });

  parser.on('cdata', (text) => {
    if (parserHasFailed() || !capture) return;
    capture.text += text;
    if (capture.text.length > MAX_CAPTURE_LENGTH) {
      fail('CAPTURE_LIMIT_EXCEEDED', 'Relevant MusicXML CDATA field exceeds parser limit.', {
        ...context(),
        field: capture.field,
        limit: MAX_CAPTURE_LENGTH,
      });
    }
  });

  parser.on('closetag', (node) => {
    if (parserHasFailed()) return;

    const name = closeName(node);
    finishCapture(name);

    if (name === 'note' && currentNote) {
      const details = context();
      if (currentNote.grace) {
        fail('UNSUPPORTED_GRACE_NOTE', 'P1B does not assign duration to grace notes.', details);
      }
      if (currentNote.cue) {
        fail('UNSUPPORTED_CUE_NOTE', 'P1B does not support cue notes.', details);
      }
      if (currentNote.unpitched) {
        fail('UNSUPPORTED_UNPITCHED_NOTE', 'P1B supports pitched or rest notes only.', details);
      }
      if (!currentNote.duration) {
        fail('MISSING_DURATION', 'Timed note/rest requires a positive duration.', details);
      }

      const voice = currentNote.voice ?? '1';
      const staff = currentNote.staff ?? 1;

      if (currentNote.rest) {
        if (
          currentNote.step !== undefined ||
          currentNote.octave !== undefined ||
          currentNote.alter !== undefined
        ) {
          fail('REST_WITH_PITCH', 'Rest note may not also carry pitch semantics.', details);
        }
        if (currentNote.chord) {
          fail('REST_CHORD_NOT_SUPPORTED', 'A rest cannot be emitted as a chord member.', details);
        }
        appendEvent({
          type: 'forward',
          duration: currentNote.duration,
          sourceKind: 'rest',
          voice,
          staff,
        });
      } else {
        if (currentNote.step === undefined || currentNote.octave === undefined) {
          fail('MISSING_PITCH', 'Pitched note requires step and octave.', details);
        }
        appendEvent({
          type: 'note',
          id: `p${currentPart.index}-m${currentMeasure.index}-n${currentNote.ordinal}`,
          pitch: formatPitch(
            currentNote.step,
            currentNote.alter ?? 0,
            currentNote.octave,
            details,
          ),
          voice,
          staff,
          duration: currentNote.duration,
          chord: currentNote.chord,
          tieStart: currentNote.tieStart,
          tieStop: currentNote.tieStop,
        });
      }
      currentNote = null;
    } else if ((name === 'backup' || name === 'forward') && currentMove?.kind === name) {
      if (!currentMove.duration) {
        fail('MISSING_DURATION', `${name} requires a positive duration.`, context());
      }
      appendEvent({
        type: name,
        duration: currentMove.duration,
        sourceKind: name,
        ...(currentMove.voice ? { voice: currentMove.voice } : {}),
        ...(currentMove.staff ? { staff: currentMove.staff } : {}),
      });
      currentMove = null;
    } else if (name === 'measure' && currentMeasure) {
      if (!currentPart) fail('MEASURE_OUTSIDE_PART', 'Measure closed outside a part.');
      if (currentMeasure.divisions !== null) currentPart.divisions = currentMeasure.divisions;
      if (currentPart.divisions === null) {
        fail(
          'MISSING_DIVISIONS',
          'A part must establish divisions before timed events are consumed.',
          {
            partId: currentPart.id,
            measureIndex: currentMeasure.index,
          },
        );
      }
      currentMeasure.divisions = currentPart.divisions;
      currentPart.measures.push({
        number: currentMeasure.number,
        divisions: currentMeasure.divisions,
        events: currentMeasure.events,
      });
      currentMeasure = null;
    } else if (name === 'part' && currentPart) {
      if (currentMeasure) fail('UNCLOSED_MEASURE', 'Part closed with an active measure.');
      parts.push({ id: currentPart.id, measures: currentPart.measures });
      currentPart = null;
    }

    const expected = stack.pop();
    if (expected !== name) {
      fail('PARSER_STACK_MISMATCH', 'Parser event stack is inconsistent.', {
        expected,
        actual: name,
      });
    }
  });

  try {
    parser.write(gated.xml).close();
  } catch (error) {
    if (firstParserFailure) throw firstParserFailure;
    if (error instanceof MusicXmlParseError) throw error;
    fail('MALFORMED_XML', 'MusicXML parsing failed.', {
      line: parser.line,
      column: parser.column,
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  if (firstParserFailure) throw firstParserFailure;
  if (xmlDeclarationVersion && xmlDeclarationVersion !== '1.0') {
    fail('UNSUPPORTED_XML_VERSION', 'P1B supports XML 1.0 input only.', {
      version: xmlDeclarationVersion,
    });
  }
  if (stack.length !== 0 || currentPart || currentMeasure || currentNote || currentMove || capture) {
    fail('INCOMPLETE_PARSE_STATE', 'MusicXML parser ended with incomplete semantic state.');
  }
  if (parts.length === 0) {
    fail('NO_PARTS', 'score-partwise document contains no part elements.');
  }

  return freezeResult(parts, gated.byteLength, rootVersion);
}

export const MUSICXML_PARSER_LIMITS = Object.freeze({
  maxElementDepth: MAX_ELEMENT_DEPTH,
  maxParts: MAX_PARTS,
  maxMeasuresPerPart: MAX_MEASURES_PER_PART,
  maxEventsPerMeasure: MAX_EVENTS_PER_MEASURE,
  maxCaptureLength: MAX_CAPTURE_LENGTH,
});
