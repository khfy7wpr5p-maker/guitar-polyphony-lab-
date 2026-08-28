import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parseMusicXmlPartwise } from '../src/musicxml/partwiseParser.js';
import { buildMeasureTimeline } from '../src/polyphony/measureTimeline.js';

function readFixture(name) {
  return readFileSync(new URL(`../fixtures/compat/${name}`, import.meta.url), 'utf8');
}

test('PS-6 2V corpus fixture preserves independent-voice overlap', () => {
  const parsed = parseMusicXmlPartwise(readFixture('ps6-counterpoint-2v.musicxml'));

  assert.equal(parsed.parts.length, 1);
  assert.equal(parsed.parts[0].measures.length, 1);

  const measure = parsed.parts[0].measures[0];
  assert.equal(measure.divisions, 4);

  const timeline = buildMeasureTimeline(measure.events);
  assert.equal(timeline.measureEnd, 16);
  assert.deepEqual(
    timeline.notes.map(({ pitch, voice, onset, end }) => ({ pitch, voice, onset, end })),
    [
      { pitch: 'E2', voice: '1', onset: 0, end: 16 },
      { pitch: 'A2', voice: '2', onset: 4, end: 16 },
    ],
  );
  assert.deepEqual(
    timeline.sonoritySpans.map(({ start, end, activeNotes }) => ({
      start,
      end,
      pitches: activeNotes.map((note) => note.pitch),
    })),
    [
      { start: 0, end: 4, pitches: ['E2'] },
      { start: 4, end: 16, pitches: ['E2', 'A2'] },
    ],
  );
});

test('PS-6 4V tie corpus fixture preserves tie evidence and four-voice sonority growth', () => {
  const parsed = parseMusicXmlPartwise(readFixture('ps6-counterpoint-4v-tie.musicxml'));

  assert.equal(parsed.parts.length, 1);
  assert.equal(parsed.parts[0].measures.length, 2);
  assert.deepEqual(parsed.parts[0].measures.map((measure) => measure.divisions), [4, 4]);

  const firstMeasureEvents = parsed.parts[0].measures[0].events;
  assert.equal(firstMeasureEvents[0].pitch, 'E2');
  assert.equal(firstMeasureEvents[0].tieStart, true);
  assert.equal(firstMeasureEvents[0].tieStop, false);

  const secondMeasureEvents = parsed.parts[0].measures[1].events;
  const tiedContinuation = secondMeasureEvents.find(
    (event) => event.type === 'note' && event.pitch === 'E2' && event.voice === '1',
  );
  assert.ok(tiedContinuation);
  assert.equal(tiedContinuation.tieStart, false);
  assert.equal(tiedContinuation.tieStop, true);

  const timeline = buildMeasureTimeline(secondMeasureEvents);
  assert.equal(timeline.measureEnd, 16);
  assert.deepEqual(
    timeline.sonoritySpans.map(({ start, end, activeNotes }) => ({
      start,
      end,
      voices: activeNotes.map((note) => note.voice),
      pitches: activeNotes.map((note) => note.pitch),
    })),
    [
      { start: 0, end: 4, voices: ['1'], pitches: ['E2'] },
      { start: 4, end: 8, voices: ['1', '2'], pitches: ['E2', 'A2'] },
      { start: 8, end: 12, voices: ['1', '2', '3'], pitches: ['E2', 'A2', 'D3'] },
      {
        start: 12,
        end: 16,
        voices: ['1', '2', '3', '4'],
        pitches: ['E2', 'A2', 'D3', 'G3'],
      },
    ],
  );
});
