import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { attachFretboardCandidates } from '../src/guitar/fretboardCandidates.js';
import {
  SONORITY_ASSIGNMENT_LIMITS,
  SonorityAssignmentError,
  enumerateSonorityAssignments,
} from '../src/guitar/sonorityAssignments.js';
import { parseMusicXmlPartwise } from '../src/musicxml/partwiseParser.js';
import { buildMeasureTimeline } from '../src/polyphony/measureTimeline.js';

test('single E4 enumerates all six positions without ranking', () => {
  const notes = attachFretboardCandidates([{ id: 'n1', pitch: 'E4' }]);
  const assignments = enumerateSonorityAssignments(notes);

  assert.deepEqual(
    assignments.map((assignment) => ({
      string: assignment[0].string,
      fret: assignment[0].fret,
    })),
    [
      { string: 1, fret: 0 },
      { string: 2, fret: 5 },
      { string: 3, fret: 9 },
      { string: 4, fret: 14 },
      { string: 5, fret: 19 },
      { string: 6, fret: 24 },
    ],
  );
});

test('distinct-string constraint removes same-string conflicts', () => {
  const notes = attachFretboardCandidates([
    { id: 'low-e', pitch: 'E2' },
    { id: 'low-a', pitch: 'A2' },
  ]);
  const assignments = enumerateSonorityAssignments(notes);

  assert.equal(assignments.length, 1);
  assert.deepEqual(
    assignments[0].map(({ noteId, string, fret }) => ({ noteId, string, fret })),
    [
      { noteId: 'low-e', string: 6, fret: 0 },
      { noteId: 'low-a', string: 5, fret: 0 },
    ],
  );
});

test('physically impossible two-note sonority returns factual empty evidence', () => {
  const notes = attachFretboardCandidates([
    { id: 'e-a', pitch: 'E2' },
    { id: 'e-b', pitch: 'E2' },
  ]);
  assert.deepEqual(enumerateSonorityAssignments(notes), []);
});

test('requested assignment bound fails closed rather than truncating valid alternatives', () => {
  const notes = attachFretboardCandidates([
    { id: 'g-a', pitch: 'G3' },
    { id: 'g-b', pitch: 'G3' },
  ]);

  assert.throws(
    () => enumerateSonorityAssignments(notes, { maxAssignments: 1 }),
    (error) =>
      error instanceof SonorityAssignmentError && error.code === 'ASSIGNMENT_LIMIT_EXCEEDED',
  );
});

test('more simultaneous notes than guitar strings fail closed', () => {
  const notes = Array.from({ length: 7 }, (_, index) => ({
    id: `n${index + 1}`,
    pitch: 'E4',
    fretboardCandidates: [{ string: 1, fret: 0, pitch: 'E4' }],
  }));

  assert.throws(
    () => enumerateSonorityAssignments(notes),
    (error) =>
      error instanceof SonorityAssignmentError && error.code === 'SONORITY_EXCEEDS_STRING_COUNT',
  );
});

test('duplicate same-string candidates for one note fail closed', () => {
  assert.throws(
    () =>
      enumerateSonorityAssignments([
        {
          id: 'n1',
          pitch: 'E4',
          fretboardCandidates: [
            { string: 1, fret: 0, pitch: 'E4' },
            { string: 1, fret: 12, pitch: 'E4' },
          ],
        },
      ]),
    (error) =>
      error instanceof SonorityAssignmentError && error.code === 'DUPLICATE_STRING_CANDIDATE',
  );
});

test('hard assignment bound is explicitly 6! for the six-string profile', () => {
  assert.equal(SONORITY_ASSIGNMENT_LIMITS.maxNotes, 6);
  assert.equal(SONORITY_ASSIGNMENT_LIMITS.hardMaxAssignments, 720);
});

test('pinned PS-6 four-voice final sonority has one forced distinct-string assignment', () => {
  const xml = readFileSync(
    new URL('../fixtures/compat/ps6-counterpoint-4v-tie.musicxml', import.meta.url),
    'utf8',
  );
  const parsed = parseMusicXmlPartwise(xml);
  const timeline = buildMeasureTimeline(parsed.parts[0].measures[1].events);
  const finalSonority = timeline.sonoritySpans.at(-1);
  const notes = attachFretboardCandidates(finalSonority.activeNotes);
  const assignments = enumerateSonorityAssignments(notes);

  assert.equal(assignments.length, 1);
  assert.deepEqual(
    assignments[0].map(({ pitch, string, fret }) => ({ pitch, string, fret })),
    [
      { pitch: 'E2', string: 6, fret: 0 },
      { pitch: 'A2', string: 5, fret: 0 },
      { pitch: 'D3', string: 4, fret: 0 },
      { pitch: 'G3', string: 3, fret: 0 },
    ],
  );
  assert.equal(new Set(assignments[0].map((record) => record.string)).size, 4);
});
