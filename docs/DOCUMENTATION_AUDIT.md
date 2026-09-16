# Documentation audit

Fresh-read classification against the current V2B branch source, tests, pinned V1B Engine evidence, 22-case V1C external evidence, committed V2A taxonomy evidence, committed V2B projection-refinement evidence, package metadata, CI, and the 2026-09-16 progressive-capability directive.

| Document set | Classification | Current meaning |
|---|---|---|
| `README.md` | CURRENT | project purpose, V1/V2 closure and V3 continuation |
| `docs/ARCHITECTURE.md` | CURRENT | authority boundaries, completed V2A/V2B evidence layers and V3/arrangement/V4 direction |
| `docs/REPOSITORY_REALITY.md` | CURRENT_BASELINE | implementation, pinned V1/V2 evidence, current CI and exact remaining uncertainty |
| `docs/V1B-SEMANTIC-COMPARATOR.md` | CURRENT | real Engine artifact provenance and reproducible V1B loop |
| `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md` | CURRENT | pinned external source/license and 22-case raw/probe evidence |
| `docs/V2-FAILURE-INTELLIGENCE.md` | CURRENT | V2A taxonomy plus completed V2B cause/location refinement |
| active progressive-capability handoff | CURRENT_PRIMARY_DIRECTIVE | prevents evidence-stage restrictions from becoming permanent product ceilings |
| `docs/FRETNET_RESEARCH.md` | CURRENT_RESEARCH_RECORD | future V4 learned/audio evidence, not runtime authority |
| P1/P2 stage documents | CURRENT_WITH_BOUNDARY_NOTE | bounded source/physical research contracts |
| `docs/POLYPHONY-MODEL.md`, `docs/SUPPORTED-MUSICXML.md`, `SECURITY.md` | PARTIALLY_OUTDATED | useful local details; current continuation belongs to maintained entry-point docs |
| historical integration plans | ARCHIVE_CANDIDATE | historical context only |

## Authority order

When documents disagree, use:

1. repository code and automated tests;
2. `docs/REPOSITORY_REALITY.md`;
3. `docs/ARCHITECTURE.md` plus the active progressive-capability directive;
4. `README.md`;
5. current stage documents;
6. historical records.

## V1 closure

V1B reproduces pinned Engine semantic evidence for the approved internal fixture slice at Engine SHA `1d8ced644f544f7e991f7275eda77a2ce557774e`.

V1C maintains a reproducible 22-case external baseline from `w3c-cg/musicxmlTestSuite` commit `77c19f7e819154c70ca1a1992e80dcda8ff82fea` under MIT licensing.

Pinned V1C summary:

```text
Lab probe supported:      17 / 22
Engine probe supported:    5 / 22
semantic EQUAL:            5
semantic MISMATCH:         0
semantic NOT_COMPARABLE:  17
```

Raw XML trust-boundary rejection remains separate from musical capability. CI-only probe transforms do not authorize application-time security weakening.

## V2A closure

V2A is implemented and reproducible:

```text
66 failure observations
44 raw trust-boundary failures
22 semantic capability failures
0 unclassified failures
```

The committed taxonomy verifies source-code anchors and explicitly forbids semantic capability evidence from becoming `BLOCKED_GLOBAL` in the Lab classification layer.

Baseline: `artifacts/v2/failure-intelligence-baseline.json`.

## V2B closure

V2B refines all six V1C Engine cases previously left as generic `UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE`.

Live Engine cause split:

```text
direction          3
harmony            2
notation:dynamics  1
```

Scope split:

```text
MEASURE_CHILD      3
NOTE_EVENT         1
FEATURE_REGION_SET 2
```

Four cases have exact local scope. The two harmony cases deliberately keep a multi-occurrence region set because Engine evidence does not identify one exact causal harmony occurrence.

All six are architecture-level `REVIEW_REQUIRED` candidates; none becomes a semantic global block and none authorizes automatic recovery.

V2B implementation/evidence:

```text
src/failures/v2bProjectionRefinement.js
scripts/run-v2b-projection-refinement-discovery.mjs
scripts/run-v2b-projection-refinement.mjs
scripts/verify-v2b-projection-refinement-report.mjs
artifacts/v2b/projection-refinement-baseline.json
test/v2bProjectionRefinement.test.js
```

CI regenerates V2B evidence from the exact pinned Engine and external corpus and requires equality with the committed baseline.

## Broad-capability interpretation rule

Strict evidence validation applies at the specific evidence/trust boundary. It is not a mandate for global product blocking. Known musical facts should be preserved, uncertainty localized, and provisional/editable output retained where production safety permits.

Fixture/category metadata is context, not causal proof. V2B narrows a generic failure only when live Engine evidence and/or a unique exact source occurrence support that narrowing.

## Current continuation

The principal next stage is **V3 Independent Feasibility Oracle**. It should distinguish true strict untransformed guitar impossibility from implementation/search/capability failure while remaining offline/CI evidence.

The two unresolved harmony occurrence sets may be refined additively if better Engine location evidence becomes available; they do not block V3.

`CURRENT_RESEARCH_RECORD` means a document is accurate as a research/evidence record but is not a statement of production-engine authority.
