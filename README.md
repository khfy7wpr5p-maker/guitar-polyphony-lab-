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
- **Future V3/V4 research:** independent feasibility oracle, ergonomics, N-best fingering and learned guitar evidence

The Lab contains deterministic research verifiers for sustained and grace transitions, but it does **not** own production path selection. Production authority remains `musicxml-to-guitar-tab-engine`.

## What it does not do

It does not perform OMR, PDF rendering, playback, UI rendering, harmony analysis, Canonical TAB writing, or production MusicXML-to-TAB projection. Audio/MIDI transcription is not a current Lab runtime capability. Future audio-derived guitar evidence, including FretNet-style research, must remain an isolated research input rather than production authority.

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
| Learned guitar evidence / FretNet | 📋 RESEARCH ONLY | Future V4 shadow evidence/ranking; no runtime integration |

## Current architecture and continuation point

The verification flow is intentionally one-way and evidence-driven:

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

**Current continuation point:** V1B comparator core exists. The next required implementation slice is to pin real Engine-generated `PolyphonicSourceModel 1.0.0` artifacts for approved compatibility fixtures, record fixture/Engine/artifact provenance, and run those comparisons in Lab CI. V1B is not complete until that loop is reproducible.

Current V1B comparison is semantic rather than visual. It compares source-note identity, written pitch, onset, duration, voice, staff, tie evidence, active-sonority membership, and peak polyphony. Cross-measure sustain-chain comparison remains outside the implemented V1B slice until both sides expose a compatible reviewed contract.

## Future learned guitar evidence

FretNet research has been reviewed as a future **V4** direction, not as current runtime work.

The intended future relationship is:

```text
MusicXML source truth
        |
        v
P2A deterministic fret candidates
        |
        v
P2B physically valid assignments ----------------+
                                                  |
Audio performance -> FretNet-style evidence ------+
                                                  |
                                                  v
                                      shadow ranking research
                                                  |
                                                  v
                                      benchmark / evidence only
```

Hard deterministic physical constraints remain above learned evidence. A learned model may eventually help rank already-valid candidates after a separate benchmark/review gate, but it must not invent physically impossible positions, override tuning/capo facts, mutate source notes, or become production path authority.

See `docs/FRETNET_RESEARCH.md` for the research boundary and benchmark requirements.

## Safety boundaries

- `main` is treated as protected-by-process while repository settings still report it unprotected.
- Development occurs on branches and through pull requests; do not commit directly to `main`.
- P1A remains authoritative for byte limits, UTF-8 validation, and rejection of DTD/entity/XInclude input before the Lab XML parser executes.
- `saxes` is exact-pinned at `6.0.0` behind the P1A gate; parser output is normalized through Lab-owned reference contracts.
- No PDF, OMR, Audiveris, renderer, UI, production routing, or current MIDI/audio transcription belongs in this repository.
- No Lab module may become production runtime authority for parsing, reduction, fingering, sustained path selection, Canonical TAB, or writing.
- Generated or private corpora must not be committed under tracked fixture paths.
- External fixtures/models/data require explicit source and license provenance before promotion into repository evidence.
- Unsupported semantics fail closed rather than inventing musical meaning.

See:

- `docs/ARCHITECTURE.md`
- `docs/REPOSITORY_REALITY.md`
- `docs/DOCUMENTATION_AUDIT.md`
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
  - V1B Engine/Lab Semantic Comparator 🟡 core implemented, real Engine artifacts pending
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
  - FretNet-style audio evidence and learned ranking research
  - learned ranking never overrides hard physical constraints
