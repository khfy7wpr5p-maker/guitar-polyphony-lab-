# Documentation audit

This classification is a fresh-read comparison of maintained documents against the current V1B branch source, tests, fixtures, package metadata, CI, and the 2026-09-16 external FretNet research review. Historical documents remain in place because they preserve evidence and do not by themselves change runtime behavior.

| Document set | Classification | Action / reason |
|---|---|---|
| `README.md`, `docs/ARCHITECTURE.md` | CURRENT | refreshed project purpose, authority boundary, current architecture map, explicit V1B continuation point, V3 feasibility direction, and V4 FretNet/learned-evidence boundary |
| `docs/V1B-SEMANTIC-COMPARATOR.md` | CURRENT | matches the implemented comparator core and correctly identifies pinned Engine-generated artifact integration as remaining V1B work |
| `docs/FRETNET_RESEARCH.md` | CURRENT_RESEARCH_RECORD | records authoritative ICASSP FretNet source, maturity/licensing observations, non-authority rules, and future V4 shadow-ranking boundary |
| `docs/POLYPHONY-MODEL.md` | PARTIALLY_OUTDATED | older stage wording remains; current authority and continuation rules are superseded by `ARCHITECTURE.md` and `REPOSITORY_REALITY.md` where they differ |
| `docs/SUPPORTED-MUSICXML.md` | PARTIALLY_OUTDATED | core bounded support remains useful, but architecture status and future learned-evidence work must be read from current entry-point docs |
| `docs/P1A-INPUT-GATE.md`, `docs/P1B-PARSER-ADAPTER.md`, `docs/P1C-COMPATIBILITY-MATRIX.md` | CURRENT | matches bounded input/parser/corpus behavior |
| `docs/P2A-FRETBOARD-CANDIDATES.md` | CURRENT_WITH_BOUNDARY_NOTE | deterministic physical candidates remain valid; future learned evidence may rank only already-valid candidates and may not alter candidate validity |
| `docs/P2B-SONORITY-ASSIGNMENTS.md` | CURRENT | matches bounded enumeration and fail-closed limits |
| `docs/TUNING-LAB-01.md`, `docs/TUNING-LAB-02.md`, `docs/TUNING_REQUEST_CONTRACT.md` | CURRENT_RESEARCH_RECORD | valid Lab evidence and external production plans; not a statement of present production integration |
| `docs/LAB_TECH_01_*` through `LAB_TECH_05_*` | CURRENT_RESEARCH_RECORD | stage evidence; authority is bounded by the physical-semantics gate |
| `PRODUCTION_INTEGRATION_PLAN.md`, `PRODUCTION_CAPO_TUNING_INTEGRATION_PLAN.md` | ARCHIVE_CANDIDATE | dated external-repository plans, retained for history; they are not current production evidence |
| `SECURITY.md` | PARTIALLY_OUTDATED | policy remains relevant, but some stage wording predates implemented P1A/P1B and V1B boundaries |
| `docs/REPOSITORY_REALITY.md` | CURRENT_BASELINE | implementation/contract/corpus/CI inventory; architecture direction is additionally clarified by `ARCHITECTURE.md` |

## Current document authority order

When documents disagree, use this order:

1. repository code and automated tests;
2. `docs/REPOSITORY_REALITY.md` for implementation inventory;
3. `docs/ARCHITECTURE.md` for present authority boundaries and continuation point;
4. `README.md` for project-level summary;
5. current stage-specific documents such as `V1B-SEMANTIC-COMPARATOR.md` and `FRETNET_RESEARCH.md`;
6. historical stage records and archived integration plans.

## Current architectural continuation

The next implementation step is **not** FretNet integration.

The required continuation remains:

```text
V1B comparator core
  -> pin real Engine-generated PolyphonicSourceModel 1.0.0 artifacts
  -> validate provenance/version/hash
  -> compare in Lab CI
  -> close V1B
```

FretNet-style learned evidence is a V4 research direction after deterministic verification and feasibility infrastructure are established.

`CURRENT_RESEARCH_RECORD` means the document is accurate as a research/evidence record but must not be read as production-engine status or runtime authority.