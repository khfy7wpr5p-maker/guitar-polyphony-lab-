# TUNING-LAB-01 — Deterministic Per-String Guitar Tuning Prototype

## Status and authority

This work is a research / verification prototype in `guitar-polyphony-lab`.

It does not become production TAB authority, does not replace the production sustained path solver, and must not be imported as a runtime dependency by `musicxml-to-guitar-tab-engine`.

The production repository was inspected read-only at fresh-read main `a45948af997368629fe830b1cbf08e2260965c36`.

## Immutable tuning contract

`src/guitar/tuningConfiguration.js` defines `GuitarTuningConfiguration 1.0.0`:

```text
GuitarTuningConfiguration
  documentType = GuitarTuningConfiguration
  contractVersion = 1.0.0
  stringCount = 6
  preset = STANDARD | DROP_D | CUSTOM
  strings[6]
    string
    pitch
    midi
    writtenPitch
```

Entries are ordered explicitly from string 1 through string 6. The normalized result and every contained string fact are frozen.

### Presets in scope

Standard:

```text
1 E4 64
2 B3 59
3 G3 55
4 D3 50
5 A2 45
6 E2 40
```

Drop D:

```text
1 E4 64
2 B3 59
3 G3 55
4 D3 50
5 A2 45
6 D2 38
```

The prototype also accepts a bounded six-string Custom configuration. It intentionally does not introduce a larger preset catalogue.

## Fail-closed validation

The tuning boundary rejects:

- anything other than exactly six strings;
- duplicate or missing string identities;
- entries not explicitly ordered 1 through 6;
- malformed scientific pitch spelling;
- MIDI values outside 0..127;
- pitch / MIDI mismatch;
- written-pitch mismatch;
- non-descending string pitch order;
- adjacent open-string intervals outside the bounded research profile;
- open pitches outside the bounded six-string research range;
- sparse/non-native arrays, Proxies, accessors/getters, Symbols and unknown fields.

No getter is evaluated during hostile-input rejection.

## Semantic safety invariant

Tuning is allowed to change only:

```text
source pitch -> playable string/fret realization
```

It is not allowed to change source:

- pitch;
- onset;
- duration;
- voice;
- staff;
- tie identity;
- octave/register semantics.

Tests preserve source objects and compare them before and after alternate-tuning candidate generation and sustained verification.

## Fretboard reference behavior

`src/guitar/fretboardCandidates.js` remains backward-compatible for its default Standard behavior while accepting an explicit tuning configuration.

The prototype supplies tuning-aware:

- `getPositionCandidates()`;
- `positionToMidi()`;
- `generateFretboardCandidates()`;
- `attachFretboardCandidates()`.

The existing 24-fret Lab research bound is unchanged. Production currently uses its own 0..20 default fret contract; tuning work must not silently change that production bound.

## Sustained-polyphony verification

`src/guitar/sustainedTuningVerifier.js` is an independent research verifier, not a second production path solver.

For each active-sonority point it:

1. generates exact candidates from the requested tuning;
2. keeps HOLD notes on the same prior string/fret;
3. enforces distinct-string occupancy;
4. verifies exact pitch round-trip;
5. returns deterministic research evidence or a fail-closed BLOCKED result.

Tie segments may have different source segment IDs but share a `sustainId`; the physical position is stable across the sustain chain. The verifier copies pitch, voice, staff and tie evidence without rewriting them.

The deterministic first-assignment choice is a research baseline only. It does not replace or modify the production ranking algorithm.

## Grace verification

`src/guitar/graceTuningVerifier.js` mirrors the production physical policy boundary without owning production behavior:

- exact grace pitch;
- exact anchor pitch/position;
- held-string reservation;
- tuning-aware candidate generation;
- exact string/fret round-trip;
- existing lexicographic transition-cost dimensions;
- BLOCKED when no exact physical transition exists.

No grace timing is inferred or invented.

## Canonical tuning facts prototype

Every physical verifier result carries the exact normalized tuning it actually used:

```json
{
  "guitar": {
    "stringCount": 6,
    "tuning": [
      { "string": 1, "pitch": "E4", "midi": 64, "writtenPitch": "E4" }
    ]
  }
}
```

This is evidence for the production requirement that result tuning and solver tuning must be identical.

## MusicXML staff-tuning round-trip

`src/musicxml/staffTuningSerializer.js` serializes the actual target tuning deterministically into six MusicXML `<staff-tuning>` elements.

MusicXML line mapping follows the guitar TAB convention used by the production writer:

```text
line 1 -> string 6
line 2 -> string 5
...
line 6 -> string 1
```

The parser round-trips pitch spelling and derived MIDI through the same tuning contract. The serializer receives only the target tuning configuration and therefore does not mix source-provenance tuning with requested target tuning.

## Regression and benchmark evidence

`test/customPerStringTuning.test.js` covers:

- immutable Standard, Drop D and Custom contracts;
- fail-closed invalid and hostile inputs;
- default Standard versus explicit Standard equality;
- Drop D candidate-set change;
- source-pitch immutability;
- one-, two-, three- and four-voice Drop D sonorities;
- HOLD occupancy;
- simultaneous attack during sustain;
- cross-measure tie physical continuity;
- bounded Custom four-voice feasibility;
- deterministic reruns;
- grace exactness and held-string reservation;
- MusicXML staff-tuning round-trip;
- existing compatibility-corpus benchmark comparison.

The recorded benchmark snapshot is `fixtures/tuning/benchmark-snapshot.json`.

For the existing Lab fixtures it records candidate count, solvable/blocked state and deterministic selected-position evidence under Standard, Drop D and Custom. Tie and grace consistency are separately asserted by the regression suite.

## Explicitly out of scope

- production Engine mutation;
- Workbench/Vercel UI implementation;
- capo;
- 7-string or 8-string instruments;
- partial capo;
- alternate temperament;
- large scordatura preset catalogues;
- production solver rewrite;
- source-pitch or source-timing transformation.
