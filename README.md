# Guitar Polyphony Lab

Experimental, evidence-first research and verification laboratory for sustained guitar polyphony from MusicXML semantics.

This repository is intentionally **not** the production TAB or sustained-path authority. Production behavior belongs to `musicxml-to-guitar-tab-engine`. The Lab exists to build fixtures, semantic reference/oracle behavior, differential verification, failure reproduction, and research evidence that may later support a separately reviewed production PR.

There must be no production runtime dependency from `musicxml-to-guitar-tab-engine` to this repository.

## Current direction: V1 — Polyphony Verification Foundation

The existing Lab work is retained but its authority is bounded:

- **P0:** measure timeline / sonority semantics → reference semantic oracle
- **P1A:** bounded MusicXML input gate → security / hostile-input validation
- **P1B:** parser adapter → differential parser oracle
- **P1C:** compatibility corpus → corpus / regression foundation
- **P2A:** fretboard candidate generation → fretboard reference/oracle
- **P2B:** bounded distinct-string sonority assignment → sonority-assignment reference/oracle

The Lab does **not** develop a second production path solver. PS-5 sustained polyphonic path selection remains owned by `musicxml-to-guitar-tab-engine`.

### V1 status

- **V1A Corpus Registry:** complete initial slice. Existing internal fixtures now carry pinned source provenance, license notice, SHA-256, MusicXML version, semantic expectations, and fail-closed registry validation.
- **V1B Engine/Lab Semantic Comparator:** next verification slice.
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

Comparison is semantic rather than visual. Relevant facts include source-note identity, pitch, onset, duration, voice, staff, tie evidence, sustain-chain membership, active-sonority membership, and peak polyphony.

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
- `docs/P1A-INPUT-GATE.md`
- `docs/P1B-PARSER-ADAPTER.md`
- `docs/P1C-COMPATIBILITY-MATRIX.md`
- `docs/POLYPHONY-MODEL.md`
- `docs/SUPPORTED-MUSICXML.md`
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
