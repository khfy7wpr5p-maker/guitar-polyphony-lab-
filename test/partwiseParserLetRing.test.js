import assert from 'node:assert/strict';
import test from 'node:test';

import { parseMusicXmlPartwise } from '../src/musicxml/partwiseParser.js';

function score(body) {
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">${body}</score-partwise>`;
}

function part(measures, id = 'P1') {
  return `<part id="${id}">${measures}</part>`;
}

test('preserves tied let-ring as non-continuity notation evidence', () => {
  const xml = score(
    part(`
      <measure number="26">
        <attributes><divisions>4</divisions></attributes>
        <note>
          <pitch><step>E</step><octave>4</octave></pitch>
          <duration>4</duration><voice>1</voice><staff>1</staff>
          <notations><tied type="let-ring"/></notations>
        </note>
      </measure>`),
  );

  const event = parseMusicXmlPartwise(xml).parts[0].measures[0].events[0];

  assert.equal(event.tieStart, false);
  assert.equal(event.tieStop, false);
  assert.equal(event.letRing, true);
});
