import assert from 'node:assert/strict';
import test from 'node:test';

import { parseMusicXmlPartwise } from '../src/musicxml/partwiseParser.js';
import { createArrangementAlternativeSet } from '../src/arrangement/arrangementAlternativeSet.js';
import {
  ArrangementTimelineSidecarError,
  buildArrangementTimelineSidecar,
} from '../src/arrangement/arrangementTimelineSidecar.js';
import { validateTimelineBackedArpeggiation } from '../src/arrangement/timelineBackedArpeggiationValidator.js';

function musicXml({ chord = true } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list/>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration><voice>1</voice><staff>1</staff>
      </note>
      <note>
        ${chord ? '<chord/>' : ''}
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>4</duration><voice>1</voice><staff>1</staff>
      </note>
      <note>
        ${chord ? '<chord/>' : ''}
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>4</duration><voice>1</voice><staff>1</staff>
      </note>
    </measure>
  </part>
</score-partwise>`;
}

function exactSource() {
  return {
    partId: 'P1',
    events: [
      { sourceEventId: 'p1-m1-n1', midi: 60, voice: '1', staff: 1 },
      { sourceEventId: 'p1-m1-n2', midi: 64, voice: '1', staff: 1 },
      { sourceEventId: 'p1-m1-n3', midi: 67, voice: '1', staff: 1 },
    ],
    groups: [
      {
        sourceGroupId: 'g1',
        sourceEventIds: ['p1-m1-n1', 'p1-m1-n2', 'p1-m1-n3'],
      },
    ],
  };
}

function arpeggio(source) {
  return createArrangementAlternativeSet(source, [{
    alternativeId: 'a2c:arp',
    strategyTags: ['ARPEGGIATION'],
    decisions: [{
      decisionId: 'a2c:arp:g1',
      decisionType: 'ARPEGGIATED',
      sourceEventIds: source.groups[0].sourceEventIds,
      sourceGroupId: source.groups[0].sourceGroupId,
      target: {
        orderedSourceEventIds: [...source.groups[0].sourceEventIds].reverse(),
        spreadDivisions: 1,
      },
      reasonCode: 'A2C_TEST_ARPEGGIATION',
    }],
  }]).alternatives[0];
}

test('A2C derives complete source timing evidence from real P1/P0 identities without guessing', () => {
  const parsed = parseMusicXmlPartwise(musicXml());
  const source = exactSource();
  const sidecar = buildArrangementTimelineSidecar(parsed.parts[0], source);

  assert.equal(sidecar.status, 'COMPLETE');
  assert.equal(sidecar.sourceTimingAuthority, true);
  assert.equal(sidecar.targetTimingAuthority, false);
  assert.equal(sidecar.entryCount, 3);
  assert.deepEqual(sidecar.unresolvedSourceEventIds, []);
  assert.ok(sidecar.entries.every((entry) => entry.matchBasis === 'EXACT_IDENTITY'));
  assert.ok(sidecar.entries.every((entry) => entry.onsetDivisions === 0));
  assert.ok(sidecar.entries.every((entry) => entry.durationDivisions === 4));
});

test('A2C confirms simultaneous source timing while keeping target arpeggio timing unresolved', () => {
  const parsed = parseMusicXmlPartwise(musicXml());
  const source = exactSource();
  const sidecar = buildArrangementTimelineSidecar(parsed.parts[0], source);
  const result = validateTimelineBackedArpeggiation(source, arpeggio(source), sidecar);

  assert.equal(result.status, 'FEASIBLE');
  assert.equal(result.sourceTimingAuthority, true);
  assert.equal(result.targetTimingAuthority, false);
  assert.equal(result.targetTimingInterpretation, 'UNRESOLVED_SPREAD_SEMANTICS');
  assert.equal(result.sourceTimeline.sourceGroupWasSimultaneous, true);
  assert.equal(result.sourceTimeline.measureIndex, 1);
  assert.equal(result.sourceTimeline.divisions, 4);
  assert.equal(result.sourceTimeline.commonOnsetDivisions, 0);
  assert.equal(result.sourceTimeline.minimumDurationDivisions, 4);
  assert.equal(result.declaredSpreadDivisions, 1);
  assert.equal(result.physicalSequence.timingAuthority, false);
});

test('A2C supports an explicit identity map but never pitch-only guessing', () => {
  const parsed = parseMusicXmlPartwise(musicXml());
  const source = {
    partId: 'P1',
    events: [
      { sourceEventId: 'e1', midi: 60, voice: '1', staff: 1 },
      { sourceEventId: 'e2', midi: 64, voice: '1', staff: 1 },
      { sourceEventId: 'e3', midi: 67, voice: '1', staff: 1 },
    ],
    groups: [{ sourceGroupId: 'g1', sourceEventIds: ['e1', 'e2', 'e3'] }],
  };

  const partial = buildArrangementTimelineSidecar(parsed.parts[0], source);
  assert.equal(partial.status, 'PARTIAL');
  assert.equal(partial.entryCount, 0);
  assert.deepEqual(partial.unresolvedSourceEventIds, ['e1', 'e2', 'e3']);
  assert.equal(partial.matchingPolicy.pitchOnlyGuessingAllowed, false);

  const mapped = buildArrangementTimelineSidecar(parsed.parts[0], source, {
    sourceEventIdToP0NoteId: {
      e1: 'p1-m1-n1',
      e2: 'p1-m1-n2',
      e3: 'p1-m1-n3',
    },
  });
  assert.equal(mapped.status, 'COMPLETE');
  assert.ok(mapped.entries.every((entry) => entry.matchBasis === 'EXPLICIT_SOURCE_TO_P0_MAP'));
});

test('A2C fails closed when mapped source pitch facts disagree with P0 evidence', () => {
  const parsed = parseMusicXmlPartwise(musicXml());
  const source = exactSource();
  source.events[1] = { ...source.events[1], midi: 65 };

  assert.throws(
    () => buildArrangementTimelineSidecar(parsed.parts[0], source),
    (error) => error instanceof ArrangementTimelineSidecarError
      && error.code === 'A2C_SOURCE_PITCH_MISMATCH',
  );
});

test('A2C reports a timeline conflict when a claimed source group was not simultaneous', () => {
  const parsed = parseMusicXmlPartwise(musicXml({ chord: false }));
  const source = exactSource();
  const sidecar = buildArrangementTimelineSidecar(parsed.parts[0], source);
  const result = validateTimelineBackedArpeggiation(source, arpeggio(source), sidecar);

  assert.equal(result.status, 'TIMELINE_CONFLICT');
  assert.equal(result.reason, 'SOURCE_GROUP_NOT_SIMULTANEOUS');
  assert.equal(result.sourceTimingAuthority, true);
  assert.equal(result.targetTimingAuthority, false);
  assert.equal(result.physicalSequence, null);
});
