# LAB-TECH-03 — Technique-specific verification fixtures

Research base: `8f6646c4a73ba36d4c5f26188aa0f9b18149b9d0`

## Evidence sources

This stage re-audited external real MusicXML sources without committing the source corpus. Exact producer/version evidence is retained only as bounded fixture facts and source hashes where available.

Observed Guitar Pro 7.6.0 source shapes include:

- `note/notations/technical/hammer-on` with `number="1"`, `type="start|stop"`, and start text `H`.
- A chained hammer-on sequence where the same number is reused and one note contains both a start and a stop marker.
- `note/notations/slide` with numbered start/stop markers, both with and without technical string/fret evidence at the endpoints.
- `note/notations/technical/harmonic` natural harmonic structures using `<natural/><base-pitch/>`.
- Artificial harmonic pitch-role structures using `<artificial/>` plus `<base-pitch/>`, `<touching-pitch/>`, or `<sounding-pitch/>` in chord context.
- `note/play/mute` with exact text `straight`.
- `string`, `fret`, `fingering`, and `pluck` technical children.
- Producer processing instruction `<?GP7 <root><letring/></root>?>` attached at note scope.

The real source files stay external-only.

## Standard MusicXML cross-check

The MusicXML 4.0 reference confirms that hammer-on and pull-off are `technical` children with required start/stop type semantics; slide is a `notations` child with required start/stop semantics; bend is a `technical` child requiring `bend-alter`; harmonic is a `technical` child that can encode natural/artificial plus one pitch-role marker (`base-pitch`, `touching-pitch`, or `sounding-pitch`).

Reference pages:

- https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/hammer-on/
- https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/pull-off/
- https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/slide/
- https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/bend/
- https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/bend-alter/
- https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/harmonic/

Standard semantics are not treated as proof that Guitar Pro 7.6.0 emits a shape. Pull-off and bend therefore remain producer-unevidenced in this retrieved corpus set.

## Critical pairing finding

`number` is not sufficient as a unique Guitar Pro pairing identity. The real `てんとう虫` source contains a three-note hammer-on chain with the same number reused across:

1. start
2. start + stop on the same note
3. stop

Therefore LAB-TECH-03 forbids assigning a pairing ID from the numeric attribute alone. Individual start/stop provenance may be preserved as metadata. A deterministic pairing requires event identity plus proven score-order context. Ambiguous chains remain unpaired and fail closed.

## Technique decisions

### Cleared as individual metadata provenance

- simple hammer-on start/stop source form
- slide start/stop source form
- natural harmonic source-role marker
- straight mute per-note marker
- technical position/fingering/pluck evidence

Clearance means provenance preservation only. It grants no physical solver authority and no destination-pitch, same-string, duration, or ranking semantics.

### Still blocked

- automatic pairing of reused-number hammer-on chains
- artificial-harmonic pitch-role chord projection until LAB-TECH-04 proves solver-visible note identity is unchanged
- Guitar Pro let-ring scope/duration semantics
- pull-off: standard MusicXML semantics known, but no retrieved Guitar Pro 7.6.0 producer example in this corpus subset
- bend: standard MusicXML shape known, but no retrieved Guitar Pro 7.6.0 producer example in this corpus subset
- palm-mute and tap: no retrieved Guitar Pro 7.6.0 producer example
- malformed/missing/conflicting endpoints

## Safety invariants

- Source pitch, octave, onset, duration, voice, staff, tie, grace, and chord membership are untouched.
- No source technique creates or rewrites a destination pitch.
- No source position becomes solver authority.
- No physical semantics are enabled.
- Unknown or insufficiently evidenced producer forms remain blocked.
