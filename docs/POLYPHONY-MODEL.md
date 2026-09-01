# Polyphony Model

## Ordered measure events

The semantic core consumes events in MusicXML document order after `src/musicxml/partwiseParser.js` has decoded a bounded `score-partwise` input. It also accepts the same ordered-event contract from callers that do not use the parser.

### Note

```json
{
  "type": "note",
  "id": "n17",
  "pitch": "C4",
  "voice": "2",
  "staff": 1,
  "duration": 8,
  "chord": false,
  "tieStart": false,
  "tieStop": false
}
```

Rules:

- `duration` is a positive safe integer in the caller's measure division units.
- `id` is unique within the measure.
- `pitch` is a bounded spelling-preserving token at P0. The bundled parser produces tokens such as `Cb4`, `C4`, `C#4`, and `C##4`; P0 itself does not interpret them.
- `voice` defaults to `"1"` when omitted.
- `staff` defaults to `1` when omitted.
- `chord=true` reuses the onset of the immediately preceding attack note and does not advance the measure cursor.
- tie flags are preserved as evidence only; P0 does not infer cross-measure duration.

### Backup

```json
{ "type": "backup", "duration": 8 }
```

Moves the measure cursor backward. Moving before measure start is invalid and fails closed.

### Forward

```json
{ "type": "forward", "duration": 4 }
```

Moves the measure cursor forward without inventing notes.

## Note intervals

Each note becomes a half-open interval:

```text
[onset, end)
```

This convention makes active-note membership deterministic at boundaries.

## Sonority spans

A sonority span is a maximal boundary-to-boundary interval with one or more active notes.

Example:

```text
Voice 1: C4 [0,8)
Voice 2: E4 [0,4) F4 [4,8)
```

becomes:

```text
[0,4) -> C4 + E4
[4,8) -> C4 + F4
```

This representation is an input to the Lab's existing sustained research verifier and a bridge to possible future research. A sustained note remains active even when another voice attacks a new note.

## Determinism and limits

P0 uses bounded text fields, positive safe-integer durations, a maximum event count per measure, deterministic sorting, and explicit error codes. Unsupported semantic event types are rejected rather than guessed.
