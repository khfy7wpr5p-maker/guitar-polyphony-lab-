# Guitar Polyphony Lab

Evidence-first research and verification laboratory for guitar polyphony, MusicXML semantics, physical feasibility, arrangement research, and future guitar-specific ranking evidence.

The Lab independently verifies source-score facts, physical guitar feasibility, production/Lab differences, and explicit recovery/arrangement alternatives without corrupting source truth. It is **not** the production TAB authority; production behavior remains in `musicxml-to-guitar-tab-engine`.

## Product direction

The long-term goal is broad-capability MusicXML-to-guitar realization, including piano/non-guitar input, not a narrow rejection engine.

> Preserve source truth, localize uncertainty, produce what is safely possible, keep provisional output editable, and reserve whole-score blocking for genuinely global failures.

Verification-stage strictness is an evidence boundary, not the permanent product ceiling.

## Current stage map

| Stage | Status | Current evidence |
|---|---|---|
| V1B Engine/Lab semantic comparator | COMPLETE | pinned real Engine evidence |
| V1C external MusicXML corpus | COMPLETE | 22 pinned cases; 5 semantic EQUAL; 0 MISMATCH |
| V2A failure intelligence | COMPLETE | 66 observations, 8 families, 0 unclassified |
| V2B generic projection refinement | COMPLETE | 6/6 generic failures localized/refined |
| V3A exact string/fret oracle | COMPLETE | exhaustive reachability + proven greedy false negative |
| V3B left-hand physical oracle | COMPLETE | 7 cases; 6/6 status parity with pinned Engine comparison slice |
| Arrangement A1 explicit N-best contract | COMPLETE | exact source coverage + transform provenance |
| Arrangement A2 bounded generation | COMPLETE — INITIAL STATIC SLICE | reduction + octave generation; every static candidate physically revalidated |
| Arrangement A2B temporal/composition | COMPLETE — ABSTRACT TEMPORAL SLICE | arpeggio exact-position sequence validation + disjoint transform composition |
| Arrangement A2C timeline-backed generation | COMPLETE — INITIAL NO-LOSS SLICE | P0 onset/duration evidence + 8-note no-loss arpeggio generation |
| Arrangement A3 real-corpus/integration gate | COMPLETE — COMMITTED BASELINE + PRODUCTION CONTRACT | 5/5 pinned real-piano support; CI-reproduced baseline; Engine migration contract pinned to current production main |
| V4 learned evidence | FUTURE | TabCNN/FretNet-style shadow evidence only |

## Pinned evidence revisions

Production Engine comparison target:

```text
1d8ced644f544f7e991f7275eda77a2ce557774e
```

External MusicXML corpus:

```text
w3c-cg/musicxmlTestSuite
77c19f7e819154c70ca1a1992e80dcda8ff82fea
MIT
```

## V1 / V2 summary

V1C pinned probe summary:

```text
cases:                    22
Lab semantic supported:   17
Engine supported:          5
semantic EQUAL:            5
semantic MISMATCH:         0
semantic NOT_COMPARABLE:  17
```

V2A classifies 66 unsupported observations with zero unclassified. V2B refines the six formerly generic Engine projection failures into direction, harmony and notation:dynamics families. Semantic capability gaps remain localized evidence; they do not become automatic `BLOCKED_GLOBAL` decisions.

## V3 summary

V3A independently proves exact string/fret/sustain reachability and distinguishes bounded evidence exhaustion from physical impossibility.

V3B adds independent finger/barre/span/reach validation. Its pinned benchmark contains 7 cases; 6 are directly comparable to the pinned Engine physical slice and all 6 have status parity.

Committed evidence:

```text
artifacts/v3a/strict-feasibility-baseline.json
artifacts/v3b/left-hand-benchmark-baseline.json
```

## Arrangement A1 — explicit N-best provenance

A1 defines `GuitarArrangementAlternativeSet` with:

```text
PRESERVED
OMITTED
OCTAVE_DISPLACED
VOICE_REDISTRIBUTED
CHORD_REDUCED
REVOICED
ARPEGGIATED
```

Every alternative must account for every source event exactly once. Silent note loss is invalid. Source groups are independent from the guitar's six-string target capacity, so piano sonorities may contain more than six source events.

## Arrangement A2 — bounded static generation

A2 generates explicit `CHORD_REDUCED` and `OCTAVE_DISPLACED` candidates and revalidates each static realization through fretboard, distinct-string assignment and the independent V3B left-hand oracle.

The pinned A2 benchmark includes an 8-note piano sonority: strict simultaneous realization is infeasible on six strings, while explicit reduction produces physically feasible six-note alternatives. Candidate exhaustion returns `PARTIAL_LIMIT`, never physical impossibility.

## Arrangement A2B — abstract temporal validation + safe composition

A2B validates an explicit `ARPEGGIATED` decision as an exact-pitch ordered guitar-position path while keeping:

```text
timingAuthority = false
sequenceSemantics = ABSTRACT_SPREAD_SEQUENCE
```

It also composes transforms when source-event scopes are disjoint. Same-event overlap returns `OVERLAPPING_SCOPE`; transform order is never silently guessed.

Committed evidence:

```text
artifacts/a2b/temporal-composition-baseline.json
```

## Arrangement A2C — real source timeline + no-loss arpeggio generation

A2C binds arrangement source events to the timing facts already produced by the Lab parser and P0 timeline model:

```text
MusicXML duration/voice/staff/tie
        -> P0 onset/end
        -> ArrangementTimelineSidecar
```

The match is exact identity or an explicit source-to-P0 map. Pitch-only guessing is forbidden. MIDI, voice and staff facts must agree.

A2C then generates bounded `ARPEGGIATED` alternatives only when the source group is proven simultaneous. `spreadDivisions` must be explicit policy; target timing is not inferred from source duration.

The pinned A2C case contains an **8-note simultaneous piano sonority**. Two unique deterministic arpeggio orders are generated and both preserve all 8 source events while producing physically feasible exact-pitch guitar sequences.

```text
source events:                 8
feasible no-loss candidates:   2
sourceNoteLossAllowed:          false
sourceTimingAuthority:          true
targetTimingAuthority:          false
```

Reduction therefore remains an option, but it is no longer the only recovery path when a source sonority exceeds six simultaneous notes.

Committed evidence:

```text
artifacts/a2c/timeline-arrangement-baseline.json
scripts/run-a2c-timeline-arrangement-benchmark.mjs
scripts/verify-a2c-timeline-arrangement-benchmark.mjs
```

See `docs/ARRANGEMENT-A2C-TIMELINE-GENERATION.md`.

## Authority boundaries

- No Lab arrangement module changes production runtime behavior.
- A2/A2B/A2C have no automatic production transformation authority.
- Source events may not silently disappear.
- `INDETERMINATE_LIMIT` / `PARTIAL_LIMIT` are not impossibility.
- A2C has source timing authority only where P0 evidence is complete.
- A2C does not infer target arpeggio speed, sustain policy, ergonomic preference or ranking.
- Overlapping same-event transforms still require an explicit ordered transform pipeline.
- Learned ranking remains below source truth and hard physical validity.

## Architecture direction

```text
SOURCE MUSICXML
      |
      v
source facts / provenance
      |
      v
V2 localized failure intelligence
      |
      v
V3 exact + left-hand physical evidence
      |
      +--> strict feasible -> strict transcription candidate
      |
      +--> strict infeasible / explicit arrangement request
                    |
                    v
            A1 explicit N-best contract
                    |
                    v
            A2 bounded static generation
                    |
                    v
       A2B abstract temporal validation
       + safe disjoint composition
                    |
                    v
       A2C P0-backed source timeline
       + no-loss arpeggio generation
                    |
                    v
       A3 real piano/non-guitar corpus validation
                    |
                    v
       ARRANGEMENT_CONTRACT_STABLE
                    |
          =====================
          PRODUCTION INTEGRATION GATE
          =====================
                    |
                    v
       musicxml-to-guitar-tab-engine
```

## Roadmap

- V1A/V1B/V1C — complete
- V2A/V2B — complete
- V3A/V3B — complete
- Arrangement A1 — complete
- Arrangement A2 — complete initial static generator
- Arrangement A2B — complete abstract temporal/composition slice
- Arrangement A2C — complete initial P0-backed no-loss timeline slice
- Arrangement A3 real piano/non-guitar corpus validation + production integration contract — complete in Lab; production migration is next
- V4 learned/ergonomic providers — later, shadow-only until benchmark/calibration gates

## Commands

```bash
npm ci --ignore-scripts
npm run check
npm test
```

Node.js 22 or newer is required.

## Maintained documents

- `docs/ARCHITECTURE.md`
- `docs/REPOSITORY_REALITY.md`
- `docs/DOCUMENTATION_AUDIT.md`
- `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md`
- `docs/V2-FAILURE-INTELLIGENCE.md`
- `docs/V3-INDEPENDENT-FEASIBILITY-ORACLE.md`
- `docs/ARRANGEMENT-NBEST-CONTRACT.md`
- `docs/ARRANGEMENT-A2-BOUNDED-GENERATION.md`
- `docs/ARRANGEMENT-A2B-TEMPORAL-COMPOSITION.md`
- `docs/ARRANGEMENT-A2C-TIMELINE-GENERATION.md`
- `docs/ARRANGEMENT-A3-PRODUCTION-INTEGRATION-CONTRACT.md`
- `docs/FRETNET_RESEARCH.md`
- `SECURITY.md`
