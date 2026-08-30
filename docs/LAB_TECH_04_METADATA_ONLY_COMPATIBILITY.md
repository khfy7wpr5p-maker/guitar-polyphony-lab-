# LAB-TECH-04 — Metadata-only compatibility benchmark

Research base: `f67b609ee14e4bb224e3994599522b3744160b87`

## Purpose

This stage proves that verified guitar technique provenance can remain an isolated sidecar without changing the physical guitar research baseline.

The benchmark deliberately does not inject technique fields into solver note objects. `GuitarTechniqueProvenance` records are validated separately and are referenced by logical note identity. Only `SAFE_METADATA_ONLY` records are accepted.

## Measured invariants

For the same polyphonic source and tuning, baseline execution and execution with a validated technique sidecar must have identical:

- source pitch, octave, onset, duration, voice, staff, tie, grace, and chord membership facts;
- solver input points;
- per-note fretboard candidate sets;
- complete sonority assignment counts and ordering;
- sustained verifier result including selected string/fret positions;
- repeated-run output across exactly two determinism runs.

The benchmark canonicalizes each compared structure and records SHA-256 fingerprints. Any difference throws `METADATA_INVARIANCE_VIOLATION`; there is no tolerance or fallback.

## Benchmark scenario

The primary mixed-polyphony fixture contains:

- two simultaneous attacks;
- a sustained/tied note that must keep its prior physical position;
- a later simultaneous attack;
- multiple voices;
- metadata-only harmonic, hammer-on, slide, straight-mute, fingering, and pluck provenance.

This exercises both candidate enumeration and the existing lexicographic distinct-string sustained verifier without changing its policy.

## Fail-closed gates

LAB-TECH-04 rejects:

- `BLOCKED_UNKNOWN_OR_AMBIGUOUS` provenance;
- any provenance record carrying pitch, octave, onset, duration, voice, staff, tie, grace, chord membership, candidates, ranking, or solver state;
- a sidecar that references an unknown logical note id;
- any determinism run count other than the required two.

## Cleared metadata-only classes

Subject to their LAB-TECH-03 source-shape constraints, the benchmark gate covers:

- empty/unspecified technical harmonic marker;
- simple hammer-on source-form provenance without invented destination physics;
- slide source-form provenance without inferred same-string physics;
- natural harmonic base-pitch role provenance without sounding-pitch rewrite;
- note/play straight-mute provenance without scope inference;
- technical string/fret/fingering/pluck evidence without solver target authority.

## Still blocked

The following are intentionally outside the metadata-only clearance:

- artificial-harmonic pitch-role chord projection;
- producer-specific let-ring scope/duration;
- automatic pairing of reused-number hammer-on chains;
- pull-off, bend, palm-mute, and tap without retrieved Guitar Pro 7.6.0 producer evidence;
- malformed, contradictory, missing-endpoint, or unknown technique structures.

## Production consequence

A green LAB-TECH-04 proves only that the listed safe classes can be represented as metadata sidecars without changing research solver behavior. It does not itself authorize production parser/projector acceptance. Production migration remains a separate, small-PR sequence and must be fresh-read before any mutation.
