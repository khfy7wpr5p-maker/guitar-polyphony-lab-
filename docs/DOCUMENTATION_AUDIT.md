# Documentation audit

This classification is a fresh-read comparison of documents against `main` source, tests, fixtures, package metadata, and CI. Historical documents remain in place because they preserve evidence and do not by themselves change runtime behavior.

| Document set | Classification | Action / reason |
|---|---|---|
| `README.md`, `docs/ARCHITECTURE.md` | PARTIALLY_OUTDATED | refreshed entry points and linked to current reality; detailed module inventory is in `REPOSITORY_REALITY.md` |
| `docs/POLYPHONY-MODEL.md` | PARTIALLY_OUTDATED | corrected references to a “future” parser and future-only sustained use |
| `docs/SUPPORTED-MUSICXML.md` | PARTIALLY_OUTDATED | removed the false statement that string/fret candidates are unimplemented; physical technique parsing remains unsupported |
| `docs/P1A-INPUT-GATE.md`, `docs/P1B-PARSER-ADAPTER.md`, `docs/P1C-COMPATIBILITY-MATRIX.md` | CURRENT | matches bounded input/parser/corpus behavior |
| `docs/P2A-FRETBOARD-CANDIDATES.md` | PARTIALLY_OUTDATED | updated to configuration-aware (Standard/Drop D/custom/capo) behavior |
| `docs/P2B-SONORITY-ASSIGNMENTS.md` | CURRENT | matches bounded enumeration and fail-closed limits |
| `docs/TUNING-LAB-01.md`, `docs/TUNING-LAB-02.md`, `docs/TUNING_REQUEST_CONTRACT.md` | CURRENT_RESEARCH_RECORD | valid Lab evidence and external production plans; not a statement of present production integration |
| `docs/LAB_TECH_01_*` through `LAB_TECH_05_*` | CURRENT_RESEARCH_RECORD | stage evidence; authority is bounded by the physical-semantics gate |
| `PRODUCTION_INTEGRATION_PLAN.md`, `PRODUCTION_CAPO_TUNING_INTEGRATION_PLAN.md` | ARCHIVE_CANDIDATE | dated external-repository plans, retained for history; they are not current production evidence |
| `SECURITY.md` | PARTIALLY_OUTDATED | still correct in policy, but its “future MusicXML input” wording predates the implemented P1A/P1B boundary |
| `REPOSITORY_REALITY.md` | CURRENT | new primary implementation, contract, corpus, CI, and integration reference |

`CURRENT_RESEARCH_RECORD` means the document is accurate as a record of Lab research, but must not be read as production-engine status. No files were moved or deleted in this refresh, avoiding unnecessary churn and preserving cited evidence.
