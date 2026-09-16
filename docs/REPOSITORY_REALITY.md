# Repository reality

Fresh-read scope: current V3B branch, source/tests, package scripts, CI, internal compatibility fixtures, committed V1B Engine evidence, pinned V1C external evidence, V2A/V2B failure evidence, V3A exact-position evidence, and V3B left-hand comparison evidence as of 2026-09-16.

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
  -> V3A exhaustive exact-position path oracle
  -> V3B independent left-hand finger/barre/reach oracle
  -> pinned Engine physical-layer comparison evidence
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
| `src/guitar/strictFeasibilityOracle.js` | exhaustive exact pitch/string/sustain reachability proof | no arrangement or production authority |
| `src/guitar/leftHandFeasibilityOracle.js` | independent static finger/barre/span/reach feasibility | bounded research policy, not ergonomic preference |
| `scripts/run-v3a-strict-feasibility-benchmark.mjs` | deterministic five-case V3A benchmark | internal research evidence only |
| `scripts/verify-v3a-strict-feasibility-report.mjs` | committed V3A baseline check | drift or overclaim fails CI |
| `scripts/run-v3b-left-hand-benchmark.mjs` | seven-case Lab ↔ pinned Engine left-hand status comparison | Engine is comparison target only |
| `scripts/verify-v3b-left-hand-benchmark-report.mjs` | committed V3B baseline check | drift, parity loss, or authority overclaim fails CI |

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

## V2A/V2B reality

V2A classifies all 66 current unsupported observations:

| Observation | Count |
|---|---:|
| raw trust-boundary failures | 44 |
| semantic capability failures | 22 |
| unclassified | 0 |

V2B refines the six formerly generic Engine projection cases into `direction` (3), `harmony` (2), and `notation:dynamics` (1). Four cases reach exact local scope; two harmony cases remain bounded region sets. All six are architecture-level `REVIEW_REQUIRED` candidates and V2B has zero semantic `BLOCKED_GLOBAL`.

Committed baselines:

```text
artifacts/v2/failure-intelligence-baseline.json
artifacts/v2b/projection-refinement-baseline.json
```

## V3A reality

V3A introduces an independent exact-position feasibility oracle with this proof scope:

```text
exact pitch
+ six-string fretboard position existence
+ distinct strings for simultaneous notes
+ stable string/fret for sustained notes
+ no arrangement transforms
```

The oracle carries every distinct reachable string/fret state forward instead of choosing one greedy path.

Pinned benchmark:

| Observation | Count |
|---|---:|
| benchmark cases | 5 |
| `FEASIBLE` | 2 |
| `INFEASIBLE` | 2 |
| `INDETERMINATE_LIMIT` | 1 |
| demonstrated legacy greedy false negatives | 1 |

The false-negative benchmark is concrete: the previous greedy verifier returns `BLOCKED / NO_DISTINCT_STRING_ASSIGNMENT`, while V3A retains alternate exact placements and finds a valid continuation path.

Committed V3A evidence:

```text
fixtures/v3a/benchmark.json
artifacts/v3a/strict-feasibility-baseline.json
```

## V3B reality

V3B adds an independent left-hand feasibility layer for fixed string/fret positions.

Current declared policy models:

```text
fretting fingers 1..4
open string finger 0
one finger -> one fret inside a static shape
ordered finger/fret relationships
partial/full barre legality
maximum static fret span = 4
maximum extra finger reach = 1
bounded assignment enumeration
```

Pinned benchmark summary:

| Observation | Count |
|---|---:|
| benchmark cases | 7 |
| Lab `FEASIBLE` | 3 |
| Lab `INFEASIBLE` | 3 |
| Lab `INDETERMINATE_LIMIT` | 1 |
| cross-repo comparable cases | 6 |
| pinned Engine status parity | 6 / 6 |

The cases cover open strings, compact C-major, an F-major barre shape, excessive static fret span, five distinct fretted frets, explicit finger-reach rejection, and a deliberately low assignment limit.

`INDETERMINATE_LIMIT` remains evidence exhaustion, not physical impossibility.

The pinned Engine is used only as a comparison target. V3B status parity does not make the Lab a wrapper around the Engine and does not make either repository production authority for final fingering.

Committed V3B evidence:

```text
fixtures/v3b/left-hand-benchmark.json
artifacts/v3b/left-hand-benchmark-baseline.json
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
8. regenerates/validates V2B cause/location evidence;
9. regenerates and verifies V3A strict-feasibility evidence;
10. regenerates V3B Lab ↔ Engine left-hand comparison evidence;
11. requires exact equality with the committed V3B baseline;
12. uploads reproducible evidence artifacts.

Engine and external corpus checkouts are CI evidence dependencies only; they are not Lab runtime dependencies.

## Capability interpretation

- V2 failure evidence is localized and semantic capability failures do not become global blocks;
- V3A can prove exact string/fret impossibility or show that exact reachability exists;
- V3B can further distinguish left-hand physical rejection from strict shapes that remain feasible under the declared policy;
- V3B `FEASIBLE` is not a claim of comfort, optimal fingering, or player-specific ease;
- V3 `INDETERMINATE_LIMIT` never becomes physical impossibility;
- production arrangement transformations are not Lab authority;
- learned guitar evidence remains future V4 research.

## Progressive-capability reality

The architecture distinguishes `SUPPORTED`, `APPROXIMATE`, `REVIEW_REQUIRED`, `UNSUPPORTED_LOCAL`, and `BLOCKED_GLOBAL` as capability states. The narrowest truthful scope is preferred, and semantic musical limitations are not automatically global blocks.

V2/V3 evidence remains non-authoritative until separately reviewed production work adopts it.

## Current continuation point

**V1B, V1C, V2A, V2B, V3A, and V3B are reproducible evidence layers.**

The principal next stage is **provenance-tracked Arrangement / N-best contracts**:

```text
strict source facts
      |
strict V3 feasibility evidence
      |
      +--> strict feasible candidate space
      |
      +--> strict infeasible region
              |
              v
explicit transformation alternatives
omission / octave displacement / register compression /
arpeggiation / voice prioritization
              |
              v
N-best alternatives with provenance
```

The arrangement layer must preserve source truth separately and record every transformation explicitly. It may not silently rewrite MusicXML semantics.

## Remaining known work

- provenance-tracked arrangement transformation contracts and N-best alternative schema;
- additive V2 harmony-location refinement if better Engine evidence becomes available;
- additional V1C fixtures such as `.mxl`, transposition, microtones and technical metadata;
- richer human/ergonomic benchmarks without weakening V3 hard constraints;
- V4 TabCNN/FretNet-style shadow evidence after benchmark/calibration gates;
- repository ruleset enforcement remains a separate administration concern.
