# Documentation audit

Fresh-read classification against the current V1C branch source, tests, internal fixtures, committed V1B Engine evidence, pinned 22-case V1C external evidence, package metadata, CI, and the 2026-09-16 progressive-capability directive.

| Document set | Classification | Current meaning |
|---|---|---|
| `README.md` | CURRENT | project purpose, broad-capability direction, V1B closure, 22-case V1C baseline and V2 continuation |
| `docs/ARCHITECTURE.md` | CURRENT | authority boundaries, progressive capability states, V1C evidence architecture, V2/V3/arrangement/ML direction |
| `docs/REPOSITORY_REALITY.md` | CURRENT_BASELINE | implementation, pinned V1B/V1C evidence, CI reality, exact current gaps |
| `docs/V1B-SEMANTIC-COMPARATOR.md` | CURRENT | real Engine artifact provenance and reproducible two-fixture V1B loop |
| `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md` | CURRENT | pinned external source/license, raw/probe distinction, 22-case local capability baseline, sharded evidence and limitations |
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
5. current stage documents such as `docs/V1B-SEMANTIC-COMPARATOR.md` and `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md`;
6. historical stage records and archived integration plans.

## V1B documentation closure

The previous V1B continuation — pin real Engine-generated artifacts and run them in Lab CI — is completed for the approved two-fixture slice.

Current V1B evidence includes:

```text
production Engine SHA
1d8ced644f544f7e991f7275eda77a2ce557774e

+ two approved fixture SHA-256 identities
+ two committed PolyphonicSourceModel 1.0.0 artifacts
+ artifact SHA-256 identities
+ Lab semantic equality tests
+ CI regeneration from the exact Engine SHA
+ byte-for-byte reproduction check
```

## V1C documentation closure

V1C now has a reproducible 22-case external baseline rather than a planning/discovery-only continuation.

Current V1C evidence includes:

```text
external repository: w3c-cg/musicxmlTestSuite
external commit:     77c19f7e819154c70ca1a1992e80dcda8ff82fea
license:             MIT
cases:               22

+ per-case Git blob SHA
+ per-case raw SHA-256
+ per-case semantic-probe SHA-256
+ per-case approved transform
+ pinned raw Lab/Engine outcome
+ pinned probe Lab/Engine outcome
+ pinned semantic comparison outcome
+ 4 hash-pinned committed evidence shards
+ CI expected-outcome drift gate
+ CI shard-hash verification and report reconstruction
+ CI regenerated-report comparison
```

Raw input rejection remains evidence and security behavior. Semantic probe transforms are explicitly CI-only evidence operations. The transform allowlist supports already-safe identity probing and structurally verified Recordare MusicXML partwise DOCTYPE removal; arbitrary/multiple declarations and entities remain rejected. This must not be described as production sanitization.

Current pinned summary:

```text
probe Lab supported:      17 / 22
probe Engine supported:    5 / 22
semantic EQUAL:            5
semantic MISMATCH:         0
semantic NOT_COMPARABLE:  17
```

The equality cases are the exact pinned backup/polyphony, basic-chord, simple-tie, piano/multistaff and single-voice staff-change fixtures. These counts are not a general MusicXML conformance percentage.

The temporary discovery workflow has been removed after promotion. Further V1C corpus growth is additive and may include `.mxl`, transposition, microtones and additional guitar/presentation fixtures.

The principal architectural continuation is now **V2 Failure Intelligence**, not another prerequisite V1C discovery cycle, not FretNet integration, and not production-authoritative learned ranking.

## V2 documentation requirement

The next maintained documentation must distinguish at least:

- source-feature limitation;
- normalization limitation;
- semantic projection limitation;
- search/path-selection limitation;
- strict physical infeasibility;
- recoverable approximation/review state;
- true global trust/parse/invariant failure.

Each failure/recovery record should use the narrowest truthful scope and preserve enough provenance to support later V3 feasibility evidence and arrangement/recovery contracts.

## Broad-capability interpretation rule

Strict evidence validation remains intentional. Historical wording such as “unsupported semantics fail closed” must be read at the specific evidence/trust boundary where it applies; it is not a mandate for the final product to return global `BLOCKED` for every unsupported musical detail.

V1C reinforces this by treating exact musical capability failures as local case outcomes while reserving corpus failure for broken provenance, invalid contracts, rejected probe transforms, expected-outcome drift, or runner failure.

Future product-facing contracts should preserve known facts, localize uncertainty, keep provisional editable output where safe, and record arrangement transformations explicitly.

`CURRENT_RESEARCH_RECORD` means a document is accurate as a research/evidence record but is not a statement of present production-engine runtime authority.
