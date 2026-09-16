# Documentation audit

Fresh-read classification against the current Arrangement A1 branch source, tests, pinned V1B Engine evidence, 22-case V1C external evidence, committed V2A/V2B failure evidence, committed V3A/V3B physical evidence, the new arrangement alternative-set contract, package metadata, CI, and the 2026-09-16 progressive-capability directive.

| Document set | Classification | Current meaning |
|---|---|---|
| `README.md` | CURRENT | project purpose, V1/V2/V3 closure and Arrangement A1/A2 direction |
| `docs/ARCHITECTURE.md` | CURRENT | authority boundaries, completed V1–V3 evidence, A1 contract and A2/V4 direction |
| `docs/REPOSITORY_REALITY.md` | CURRENT_BASELINE | implementation, pinned evidence, A1 contract reality, current CI and exact remaining work |
| `docs/V1B-SEMANTIC-COMPARATOR.md` | CURRENT | real Engine artifact provenance and reproducible V1B loop |
| `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md` | CURRENT | pinned external source/license and 22-case raw/probe evidence |
| `docs/V2-FAILURE-INTELLIGENCE.md` | CURRENT | V2A taxonomy plus completed V2B cause/location refinement |
| `docs/V3-INDEPENDENT-FEASIBILITY-ORACLE.md` | CURRENT | V3A exact-position plus V3B left-hand independent physical evidence |
| `docs/ARRANGEMENT-NBEST-CONTRACT.md` | CURRENT | A1 source-complete explicit transformation/N-best representation boundary |
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

## V3 closure

V3A and V3B are implemented and reproducible.

V3A provides exhaustive exact pitch/string/sustain reachability and preserves one proven legacy greedy false negative. V3B adds independent static left-hand finger/barre/span/reach evidence and records 6/6 normalized status parity against the pinned Engine on six comparable benchmark cases.

Evidence exhaustion remains `INDETERMINATE_LIMIT`; it is never converted into physical impossibility.

## Arrangement A1 closure

Arrangement A1 is implemented as a Lab-only representation contract:

```text
src/arrangement/arrangementAlternativeSet.js
test/arrangementAlternativeSet.test.js
docs/ARRANGEMENT-NBEST-CONTRACT.md
```

A1 deliberately aligns its decision vocabulary with the existing production arrangement contract:

```text
PRESERVED
OMITTED
OCTAVE_DISPLACED
VOICE_REDISTRIBUTED
CHORD_REDUCED
REVOICED
ARPEGGIATED
```

A1 adds these explicit invariants:

- every source event is covered exactly once in every alternative;
- source events cannot silently disappear;
- group transformations require exact canonical group membership;
- V1 octave displacement is whole-octave only;
- V1 revoicing preserves pitch class;
- chord reduction records surviving source IDs;
- arpeggiation records exact member order and spread;
- candidate order is not a musical/learned preference rank;
- content-changing alternatives are review-required;
- output is immutable and caller-owned inputs are not mutated.

A1 explicitly has no production, automatic-transformation, learned-ranking, or export authority.

## Broad-capability interpretation rule

Strict evidence validation applies at the specific evidence/trust boundary. It is not a mandate for global product blocking. Known musical facts should be preserved, uncertainty localized, and provisional/editable output retained where production safety permits.

V3 strict infeasibility does not authorize silent source alteration. A1 supplies an explicit provenance language for transformed alternatives instead.

Likewise, A1 does not authorize an automatic arrangement generator merely because the representation is valid. Generation and application are separate gates.

## Current continuation

The principal next stage is **Arrangement A2: bounded explicit-policy candidate generation + transformed-candidate physical revalidation**.

A2 may research generation of omission/reduction, octave/register, arpeggiation, and voice-priority alternatives, but each candidate must be represented through A1 and independently revalidated for physical feasibility.

Automatic note-changing production behavior remains a separate consequential gate. No learned ranking should become authoritative at A2. V4 TabCNN/FretNet-style evidence remains shadow-only until benchmark/calibration/candidate-invariance gates are satisfied.

The two unresolved V2B harmony occurrence sets may be refined additively and do not block arrangement research.

`CURRENT_RESEARCH_RECORD` means a document is accurate as a research/evidence record but is not a statement of production-engine authority.
