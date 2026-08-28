# Architecture

## Authority boundary

`guitar-polyphony-lab` is a research and validation repository. It does not own production TAB output and must not silently replace routing in `musicxml-to-guitar-tab-engine`.

Any future promotion into the production engine requires a separate reviewed integration change with exact-head CI evidence.

## Layer map

```text
UNTRUSTED INPUT
MusicXML bytes
    |
    | P1 parser adapter (not implemented in P0)
    v
OrderedMeasureEvent[]
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

## P0 contract

P0 receives one measure at a time as already-decoded ordered semantic events. This keeps XML syntax, entity handling, encoding, and parser supply-chain concerns outside the semantic timing core.

Supported event types:

- `note`
- `backup`
- `forward`

A `note` can carry `chord=true`, `voice`, `staff`, and tie evidence.

P0 is responsible for:

1. deterministic measure cursor movement;
2. chord onset reuse;
3. voice overlap reconstruction through `backup`;
4. gap reconstruction through `forward`;
5. bounded input validation;
6. note interval production;
7. active-note sonority span production;
8. fail-closed behavior for unsupported event types.

P0 is not responsible for:

- XML parsing;
- cross-measure tie resolution;
- grace timing;
- tuplets;
- ornaments;
- fret/string assignment;
- fingering optimization;
- TAB serialization;
- rendering or playback.

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
