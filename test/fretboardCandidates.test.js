import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  FretboardCandidateError,
  STANDARD_GUITAR_PROFILE,
  attachFretboardCandidates,
  generateFretboardCandidates,
  spelledPitchToMidi,
} from '../src/guitar/fretboardCandidates.js';
import { parseMusicXmlPartwise } from '../src/musicxml/partwiseParser.js';
import { buildMeasureTimeline } from '../src/polyphony/measureTimeline.js';

test('spelling-preserving pitches resolve deterministically to MIDI semitones', () => {
  assert.equal(spelledPitchToMidi('C4'), 60);
  assert.equal(spelledPitchToMidi('C#4'), 61);
  assert.equal(spelledPitchToMidi('Db4'), 61);
  assert.equal(spelledPitchToMidi('B#3'), 60);
  assert.equal(spelledPitchToMidi('Cb4'), 59);
  assert.equal(spelledPitchToMidi('C##4'), 62);
});

test('standard profile is bounded to six strings and 24 frets', () => {
  assert.equal(STANDARD_GUITAR_PROFILE.id, 'STANDARD_E2_E4_24_FRET_1.0');
  assert.equal(STANDARD_GUITAR_PROFILE.maxFret, 24);
  assert.deepEqual(
    STANDARD_GUITAR_PROFILE.strings.map(({ string, openPitch }) => ({ string, openPitch })),
    [
      { string: 1, openPitch: 'E4' },
      { string: 2, openPitch: 'B3' },
      { string: 3, openPitch: 'G3' },
      { string: 4, openPitch: 'D3' },
      { string: 5, openPitch: 'A2' },
      { string: 6, openPitch: 'E2' },
    ],
  );
});

test('lowest standard-guitar E2 has exactly one candidate', () => {
  assert.deepEqual(
    generateFretboardCandidates('E2').map(({ string, fret }) => ({ string, fret })),
    [{ string: 6, fret: 0 }],
  );
});

test('A2 exposes both open fifth string and fifth fret of sixth string without ranking them', () => {
  assert.deepEqual(
    generateFretboardCandidates('A2').map(({ string, fret }) => ({ string, fret })),
    [
      { string: 5, fret: 0 },
      { string: 6, fret: 5 },
    ],
  );
});

test('E4 exposes every physically available 24-fret standard-guitar location', () => {
  assert.deepEqual(
    generateFretboardCandidates('E4').map(({ string, fret }) => ({ string, fret })),
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

test('pitch above the bounded profile returns factual no-candidate evidence', () => {
  assert.deepEqual(generateFretboardCandidates('F6'), []);
});

test('candidate attachment is immutable and does not mutate source note intervals', () => {
  const source = Object.freeze([
    Object.freeze({ id: 'n1', pitch: 'D3', voice: '1', onset: 0, end: 4 }),
  ]);
  const attached = attachFretboardCandidates(source);

  assert.notEqual(attached, source);
  assert.equal(source[0].fretboardCandidates, undefined);
  assert.equal(attached[0].playableOnProfile, true);
  assert.equal(attached[0].fretboardProfileId, STANDARD_GUITAR_PROFILE.id);
  assert.ok(Object.isFrozen(attached));
  assert.ok(Object.isFrozen(attached[0]));
  assert.ok(Object.isFrozen(attached[0].fretboardCandidates));
});

test('invalid pitch spelling fails closed', () => {
  assert.throws(
    () => generateFretboardCandidates('H4'),
    (error) => error instanceof FretboardCandidateError && error.code === 'INVALID_PITCH',
  );
});

test('duplicate note ids fail closed before solver stages can lose identity', () => {
  assert.throws(
    () =>
      attachFretboardCandidates([
        { id: 'same', pitch: 'E2' },
        { id: 'same', pitch: 'A2' },
      ]),
    (error) => error instanceof FretboardCandidateError && error.code === 'DUPLICATE_NOTE_ID',
  );
});

test('PS-6 four-voice sonority receives factual candidates including four distinct open strings', () => {
  const xml = readFileSync(
    new URL('../fixtures/compat/ps6-counterpoint-4v-tie.musicxml', import.meta.url),
    'utf8',
  );
  const parsed = parseMusicXmlPartwise(xml);
  const timeline = buildMeasureTimeline(parsed.parts[0].measures[1].events);
  const finalSonority = timeline.sonoritySpans.at(-1);
  const notesWithCandidates = attachFretboardCandidates(finalSonority.activeNotes);

  assert.deepEqual(
    notesWithCandidates.map(({ pitch, playableOnProfile }) => ({ pitch, playableOnProfile })),
    [
      { pitch: 'E2', playableOnProfile: true },
      { pitch: 'A2', playableOnProfile: true },
      { pitch: 'D3', playableOnProfile: true },
      { pitch: 'G3', playableOnProfile: true },
    ],
  );

  const openStringEvidence = notesWithCandidates.map((note) => {
    const open = note.fretboardCandidates.find((candidate) => candidate.fret === 0);
    return { pitch: note.pitch, string: open?.string ?? null };
  });
  assert.deepEqual(openStringEvidence, [
    { pitch: 'E2', string: 6 },
    { pitch: 'A2', string: 5 },
    { pitch: 'D3', string: 4 },
    { pitch: 'G3', string: 3 },
  ]);
});
