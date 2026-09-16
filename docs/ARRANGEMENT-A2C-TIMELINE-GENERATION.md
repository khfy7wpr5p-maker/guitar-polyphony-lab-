# Arrangement A2C — Timeline-backed no-loss generation

A2C connects arrangement alternatives to timing evidence already derived by the Lab MusicXML parser and measure timeline model.

## What A2C proves in this slice

`partwiseParser.js` emits stable note identities, duration, voice, staff and tie facts. `measureTimeline.js` derives note onset/end and simultaneous sonority spans. A2C binds those facts to arrangement source events without pitch-only guessing.

The sidecar contract is:

```text
src/arrangement/arrangementTimelineSidecar.js
```

Matching is allowed only by exact source/P0 identity or an explicit source-to-P0 map. MIDI, voice and staff facts must agree.

## Source timing vs target timing

A2C deliberately separates two authorities:

```text
sourceTimingAuthority = true   // when P0 evidence is complete
 targetTimingAuthority = false // current arpeggio spread remains explicit policy
```

A2C may prove that a source group was simultaneous. It does not infer target arpeggio speed from source duration.

`spreadDivisions` is therefore required explicitly by the generation policy.

## No-loss arpeggiation generation

```text
src/arrangement/timelineBackedArpeggiationGenerator.js
```

The initial generator produces deterministic order alternatives:

```text
SOURCE_ORDER
REVERSE_SOURCE_ORDER
ASCENDING_PITCH
DESCENDING_PITCH
```

Duplicate orders are removed. Candidate order is not a preference rank.

Every candidate:

1. covers the entire canonical source group with one `ARPEGGIATED` decision,
2. preserves all source events outside the group,
3. passes through the A1 exact-coverage contract,
4. is checked against P0 source timing evidence,
5. is revalidated as an exact-pitch guitar-position sequence,
6. remains review-required and non-production-authoritative.

No `OMITTED` or `CHORD_REDUCED` decision is needed for the no-loss arpeggio path.

## Eight-note piano evidence

The pinned A2C benchmark contains an eight-note simultaneous piano sonority. A six-string strict simultaneous realization cannot preserve eight active notes, but A2C can preserve all eight source events in a sequential guitar alternative.

Pinned result:

```text
source events:                 8
unique generated orders:       2
physically feasible orders:    2
source-note loss allowed:      false
source timing authority:       true
target timing authority:       false
```

This is important: reduction remains an available arrangement strategy, but it is no longer the only recovery path for source sonorities above six notes.

## Safety boundaries

A2C does not claim:

- production TAB authority,
- export authority,
- performance-speed feasibility,
- sustain/ringing behavior across generated arpeggio steps,
- ergonomic preference ranking,
- learned ranking,
- automatic selection of the musically best order.

If the source group is not actually simultaneous, generation returns `TIMELINE_CONFLICT` and emits no alternatives.

If the candidate bound is reached, generation returns `PARTIAL_LIMIT`; this is not physical impossibility.

## Evidence

```text
artifacts/a2c/timeline-arrangement-baseline.json
scripts/run-a2c-timeline-arrangement-benchmark.mjs
scripts/verify-a2c-timeline-arrangement-benchmark.mjs
```

## Next integration-facing work

Before production Engine integration, the next evidence gate should broaden A2C beyond the synthetic pinned case into real piano/non-guitar MusicXML corpus slices and define an explicit ordered same-event transform pipeline for cases such as octave displacement followed by arpeggiation.
