# Repository reality

Fresh-read scope: current V3A branch, source/tests, package scripts, CI, internal compatibility fixtures, committed V1B Engine evidence, pinned V1C external evidence, V2A taxonomy evidence, V2B cause/location refinement evidence, and V3A strict-feasibility evidence as of 2026-09-16.

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

physical research
  -> P2A fretboard candidates
  -> P2B distinct-string assignments
  -> legacy deterministic sustained/grace verifiers
  -> V3A exhaustive exact-position sustained-path oracle
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
| `src/guitar/strictFeasibilityOracle.js` | exhaustive exact pitch/string/sustain reachability proof | no left-hand finger/barre/reach or production authority |
| `scripts/run-v3a-strict-feasibility-benchmark.mjs` | deterministic five-case V3A benchmark | internal research evidence only |
| `scripts/verify-v3a-strict-feasibility-report.mjs` | committed V3A baseline check | drift or overclaim fails CI |
| P2 guitar modules | fretboard and distinct-string physical primitives | not production arrangement authority |

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

Committed V2A baseline: `artifacts/v2/failure-intelligence-baseline.json`.

## V2B reality

V2B re-runs the six formerly generic Engine projection cases against the pinned Engine production compatibility chain.

Observed feature split:

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

Four cases reach exact local scope. Two harmony cases remain bounded region sets because the Engine identifies `harmony` but not the single causal occurrence. All six are architecture-level `REVIEW_REQUIRED` candidates and V2B has zero semantic `BLOCKED_GLOBAL`.

Committed V2B baseline: `artifacts/v2b/projection-refinement-baseline.json`.

## V3A reality

V3A introduces an independent exact-position feasibility oracle.

Current physical proof scope:

```text
exact pitch
+ six-string fretboard position existence
+ distinct strings for simultaneous notes
+ stable string/fret for sustained notes
+ no arrangement transforms
```

Not modeled yet:

```text
left-hand finger assignment
barre feasibility
hand span / extra reach
ergonomics / player profile
```

The oracle carries every distinct reachable string/fret state forward instead of choosing one greedy path.

Pinned benchmark summary:

| Observation | Count |
|---|---:|
| benchmark cases | 5 |
| `FEASIBLE` | 2 |
| `INFEASIBLE` | 2 |
| `INDETERMINATE_LIMIT` | 1 |
| demonstrated legacy greedy false negatives | 1 |

The false-negative benchmark is concrete: the previous greedy verifier returns `BLOCKED / NO_DISTINCT_STRING_ASSIGNMENT`, while V3A retains six initial exact placements and finds five exact continuation states at the next point.

This proves that a single-path verifier failure is not automatically proof of physical impossibility.

Committed V3A evidence:

```text
fixtures/v3a/benchmark.json
artifacts/v3a/strict-feasibility-baseline.json
```

`INDETERMINATE_LIMIT` is intentionally separate from `INFEASIBLE`; a configured evidence bound is not physical proof.

## CI reality

`.github/workflows/ci.yml` runs for PRs to `main` and pushes to `stage/**`.

Current CI:

1. installs locked Lab dependencies;
2. runs syntax checks and tests;
3. checks out exact pinned Engine revision;
4. regenerates and byte-compares V1B evidence;
5. checks out exact external V1C corpus revision;
6. regenerates/validates V1C evidence and committed shards;
7. regenerates/validates V2A failure intelligence;
8. regenerates/validates V2B cause/location evidence;
9. runs the V3A five-case exhaustive feasibility benchmark;
10. compares regenerated V3A evidence with the committed baseline;
11. uploads reproducible evidence artifacts.

Engine and external corpus checkouts are CI evidence dependencies only; they are not Lab runtime dependencies.

## Capability interpretation

- V2 failure evidence is localized and semantic capability failures do not become global blocks;
- V3A can prove exact string/fret impossibility or show that exact reachability still exists;
- V3A `FEASIBLE` does **not** yet prove left-hand finger/barre/reach feasibility;
- therefore an Engine failure with V3A `FEASIBLE` is not yet automatically a search bug: stronger left-hand physics must be independently checked in V3B;
- production arrangement transformations are not Lab authority;
- learned guitar evidence remains future V4 research.

## Progressive-capability reality

The architecture distinguishes `SUPPORTED`, `APPROXIMATE`, `REVIEW_REQUIRED`, `UNSUPPORTED_LOCAL`, and `BLOCKED_GLOBAL` as capability states. The narrowest truthful scope is preferred, and semantic musical limitations are not automatically global blocks.

V2/V3 evidence remains non-authoritative until separately reviewed production work adopts it.

## Current continuation point

**V1B, V1C, V2A, V2B, and V3A are reproducible evidence layers.**

The principal next stage is **V3B Independent Left-Hand Physical Oracle**:

```text
V3A exact-position FEASIBLE
          |
          v
independent finger / barre / reach validation
          |
          +--> physically impossible under explicit left-hand policy
          |
          +--> physically feasible -> production search/capability-gap candidate
```

Additive V2 harmony-location refinement does not block V3B.

## Remaining known work

- V3B independent finger/barre/reach physical model;
- V3B pinned cross-repository comparison against production Engine physical failures;
- additive V2 harmony-location refinement if better Engine evidence becomes available;
- additional V1C fixtures such as `.mxl`, transposition, microtones and technical metadata;
- explicit provenance-tracked arrangement/N-best contracts;
- V4 ergonomic/TabCNN/FretNet-style shadow evidence after benchmark/calibration gates;
- repository ruleset enforcement remains a separate administration concern.
