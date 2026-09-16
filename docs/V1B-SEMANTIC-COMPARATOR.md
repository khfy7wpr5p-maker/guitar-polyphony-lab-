# V1B — Engine/Lab Semantic Comparator

## Status

**V1B deterministic evidence loop is complete for the approved two-fixture slice.**

The Lab now contains:

- a deterministic semantic comparator;
- pinned, real Engine-generated `PolyphonicSourceModel 1.0.0` evidence for the two approved compatibility fixtures;
- fixture SHA-256, Engine repository/SHA and artifact SHA-256 provenance;
- Lab tests that compare each pinned Engine artifact against the Lab semantic snapshot;
- CI regeneration from the exact pinned Engine commit followed by byte-for-byte comparison with the committed evidence.

This does **not** create a production runtime dependency on `musicxml-to-guitar-tab-engine`. Engine source is checked out only inside CI to reproduce evidence. Production authority remains in the Engine repository.

## Pinned production evidence

Engine repository:

```text
khfy7wpr5p-maker/musicxml-to-guitar-tab-engine
```

Pinned Engine commit:

```text
1d8ced644f544f7e991f7275eda77a2ce557774e
```

Approved fixtures and committed evidence:

| Fixture | Fixture SHA-256 | Engine artifact SHA-256 |
|---|---|---|
| `fixtures/compat/ps6-counterpoint-2v.musicxml` | `33a477a500e654a5731980f494ee16d8d0b7a83048114788976f4804e3332bf7` | `967352508ca5e9f64efbdde79e74ed2167e00824064f4d16fbfa0081b6708bf4` |
| `fixtures/compat/ps6-counterpoint-4v-tie.musicxml` | `47122b0aa38b6f9a7fdc974ec47c436ee1b2cead4f822d242b1712b399638c1a` | `be5a61a0e46314242584fbbc5a903e1aa97e241341e95836eb24f080a56ed8b1` |

The provenance manifest is `artifacts/v1b-engine/manifest.json`.

## Purpose

V1B answers a bounded verification question:

> Given the same source MusicXML part, do the Lab reference semantics and the production Engine source model agree on the source-note facts and active polyphony structure that both sides currently represent?

A mismatch report is evidence only. It does not authorize a production behavior change.

## Inputs

### Lab reference side

`buildLabSemanticSnapshot(input, options)` uses:

```text
MusicXML
  -> P1A input gate
  -> P1B parser adapter
  -> P0 measure timeline / sonority spans
  -> GuitarPolyphonySemanticSnapshot 1.0.0
```

### Engine evidence side

`adaptEnginePolyphonicSourceModel(model)` accepts only:

```text
documentType: PolyphonicSourceModel
contractVersion: 1.0.0
```

For reproducibility, `scripts/generate-v1b-engine-artifacts.cjs` executes the real pinned Engine parser/projector path in CI and writes deterministic evidence artifacts. The Lab runtime still imports no Engine module or package.

## Source identity

The comparison key is:

```text
partId + measureIndex + sourceNoteIndex
```

`sourceNoteIndex` is zero-based source `<note>` order within the measure. Source rests count in that order even though the Lab P0 note timeline does not create pitched note intervals for rests.

## Compared facts

For pitched source notes present on both sides, V1B compares:

- written pitch;
- onset in MusicXML divisions;
- duration in MusicXML divisions;
- voice;
- staff;
- tie-start evidence;
- tie-stop evidence.

Per measure it also compares:

- measure number;
- derived active-sonority spans;
- active source-note membership per span;
- peak polyphony.

## Explicit non-scope

V1B does not compare or infer:

- cross-measure sustain-chain joining;
- guitar string/fret assignment;
- sustained path selection;
- grace physical transitions;
- guitar technique physical semantics;
- reduction, omission or octave decisions;
- Canonical TAB output;
- rendering, playback, OMR or MIDI;
- visual equivalence.

Those are separate capabilities and must not be invented merely to make a comparator pass.

## Reproducibility loop

CI now performs:

```text
Lab fixture bytes
  -> verify Lab tests + pinned artifact hashes
  -> checkout Engine @ 1d8ced644f544f7e991f7275eda77a2ce557774e
  -> real parseParsedMusicXmlDocument()
  -> real projectParsedMusicXmlToPolyphonicSourceModel()
  -> deterministic artifact generation
  -> byte-for-byte diff against artifacts/v1b-engine
  -> upload regenerated evidence artifact
```

The committed Lab test `test/v1bEngineArtifacts.test.js` separately adapts the pinned Engine model and requires `compareSemanticSnapshots(...).equal === true` with zero mismatches.

## Safety and authority boundary

Strict evidence validation and the broader product goal are compatible. V1B is exact about facts both sides claim to represent, while later capability layers may support localized review, approximation and explicit arrangement transformations without rewriting source truth.

The Lab remains verification-only. A V1B result does not itself change production behavior.

## V1B completion and next stage

The approved two-fixture V1B slice is complete when its final branch CI is green. The next architecture stage is **V1C**, expanding the compatibility corpus and capability classification across broader real-world MusicXML shapes.

V1B completion must not be interpreted as a permanent product capability ceiling. The governing progressive-capability directive remains `handoffs/guitar_polyphony_lab_progressive_capability_developer_prompt_2026-09-16.json`.
