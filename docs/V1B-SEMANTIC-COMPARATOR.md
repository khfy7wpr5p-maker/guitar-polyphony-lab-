# V1B — Engine/Lab Semantic Comparator

## Status

V1B now contains an initial deterministic comparator implementation inside the Lab.

This slice does **not** create a runtime dependency on `musicxml-to-guitar-tab-engine` and does not give the Lab production authority. Engine evidence is supplied as a previously produced `PolyphonicSourceModel 1.0.0` value and is adapted into the Lab-owned semantic snapshot contract.

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

When the MusicXML contains multiple parts, `options.partId` is required.

### Engine evidence side

`adaptEnginePolyphonicSourceModel(model)` accepts only:

```text
documentType: PolyphonicSourceModel
contractVersion: 1.0.0
```

The adapter consumes data only. The Lab does not import Engine source code, packages, parser modules, projectors, or runtime functions.

## Source identity

The comparison key is intentionally independent from each repository's internal object identity:

```text
partId + measureIndex + sourceNoteIndex
```

`sourceNoteIndex` is zero-based source `<note>` order within the measure. Source rests count in that order even though the Lab P0 note timeline does not create note intervals for rests. This preserves identity alignment across passages containing rests.

## Compared facts

For each pitched source note present on both sides, V1B compares:

- written pitch;
- onset in MusicXML divisions;
- duration in MusicXML divisions;
- voice;
- staff;
- tie-start evidence;
- tie-stop evidence.

For each measure, V1B also compares:

- measure number;
- derived active-sonority spans;
- active source-note membership per span;
- peak polyphony.

## Explicit non-scope

This V1B slice does not compare or infer:

- cross-measure sustain-chain joining;
- guitar string/fret assignment;
- sustained path selection;
- grace physical transitions;
- guitar technique physical semantics;
- reduction, omission or octave decisions;
- Canonical TAB output;
- rendering, playback, OMR or MIDI;
- visual equivalence.

Cross-measure sustain-chain comparison remains blocked until both sides expose an explicitly compatible and independently reviewed contract.

## Deterministic report

`compareSemanticSnapshots(reference, candidate)` returns an immutable `GuitarPolyphonySemanticComparisonReport 1.0.0`.

Current mismatch codes include:

- `PART_ID_MISMATCH`
- `MISSING_MEASURE`
- `UNEXPECTED_MEASURE`
- `MEASURE_NUMBER_MISMATCH`
- `MISSING_NOTE`
- `UNEXPECTED_NOTE`
- `NOTE_FIELD_MISMATCH`
- `PEAK_POLYPHONY_MISMATCH`
- `MISSING_SONORITY`
- `UNEXPECTED_SONORITY`
- `SONORITY_MISMATCH`

The report order is deterministic by measure index, source note index and compared field traversal.

## Safety boundary

The comparator fails closed on unsupported Engine contract versions and malformed evidence shapes. It does not normalize an unknown Engine contract into a claimed match.

The Lab remains verification-only:

```text
Lab reference semantics -------------------+
                                            |
Engine-produced PolyphonicSourceModel ------+--> V1B comparator
                                                  |
                                                  v
                                       deterministic evidence report
                                                  |
                                                  v
                                      separately reviewed production PR
```

## Current acceptance evidence

Automated tests cover:

- overlapping two-voice equality;
- source-note identity across rests;
- deterministic note-field mismatches;
- sonority / peak-polyphony mismatch reporting;
- missing-note reporting;
- fail-closed rejection of unsupported Engine evidence contract versions.

## Remaining V1B integration work

The comparator core is implemented. The remaining integration step is to produce and pin real Engine-generated `PolyphonicSourceModel 1.0.0` artifacts for approved compatibility fixtures, then run those artifacts through this comparator in Lab CI without introducing cross-repository runtime coupling.
