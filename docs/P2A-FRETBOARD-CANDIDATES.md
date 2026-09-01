# P2A Fretboard Candidate Generation

## Scope

P2A converts each spelling-preserving pitch into every physically available position on a bounded six-string `GuitarConfiguration`. Standard tuning is the default; Drop D, fully custom six-string tunings, and capo configurations are accepted by the same implementation.

This stage is **candidate generation only**. It does not select, rank, optimize, or prefer any position.

## Default fretboard profile

Authority id:

```text
STANDARD_E2_E4_24_FRET_1.0
```

Profile:

| String | Open pitch | MIDI |
|---:|---|---:|
| 1 | E4 | 64 |
| 2 | B3 | 59 |
| 3 | G3 | 55 |
| 4 | D3 | 50 |
| 5 | A2 | 45 |
| 6 | E2 | 40 |

The default valid relative-fret range is `0..24` inclusive. With capo, relative fret `0` is the capoed open string and sounding MIDI is `openMidi + capoFret + relativeFret`.

## Pitch identity

P1B preserves source pitch spelling. P2A accepts:

- natural pitches;
- `b` / `bb`;
- `#` / `##`;
- octave `0..9`.

Enharmonic spellings may resolve to the same MIDI semitone, but the original source spelling remains attached to every candidate.

Examples:

```text
C#4 -> MIDI 61
Db4 -> MIDI 61
B#3 -> MIDI 60
Cb4 -> MIDI 59
```

## Candidate contract

For each pitch P2A returns zero or more immutable records:

```text
{
  string,
  fret,
  pitch,
  pitchMidi,
  openPitch
}
```

Candidate order is deterministic by conventional guitar string number from string 1 to string 6. The order is **not** a preference score.

Examples:

```text
E2 -> [6/0]
A2 -> [5/0, 6/5]
E4 -> [1/0, 2/5, 3/9, 4/14, 5/19, 6/24]
```

An empty candidate array means the pitch is valid but has no playable position inside the active bounded configuration. It is evidence, not an exception and not permission to transpose the source pitch.

## Note-interval attachment

P2A can attach candidate arrays to P0 note intervals while preserving the original note id and all source timing/voice evidence.

The source interval is never mutated. Duplicate note ids fail closed before later solver stages can lose identity.

## Corpus evidence

The pinned PS-6 four-voice fixture reaches a final sonority:

```text
E2 A2 D3 G3
```

P2A must preserve at least the direct open-string evidence:

```text
E2 -> string 6 fret 0
A2 -> string 5 fret 0
D3 -> string 4 fret 0
G3 -> string 3 fret 0
```

This proves candidate enumeration only. It does not claim that the open-string combination is always the preferred musical fingering.

## Explicit non-goals

P2A does not implement:

- candidate ranking;
- best-position selection;
- left-hand fingering;
- barre detection;
- stretch/span cost;
- string-conflict resolution between simultaneous notes;
- held-note continuity;
- finger substitution;
- sustained path solving;
- TAB serialization.

Those require later bounded stages and separate evidence.
