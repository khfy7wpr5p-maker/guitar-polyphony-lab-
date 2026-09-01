# Guitar Polyphony Lab

Evidence-first research and verification laboratory for bounded guitar-polyphony semantics from MusicXML.

This repository is intentionally **not** the production TAB or sustained-path authority. Production behavior belongs to `musicxml-to-guitar-tab-engine`. The Lab exists to build fixtures, semantic reference/oracle behavior, differential verification, failure reproduction, and research evidence that may later support a separately reviewed production PR.

There must be no production runtime dependency from `musicxml-to-guitar-tab-engine` to this repository.

## What it does

The existing Lab work is retained but its authority is bounded:

- **P0:** measure timeline / sonority semantics → reference semantic oracle
- **P1A:** bounded MusicXML input gate → security / hostile-input validation
- **P1B:** parser adapter → differential parser oracle
- **P1C:** compatibility corpus → corpus / regression foundation
- **P2A:** deterministic, configuration-aware fretboard candidate enumeration
- **P2B:** bounded, distinct-string sonority assignment enumeration
- **V1B:** deterministic Lab/Engine semantic snapshot comparison without runtime coupling
- **Tuning research:** immutable Standard, Drop D, custom six-string and capo configurations
- **Technique research:** bounded source-provenance sidecars that are deliberately excluded from physical solving

The Lab contains deterministic research verifiers for sustained and grace transitions, but it does **not** own production path selection. Production authority remains `musicxml-to-guitar-tab-engine`.

## What it does not do

It does not perform OMR, PDF rendering, audio/MIDI transcription, playback, UI rendering, harmony analysis, Canonical TAB writing, or production MusicXML-to-TAB projection. It has no production runtime dependency contract with another repository.

## Current implementation status

| Area | Status | Verified boundary |
|---|---|---|
| MusicXML input gate and bounded partwise parser | ✅ PRODUCTION | Lab-only input/reference contract; not production Engine authority |
| Measure timelines, voice overlap and sonority spans | ✅ PRODUCTION | Per-measure reference semantics |
| 2-voice and 4-voice fixture coverage | 🟡 PARTIAL | Two pinned compatibility fixtures; no 3-voice fixture |
| Fretboard candidates and distinct-string assignments | ✅ PRODUCTION | Bounded six-string research configuration |
| Sustained/grace physical verifiers | 🧪 EXPERIMENTAL | Deterministic research baselines, not production solvers |
| Technique provenance sidecars | 🟡 PARTIAL | Metadata only; no physical-technique authority |
| Technique-driven physical solver behavior | ⚠️ FAIL-CLOSED | No technique is authorized to affect candidates, path, or ranking |
| MIDI input or evidence | ❌ UNSUPPORTED | No MIDI parser, contract, or fixture exists |
| Engine/Lab semantic comparator | 🟡 PARTIAL | V1B comparator core implemented; pinned real Engine-generated artifacts still pending |

### V1 status

- **V1A Corpus Registry:** complete initial slice. Existing internal fixtures now carry pinned source provenance, license notice, SHA-256, MusicXML version, semantic expectations, and fail-closed registry validation.
- **V1B Engine/Lab Semantic Comparator:** comparator core and deterministic mismatch report implemented. Remaining integration work is to pin real Engine-generated `PolyphonicSourceModel 1.0.0` artifacts for approved fixtures and compare them in Lab CI.
- **V1C External MusicXML Polyphony Compatibility Corpus:** future; only after source and fixture licensing are verified.

The intended verification flow is:

```text
licensed / internal MusicXML fixture
        |
        +------------------------------+
        |                              |
        v                              v
Lab parser/reference             Production Engine
semantic oracle                  parser/projector
        |                              |
        +---------------+--------------+
                        |
                        v
              semantic comparator
                        |
                        v
          deterministic mismatch report
                        |
                        v
             reviewed production PR
                        |
                        v
          musicxml-to-guitar-tab-engine
```

Current V1B comparison is semantic rather than visual. It compares source-note identity, written pitch, onset, duration, voice, staff, tie evidence, active-sonority membership, and peak polyphony. Cross-measure sustain-chain comparison remains outside the implemented V1B slice until both sides expose a compatible reviewed contract.

## Safety boundaries

- `main` is treated as protected-by-process while repository settings still report it unprotected.
- Development occurs on branches and through pull requests; do not commit directly to `main`.
- P1A remains authoritative for byte limits, UTF-8 validation, and rejection of DTD/entity/XInclude input before the Lab XML parser executes.
- `saxes` is exact-pinned at `6.0.0` behind the P1A gate; parser output is normalized through Lab-owned reference contracts.
- No PDF, OMR, Audiveris, renderer, UI, MIDI, or production routing belongs in this repository.
- No Lab module may become production runtime authority for parsing, reduction, fingering, sustained path selection, Canonical TAB, or writing.
- Generated or private corpora must not be committed under tracked fixture paths.
- External fixtures require explicit source and license provenance before promotion into the corpus registry.
- Unsupported semantics fail closed rather than inventing musical meaning.

See:

- `docs/ARCHITECTURE.md`
- `docs/REPOSITORY_REALITY.md` — fresh-read module, contract, corpus, and test inventory
- `docs/DOCUMENTATION_AUDIT.md` — status of every maintained document
- `docs/V1B-SEMANTIC-COMPARATOR.md`
- `docs/P1A-INPUT-GATE.md`
- `docs/P1B-PARSER-ADAPTER.md`
- `docs/P1C-COMPATIBILITY-MATRIX.md`
- `docs/POLYPHONY-MODEL.md`
- `docs/SUPPORTED-MUSICXML.md`
- `docs/TUNING-LAB-02.md`
- `SECURITY.md`

## Commands

```bash
npm ci --ignore-scripts
npm run check
npm test
```

Node.js 22 or newer is required.

## Research roadmap

- **V1 — Polyphony Verification Foundation**
  - V1A Corpus Registry
  - V1B Engine/Lab Semantic Comparator
  - V1C External MusicXML Polyphony Compatibility Corpus
- **V2 — Failure Intelligence**
  - semantic mismatch classification
  - unplayable-reason analysis
  - regression classification
  - reproducible failure fixtures
- **V3 — Independent Feasibility Oracle**
  - optional offline/CI constraint oracle such as CP-SAT
  - never a production runtime dependency
  - distinguish true infeasibility from production search/solver limitations
- **V4 — Guitar Research**
  - ergonomic benchmarks
  - alternate tunings / capo / future profiles
  - technique-aware sustain corpora
  - N-best fingering research
  - learned ranking research, never overriding hard physical constraints
