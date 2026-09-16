# V2 — Failure Intelligence

## Status

V2A and V2B are complete as evidence-only Lab stages on top of the pinned 22-case V1C baseline. They do not change production Engine behavior, authorize automatic recovery, or make Lab classifications runtime authority.

Pinned evidence inputs:

- V1C cases: 22
- external corpus: `w3c-cg/musicxmlTestSuite`
- external commit: `77c19f7e819154c70ca1a1992e80dcda8ff82fea`
- Engine commit: `1d8ced644f544f7e991f7275eda77a2ce557774e`

## V2A — taxonomy foundation

V2A classifies all 66 unsupported observations in the pinned V1C baseline by provider, phase, failure family, architecture layer, scope class, handling class, progressive-state candidate, refinement requirement, and source-code anchors.

Pinned V2A summary:

| Class | Count |
|---|---:|
| Raw input trust-boundary failures | 44 |
| Semantic-probe capability failures | 22 |
| Semantic review candidates before V2B | 16 |
| Generic projection cases sent to V2B | 6 |
| Unclassified observed failures | 0 |

Raw trust-boundary failures are the only current `BLOCKED_GLOBAL` candidates. Semantic capability evidence is forbidden from becoming `BLOCKED_GLOBAL` in the Lab taxonomy.

Committed baseline: `artifacts/v2/failure-intelligence-baseline.json`.

## V2B — generic projection refinement

V2B re-runs the six V1C cases whose Engine semantic-probe outcome is `UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` through the exact pinned production compatibility chain.

Refinement is based on live Engine `error.details` and exact source occurrence evidence. Fixture names and feature tags remain context only and are not treated as causal proof.

Observed Engine feature split:

| Engine feature | Cases |
|---|---:|
| `direction` | 3 |
| `harmony` | 2 |
| `notation:dynamics` | 1 |

Refined scope split:

| Scope | Cases | Evidence meaning |
|---|---:|---|
| `MEASURE_CHILD` | 3 | Engine supplied measure/child location and the matching source occurrence is exact |
| `NOTE_EVENT` | 1 | Engine identified `notation:dynamics` and the pinned source has one matching note occurrence |
| `FEATURE_REGION_SET` | 2 | Engine identified `harmony`, but multiple matching source occurrences remain |

Pinned V2B summary:

- cases: 6
- exact local scope: 4
- remaining location refinement required: 2
- `REVIEW_REQUIRED` architecture candidates: 6
- `UNSUPPORTED_LOCAL` after V2B refinement: 0
- semantic `BLOCKED_GLOBAL`: 0

Refined families:

- `DIRECTION_COMPATIBILITY`: 3
- `HARMONY_COMPATIBILITY`: 2
- `NOTATION_DYNAMICS_COMPATIBILITY`: 1

The direction cases preserve exact source subtype context such as `direction-type/dynamics`, `direction-type/metronome`, and `direction-type/octave-shift`. These shapes do not replace the Engine-emitted cause `direction`.

The notation-dynamics case is localized to one note event in measure 85 of the pinned source because the Engine cause is `notation:dynamics` and exactly one matching source occurrence exists.

The two harmony cases deliberately remain `FEATURE_REGION_SET`. The Engine identifies `harmony` but does not identify which individual harmony occurrence caused the first failure, so V2B does not invent that location.

## Reproducibility

V2A implementation:

- `src/failures/v2FailureIntelligence.js`
- `scripts/run-v2-failure-intelligence.mjs`
- `scripts/verify-v2-failure-intelligence-report.mjs`
- `artifacts/v2/failure-intelligence-baseline.json`

V2B implementation:

- `src/failures/v2bProjectionRefinement.js`
- `scripts/run-v2b-projection-refinement-discovery.mjs`
- `scripts/run-v2b-projection-refinement.mjs`
- `scripts/verify-v2b-projection-refinement-report.mjs`
- `artifacts/v2b/projection-refinement-baseline.json`

The V2B report generator verifies exact external and Engine revisions, captures bounded live error evidence, locates matching source occurrences, applies the deterministic refinement contract, forbids semantic global blocking, and emits reproducible evidence. CI regenerates V1B, V1C, V2A, and V2B evidence from pinned sources and requires the committed V2B baseline to match.

## Authority boundary

V2 does not:

- modify `musicxml-to-guitar-tab-engine`;
- change production runtime status;
- make `REVIEW_REQUIRED` operational in production;
- authorize automatic approximation or recovery;
- create arrangement transformations;
- decide strict physical guitar feasibility;
- use learned evidence.

All progressive-state fields are architecture evidence for future separately reviewed production changes.

## Next — V3 independent feasibility oracle

The two unresolved harmony occurrence sets may be refined additively if later Engine evidence exposes an exact location. They do not block the next principal research stage.

V3 should independently distinguish true untransformed guitar impossibility from production search/capability failure. The oracle remains offline/CI evidence and must not become production runtime authority.
