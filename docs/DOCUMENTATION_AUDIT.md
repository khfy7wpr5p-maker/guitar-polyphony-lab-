# Documentation audit

Fresh-read classification against the current V2A branch source, tests, internal fixtures, committed V1B Engine evidence, pinned 22-case V1C external evidence, committed V2A failure-intelligence evidence, package metadata, CI, and the 2026-09-16 progressive-capability directive.

| Document set | Classification | Current meaning |
|---|---|---|
| `README.md` | CURRENT | project purpose, broad-capability direction, V1/V2A status and V2B continuation |
| `docs/ARCHITECTURE.md` | CURRENT | authority boundaries, progressive states, V1C evidence architecture, implemented V2A taxonomy and V2B/V3/arrangement/ML direction |
| `docs/REPOSITORY_REALITY.md` | CURRENT_BASELINE | implementation, pinned V1B/V1C/V2A evidence, CI reality and exact current gaps |
| `docs/V1B-SEMANTIC-COMPARATOR.md` | CURRENT | real Engine artifact provenance and reproducible two-fixture V1B loop |
| `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md` | CURRENT | pinned external source/license, raw/probe distinction, 22-case local capability baseline, sharded evidence and limitations |
| `docs/V2-FAILURE-INTELLIGENCE.md` | CURRENT | V2A taxonomy, counts, authority boundary, generic-projection refinement rule and V2B target |
| active progressive-capability handoff | CURRENT_PRIMARY_DIRECTIVE | prevents current verification boundaries from becoming permanent product capability ceilings |
| `docs/FRETNET_RESEARCH.md` | CURRENT_RESEARCH_RECORD | future V4 learned/audio evidence; not current runtime authority |
| `docs/P1A-INPUT-GATE.md`, `docs/P1B-PARSER-ADAPTER.md`, `docs/P1C-COMPATIBILITY-MATRIX.md` | CURRENT | bounded input/parser/internal corpus behavior |
| `docs/P2A-FRETBOARD-CANDIDATES.md`, `docs/P2B-SONORITY-ASSIGNMENTS.md` | CURRENT_WITH_BOUNDARY_NOTE | deterministic physical evidence; not arrangement or learned authority |
| technique research documents | CURRENT_RESEARCH_RECORD | source/provenance research with separate physical-semantics gate |
| `docs/POLYPHONY-MODEL.md`, `docs/SUPPORTED-MUSICXML.md`, `SECURITY.md` | PARTIALLY_OUTDATED | useful bounded details remain, but current architecture/continuation must be read from maintained entry-point docs |
| historical production integration plans | ARCHIVE_CANDIDATE | retained for history; not current production evidence |

## Document authority order

When documents disagree, use:

1. repository code and automated tests;
2. `docs/REPOSITORY_REALITY.md` for implementation inventory;
3. `docs/ARCHITECTURE.md` plus the active progressive-capability directive for current architecture direction;
4. `README.md` for project-level summary;
5. current stage documents including `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md` and `docs/V2-FAILURE-INTELLIGENCE.md`;
6. historical stage records and archived integration plans.

## V1B closure

V1B real Engine evidence is closed for the approved two-fixture slice at pinned Engine SHA:

```text
1d8ced644f544f7e991f7275eda77a2ce557774e
```

The repository retains fixture/artifact hashes, semantic equality tests, exact Engine regeneration and byte-for-byte CI reproduction.

## V1C closure

V1C has a reproducible 22-case external baseline from `w3c-cg/musicxmlTestSuite` commit `77c19f7e819154c70ca1a1992e80dcda8ff82fea` under MIT licensing.

Pinned summary:

```text
probe Lab supported:      17 / 22
probe Engine supported:    5 / 22
semantic EQUAL:            5
semantic MISMATCH:         0
semantic NOT_COMPARABLE:  17
```

Raw XML trust-boundary rejection remains separate from musical capability. Semantic probe transforms remain CI-only evidence operations and do not authorize application-time DTD stripping.

Further V1C corpus growth is additive and no longer gates V2 work.

## V2A closure

V2A is no longer planning-only. The repository now contains:

```text
src/failures/v2FailureIntelligence.js
scripts/run-v2-failure-intelligence.mjs
scripts/verify-v2-failure-intelligence-report.mjs
artifacts/v2/failure-intelligence-baseline.json
test/v2FailureIntelligence.test.js
docs/V2-FAILURE-INTELLIGENCE.md
```

Current pinned V2A evidence:

```text
failure observations:              66
raw trust-boundary failures:        44
semantic capability failures:       22
semantic REVIEW_REQUIRED candidates:16
semantic UNSUPPORTED_LOCAL pending refinement: 6
unclassified observed failures:      0
```

Eight current failure families are represented: input security, source selection, source semantic capability, rhythm compatibility, ornament compatibility, playback structure, presentation compatibility and generic projection capability.

V2A additionally verifies each mapped code against Lab or pinned Engine source anchors. This guards against documentation-only taxonomy drift.

The semantic no-global-block invariant is explicit and tested: a semantic-probe failure cannot be classified as `BLOCKED_GLOBAL` by the V2 taxonomy.

## Generic projection limitation

Six V1C observations still use `UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE`.

They intentionally remain:

```text
GENERIC_PROJECTION_CAPABILITY
PROJECTION_OR_COMPATIBILITY
UNKNOWN_LOCAL
NEEDS_FEATURE_REFINEMENT
UNSUPPORTED_LOCAL
```

Fixture names, categories and feature tags are context only. They must not be treated as proof of the causal unsupported feature.

The next maintained continuation is therefore **V2B bounded live cause/location refinement**, not V3 yet and not learned-ranking integration.

## Broad-capability interpretation rule

Strict evidence validation remains intentional. Historical wording such as “unsupported semantics fail closed” must be read at the specific evidence/trust boundary where it applies; it is not a mandate for final product-wide blocking.

Current architecture distinguishes:

- unsafe raw input, which may be globally rejected for the import operation;
- semantic capability gaps, which stay local and may become review/recovery candidates;
- generic failures whose cause is not yet proven, which stay explicitly unrefined.

Future product-facing contracts should preserve known facts, localize uncertainty, keep provisional editable output where safe, and record arrangement transformations explicitly.

`CURRENT_RESEARCH_RECORD` means a document is accurate as a research/evidence record but is not a statement of present production-engine runtime authority.
