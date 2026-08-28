# Guitar Polyphony Lab

Experimental, evidence-first laboratory for sustained guitar polyphony from MusicXML semantics.

This repository is intentionally **not** the production TAB authority. Its job is to isolate, test, and validate polyphonic timeline and guitar-state algorithms before any separately reviewed integration into `musicxml-to-guitar-tab-engine`.

## Current stage: P1B — bounded MusicXML parser adapter

The current pipeline is:

```text
untrusted MusicXML bytes/string
    |
    v
P1A input gate
    |
    v
P1B score-partwise parser adapter
    |
    v
per-part / per-measure OrderedMeasureEvent[]
    |
    v
P0 semantic timeline core
    |
    +--> note intervals
    +--> sonority spans
```

P1B extracts the bounded semantics needed for polyphony evidence:

- `divisions`
- pitched `note`
- `voice`
- `staff`
- `duration`
- `<chord/>`
- rests as provenance-carrying cursor movement
- `<backup>` / `<forward>`
- tie/tied start-stop evidence

Unsupported semantics fail closed rather than inventing timing or pitch.

## Safety boundaries

- `main` is treated as protected-by-process while repository settings still report it unprotected.
- Development occurs on stage branches and through pull requests.
- P1A remains authoritative for byte limits, UTF-8 validation, and rejection of DTD/entity/XInclude input.
- `saxes` is exact-pinned at `6.0.0` behind the P1A gate; parser output is normalized through our adapter rather than exposed as project authority.
- No PDF, OMR, Audiveris, renderer, UI, MIDI, AI, or production routing belongs in this repository stage.
- Generated or private corpora must not be committed under tracked fixture paths.

See:

- `docs/ARCHITECTURE.md`
- `docs/P1A-INPUT-GATE.md`
- `docs/P1B-PARSER-ADAPTER.md`
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

## Roadmap

- **P0:** semantic event contract + deterministic timeline + tests — complete
- **P1A:** untrusted MusicXML input gate — complete
- **P1B:** bounded `score-partwise` parser adapter — current
- **P1C:** exporter fixtures and compatibility matrix
- **P2:** guitar fretboard candidate generation
- **P3:** sustained polyphonic path solver harness
- **P4:** semantic round-trip validator + golden corpus promotion protocol
