import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SemanticComparatorError,
  adaptEnginePolyphonicSourceModel,
  buildLabSemanticSnapshot,
  compareSemanticSnapshots,
} from '../src/verification/semanticComparator.js';

function score(body) {
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">${body}</score-partwise>`;
}

function part(measures, id = 'P1') {
  return `<part id="${id}">${measures}</part>`;
}

function engineModel(events, overrides = {}) {
  return {
    documentType: 'PolyphonicSourceModel',
    contractVersion: '1.0.0',
    source: {
      format: 'score-partwise',
      musicXmlVersion: '4.0',
      partId: 'P1',
    },
    measureCount: 1,
    eventCount: events.length,
    measures: [
      {
        measureId: 'P1:measure:0',
        index: 0,
        number: '1',
        implicit: false,
        divisions: 4,
        timeSignature: { beats: 2, beatType: 4 },
        expectedDurationDivisions: 8,
        events,
        ...overrides,
      },
    ],
  };
}

function engineNote({
  noteIndex,
  written,
  onsetDivisions,
  durationDivisions,
  voice,
  staff = 1,
  tieStart = false,
  tieStop = false,
  chordWithPrevious = false,
}) {
  return {
    sourceEventId: `P1:measure:0:note:${noteIndex}`,
    sourceOrder: noteIndex,
    type: 'note',
    voice,
    staff,
    onsetDivisions,
    durationDivisions,
    pitch: { step: written[0], alter: 0, octave: Number(written.at(-1)), midi: 60, written },
    tieStart,
    tieStop,
    source: {
      partId: 'P1',
      measureIndex: 0,
      measureNumber: '1',
      noteIndex,
      chordWithPrevious,
    },
  };
}

function engineRest({ noteIndex, onsetDivisions, durationDivisions, voice = '1', staff = 1 }) {
  return {
    sourceEventId: `P1:measure:0:note:${noteIndex}`,
    sourceOrder: noteIndex,
    type: 'rest',
    voice,
    staff,
    onsetDivisions,
    durationDivisions,
    tieStart: false,
    tieStop: false,
    source: {
      partId: 'P1',
      measureIndex: 0,
      measureNumber: '1',
      noteIndex,
      chordWithPrevious: false,
    },
  };
}

test('builds a deterministic Lab semantic snapshot for overlapping voices', () => {
  const xml = score(part(`
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff></note>
      <backup><duration>8</duration></backup>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice><staff>1</staff></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice><staff>1</staff></note>
    </measure>
  `));

  const snapshot = buildLabSemanticSnapshot(xml);
  assert.equal(snapshot.partId, 'P1');
  assert.equal(snapshot.measures[0].peakPolyphony, 2);
  assert.deepEqual(
    snapshot.measures[0].notes.map(({ sourceNoteIndex, pitch, onsetDivisions, voice }) => ({
      sourceNoteIndex,
      pitch,
      onsetDivisions,
      voice,
    })),
    [
      { sourceNoteIndex: 0, pitch: 'C4', onsetDivisions: 0, voice: '1' },
      { sourceNoteIndex: 1, pitch: 'E4', onsetDivisions: 0, voice: '2' },
      { sourceNoteIndex: 2, pitch: 'F4', onsetDivisions: 4, voice: '2' },
    ],
  );
});

test('Lab and Engine source semantics compare equal without a runtime dependency', () => {
  const xml = score(part(`
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff></note>
      <backup><duration>8</duration></backup>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice><staff>1</staff></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice><staff>1</staff></note>
    </measure>
  `));

  const reference = buildLabSemanticSnapshot(xml);
  const candidate = adaptEnginePolyphonicSourceModel(engineModel([
    engineNote({ noteIndex: 0, written: 'C4', onsetDivisions: 0, durationDivisions: 8, voice: '1' }),
    engineNote({ noteIndex: 1, written: 'E4', onsetDivisions: 0, durationDivisions: 4, voice: '2' }),
    engineNote({ noteIndex: 2, written: 'F4', onsetDivisions: 4, durationDivisions: 4, voice: '2' }),
  ]));

  const report = compareSemanticSnapshots(reference, candidate);
  assert.equal(report.equal, true);
  assert.equal(report.mismatchCount, 0);
  assert.equal(report.comparedMeasures, 1);
  assert.equal(report.comparedNotes, 3);
});

test('source note identity stays aligned across rests', () => {
  const xml = score(part(`
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><rest/><duration>2</duration><voice>1</voice></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
    </measure>
  `));

  const reference = buildLabSemanticSnapshot(xml);
  assert.deepEqual(
    reference.measures[0].notes.map((note) => note.sourceNoteIndex),
    [0, 2],
  );

  const candidate = adaptEnginePolyphonicSourceModel(engineModel([
    engineNote({ noteIndex: 0, written: 'C4', onsetDivisions: 0, durationDivisions: 4, voice: '1' }),
    engineRest({ noteIndex: 1, onsetDivisions: 4, durationDivisions: 2 }),
    engineNote({ noteIndex: 2, written: 'D4', onsetDivisions: 6, durationDivisions: 2, voice: '1' }),
  ]));
  assert.equal(compareSemanticSnapshots(reference, candidate).equal, true);
});

test('reports deterministic note-field and sonority mismatches', () => {
  const xml = score(part(`
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
  `));

  const reference = buildLabSemanticSnapshot(xml);
  const candidate = adaptEnginePolyphonicSourceModel(engineModel([
    engineNote({ noteIndex: 0, written: 'C4', onsetDivisions: 0, durationDivisions: 8, voice: '2' }),
    engineNote({ noteIndex: 1, written: 'D4', onsetDivisions: 4, durationDivisions: 4, voice: '1' }),
  ]));
  const report = compareSemanticSnapshots(reference, candidate);

  assert.equal(report.equal, false);
  assert.ok(report.mismatches.some((entry) => (
    entry.code === 'NOTE_FIELD_MISMATCH'
    && entry.sourceNoteIndex === 0
    && entry.field === 'durationDivisions'
  )));
  assert.ok(report.mismatches.some((entry) => (
    entry.code === 'NOTE_FIELD_MISMATCH'
    && entry.sourceNoteIndex === 0
    && entry.field === 'voice'
  )));
  assert.ok(report.mismatches.some((entry) => entry.code === 'PEAK_POLYPHONY_MISMATCH'));
  assert.ok(report.mismatches.some((entry) => entry.code === 'SONORITY_MISMATCH'));
});

test('missing Engine notes are reported by source identity', () => {
  const xml = score(part(`
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
    </measure>
  `));

  const reference = buildLabSemanticSnapshot(xml);
  const candidate = adaptEnginePolyphonicSourceModel(engineModel([
    engineNote({ noteIndex: 0, written: 'C4', onsetDivisions: 0, durationDivisions: 4, voice: '1' }),
  ]));
  const report = compareSemanticSnapshots(reference, candidate);

  assert.ok(report.mismatches.some((entry) => (
    entry.code === 'MISSING_NOTE' && entry.sourceNoteIndex === 1
  )));
});

test('fails closed on unsupported Engine evidence contracts', () => {
  assert.throws(
    () => adaptEnginePolyphonicSourceModel({
      documentType: 'PolyphonicSourceModel',
      contractVersion: '2.0.0',
      source: { partId: 'P1' },
      measures: [],
    }),
    (error) => (
      error instanceof SemanticComparatorError
      && error.code === 'UNSUPPORTED_ENGINE_SOURCE_MODEL'
    ),
  );
});
