# Supported MusicXML Semantics

This document describes the bounded, tested semantic support of the lab. It is not a claim of full MusicXML schema coverage.

## Input boundary — P1A

Accepted input:

- UTF-8 string or `Uint8Array`
- bounded size
- `score-partwise` root
- optional XML declaration and leading comments

Rejected before parser execution:

- invalid UTF-8
- NUL bytes
- DOCTYPE
- entity declarations
- XInclude
- `score-timewise`
- unsupported roots

## Parser adapter — P1B

P1B extracts, in document order:

- parts and measures
- measure `number`
- `divisions`, including deterministic inheritance to later measures in the same part
- pitched notes with step / integer alter / octave
- positive integer `duration`
- `voice`
- `staff`
- `<chord/>`
- rests
- `<backup>`
- `<forward>`
- `<tie type="start|stop">`
- `<notations><tied type="start|stop|continue">`

Pitch alterations are currently bounded to integer values `-2..2`. P1B formats pitches as spelling-preserving strings such as `Cb4`, `C4`, `C#4`, `C##4`.

Rests are normalized into P0-compatible cursor movement:

```text
{ type: "forward", duration, sourceKind: "rest", voice, staff }
```

This preserves the no-sound timing effect while retaining rest provenance for later validation.

## P0 timeline support

The P0 timeline consumes:

- `note`
- `backup`
- `forward`
- chord membership
- voice/staff metadata
- tie evidence

It produces deterministic note intervals and active-note sonority spans within a measure.

## Intentionally fail-closed in P1B

- grace notes
- cue notes
- unpitched notes
- microtonal/non-integer `<alter>` values
- XML 1.1
- missing `divisions` before a part establishes timing units
- missing/invalid duration
- malformed XML
- unsupported tie/tied types
- excessive element depth, part count, measure count, event count, or captured semantic text

## Not yet implemented

- cross-measure tie joining
- normalization across changing `divisions`
- tuplets / `time-modification`
- ornaments
- transposition interpretation
- multiple-part synchronization
- repeat/navigation expansion
- exporter-specific compatibility normalizers
- full MusicXML technical-technique parsing into physical behavior
- production sustained path solving
- TAB writing

## Compatibility policy

A construct is supported only after a fixture and exact-head CI demonstrate it. Unknown presentation metadata may be ignored when it cannot change the extracted timing/pitch contract; unknown timed or pitch-changing semantics must not be silently guessed.
