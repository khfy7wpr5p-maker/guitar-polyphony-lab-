# Documentation audit

Fresh-read classification against the current V3A branch source, tests, pinned V1B Engine evidence, 22-case V1C external evidence, committed V2A taxonomy evidence, committed V2B projection-refinement evidence, committed V3A strict-feasibility evidence, package metadata, CI, and the 2026-09-16 progressive-capability directive.

| Document set | Classification | Current meaning |
|---|---|---|
| `README.md` | CURRENT | project purpose, V1/V2 closure, V3A implementation and V3B continuation |
| `docs/ARCHITECTURE.md` | CURRENT | authority boundaries, completed V1/V2/V3A evidence layers and V3B/arrangement/V4 direction |
| `docs/REPOSITORY_REALITY.md` | CURRENT_BASELINE | implementation, pinned evidence, current CI and exact remaining physical-authority gap |
| `docs/V1B-SEMANTIC-COMPARATOR.md` | CURRENT | real Engine artifact provenance and reproducible V1B loop |
| `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md` | CURRENT | pinned external source/license and 22-case raw/probe evidence |
| `docs/V2-FAILURE-INTELLIGENCE.md` | CURRENT | V2A taxonomy plus completed V2B cause/location refinement |
| `docs/V3-INDEPENDENT-FEASIBILITY-ORACLE.md` | CURRENT | V3A exhaustive exact-position oracle, benchmark, limits and V3B boundary |
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

## V2 closure

V2A classifies all 66 current unsupported observations with zero unclassified failures and forbids semantic capability evidence from becoming `BLOCKED_GLOBAL` in the Lab taxonomy.

V2B refines all six formerly generic Engine projection failures:

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

All six are architecture-level `REVIEW_REQUIRED` candidates. The two harmony cases deliberately retain bounded multi-occurrence scope because the Engine does not identify one exact causal occurrence.

## V3A closure

V3A is implemented and reproducible.

Core implementation/evidence:

```text
src/guitar/strictFeasibilityOracle.js
fixtures/v3a/benchmark.json
artifacts/v3a/strict-feasibility-baseline.json
scripts/run-v3a-strict-feasibility-benchmark.mjs
scripts/verify-v3a-strict-feasibility-report.mjs
test/strictFeasibilityOracle.test.js
docs/V3-INDEPENDENT-FEASIBILITY-ORACLE.md
```

V3A proves exact feasibility only for:

```text
pitch on declared fretboard
+ simultaneous distinct-string assignment
+ sustained string/fret stability
```

It does not yet claim finger assignment, barre feasibility, hand reach, ergonomics, or arrangement authority.

Pinned benchmark:

```text
cases:                               5
FEASIBLE:                            2
INFEASIBLE:                          2
INDETERMINATE_LIMIT:                 1
proven legacy greedy false-negative: 1
```

The false-negative case is important architecture evidence: a greedy verifier can report `BLOCKED` even though an exact sustained path exists. Therefore a single-path solver failure cannot be treated as physical impossibility without independent reachability evidence.

`INDETERMINATE_LIMIT` is explicitly separate from `INFEASIBLE` so computational/evidence bounds cannot masquerade as physical proof.

## Broad-capability interpretation rule

Strict evidence validation applies at the specific evidence/trust boundary. It is not a mandate for global product blocking. Known musical facts should be preserved, uncertainty localized, and provisional/editable output retained where production safety permits.

V3A `FEASIBLE` means exact string/fret reachability exists within its declared scope. If production still rejects the material, the remaining question is stronger left-hand physics versus search/capability failure; V3A alone must not guess which one.

## Current continuation

The principal next stage is **V3B Independent Left-Hand Physical Oracle + pinned Engine comparison**.

V3B should independently reproduce finger assignment, barre feasibility, hand-span/extra-reach constraints, then compare those facts with production Engine physical failures. Only after that layer is independent can an Engine rejection be promoted to a likely search/capability-gap classification.

The two unresolved V2B harmony occurrence sets may be refined additively and do not block V3B.

`CURRENT_RESEARCH_RECORD` means a document is accurate as a research/evidence record but is not a statement of production-engine authority.
