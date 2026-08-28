# Guitar Polyphony Lab

Experimental, evidence-first laboratory for sustained guitar polyphony from MusicXML semantics.

This repository is intentionally **not** the production TAB authority. Its job is to isolate, test, and validate polyphonic timeline and guitar-state algorithms before any separately reviewed integration into `musicxml-to-guitar-tab-engine`.

## Current stage: P0 — semantic polyphony core

P0 establishes a dependency-free semantic core for ordered MusicXML measure events:

- `note`
- `chord`
- `backup`
- `forward`
- `voice`
- `staff`
- `duration`
- tie flags carried as evidence

The core converts ordered measure events into deterministic note intervals and active-note sonority spans. It does **not** parse untrusted XML yet.

## Safety boundaries

- `main` is treated as protected-by-process even when repository settings do not enforce protection.
- Development occurs on stage branches and through pull requests.
- No PDF, OMR, Audiveris, renderer, UI, MIDI, AI, or production routing belongs in P0.
- No external runtime dependency is introduced in P0.
- Real XML parsing is a separate dependency/security review gate.
- Generated or private corpora must not be committed under tracked fixture paths.

## Architecture

```text
MusicXML bytes
    |
    |  future parser boundary (untrusted input)
    v
Ordered Measure Events
    |
    v
P0 Semantic Timeline Core
    |
    +--> Note intervals
    |
    +--> Sonority spans
    |
    v
future: guitar candidate generation
    |
    v
future: sustained path solver
    |
    v
future: semantic validator
```

See:

- `docs/ARCHITECTURE.md`
- `docs/POLYPHONY-MODEL.md`
- `docs/SUPPORTED-MUSICXML.md`
- `SECURITY.md`

## Commands

```bash
npm ci --ignore-scripts
npm test
```

Node.js 22 or newer is required.

## Roadmap

- **P0:** semantic event contract + deterministic timeline + tests
- **P1:** bounded MusicXML parser adapter after dependency/security review
- **P2:** guitar fretboard candidate generation
- **P3:** sustained polyphonic path solver harness
- **P4:** semantic round-trip validator + golden corpus promotion protocol
