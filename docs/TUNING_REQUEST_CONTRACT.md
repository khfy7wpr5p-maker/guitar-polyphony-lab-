# Workbench / Runtime Guitar Configuration Request Contract — Research Proposal

## Browser authority boundary

The browser or Workbench is not semantic authority. It may request a six-string tuning and capo fret, but the Engine/runtime must validate, normalize and derive the full GuitarConfiguration before any candidate or TAB generation occurs.

Changing tuning or capo means re-running the same immutable source MusicXML through the physical realization pipeline. Browser code must not rewrite source MusicXML notes or manipulate existing TAB positions to simulate tuning/capo.

## Request

When omitted, runtime should retain the exact existing Standard-tuning + capo-0 default.

When supplied:

```json
{
  "guitar": {
    "capoFret": 2,
    "tuning": [
      { "string": 1, "pitch": "E4" },
      { "string": 2, "pitch": "B3" },
      { "string": 3, "pitch": "G3" },
      { "string": 4, "pitch": "D3" },
      { "string": 5, "pitch": "A2" },
      { "string": 6, "pitch": "D2" }
    ]
  }
}
```

The public request intentionally sends only:

- six explicit string identities
- scientific pitch spelling for each non-capo open string
- `capoFret`

The runtime derives and validates:

- MIDI
- canonical written pitch
- six-string completeness
- unique string identities
- deterministic string order
- bounded capo
- physical tuning/configuration bounds
- fixed relative-from-capo fret semantics

Unknown fields, Proxies, getters/accessors, sparse arrays, malformed pitches, contradictory facts and ambiguous fret semantics must fail closed at the server/runtime trust boundary.

## First product slice

UI may expose:

- Standard preset
- Drop D preset
- six independent tuning selectors
- capo selector
- Reset

`Standard` and `Drop D` are convenience request builders. `Custom` sends the six explicit pitches. The Engine remains responsible for semantic meaning.

Not included:

- partial capo
- movable partial capo
- 7/8-string instruments
- mid-score capo changes
- microtonal/alternate temperament

## Physical contract

Tuning entries are the non-capo open strings.

Solver-facing fret is relative from the capo:

```text
soundingMidi = openStringMidi + capoFret + relativeFret
absoluteFret = capoFret + relativeFret
```

The same GuitarConfiguration must be used by candidate generation, MONO/POLY selection, sustained/tie handling, grace integration, canonical result construction and writer serialization.

## Authority policy

Proposed default precedence/evidence policy:

1. explicit user configuration
2. explicit safe MusicXML `staff-tuning` / `capo` configuration evidence
3. Standard/capo-0 default only when no explicit configuration exists

If explicit user and explicit source configurations differ, runtime must not silently choose. The first slice should return a configuration conflict state unless a future product flow explicitly records an override decision.

Source `<technical><string>/<fret>` is fingering evidence, not target solver authority.

## Processing contract

```text
original immutable MusicXML source
        +
validated user request (optional)
        +
safe MusicXML guitar-configuration evidence (optional)
        |
        v
GuitarConfiguration authority resolution
        |
        v
one immutable GuitarConfiguration
        |
        v
candidate generation
        |
        v
POLY / MONO physical selection
        |
        v
Canonical TAB result with exact solver configuration facts
        |
        v
MusicXML/TAB writer emits exact target tuning + capo + positions
```

The requested configuration may alter only playable string/fret realization. It must not alter source pitch, octave, onset, duration, voice, staff, tie identity or grace identity/timing.

## Result facts

The runtime result should expose the exact normalized configuration used by the solver:

```json
{
  "guitar": {
    "stringCount": 6,
    "tuning": [
      { "string": 1, "pitch": "E4", "midi": 64, "writtenPitch": "E4" },
      { "string": 2, "pitch": "B3", "midi": 59, "writtenPitch": "B3" },
      { "string": 3, "pitch": "G3", "midi": 55, "writtenPitch": "G3" },
      { "string": 4, "pitch": "D3", "midi": 50, "writtenPitch": "D3" },
      { "string": 5, "pitch": "A2", "midi": 45, "writtenPitch": "A2" },
      { "string": 6, "pitch": "D2", "midi": 38, "writtenPitch": "D2" }
    ],
    "capoFret": 2,
    "fretSemantics": "RELATIVE_FROM_CAPO"
  }
}
```

Production may preserve its current internal field name (`number` rather than `string`) if required for compatibility. Public API should choose one versioned shape and normalize once.

## Re-solve behavior

On a tuning or capo change, Workbench submits the original immutable source plus the new configuration request. Runtime performs a new solve. Reusing old string/fret selections under a new configuration is forbidden.

No UI implementation is part of TUNING-LAB-02.
