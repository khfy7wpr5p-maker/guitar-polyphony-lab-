# Workbench / Runtime Tuning Request Contract — Research Proposal

## Browser authority boundary

The browser or Workbench is not semantic authority. It may request a six-string tuning, but the Engine/runtime must validate, normalize and derive the full tuning facts before any candidate or TAB generation occurs.

Changing tuning means re-running the same source MusicXML through the physical realization pipeline. Browser code must not rewrite source MusicXML notes to simulate tuning.

## Request

When omitted, the runtime should retain the existing Standard-tuning default.

When supplied:

```json
{
  "guitar": {
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

The public request intentionally sends only string identity and requested scientific pitch spelling.

The runtime derives and validates:

- MIDI;
- canonical written pitch;
- six-string completeness;
- unique string identities;
- deterministic order;
- physical research/production bounds.

Unknown fields, Proxies, getters/accessors, sparse arrays, malformed pitches and contradictory facts must fail closed at the server/runtime trust boundary.

## Supported UI choices for the first production slice

Only these product-level choices are proposed:

- Standard;
- Drop D;
- Custom.

`Standard` and `Drop D` are convenience request builders. `Custom` sends the six explicit per-string pitches. The Engine remains responsible for the meaning of all three.

## Processing contract

```text
original MusicXML source
        +
validated GuitarTuningConfiguration
        |
        v
candidate generation
        |
        v
POLY / MONO physical selection
        |
        v
Canonical TAB result with exact solver tuning facts
        |
        v
MusicXML/TAB writer emits the exact target tuning
```

The requested tuning may alter only playable string/fret realization. It must not alter source pitch, onset, duration, voice, staff or tie identity.

## Result facts

The runtime result should expose the normalized tuning actually used by the solver, for example:

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
    ]
  }
}
```

Production may preserve its existing field names (`number` instead of `string`) internally if necessary for compatibility. The public boundary should choose one versioned shape and normalize only once.

## Re-solve behavior

On a tuning change, Workbench should submit the original immutable source plus the new tuning request. The runtime must run a new solve and produce a new result. Reusing old string/fret selections under a new tuning is forbidden.

No UI implementation is part of TUNING-LAB-01.
