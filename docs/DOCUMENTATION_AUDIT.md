# Documentation audit

Fresh-read classification against the current V1C branch source, tests, internal fixtures, committed V1B Engine evidence, pinned V1C external evidence, package metadata, CI, and the 2026-09-16 progressive-capability directive.

| Document set | Classification | Current meaning |
|---|---|---|
| `README.md` | CURRENT | project purpose, broad-capability direction, V1B closure, V1C initial baseline and continuation |
| `docs/ARCHITECTURE.md` | CURRENT | authority boundaries, progressive capability states, V1C raw/probe evidence architecture, arrangement/ML direction |
| `docs/REPOSITORY_REALITY.md` | CURRENT_BASELINE | implementation, pinned V1B/V1C evidence, CI reality, exact current gaps |
| `docs/V1B-SEMANTIC-COMPARATOR.md` | CURRENT | real Engine artifact provenance and reproducible two-fixture V1B loop |
| `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md` | CURRENT | pinned external source/license, raw/probe distinction, 11-case local capability baseline and limitations |
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

## V1C documentation baseline

V1C now has an initial external evidence slice instead of a planning-only continuation.

Current V1C evidence includes:

```text
external repository: w3c-cg/musicxmlTestSuite
external commit:     77c19f7e819154c70ca1a1992e80dcda8ff82fea
license:             MIT
cases:               11

+ per-case Git blob SHA
+ per-case raw SHA-256
+ per-case DTD-free semantic-probe SHA-256
+ pinned raw Lab/Engine outcome
+ pinned probe Lab/Engine outcome
+ pinned semantic comparison outcome
+ committed capability-report baseline
+ CI expected-outcome drift gate
+ CI regenerated-report comparison
```

The selected upstream files contain an external MusicXML 4.0 DOCTYPE. Raw input rejection remains evidence and security behavior. The DTD-free transformation is explicitly CI-only semantic probing and must not be described as production sanitization.

The initial baseline contains three exact semantic-equality cases and zero semantic mismatches. The other eight cases are locally unsupported/not-comparable on the pinned revisions. These counts are not a general MusicXML conformance percentage.

The next architectural continuation is **broader isolated V1C capability coverage**, followed by V2 localized failure intelligence. It is not FretNet integration and not production-authoritative learned ranking.

## Broad-capability interpretation rule

Strict evidence validation remains intentional. Historical wording such as “unsupported semantics fail closed” must be read at the specific evidence/trust boundary where it applies; it is not a mandate for the final product to return global `BLOCKED` for every unsupported musical detail.

V1C reinforces this by treating exact musical capability failures as local case outcomes while reserving corpus failure for broken provenance, invalid contracts, rejected probe transforms, expected-outcome drift, or runner failure.

Future product-facing contracts should preserve known facts, localize uncertainty, keep provisional editable output where safe, and record arrangement transformations explicitly.

`CURRENT_RESEARCH_RECORD` means a document is accurate as a research/evidence record but is not a statement of present production-engine runtime authority.
