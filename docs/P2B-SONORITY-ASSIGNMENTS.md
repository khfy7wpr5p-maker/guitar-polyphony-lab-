# P2B Sonority Assignment Enumeration

## Scope

P2B combines P2A note candidates into every bounded simultaneous assignment that uses a distinct guitar string for each active note.

It answers only:

> Can this sonority be placed on the six-string fretboard without assigning two simultaneous notes to the same string, and what are all such placements inside the bounded profile?

P2B does **not** rank or select a musically preferred placement.

## Input contract

Each note must preserve:

- unique note id;
- pitch;
- P2A `fretboardCandidates`.

At most six notes are accepted because the current guitar profile has six strings.

Each note may expose at most one candidate per string. Candidate string numbers are bounded to `1..6` and frets to `0..24`.

## Assignment contract

Each returned assignment contains one record per input note:

```text
{
  noteId,
  pitch,
  voice?,
  staff?,
  string,
  fret,
  pitchMidi?
}
```

Every assignment guarantees that its string numbers are unique.

Input note order is preserved. Candidate traversal is canonicalized by string then fret solely for deterministic enumeration; this ordering is not a preference score.

## Bounded enumeration

For six distinct strings the maximum number of one-candidate-per-string permutations across six notes is `6! = 720`.

P2B therefore has a hard assignment ceiling of 720. A caller may request a lower ceiling for testing or resource control, but if the complete valid set would exceed that ceiling P2B throws `ASSIGNMENT_LIMIT_EXCEEDED` rather than silently truncating the result.

## Fail-closed / factual-empty distinction

P2B distinguishes invalid input from a physically impossible sonority.

Examples:

- seven simultaneous notes -> `SONORITY_EXCEEDS_STRING_COUNT`;
- malformed candidate -> explicit error;
- duplicate same-string candidate for one note -> explicit error;
- two E2 notes, both requiring string 6 -> valid input but no physical assignment, therefore `[]`.

An empty result never authorizes pitch deletion, octave displacement, or transcription changes.

## Corpus evidence

The pinned PS-6 final four-voice sonority:

```text
E2 A2 D3 G3
```

has one forced distinct-string assignment inside the current low-register profile:

```text
E2 -> 6/0
A2 -> 5/0
D3 -> 4/0
G3 -> 3/0
```

This is a factual placement result, not a preference decision.

## Explicit non-goals

P2B does not implement:

- ranking or cost;
- left-hand position;
- fingering numbers;
- barre;
- stretch/span comfort;
- transition cost between sonorities;
- held-note continuity;
- finger substitution;
- sustained path solving;
- TAB serialization.

Those belong to later stages. P3 must consume P2B assignments as evidence rather than reinterpret MusicXML or invent new pitches.
