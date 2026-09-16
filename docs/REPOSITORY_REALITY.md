# Repository reality

Fresh-read scope: current Arrangement A2 branch, source/tests, package scripts, CI, V1/V2 evidence, V3A/V3B physical evidence, A1 arrangement contract, A2 bounded generator, and committed A2 benchmark as of 2026-09-16.

This document describes repository reality, not general production capability claims for `musicxml-to-guitar-tab-engine`.

## Current chain

```text
MusicXML/source facts
 -> V1 semantic/capability evidence
 -> V2 localized failure intelligence
 -> V3 exact + left-hand physical evidence
 -> A1 source-complete arrangement alternatives
 -> A2 bounded explicit-policy candidate generation
 -> independent physical validation of every static candidate
```

## Implemented modules

| Module | Current role | Authority boundary |
|---|---|---|
| `src/musicxml/inputGate.js` | bounded hostile-input gate | Lab security/reference boundary |
| `src/polyphony/measureTimeline.js` | deterministic source timeline/sonority facts | source-semantics reference |
| `src/verification/semanticComparator.js` | Lab ↔ pinned Engine semantic comparison | evidence only |
| `src/failures/v2FailureIntelligence.js` | failure family/layer/scope taxonomy | semantic gaps cannot become automatic global blocks |
| `src/failures/v2bProjectionRefinement.js` | generic projection cause/location refinement | evidence only |
| `src/guitar/strictFeasibilityOracle.js` | exhaustive exact pitch/string/sustain reachability | no arrangement authority |
| `src/guitar/leftHandFeasibilityOracle.js` | independent finger/barre/span/reach feasibility | bounded research policy |
| `src/arrangement/arrangementAlternativeSet.js` | source-complete explicit N-best/provenance contract | no automatic production transform/rank/export authority |
| `src/arrangement/boundedArrangementGenerator.js` | bounded explicit-policy reduction/octave generation + static physical revalidation | Lab research generator only |

## Pinned external evidence

Production Engine comparison target:

```text
khfy7wpr5p-maker/musicxml-to-guitar-tab-engine
1d8ced644f544f7e991f7275eda77a2ce557774e
```

External MusicXML corpus:

```text
w3c-cg/musicxmlTestSuite
77c19f7e819154c70ca1a1992e80dcda8ff82fea
MIT
```

## V1/V2 reality

V1C has 22 pinned external cases:

```text
Lab supported:           17
Engine supported:         5
semantic EQUAL:           5
semantic MISMATCH:        0
semantic NOT_COMPARABLE: 17
```

V2A classifies 66 unsupported observations with zero unclassified. V2B refines the six generic Engine projection cases into `direction` (3), `harmony` (2), and `notation:dynamics` (1). These remain localized/review evidence rather than whole-score blocks.

## V3 reality

V3A preserves all bounded reachable exact string/fret states and contains a proven greedy false negative.

V3B independently validates static left-hand shapes. Its seven-case benchmark has six cross-repository comparable cases and 6/6 normalized status parity with the pinned Engine physical slice.

Committed evidence:

```text
artifacts/v3a/strict-feasibility-baseline.json
artifacts/v3b/left-hand-benchmark-baseline.json
```

Evidence/search exhaustion remains `INDETERMINATE_LIMIT`, never physical impossibility.

## Arrangement A1 reality

A1 decision vocabulary matches the production arrangement language:

```text
PRESERVED
OMITTED
OCTAVE_DISPLACED
VOICE_REDISTRIBUTED
CHORD_REDUCED
REVOICED
ARPEGGIATED
```

Every alternative accounts for every source event exactly once. Group transforms require exact canonical group membership. Candidate order is not preference rank.

A2 discovered and corrected an A1 `1.0.0` narrowness: source group size was incorrectly tied to six guitar strings. Current A1 contract is `1.1.0`:

```text
maxSourceGroupEvents = 128
```

This allows piano/polyphonic source truth to exceed six simultaneous notes without being treated as malformed.

## Arrangement A2 reality

A2 implements bounded generation for:

```text
CHORD_REDUCED
OCTAVE_DISPLACED
```

Current research policy fields include:

```text
sourceGroupId
allowedTransforms
priorityEventIds
maxAlternatives
maxKeptNotes
minKeptNotes
octaveSemitoneDeltas
maxAssignments
leftHandMaxAssignmentAttempts
```

Reduction candidates must retain all explicit priority events. Octave candidates use only declared whole-octave deltas.

Every emitted static candidate is revalidated through:

```text
getPositionCandidates
 -> enumerateSonorityAssignments
 -> evaluateIndependentLeftHandFeasibility
```

Physical outcomes remain distinct from generator completeness. When candidate enumeration is cut off:

```text
PARTIAL_LIMIT
candidateSpaceComplete = false
```

No claim is made that no playable arrangement exists.

### A2 pinned benchmark

```text
fixtures/a2/benchmark.json
artifacts/a2/arrangement-generation-baseline.json
scripts/run-a2-arrangement-benchmark.mjs
scripts/verify-a2-arrangement-benchmark.mjs
```

Pinned summary:

| Observation | Count |
|---|---:|
| benchmark cases | 3 |
| complete-generation cases | 2 |
| partial-limit cases | 1 |
| strict-infeasible cases | 3 |
| cases with feasible transformed evidence | 2 |

The `piano-eight-reduction` fixture contains eight simultaneous source events. Strict realization is infeasible because active notes exceed six strings. Source truth remains eight events. A2 emits 15 six-note reduction candidates under the pinned policy; all 15 are physically feasible. A required candidate keeping `e1..e6` remains source-complete in A1 provenance and review-required.

The `low-pitch-octave-recovery` fixture proves strict MIDI 28 is out of Standard guitar range while explicit `+12` octave displacement has a physical witness.

The `candidate-limit-is-indeterminate` fixture proves a small candidate bound produces `PARTIAL_LIMIT`, not false impossibility/completeness.

## CI reality

CI on `stage/**` and PRs to `main` now:

1. runs syntax/tests;
2. regenerates V1B evidence;
3. regenerates/verifies V1C;
4. regenerates/verifies V2A/V2B;
5. regenerates/verifies V3A/V3B;
6. regenerates A2 bounded arrangement evidence;
7. deep-compares it with the committed A2 baseline;
8. uploads evidence artifacts.

## Authority reality

A2 explicitly has:

```text
authority = LAB_RESEARCH_GENERATOR_ONLY
productionAuthority = false
automaticProductionTransformationAuthority = false
learnedRankingAuthority = false
candidateOrderIsPreferenceRank = false
```

No automatic note-changing production behavior has been enabled.

A1 can represent arpeggiation, but current A2 does not automatically generate it because temporal physical validation is not yet implemented. That is an implementation boundary, not a permanent product-support restriction.

## Current continuation point

**V1, V2, V3, A1, and the A2 initial static generation slice are implemented and reproducible.**

Next principal stage:

```text
A2B temporal + combined arrangement research
  -> arpeggiation temporal validation
  -> bounded combined transforms
  -> richer melody/bass/voice-priority policy
  -> broader piano/polyphonic arrangement corpus
```

Automatic content-changing behavior in the production Engine remains a separate consequential gate.
