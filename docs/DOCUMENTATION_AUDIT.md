# Documentation audit

Fresh-read classification against the current V1B branch source, tests, fixtures, committed Engine evidence, package metadata, CI, and the 2026-09-16 progressive-capability directive.

| Document set | Classification | Current meaning |
|---|---|---|
| `README.md` | CURRENT | project purpose, broad-capability direction, V1B closure and V1C continuation |
| `docs/ARCHITECTURE.md` | CURRENT | authority boundaries, progressive capability states, arrangement/ML direction, V1C continuation |
| `docs/REPOSITORY_REALITY.md` | CURRENT_BASELINE | implementation, pinned Engine evidence, CI reality, current gaps |
| `docs/V1B-SEMANTIC-COMPARATOR.md` | CURRENT | real Engine artifact provenance and reproducible two-fixture V1B loop |
| active progressive-capability handoff | CURRENT_PRIMARY_DIRECTIVE | prevents current verification boundaries from becoming permanent product capability ceilings |
| `docs/FRETNET_RESEARCH.md` | CURRENT_RESEARCH_RECORD | future V4 learned/audio evidence; not current runtime authority |
| `docs/P1A-INPUT-GATE.md`, `docs/P1B-PARSER-ADAPTER.md`, `docs/P1C-COMPATIBILITY-MATRIX.md` | CURRENT | bounded input/parser/corpus behavior |
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
5. current stage documents such as `docs/V1B-SEMANTIC-COMPARATOR.md`;
6. historical stage records and archived integration plans.

## V1B documentation closure

The previous continuation text — “pin real Engine-generated artifacts and run them in Lab CI” — is now completed for the approved two-fixture slice.

Current evidence includes:

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

The next architectural continuation is **V1C broader MusicXML compatibility/capability corpus work**, not FretNet integration and not production-authoritative learned ranking.

## Broad-capability interpretation rule

Strict evidence validation remains intentional. However, historical wording such as “unsupported semantics fail closed” must be read at the specific evidence/trust boundary where it applies; it is not a mandate for the final product to return global `BLOCKED` for every unsupported musical detail.

Future product-facing contracts should preserve known facts, localize uncertainty, keep provisional editable output where safe, and record arrangement transformations explicitly.

`CURRENT_RESEARCH_RECORD` means a document is accurate as a research/evidence record but is not a statement of present production-engine runtime authority.
