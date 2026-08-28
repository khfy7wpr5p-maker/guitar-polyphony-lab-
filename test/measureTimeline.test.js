import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PolyphonyModelError,
  buildMeasureTimeline,
} from '../src/polyphony/measureTimeline.js';

test('sequential notes advance the measure cursor deterministically', () => {
  const result = buildMeasureTimeline([
    { type: 'note', id: 'n1', pitch: 'C4', voice: '1', duration: 4 },
    { type: 'note', id: 'n2', pitch: 'D4', voice: '1', duration: 4 },
  ]);

  assert.deepEqual(
    result.notes.map(({ id, onset, end }) => ({ id, onset, end })),
    [
      { id: 'n1', onset: 0, end: 4 },
      { id: 'n2', onset: 4, end: 8 },
    ],
  );
  assert.equal(result.measureEnd, 8);
});

test('chord notes share the preceding attack onset and do not advance the cursor', () => {
  const result = buildMeasureTimeline([
    { type: 'note', id: 'n1', pitch: 'C4', voice: '1', duration: 4 },
    { type: 'note', id: 'n2', pitch: 'E4', voice: '1', duration: 4, chord: true },
    { type: 'note', id: 'n3', pitch: 'G4', voice: '1', duration: 4 },
  ]);

  const byId = Object.fromEntries(result.notes.map((note) => [note.id, note]));
  assert.equal(byId.n1.onset, 0);
  assert.equal(byId.n2.onset, 0);
  assert.equal(byId.n3.onset, 4);
  assert.equal(result.measureEnd, 8);
});

test('backup reconstructs two independent voices and preserves sustained overlap', () => {
  const result = buildMeasureTimeline([
    { type: 'note', id: 'v1-long', pitch: 'C4', voice: '1', duration: 8 },
    { type: 'backup', duration: 8 },
    { type: 'note', id: 'v2-a', pitch: 'E4', voice: '2', duration: 4 },
    { type: 'note', id: 'v2-b', pitch: 'F4', voice: '2', duration: 4 },
  ]);

  assert.deepEqual(
    result.sonoritySpans.map(({ start, end, activeNoteIds }) => ({
      start,
      end,
      activeNoteIds,
    })),
    [
      { start: 0, end: 4, activeNoteIds: ['v1-long', 'v2-a'] },
      { start: 4, end: 8, activeNoteIds: ['v1-long', 'v2-b'] },
    ],
  );
});

test('forward creates a deterministic gap without inventing notes', () => {
  const result = buildMeasureTimeline([
    { type: 'note', id: 'n1', pitch: 'C4', voice: '1', duration: 4 },
    { type: 'forward', duration: 4 },
    { type: 'note', id: 'n2', pitch: 'E4', voice: '1', duration: 4 },
  ]);

  assert.deepEqual(
    result.notes.map(({ id, onset, end }) => ({ id, onset, end })),
    [
      { id: 'n1', onset: 0, end: 4 },
      { id: 'n2', onset: 8, end: 12 },
    ],
  );
  assert.equal(result.measureEnd, 12);
});

test('tie flags are preserved as evidence without inferring cross-measure duration', () => {
  const result = buildMeasureTimeline([
    {
      type: 'note',
      id: 'n1',
      pitch: 'A3',
      voice: '1',
      staff: 1,
      duration: 4,
      tieStart: true,
    },
  ]);

  assert.equal(result.notes[0].tieStart, true);
  assert.equal(result.notes[0].tieStop, false);
});

test('backup before measure start fails closed', () => {
  assert.throws(
    () => buildMeasureTimeline([{ type: 'backup', duration: 1 }]),
    (error) =>
      error instanceof PolyphonyModelError &&
      error.code === 'BACKUP_BEFORE_MEASURE_START',
  );
});

test('chord without an attack anchor fails closed', () => {
  assert.throws(
    () =>
      buildMeasureTimeline([
        {
          type: 'note',
          id: 'n1',
          pitch: 'C4',
          voice: '1',
          duration: 4,
          chord: true,
        },
      ]),
    (error) => error instanceof PolyphonyModelError && error.code === 'CHORD_WITHOUT_ANCHOR',
  );
});

test('duplicate note ids fail closed', () => {
  assert.throws(
    () =>
      buildMeasureTimeline([
        { type: 'note', id: 'n1', pitch: 'C4', voice: '1', duration: 4 },
        { type: 'note', id: 'n1', pitch: 'D4', voice: '1', duration: 4 },
      ]),
    (error) => error instanceof PolyphonyModelError && error.code === 'DUPLICATE_NOTE_ID',
  );
});

test('unsupported event types fail closed', () => {
  assert.throws(
    () => buildMeasureTimeline([{ type: 'direction', duration: 1 }]),
    (error) => error instanceof PolyphonyModelError && error.code === 'UNSUPPORTED_EVENT_TYPE',
  );
});
