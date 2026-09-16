# V2 — Failure Intelligence

## Status

V2A establishes the first deterministic failure-intelligence layer on top of the completed V1C 22-case capability baseline.

It is evidence-only. It does not change production Engine behavior, authorize automatic recovery, or turn Lab classifications into runtime authority.

Pinned evidence inputs:

```text
V1C cases: 22
external corpus: w3c-cg/musicxmlTestSuite
external commit: 77c19f7e819154c70ca1a1992e80dcda8ff82fea
Engine commit: 1d8ced644f544f7e991f7275eda77a2ce557774e
```

## Purpose

V1C records exact supported/unsupported outcomes. V2 adds a stable interpretation layer so an error is not treated as a single undifferentiated `BLOCKED` condition.

Each mapped failure receives:

- provider (`LAB` or `ENGINE`);
- phase (`RAW_INPUT` or `SEMANTIC_PROBE`);
- error code;
- failure family;
- architecture layer;
- narrowest reliable scope class available from the current evidence;
- handling/recovery class;
- candidate progressive state;
- refinement requirement;
- code-emission source anchors.

The classification does not rewrite source truth.

## Current evidence summary

The 22-case V1C baseline contains 66 unsupported observations:

| Class | Count |
|---|---:|
| Raw input trust-boundary failures | 44 |
| Semantic-probe capability failures | 22 |
| Semantic failures classified as review candidates | 16 |
| Semantic failures retained as local unsupported pending refinement | 6 |
| Unclassified observed failures | 0 |

Current failure-family counts:

| Failure family | Count |
|---|---:|
| `INPUT_SECURITY` | 44 |
| `GENERIC_PROJECTION_CAPABILITY` | 6 |
| `ORNAMENT_COMPATIBILITY` | 5 |
| `SOURCE_SEMANTIC_CAPABILITY` | 4 |
| `PLAYBACK_STRUCTURE` | 3 |
| `RHYTHM_COMPATIBILITY` | 2 |
| `SOURCE_SELECTION` | 1 |
| `PRESENTATION_COMPATIBILITY` | 1 |

These numbers describe the exact pinned corpus and revisions only.

## Taxonomy policy

### Raw trust boundary

`DOCTYPE_NOT_ALLOWED` and `UNSAFE_XML_DECLARATION` are classified as:

```text
failureFamily: INPUT_SECURITY
layer: TRUST_BOUNDARY
scopeClass: SCORE_INPUT
handlingClass: GLOBAL_TRUST_REJECT
progressiveStateCandidate: BLOCKED_GLOBAL
```

This is the intentionally narrow global-block exception: unsafe raw input may be rejected as an import operation.

### Semantic capability failures

Semantic-probe failures are forbidden from being promoted to `BLOCKED_GLOBAL` by the V2 taxonomy.

Current exact mappings include:

- `PART_SELECTION_REQUIRED` → source selection / `PART_SET` / `REVIEW_REQUIRED` candidate;
- `UNSUPPORTED_GRACE_NOTE` → Lab semantic extraction / `EVENT` / local semantic defer;
- `UNSUPPORTED_POLYPHONIC_TRIPLET_TIME_MODIFICATION` → rhythm compatibility / rhythmic event region;
- `UNSUPPORTED_POLYPHONIC_GRACE_ORNAMENT` → ornament compatibility / ornament event region;
- `UNSUPPORTED_POLYPHONIC_REPEAT_BARLINE` → playback structure / measure region;
- `UNSUPPORTED_POLYPHONIC_TIME_SIGNATURE_DISPLAY` → presentation compatibility / measure display.

These are recovery candidates, not automatic recovery authorization.

## Generic projection rule

`UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` is intentionally not assigned a fabricated precise cause.

It is classified as:

```text
failureFamily: GENERIC_PROJECTION_CAPABILITY
layer: PROJECTION_OR_COMPATIBILITY
scopeClass: UNKNOWN_LOCAL
handlingClass: NEEDS_FEATURE_REFINEMENT
progressiveStateCandidate: UNSUPPORTED_LOCAL
refinementRequired: true
```

Six current V1C cases fall into this group. Their category/feature-tag metadata is context only; it is not treated as proof of the causal unsupported feature.

This is the main V2B continuation target.

## Reproducibility

`src/failures/v2FailureIntelligence.js` contains the deterministic taxonomy.

`scripts/run-v2-failure-intelligence.mjs`:

1. reads the hash-pinned V1C report shards;
2. verifies the pinned Engine checkout identity;
3. classifies every unsupported observation;
4. verifies each mapped code against its Lab/Engine source-emission anchor;
5. rejects unclassified observed codes when `--assert-covered` is enabled;
6. forbids semantic-probe global blocking;
7. emits the full contextual V2 report.

`artifacts/v2/failure-intelligence-baseline.json` commits the stable regression projection. Context-only feature tags are intentionally excluded from the baseline projection.

`scripts/verify-v2-failure-intelligence-report.mjs` requires regenerated evidence to match the committed baseline exactly.

## Authority boundary

V2A does not:

- change `musicxml-to-guitar-tab-engine`;
- change the status returned by production runtime;
- make `REVIEW_REQUIRED` operational in production;
- create provisional TAB itself;
- authorize approximation or arrangement transforms;
- infer exact event/measure locations when current V1C artifacts do not carry them;
- infer physical guitar infeasibility;
- use learned evidence.

The `progressiveStateCandidate` field is architecture evidence for future reviewed product changes, not a production decision.

## Next — V2B

The next V2 slice should refine the six generic projection cases by collecting bounded live error details and source locations from the pinned Engine compatibility chain.

V2B acceptance target:

```text
UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE
        |
        v
bounded error.name / error.details / location evidence
        |
        +--> exact feature family where proven
        +--> narrowest reliable measure/event/region scope
        +--> otherwise remain UNKNOWN_LOCAL
```

No classification may become more specific only because a fixture name or feature tag suggests a cause.

After V2 failure causes and locations are sufficiently refined, V3 can compare production-search failures against an independent strict physical-feasibility oracle.
