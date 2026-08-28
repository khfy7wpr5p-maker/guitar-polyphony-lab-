import assert from 'node:assert/strict';
import test from 'node:test';

import { MusicXmlInputError } from '../src/musicxml/inputGate.js';
import {
  MUSICXML_PARSER_LIMITS,
  MusicXmlParseError,
  parseMusicXmlPartwise,
} from '../src/musicxml/partwiseParser.js';
import { buildMeasureTimeline } from '../src/polyphony/measureTimeline.js';

function score(body, declaration = '<?xml version="1.0" encoding="UTF-8"?>') {
  return `${declaration}<score-partwise version="4.0">${body}</score-partwise>`;
}

function part(measures, id = 'P1') {
  return `<part id="${id}">${measures}</part>`;
}

test('parses two independent voices into the P0 ordered event contract', () => {
  const xml = score(
    part(`
      <measure number="1">
        <attributes><divisions>4</divisions></attributes>
        <note>
          <pitch><step>C</step><octave>4</octave></pitch>
          <duration>8</duration><voice>1</voice><staff>1</staff>
        </note>
        <backup><duration>8</duration></backup>
        <note>
          <pitch><step>E</step><octave>4</octave></pitch>
          <duration>4</duration><voice>2</voice><staff>1</staff>
        </note>
        <note>
          <pitch><step>F</step><alter>1</alter><octave>4</octave></pitch>
          <duration>4</duration><voice>2</voice><staff>1</staff>
        </note>
      </measure>`),
  );

  const parsed = parseMusicXmlPartwise(xml);
  assert.equal(parsed.parts.length, 1);
  assert.equal(parsed.parts[0].id, 'P1');
  assert.equal(parsed.parts[0].measures[0].divisions, 4);

  const timeline = buildMeasureTimeline(parsed.parts[0].measures[0].events);
  assert.deepEqual(
    timeline.notes.map(({ id, pitch, voice, onset, end }) => ({ id, pitch, voice, onset, end })),
    [
      { id: 'p1-m1-n1', pitch: 'C4', voice: '1', onset: 0, end: 8 },
      { id: 'p1-m1-n2', pitch: 'E4', voice: '2', onset: 0, end: 4 },
      { id: 'p1-m1-n3', pitch: 'F#4', voice: '2', onset: 4, end: 8 },
    ],
  );
  assert.deepEqual(
    timeline.sonoritySpans.map((span) => ({
      start: span.start,
      end: span.end,
      pitches: span.activeNotes.map((note) => note.pitch),
    })),
    [
      { start: 0, end: 4, pitches: ['C4', 'E4'] },
      { start: 4, end: 8, pitches: ['C4', 'F#4'] },
    ],
  );
});

test('preserves chord onset and maps rests to provenance-carrying cursor movement', () => {
  const xml = score(
    part(`
      <measure number="1">
        <attributes><divisions>4</divisions></attributes>
        <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration></note>
        <note><chord/><pitch><step>B</step><octave>3</octave></pitch><duration>4</duration></note>
        <note><rest/><duration>4</duration><voice>1</voice></note>
      </measure>`),
  );

  const events = parseMusicXmlPartwise(xml).parts[0].measures[0].events;
  assert.deepEqual(events[2], {
    type: 'forward',
    duration: 4,
    sourceKind: 'rest',
    voice: '1',
    staff: 1,
  });

  const timeline = buildMeasureTimeline(events);
  assert.equal(timeline.measureEnd, 8);
  assert.deepEqual(
    timeline.notes.map(({ pitch, onset, end, chord }) => ({ pitch, onset, end, chord })),
    [
      { pitch: 'G3', onset: 0, end: 4, chord: false },
      { pitch: 'B3', onset: 0, end: 4, chord: true },
    ],
  );
});

test('inherits divisions across later measures without inventing a new value', () => {
  const xml = score(
    part(`
      <measure number="1">
        <attributes><divisions>8</divisions></attributes>
        <note><pitch><step>A</step><octave>3</octave></pitch><duration>8</duration></note>
      </measure>
      <measure number="2">
        <note><pitch><step>B</step><octave>3</octave></pitch><duration>8</duration></note>
      </measure>`),
  );

  const measures = parseMusicXmlPartwise(xml).parts[0].measures;
  assert.deepEqual(measures.map((measure) => measure.divisions), [8, 8]);
});

test('preserves tie and tied evidence including continue', () => {
  const xml = score(
    part(`
      <measure number="1">
        <attributes><divisions>4</divisions></attributes>
        <note>
          <pitch><step>D</step><octave>4</octave></pitch><duration>4</duration>
          <tie type="start"/>
          <notations><tied type="continue"/></notations>
        </note>
      </measure>`),
  );

  const event = parseMusicXmlPartwise(xml).parts[0].measures[0].events[0];
  assert.equal(event.tieStart, true);
  assert.equal(event.tieStop, true);
});

test('fails closed on grace notes instead of inventing duration', () => {
  const xml = score(
    part(`
      <measure number="1">
        <attributes><divisions>4</divisions></attributes>
        <note><grace/><pitch><step>E</step><octave>4</octave></pitch><voice>1</voice></note>
      </measure>`),
  );

  assert.throws(
    () => parseMusicXmlPartwise(xml),
    (error) => error instanceof MusicXmlParseError && error.code === 'UNSUPPORTED_GRACE_NOTE',
  );
});

test('fails closed when divisions have not been established', () => {
  const xml = score(
    part(
      '<measure number="1"><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note></measure>',
    ),
  );

  assert.throws(
    () => parseMusicXmlPartwise(xml),
    (error) => error instanceof MusicXmlParseError && error.code === 'MISSING_DIVISIONS',
  );
});

test('fails closed on microtonal alter values in the bounded P1B contract', () => {
  const xml = score(
    part(`
      <measure number="1">
        <attributes><divisions>4</divisions></attributes>
        <note><pitch><step>C</step><alter>0.5</alter><octave>4</octave></pitch><duration>4</duration></note>
      </measure>`),
  );

  assert.throws(
    () => parseMusicXmlPartwise(xml),
    (error) => error instanceof MusicXmlParseError && error.code === 'UNSUPPORTED_ALTER',
  );
});

test('malformed XML is rejected and no partial semantic result is returned', () => {
  const xml = '<score-partwise><part id="P1"><measure number="1"></part></score-partwise>';
  assert.throws(
    () => parseMusicXmlPartwise(xml),
    (error) => error instanceof MusicXmlParseError && error.code === 'MALFORMED_XML',
  );
});

test('P1A trust-boundary errors remain authoritative before saxes parsing', () => {
  const xml = '<!DOCTYPE score-partwise><score-partwise><part id="P1"/></score-partwise>';
  assert.throws(
    () => parseMusicXmlPartwise(xml),
    (error) => error instanceof MusicXmlInputError && error.code === 'DOCTYPE_NOT_ALLOWED',
  );
});

test('rejects XML 1.1 after parsing rather than silently claiming XML 1.0 support', () => {
  const xml = score(
    part('<measure number="1"><attributes><divisions>4</divisions></attributes></measure>'),
    '<?xml version="1.1"?>',
  );
  assert.throws(
    () => parseMusicXmlPartwise(xml),
    (error) => error instanceof MusicXmlParseError && error.code === 'UNSUPPORTED_XML_VERSION',
  );
});

test('bounded semantic depth prevents pathological nested input', () => {
  const nested =
    '<x>'.repeat(MUSICXML_PARSER_LIMITS.maxElementDepth) +
    '</x>'.repeat(MUSICXML_PARSER_LIMITS.maxElementDepth);
  const xml = score(
    part(
      `<measure number="1"><attributes><divisions>4</divisions></attributes>${nested}</measure>`,
    ),
  );
  assert.throws(
    () => parseMusicXmlPartwise(xml),
    (error) =>
      error instanceof MusicXmlParseError && error.code === 'ELEMENT_DEPTH_LIMIT_EXCEEDED',
  );
});
