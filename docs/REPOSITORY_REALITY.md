# Repository reality

Fresh-read scope: current V2B branch, source/tests, package scripts, CI, internal compatibility fixtures, committed V1B Engine evidence, pinned V1C external evidence, V2A taxonomy evidence, and V2B cause/location refinement evidence as of 2026-09-16.

This document describes repository reality, not general production capability claims for `musicxml-to-guitar-tab-engine`.

## Current evidence chain

```text
internal fixtures
  -> P1A/P1B/P0 Lab facts
  -> V1B Lab ↔ pinned Engine semantic comparison

pinned external MusicXML corpus
  -> raw trust-boundary observations
  -> approved CI-only semantic probes
  -> V1C capability report
  -> V2A failure taxonomy
  -> V2B generic projection cause/location refinement

P0 facts may also feed
  -> P2A fretboard candidates
  -> P2B distinct-string assignments
  -> sustained/grace research verifiers
```

## Implemented contracts

| Module | Current role | Authority boundary |
|---|---|---|
| `src/musicxml/inputGate.js` | bounded UTF-8 / hostile-XML trust gate | evidence/security authority before Lab parsing |
| `src/musicxml/partwiseParser.js` | bounded MusicXML semantic extraction | does not guess unsupported source shapes |
| `src/polyphony/measureTimeline.js` | deterministic timeline/sonority reconstruction | per-measure Lab reference semantics |
| `src/verification/semanticComparator.js` | Lab ↔ Engine semantic comparison | pinned evidence only |
| `src/corpus/v1cCapabilityCorpus.js` | V1C provenance/hash/outcome contract | local unsupported states remain valid evidence |
| `src/failures/v2FailureIntelligence.js` | V2A failure taxonomy | semantic failures cannot become global blocks |
| `src/failures/v2bProjectionRefinement.js` | V2B refinement of generic Engine projection failures | evidence-only; no automatic recovery authority |
| `scripts/run-v2b-projection-refinement-discovery.mjs` | bounded live Engine detail + exact source occurrence extraction | internal evidence extraction, not production behavior |
| `scripts/run-v2b-projection-refinement.mjs` | deterministic six-case V2B report | exact pinned Engine/corpus only |
| `scripts/verify-v2b-projection-refinement-report.mjs` | committed V2B regression check | drift fails CI |
| P2 guitar modules | physical candidate/assignment research | not production arrangement authority |

## Pinned repositories and revisions

Production Engine:

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

## V1C reality

The schema-v2 V1C manifest contains 22 pinned cases with source blob SHA, raw SHA-256, semantic-probe SHA-256, approved transform, Lab/Engine outcomes, and semantic comparison outcome.

Current probe summary:

| Observation | Count |
|---|---:|
| Lab `SUPPORTED` | 17 |
| Lab `UNSUPPORTED_LOCAL` | 5 |
| Engine `SUPPORTED` | 5 |
| Engine `UNSUPPORTED_LOCAL` | 17 |
| semantic `EQUAL` | 5 |
| semantic `MISMATCH` | 0 |
| semantic `NOT_COMPARABLE` | 17 |

Raw DOCTYPE rejection is security evidence, not musical-support evidence. CI-only semantic probing does not alter raw production security behavior.

## V2A reality

V2A classifies all 66 current unsupported observations:

| Observation | Count |
|---|---:|
| raw trust-boundary failures | 44 |
| semantic capability failures | 22 |
| unclassified | 0 |

Before V2B, six Engine semantic cases remained deliberately generic because the shared code `UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` has multiple emitters.

Committed V2A baseline: `artifacts/v2/failure-intelligence-baseline.json`.

## V2B reality

V2B re-runs exactly those six generic Engine cases against the pinned Engine production compatibility chain and captures bounded live `error.details` plus exact source occurrences.

Observed Engine feature split:

| Feature | Cases |
|---|---:|
| `direction` | 3 |
| `harmony` | 2 |
| `notation:dynamics` | 1 |

Refined scope split:

| Scope | Cases |
|---|---:|
| `MEASURE_CHILD` | 3 |
| `NOTE_EVENT` | 1 |
| `FEATURE_REGION_SET` | 2 |

Four cases reach exact local scope. Two harmony cases remain bounded region sets because the Engine identifies `harmony` but not the single causal occurrence.

All six are architecture-level `REVIEW_REQUIRED` candidates. V2B has zero semantic `BLOCKED_GLOBAL`, does not change production status, and does not authorize recovery.

Committed V2B baseline:

```text
artifacts/v2b/projection-refinement-baseline.json
```

## CI reality

`.github/workflows/ci.yml` runs for PRs to `main` and pushes to `stage/**`.

Current CI:

1. installs locked Lab dependencies;
2. runs syntax checks and tests;
3. checks out the exact pinned Engine revision;
4. regenerates and byte-compares V1B evidence;
5. checks out the exact external V1C corpus revision;
6. regenerates/validates V1C evidence and committed shards;
7. regenerates/validates V2A failure intelligence;
8. regenerates V2B live cause/location evidence;
9. verifies the committed V2B regression baseline;
10. uploads V1B/V1C/V2A/V2B evidence artifacts.

Engine and external corpus checkouts are CI evidence dependencies only; they are not Lab runtime dependencies.

## Capability interpretation

- exact V1C equality exists for the pinned `03b`, `21a`, `33b`, `43a`, and `43i` fixtures;
- tuplets, grace notation, repeat structures and presentation features remain localized capability evidence rather than global corpus failure;
- V2B now separates generic projection evidence into direction, harmony and notation-dynamics families;
- unresolved harmony occurrence identity remains explicit uncertainty;
- production arrangement transformations are not Lab authority;
- learned guitar evidence remains future V4 research.

## Progressive-capability reality

The architecture distinguishes `SUPPORTED`, `APPROXIMATE`, `REVIEW_REQUIRED`, `UNSUPPORTED_LOCAL`, and `BLOCKED_GLOBAL` as capability states. The narrowest truthful scope is preferred, and semantic musical limitations are not automatically global blocks.

V2 candidate states remain evidence metadata until separately reviewed production work adopts them.

## Current continuation point

**V1B, V1C, V2A, and V2B are reproducible evidence layers.**

The principal next stage is **V3 Independent Feasibility Oracle**:

```text
production/search/capability failure
          vs
true strict untransformed guitar impossibility
```

V3 must remain offline/CI evidence and independent from production path selection. Exact occurrence refinement for the two harmony region sets is additive and does not block V3.

## Remaining known work

- V3 independent strict-feasibility oracle;
- additive V2 harmony-location refinement if better Engine location evidence becomes available;
- additional V1C fixtures such as `.mxl`, transposition, microtones and technical metadata;
- explicit provenance-tracked arrangement/N-best contracts;
- V4 ergonomic/TabCNN/FretNet-style shadow evidence after benchmark/calibration gates;
- repository ruleset enforcement remains a separate administration concern.
