# TUNING-LAB-02 — Capo-aware per-string GuitarConfiguration

Status: research / verification only.

Production authority remains `khfy7wpr5p-maker/musicxml-to-guitar-tab-engine`. This Lab change must not become a second production solver or a runtime dependency of production.

## Fresh-read basis

At the start of TUNING-LAB-02:

- Lab `main`: `cae280cb2bbeb45466e3ec2ff88b25f2335c46ac`
- Lab `main` protection: disabled; no repository ruleset; open hardening Issue #2 remains
- Lab open PRs: none before this work
- Production `main`: `a45948af997368629fe830b1cbf08e2260965c36`
- Production `main`: protected with required CI checks
- Production open PRs/issues observed: none

Production was inspected read-only only.

## Single physical configuration

TUNING-LAB-02 extends the TUNING-LAB-01 tuning object into one immutable `GuitarConfiguration`:

```text
GuitarConfiguration
- documentType: GuitarConfiguration
- contractVersion: 2.0.0
- stringCount: 6
- tuning: six non-capo open-string pitches/MIDI values
- capoFret: integer 0..24
- fretSemantics: RELATIVE_FROM_CAPO
- preset: STANDARD | DROP_D | CUSTOM
```

`strings` remains only as a compatibility alias to the exact same frozen `tuning` array. It is not a second model.

Default configuration is:

```text
1 E4 64
2 B3 59
3 G3 55
4 D3 50
5 A2 45
6 E2 40
capoFret = 0
```

## Capo semantics

Tuning entries always describe the non-capo open string.

Solver-facing fret is always relative from the capo:

```text
soundingMidi = openStringMidi + capoFret + relativeFret
absoluteFret = capoFret + relativeFret
```

The bounded Lab fretboard ends at absolute fret 24, so:

```text
0 <= relativeFret <= 24 - capoFret
```

This avoids using the same `fret` number with two meanings.

## Source immutability

Tuning/capo may change only physical realization:

```text
source pitch -> candidate string / relative fret
```

They do not change or infer:

- pitch or octave
- onset
- duration
- voice
- staff
- tie identity
- grace identity/timing

A pitch below the capo-raised minimum sounding pitch produces no exact candidate and therefore BLOCKED / unplayable evidence.

## Validation

Fail-closed validation covers:

- exactly six strings
- explicit ordered string 1..6
- duplicate/missing strings
- scientific pitch spelling
- integer MIDI and exact pitch/MIDI agreement
- bounded physically descending tuning
- integer capo
- capo >= 0
- capo <= 24
- hostile Proxy/accessor input
- unknown/ambiguous configuration fields
- fixed `RELATIVE_FROM_CAPO` semantics

## Fretboard and POLY behavior

The existing ranking/enumeration policy is intentionally unchanged.

`getPositionCandidates`, `generateFretboardCandidates` and `positionToMidi` now resolve the single GuitarConfiguration. Existing sustained/tie and grace research verifiers therefore use the same tuning + capo facts without a parallel capo solver.

TUNING-LAB-01 compatibility APIs remain available for capo=0 callers.

## Sustained / tie

For HOLD segments the selected physical position must still round-trip to the exact source pitch under the same GuitarConfiguration. A sustain chain cannot move string/fret merely because a later sonority has different attacks.

Mid-score capo changes are unsupported in this prototype. One verification run has one immutable GuitarConfiguration.

## Grace

Grace verification uses the same configuration and the existing policy:

`HELD_STRINGS_RESERVED_THEN_LEXICOGRAPHIC_POSITION_PATH_1.0`

No grace duration or timing is generated.

## MusicXML findings

MusicXML 4.0 defines both `<staff-tuning>` and `<capo>` under `<staff-details>`.

- `<staff-tuning>` is the open, non-capo tuning of tablature staff lines.
- `<capo>` is a non-negative integer fret and raises the open tuning by that many half-steps.
- tablature strings are numbered 1 from the highest string.
- `<technical><string>` and `<fret>` encode source fingering/tablature position facts.

References:

- https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/staff-details/
- https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/staff-tuning/
- https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/capo/
- https://www.w3.org/2021/06/musicxml40/tutorial/tablature/

The Lab target serializer maps MusicXML staff line 1 -> guitar string 6 through line 6 -> string 1, emits explicit `<capo>N</capo>`, and treats serialized technical fret as `RELATIVE_FROM_CAPO`.

Producer-specific ambiguity is not guessed. Source technical fingering is evidence, not target solver authority.

## Production read-only findings

At production SHA `a45948af997368629fe830b1cbf08e2260965c36`:

- `src/guitar/tuning.js` has an immutable six-string `createGuitarConfiguration`, custom tuning, and min/max fret, but no capo field.
- `src/guitar/fretboard.js` is configuration-aware for tuning but has no capo semantics.
- MONO candidate construction can receive tuning/fret range, but no capo propagation exists.
- `src/music/sustainedGuitarPositionStateModel.js` calls `getPositionCandidates(targetMidi)` and `positionToMidi(position)` without a supplied configuration, so PS-4A is still standard-hard-coded at this boundary.
- `src/music/gracePhysicalTransitionModel.js` similarly calls fretboard primitives without configuration and invokes the sustained path without capo/tuning propagation.
- `src/app/runtimeGuitarNotationNormalizer.js` accepts safe `staff-tuning` under `staff-details`, but `capo` is not in its safe staff-details child set; therefore capo is not currently a supported normalized production guitar configuration fact.
- canonical/writer tuning support exists, but upstream runtime/canonical construction must carry the exact configuration actually used by the solver before capo can be safely serialized.

## Configuration authority policy

Default Lab policy:

1. explicit user configuration
2. explicit safe MusicXML guitar configuration evidence
3. Standard/capo-0 fallback only if neither is explicit

If both explicit user and source configurations exist and differ, the prototype returns `CONFLICT` instead of silently choosing one. If they agree, the user/source agreement is recorded.

Explicit source technical string/fret does not become target solver authority.

## Canonical result proposal

Production result should expose the exact configuration used by the solver:

```json
{
  "guitar": {
    "stringCount": 6,
    "tuning": [
      { "string": 1, "pitch": "E4", "midi": 64 },
      { "string": 2, "pitch": "B3", "midi": 59 },
      { "string": 3, "pitch": "G3", "midi": 55 },
      { "string": 4, "pitch": "D3", "midi": 50 },
      { "string": 5, "pitch": "A2", "midi": 45 },
      { "string": 6, "pitch": "D2", "midi": 38 }
    ],
    "capoFret": 2,
    "fretSemantics": "RELATIVE_FROM_CAPO"
  }
}
```

## Workbench request proposal

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

Browser/UI is not semantic authority. Runtime must validate the request, derive MIDI, resolve authority/conflicts, and rerun the solver from immutable source notation.

## Benchmark

`fixtures/tuning/capo-benchmark-snapshot.json` compares the same existing compatibility corpus under:

- Standard / capo 0
- Standard / capo 2
- Drop D / capo 0
- Drop D / capo 2
- custom / capo 0
- custom / capo 2

It records candidate count, playability, solver status, selected positions, deterministic rerun, tie consistency and grace consistency.

Some capo-2 variants intentionally become BLOCKED because the existing corpus includes E2. This is expected physical evidence, not a reason to transpose the source.

## Out of scope

- production mutation
- Vercel/Workbench UI implementation
- partial/movable partial capo
- mid-score capo changes
- 7/8-string instruments
- microtonal/alternate temperament
- solver ranking rewrite
- source pitch transformation
- automatic octave shift
