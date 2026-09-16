# Architecture

## Purpose

`guitar-polyphony-lab` is an independent research and verification laboratory. It separates MusicXML source truth, physical guitar feasibility, production capability gaps, explicit arrangement transformations, and later ranking evidence.

The Lab does **not** own production TAB output. Production authority remains `musicxml-to-guitar-tab-engine`.

## Governing policy

The product direction is broad-capability rather than safe-by-refusal. Keep these layers separate:

1. source truth;
2. strict physical feasibility;
3. capability/failure intelligence;
4. local review/approximation;
5. explicit arrangement alternatives;
6. transformed-candidate physical validation;
7. deterministic/teacher/learned ranking;
8. export readiness.

A local musical limitation must not automatically become a whole-score block. Computational/generation bounds must not masquerade as physical impossibility.

## Implemented stage chain

```text
SOURCE MUSICXML
      |
      v
P1 trust boundary + parser
      |
      v
P0 source-polyphony facts
      |
      +--> V1 semantic/capability evidence
      |
      v
V2 localized failure intelligence
      |
      v
V3A exact pitch/string/sustain feasibility
      |
      v
V3B left-hand finger/barre/span/reach feasibility
      |
      +--> strict feasible -> strict transcription candidate
      |
      +--> strict infeasible / explicit arrangement request
                    |
                    v
A1 source-complete explicit N-best alternative contract
                    |
                    v
A2 bounded explicit-policy static candidate generation
                    |
                    v
fretboard -> distinct strings -> V3B physical revalidation
                    |
                    v
A2B temporal / combined-transform research
                    |
                    v
future deterministic / teacher / learned ranking
```

## Evidence layers

### V1

Pinned production Engine comparison target:

```text
1d8ced644f544f7e991f7275eda77a2ce557774e
```

V1C external corpus is pinned to `w3c-cg/musicxmlTestSuite` commit `77c19f7e819154c70ca1a1992e80dcda8ff82fea`.

Current 22-case probe summary:

```text
Lab supported:            17
Engine supported:          5
semantic EQUAL:            5
semantic MISMATCH:         0
semantic NOT_COMPARABLE:  17
```

### V2

V2A classifies 66 unsupported observations with zero unclassified. V2B refines the six generic Engine projection failures into `direction`, `harmony`, and `notation:dynamics` families with bounded local scope. Semantic musical gaps remain local evidence and are not automatic `BLOCKED_GLOBAL` states.

### V3

V3A carries all bounded exact string/fret states instead of one greedy path and contains a proven legacy greedy false negative.

V3B independently evaluates static left-hand feasibility. Its seven-case benchmark includes six cases comparable to the pinned Engine physical slice, with 6/6 normalized status parity.

`INDETERMINATE_LIMIT` is always distinct from `INFEASIBLE`.

## Arrangement A1 — representation contract

A1 defines explicit transformation provenance with production-aligned decision names:

```text
PRESERVED
OMITTED
OCTAVE_DISPLACED
VOICE_REDISTRIBUTED
CHORD_REDUCED
REVOICED
ARPEGGIATED
```

Every alternative must cover every source event exactly once. Silent omission and invented group membership are invalid.

A2 exposed an important target/source boundary error in A1 `1.0.0`: source sonorities were mistakenly bounded by the guitar's six strings. A1 `1.1.0` corrects this:

```text
source group != target guitar string count
maxSourceGroupEvents = 128
```

Thus an 8-note piano sonority remains an 8-note source fact even if a guitar realization later keeps only six notes.

A1 candidate order is enumeration only, never preference rank. Content-changing alternatives are review-required and have no production/export authority.

## Arrangement A2 — bounded static generator

A2 implements:

```text
src/arrangement/boundedArrangementGenerator.js
```

Initial automatic research transforms:

```text
CHORD_REDUCED
OCTAVE_DISPLACED
```

The generator accepts explicit policy inputs including target source group, allowed transforms, priority event IDs, candidate bounds, kept-note bounds, allowed octave deltas, and physical-search bounds.

### Priority preservation

Reduction generation must preserve all declared `priorityEventIds`. A policy that asks to preserve more priority notes than the realized guitar candidate may contain fails explicitly rather than silently dropping them.

### Candidate-bound semantics

When `maxAlternatives` cuts off the generation space:

```text
status = PARTIAL_LIMIT
candidateSpaceComplete = false
```

No claim is made that no other arrangement exists.

### Physical revalidation

Every emitted static candidate is realized from A1 provenance and independently validated through:

```text
exact target pitch set
 -> fretboard candidates
 -> distinct-string assignment
 -> V3B left-hand oracle
```

Possible results include `FEASIBLE`, `INFEASIBLE`, and `INDETERMINATE_LIMIT`.

A1 can represent `ARPEGGIATED`, but A2 does not automatically generate it yet because arpeggiation requires temporal validation. Current static validation returns `INDETERMINATE_TRANSFORM_SCOPE / TEMPORAL_REVALIDATION_REQUIRED` rather than false physical rejection.

## A2 committed benchmark

Evidence:

```text
fixtures/a2/benchmark.json
artifacts/a2/arrangement-generation-baseline.json
scripts/run-a2-arrangement-benchmark.mjs
scripts/verify-a2-arrangement-benchmark.mjs
```

Pinned summary:

```text
cases:                                   3
complete generation:                     2
partial-limit:                            1
strict-infeasible cases:                  3
cases with feasible transformed evidence: 2
```

The principal benchmark starts with an 8-note piano source sonority. Strict realization is infeasible because simultaneous active notes exceed six strings. A2 preserves all eight source facts and generates 15 six-note reduction alternatives; all 15 are physically feasible under the pinned research policy.

A second benchmark converts a strict out-of-range MIDI 28 pitch into a physically feasible explicit `+12` octave alternative without modifying the source event itself.

## Authority boundary

A2 explicitly remains:

```text
authority = LAB_RESEARCH_GENERATOR_ONLY
productionAuthority = false
automaticProductionTransformationAuthority = false
learnedRankingAuthority = false
candidateOrderIsPreferenceRank = false
```

Production activation of automatic content-changing arrangement remains a separate consequential review gate.

## Current continuation point

```text
V1 evidence ✅
V2 failure intelligence ✅
V3 independent physical evidence ✅
A1 explicit N-best provenance ✅
A2 bounded static generation + physical validation ✅
        |
        v
A2B TEMPORAL + COMBINED ARRANGEMENT RESEARCH  <--- NEXT
        |
        +--> arpeggiation temporal validation
        +--> bounded combined transforms
        +--> richer melody/bass/voice priority contracts
        +--> broader piano/polyphonic arrangement corpus
        |
        v
future ranking / teacher selection
```

## Learned evidence

Future TabCNN/FretNet-style providers remain below source truth and hard physical constraints:

```text
source truth
   > hard physical constraints
   > explicit arrangement policy
   > soft ergonomic / learned ranking evidence
```

Learned ranking remains shadow-only until benchmark, calibration, and candidate-invariance evidence exists.
