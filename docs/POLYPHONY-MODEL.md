# Polyphony Model

## Ordered measure events

The semantic core consumes events in MusicXML document order after a future parser adapter has decoded XML syntax.

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
- `pitch` is an opaque normalized pitch token at P0; pitch spelling semantics are a later contract.
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

This representation is the intended bridge to future sustained guitar-state search. A sustained note remains active even when another voice attacks a new note.

## Determinism and limits

P0 uses bounded text fields, positive safe-integer durations, a maximum event count per measure, deterministic sorting, and explicit error codes. Unsupported semantic event types are rejected rather than guessed.
