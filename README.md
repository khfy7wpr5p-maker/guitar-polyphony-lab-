# Guitar Polyphony Lab

Evidence-first research and verification laboratory for bounded guitar-polyphony semantics, physical feasibility, and future guitar-specific ranking research.

The Lab exists to independently verify what a MusicXML source says, what is physically possible on guitar, and where production behavior differs from independently reproducible evidence.

This repository is intentionally **not** the production TAB or sustained-path authority. Production behavior belongs to `musicxml-to-guitar-tab-engine`. The Lab produces fixtures, semantic reference/oracle behavior, differential verification, failure reproduction, feasibility evidence, and research results that may later support a separately reviewed production PR.

There must be no production runtime dependency from `musicxml-to-guitar-tab-engine` to this repository.

## What it does

- **P0:** measure timeline / sonority semantics → reference semantic oracle
- **P1A:** bounded MusicXML input gate → security / hostile-input validation
- **P1B:** parser adapter → differential parser oracle
- **P1C:** compatibility corpus → corpus / regression foundation
- **P2A:** deterministic, configuration-aware fretboard candidate enumeration
- **P2B:** bounded, distinct-string sonority assignment enumeration
- **V1A:** corpus provenance / licensing / expectation registry
- **V1B:** deterministic Lab/Engine semantic snapshot comparison without runtime coupling
- **Tuning research:** immutable Standard, Drop D, custom six-string and capo configurations
- **Technique research:** bounded source-provenance sidecars deliberately excluded from physical solving
- **Future V3/V4 research:** independent feasibility oracle and learned guitar-ranking evidence under hard deterministic constraints

The Lab contains deterministic research verifiers for sustained and grace transitions, but it does **not** own production path selection. Production authority remains `musicxml-to-guitar-tab-engine`.

## What it does not do

It does not perform production MusicXML-to-TAB projection, Canonical TAB writing, rendering, playback, OMR, PDF processing, harmony analysis, application UI, or production runtime routing.

Audio/MIDI transcription is not currently implemented. FretNet is documented only as a future external research direction for V4 learned evidence/ranking; it is not a current Lab runtime component.

## Current implementation status

| Area | Status | Verified boundary |
|---|---|---|
| MusicXML input gate and bounded partwise parser | ✅ PRODUCTION | Lab-only input/reference contract; not production Engine authority |
| Measure timelines, voice overlap and sonority spans | ✅ PRODUCTION | Per-measure reference semantics |
| 2-voice and 4-voice fixture coverage | 🟡 PARTIAL | Two pinned compatibility fixtures; no dedicated 3-voice fixture |
| Fretboard candidates and distinct-string assignments | ✅ PRODUCTION | Bounded six-string research configuration |
| Sustained/grace physical verifiers | 🧪 EXPERIMENTAL | Deterministic research baselines, not production solvers |
| Technique provenance sidecars | 🟡 PARTIAL | Metadata only; no physical-technique authority |
| Technique-driven physical solver behavior | ⚠️ FAIL-CLOSED | No technique is authorized to affect candidates, path or ranking |
| MIDI/audio evidence | ❌ UNSUPPORTED | No Lab audio/MIDI runtime contract or fixture exists |
| Engine/Lab semantic comparator | 🟡 PARTIAL | V1B comparator core implemented; pinned real Engine-generated artifacts still pending |
| FretNet-style learned ranking | 📋 RESEARCH-ONLY | V4 concept only; no implementation or ranking authority |

## Current continuation point

The architecture should continue **here**, before any learned-ranking or new solver work:

```text
V1B comparator core ✅
        |
        v
pin real Engine-generated PolyphonicSourceModel 1.0.0 artifacts
        |
        v
validate artifact provenance/version/hash
        |
        v
run Lab ↔ Engine comparisons in Lab CI
        |
        v
close deterministic V1B verification loop
```

This is the current highest-priority architecture gap.

### V1 status

- **V1A Corpus Registry:** complete initial slice. Internal fixtures carry pinned source provenance, license notice, SHA-256, MusicXML version, semantic expectations and fail-closed registry validation.
- **V1B Engine/Lab Semantic Comparator:** comparator core and deterministic mismatch report implemented. Remaining work is to pin real Engine-generated `PolyphonicSourceModel 1.0.0` artifacts for approved fixtures and compare them in Lab CI.
- **V1C External MusicXML Polyphony Compatibility Corpus:** later; only after source and fixture licensing are verified.

The verification flow is:

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

Current V1B comparison is semantic rather than visual. It compares source-note identity, written pitch, onset, duration, voice, staff, tie evidence, active-sonority membership and peak polyphony. Cross-measure sustain-chain comparison remains outside the implemented V1B slice until both sides expose a compatible reviewed contract.

## FretNet research direction

The authoritative academic FretNet implementation inspected is `cwitkowitz/guitar-transcription-continuous` (ICASSP 2023). It is relevant because it provides audio-driven string-aware guitar tablature and continuous-pitch evidence.

In this project, a future FretNet-style component may only act as a **shadow evidence/ranking layer** over already-valid deterministic candidates:

```text
P2A/P2B valid guitar solutions
            +
FretNet-style audio evidence
            |
            v
shadow benchmark / ranking research
```

Hard rule:

```text
physical validity > learned ranking
```

Learned evidence may never create physically invalid positions, alter tuning/capo facts, mutate source musical truth, or become production authority.

See `docs/FRETNET_RESEARCH.md` for the full research boundary.

## Safety boundaries

- `main` is treated as protected-by-process while repository settings still report it unprotected.
- Development occurs on branches and through pull requests; do not commit directly to `main`.
- P1A remains authoritative for byte limits, UTF-8 validation, and rejection of DTD/entity/XInclude input before the Lab XML parser executes.
- `saxes` is exact-pinned at `6.0.0` behind the P1A gate; parser output is normalized through Lab-owned reference contracts.
- No PDF, OMR, renderer, UI, production routing, or production audio/MIDI authority belongs in this repository.
- No Lab module may become production runtime authority for parsing, reduction, fingering, sustained path selection, Canonical TAB, or writing.
- Generated or private corpora must not be committed under tracked fixture paths.
- External fixtures require explicit source and license provenance before promotion into the corpus registry.
- Unsupported semantics fail closed rather than inventing musical meaning.
- Probabilistic/learned outputs must never override deterministic physical constraints.

See:

- `docs/ARCHITECTURE.md`
- `docs/REPOSITORY_REALITY.md` — implementation, contract, corpus, CI and integration inventory
- `docs/DOCUMENTATION_AUDIT.md` — maintained-document status
- `docs/V1B-SEMANTIC-COMPARATOR.md`
- `docs/FRETNET_RESEARCH.md`
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
  - V1A Corpus Registry ✅ initial slice
  - V1B Engine/Lab Semantic Comparator 🟡 artifact/CI integration is next
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
  - FretNet-style audio evidence
  - learned ranking in shadow mode only
  - learned evidence never overrides hard physical constraints
