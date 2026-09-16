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
| Arrangement A2C timeline-bearing generation | NEXT | real onset/duration evidence where available + explicit same-event transform pipelines |
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

V2A classifies 66 unsupported observations with zero unclassified. V2B refines the six formerly generic Engine projection failures into:

```text
direction          3
harmony            2
notation:dynamics  1
```

Semantic capability gaps remain localized evidence; they do not become automatic `BLOCKED_GLOBAL` decisions.

## V3 summary

V3A independently proves exact string/fret/sustain reachability and distinguishes bounded evidence exhaustion from physical impossibility.

V3B adds independent finger/barre/span/reach validation. Its pinned benchmark contains 7 cases; 6 are directly comparable to the pinned Engine physical slice and all 6 have status parity.

Committed evidence:

```text
artifacts/v3a/strict-feasibility-baseline.json
artifacts/v3b/left-hand-benchmark-baseline.json
```

## Arrangement A1 — explicit N-best provenance

A1 defines `GuitarArrangementAlternativeSet`. Decision vocabulary is aligned with the production arrangement language:

```text
PRESERVED
OMITTED
OCTAVE_DISPLACED
VOICE_REDISTRIBUTED
CHORD_REDUCED
REVOICED
ARPEGGIATED
```

Every alternative must account for every source event exactly once. Silent note loss is invalid. Content-changing candidates remain review-required and have no production/export authority.

A2 exposed one important A1 contract mistake: **source groups must not be limited by the guitar's six strings**. A piano sonority may contain more than six events. The contract is therefore now `1.1.0`, with source groups independent from target-guitar string count.

## Arrangement A2 — bounded generation + physical revalidation

A2 implements the first explicit-policy arrangement generator:

```text
src/arrangement/boundedArrangementGenerator.js
```

Initial generated transforms:

```text
CHORD_REDUCED
OCTAVE_DISPLACED
```

Every emitted static candidate is revalidated through:

```text
realized pitch set
 -> fretboard candidates
 -> distinct-string assignment
 -> independent V3B left-hand oracle
```

A2 policy can declare priority source events that reduction candidates are forbidden to remove. Candidate enumeration is deterministic, but **candidate order is not quality/preference ranking**.

A candidate bound returns:

```text
PARTIAL_LIMIT
candidateSpaceComplete = false
```

not physical impossibility.

### Pinned A2 benchmark

```text
cases:                                   3
complete generation cases:               2
partial-limit cases:                      1
cases with strict infeasibility:          3
cases with feasible transformed evidence: 2
```

The most important case starts with an **8-note piano source sonority**. Strict realization fails because only six guitar strings exist, but source truth remains all eight notes. Under explicit reduction policy A2 emits 15 six-note alternatives; in the pinned benchmark all 15 are physically feasible.

A second case proves an out-of-range MIDI 28 source note can remain preserved in source facts while an explicit `+12` octave candidate becomes physically feasible.

Committed evidence:

```text
fixtures/a2/benchmark.json
artifacts/a2/arrangement-generation-baseline.json
scripts/run-a2-arrangement-benchmark.mjs
scripts/verify-a2-arrangement-benchmark.mjs
```

See `docs/ARRANGEMENT-A2-BOUNDED-GENERATION.md`.

## Arrangement A2B — abstract temporal validation + safe composition

A2B adds:

```text
src/arrangement/temporalArpeggiationValidator.js
src/arrangement/disjointTransformComposition.js
```

An explicit `ARPEGGIATED` decision can now be validated as an exact-pitch ordered guitar-position path. Because A1 source events do not yet carry full onset/duration facts, A2B deliberately labels this evidence:

```text
sequenceSemantics = ABSTRACT_SPREAD_SEQUENCE
timingAuthority = false
sourceOnsetsAvailable = false
sourceDurationsAvailable = false
```

`spreadDivisions` and source-event order are preserved, but no real MusicXML playback timeline is invented. Every selected arpeggio step has an exact fretboard position and an independent per-step left-hand check.

A2B also composes multiple transforms when their source-event scopes are disjoint. The composed candidate is rebuilt and passed through A1 again, so exact source coverage remains mandatory.

If two transforms touch the same source event, A2B does not silently decide an order. It returns:

```text
OVERLAPPING_SCOPE
SOURCE_EVENT_TRANSFORMED_MORE_THAN_ONCE
```

This local result is not a global product block; it marks the need for a richer explicit ordered transform pipeline.

### Pinned A2B benchmark

```text
cases:                    3
abstract temporal FEASIBLE: 1
disjoint COMPOSED:           1
overlapping scope:           1
```

Committed evidence:

```text
artifacts/a2b/temporal-composition-baseline.json
scripts/run-a2b-temporal-composition-benchmark.mjs
scripts/verify-a2b-temporal-composition-benchmark.mjs
```

See `docs/ARRANGEMENT-A2B-TEMPORAL-COMPOSITION.md`.

## Authority boundaries

- No Lab arrangement module changes production runtime behavior.
- A2/A2B have `automaticProductionTransformationAuthority = false`.
- Content-changing alternatives remain review-required.
- Source events may not silently disappear.
- `INDETERMINATE_LIMIT` / `PARTIAL_LIMIT` are not impossibility.
- A2B arpeggio feasibility is exact-position sequence evidence, not real timing/performance proof.
- Overlapping same-event transforms require explicit ordered provenance before composition is allowed.
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
       physical revalidation of every candidate
                    |
                    v
       A2B abstract temporal validation
       + disjoint transform composition
                    |
                    v
       A2C timeline-bearing generation
       + ordered same-event transform pipeline
                    |
                    v
       future ranking / teacher selection
```

## Roadmap

- V1A/V1B/V1C — complete
- V2A/V2B — complete
- V3A/V3B — complete
- Arrangement A1 — complete
- Arrangement A2 initial static generator — complete
- Arrangement A2B abstract temporal validator + disjoint composition — complete
- **Arrangement A2C timeline-bearing arpeggiation generation + ordered same-event transform pipeline — NEXT**
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
- `docs/FRETNET_RESEARCH.md`
- `SECURITY.md`
