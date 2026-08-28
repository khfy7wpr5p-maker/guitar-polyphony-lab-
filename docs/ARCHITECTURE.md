# Architecture

## Authority boundary

`guitar-polyphony-lab` is a research and validation repository. It does not own production TAB output and must not silently replace routing in `musicxml-to-guitar-tab-engine`.

Any future promotion into the production engine requires a separate reviewed integration change with exact-head CI evidence.

## Current layer map

```text
UNTRUSTED INPUT
MusicXML bytes/string
    |
    | P1A — size/UTF-8/root/security gate
    v
bounded score-partwise XML
    |
    | P1B — exact-pinned SAX parser adapter
    v
Part[] / Measure[] / OrderedMeasureEvent[] + divisions
    |
    | P0
    v
buildMeasureTimeline
    |
    +--> NoteInterval[]
    |
    +--> SonoritySpan[]
    |
    | P2
    v
Guitar candidate generation
    |
    | P3
    v
Sustained path solver
    |
    | P4
    v
Semantic validator / evidence report
```

## P1A trust boundary

P1A remains authoritative before any XML library executes. It enforces:

- UTF-8 string/byte input;
- bounded input size;
- `score-partwise` root;
- no DOCTYPE;
- no entity declarations;
- no XInclude;
- no NUL bytes.

P1B must not weaken or bypass this gate.

## P1B parser adapter

P1B uses an isolated SAX-style parser to verify well-formed XML and extract only the semantic fields needed by the polyphony model. Raw parser objects are not part of the lab data contract.

The adapter produces per-part, per-measure ordered events and preserves `divisions` separately. It supports:

- pitched notes;
- duration;
- voice;
- staff;
- chord membership;
- rests as `forward` cursor movement with `sourceKind=rest` provenance;
- backup/forward cursor movement;
- tie/tied evidence;
- inherited divisions across measures.

It fails closed for currently unsupported grace, cue, unpitched, non-integer microtonal alteration, XML 1.1, missing required timing fields, excessive semantic depth, or malformed XML.

## Parser dependency boundary

`saxes@6.0.0` is exact-pinned and is used only behind P1A. Its event stream is normalized into project-owned semantic objects.

The upstream repository is archived, so this dependency is not considered permanent architecture authority. Replacement must remain possible without changing the P0/P2/P3 contracts. Dependency maintenance risk is tracked in `docs/P1B-PARSER-ADAPTER.md`.

## P0 contract

P0 receives one measure at a time as ordered semantic events.

Supported event types:

- `note`
- `backup`
- `forward`

A `note` can carry `chord=true`, `voice`, `staff`, and tie evidence. Rest provenance may be carried on a `forward` event; P0 consumes only its cursor semantics.

P0 is responsible for deterministic measure cursor movement, chord onset reuse, voice-overlap reconstruction through `backup`, gap/rest cursor movement, note interval production, sonority-span production, and fail-closed validation.

P0 is not responsible for XML syntax, DTD/entity handling, cross-measure tie joining, grace timing, tuplets, ornaments, fret/string assignment, fingering optimization, TAB serialization, rendering, or playback.

## Future production integration boundary

The intended future connection is data-contract based rather than repository import coupling:

```text
musicxml-to-guitar-tab-engine
        |
        | normalized polyphony contract
        v
validated sustained-selection algorithm
        |
        v
CanonicalTabResultV2 adapter
```

The lab may prove an algorithm. The production engine remains responsible for adopting it through its own contracts, regression suite, and release gates.
