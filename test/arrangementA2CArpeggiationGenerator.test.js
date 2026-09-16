import assert from 'node:assert/strict';
import test from 'node:test';

import { parseMusicXmlPartwise } from '../src/musicxml/partwiseParser.js';
import { buildArrangementTimelineSidecar } from '../src/arrangement/arrangementTimelineSidecar.js';
import {
  TimelineBackedArpeggiationGeneratorError,
  generateTimelineBackedArpeggiationAlternatives,
} from '../src/arrangement/timelineBackedArpeggiationGenerator.js';

const NOTES = Object.freeze([
  { step: 'E', octave: 3, midi: 52 },
  { step: 'G', octave: 3, midi: 55 },
  { step: 'B', octave: 3, midi: 59 },
  { step: 'D', octave: 4, midi: 62 },
  { step: 'F', alter: 1, octave: 4, midi: 66 },
  { step: 'A', octave: 4, midi: 69 },
  { step: 'C', octave: 5, midi: 72 },
  { step: 'E', octave: 5, midi: 76 },
]);

function pianoChordXml({ simultaneous = true } = {}) {
  const noteXml = NOTES.map((note, index) => `
      <note>
        ${index > 0 && simultaneous ? '<chord/>' : ''}
        <pitch><step>${note.step}</step>${note.alter ? `<alter>${note.alter}</alter>` : ''}<octave>${note.octave}</octave></pitch>
        <duration>8</duration><voice>1</voice><staff>1</staff>
      </note>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list/>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>8</divisions></attributes>${noteXml}
    </measure>
  </part>
</score-partwise>`;
}

function source() {
  const events = NOTES.map((note, index) => ({
    sourceEventId: `p1-m1-n${index + 1}`,
    midi: note.midi,
    voice: '1',
    staff: 1,
  }));
  return {
    partId: 'P1',
    events,
    groups: [{
      sourceGroupId: 'piano-sonority-8',
      sourceEventIds: events.map((event) => event.sourceEventId),
    }],
  };
}

function policy(overrides = {}) {
  return {
    sourceGroupId: 'piano-sonority-8',
    spreadDivisions: 1,
    orderStrategies: ['SOURCE_ORDER', 'ASCENDING_PITCH', 'DESCENDING_PITCH', 'REVERSE_SOURCE_ORDER'],
    maxAlternatives: 8,
    ...overrides,
  };
}

test('A2C generates physically feasible no-loss arpeggio alternatives for an eight-note piano sonority', () => {
  const parsed = parseMusicXmlPartwise(pianoChordXml());
  const arrangementSource = source();
  const sidecar = buildArrangementTimelineSidecar(parsed.parts[0], arrangementSource);
  const result = generateTimelineBackedArpeggiationAlternatives(
    arrangementSource,
    sidecar,
    policy(),
  );

  assert.equal(result.sourceTimelineEvidence.status, 'COMPLETE');
  assert.equal(result.sourceTimelineEvidence.sourceGroupWasSimultaneous, true);
  assert.equal(result.sourceNoteLossAllowed, false);
  assert.equal(result.targetTimingAuthority, false);
  assert.equal(result.generation.status, 'COMPLETE');
  assert.ok(result.alternativeSet.alternativeCount >= 2);
  assert.equal(result.validationStatusCounts.FEASIBLE, result.alternativeSet.alternativeCount);

  for (const alternative of result.alternativeSet.alternatives) {
    const arpeggiation = alternative.decisions.find((decision) => decision.decisionType === 'ARPEGGIATED');
    assert.ok(arpeggiation);
    assert.equal(arpeggiation.sourceEventIds.length, 8);
    assert.equal(arpeggiation.target.orderedSourceEventIds.length, 8);
    assert.deepEqual(
      [...arpeggiation.target.orderedSourceEventIds].sort(),
      [...arrangementSource.groups[0].sourceEventIds].sort(),
    );
    assert.equal(
      alternative.decisions.some((decision) => decision.decisionType === 'OMITTED'),
      false,
    );
    assert.equal(
      alternative.decisions.some((decision) => decision.decisionType === 'CHORD_REDUCED'),
      false,
    );
  }

  for (const validation of result.validations) {
    assert.equal(validation.timelinePhysical.status, 'FEASIBLE');
    assert.equal(validation.timelinePhysical.sourceTimingAuthority, true);
    assert.equal(validation.timelinePhysical.targetTimingAuthority, false);
    assert.equal(validation.timelinePhysical.physicalSequence.witness.steps.length, 8);
  }
});

test('A2C never infers target spread from source duration', () => {
  const parsed = parseMusicXmlPartwise(pianoChordXml());
  const arrangementSource = source();
  const sidecar = buildArrangementTimelineSidecar(parsed.parts[0], arrangementSource);

  assert.throws(
    () => generateTimelineBackedArpeggiationAlternatives(
      arrangementSource,
      sidecar,
      { sourceGroupId: 'piano-sonority-8' },
    ),
    (error) => error instanceof TimelineBackedArpeggiationGeneratorError
      && error.code === 'A2C_EXPLICIT_SPREAD_REQUIRED',
  );
});

test('A2C refuses generation when the claimed source group is not simultaneous', () => {
  const parsed = parseMusicXmlPartwise(pianoChordXml({ simultaneous: false }));
  const arrangementSource = source();
  const sidecar = buildArrangementTimelineSidecar(parsed.parts[0], arrangementSource);
  const result = generateTimelineBackedArpeggiationAlternatives(
    arrangementSource,
    sidecar,
    policy(),
  );

  assert.equal(result.generation.status, 'TIMELINE_CONFLICT');
  assert.equal(result.sourceTimelineEvidence.reason, 'SOURCE_GROUP_NOT_SIMULTANEOUS');
  assert.equal(result.alternativeSet, null);
  assert.equal(result.validations.length, 0);
});

test('A2C candidate limit is PARTIAL_LIMIT rather than an impossibility claim', () => {
  const parsed = parseMusicXmlPartwise(pianoChordXml());
  const arrangementSource = source();
  const sidecar = buildArrangementTimelineSidecar(parsed.parts[0], arrangementSource);
  const result = generateTimelineBackedArpeggiationAlternatives(
    arrangementSource,
    sidecar,
    policy({ maxAlternatives: 1 }),
  );

  assert.equal(result.generation.status, 'PARTIAL_LIMIT');
  assert.equal(result.generation.candidateSpaceComplete, false);
  assert.equal(result.alternativeSet.alternativeCount, 1);
  assert.equal(result.validations[0].timelinePhysical.status, 'FEASIBLE');
});
