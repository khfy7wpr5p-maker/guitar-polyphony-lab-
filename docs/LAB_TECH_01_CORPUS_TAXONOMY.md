# LAB-TECH-01 — Guitar technique corpus taxonomy

Research snapshot: `05fa70edf72af59cea52e2642d4bb45280049a07`  
Production evidence snapshot: `bb8c5f0be3c0f352d64026c988e61ba6af9dc3f3`

## Evidence rule

This stage records only technique structures supported by retained repository evidence. The nine Guitar Pro 7.6.0 source files are external-only and are not committed here. Their retained SHA-256 provenance is copied into `TECHNIQUE_TAXONOMY.json` and `fixtures/techniques/index.json`.

No physical solver behavior is defined by this stage.

## Exact retained shapes

### Empty technical harmonic

Observed as `note/notations/technical/harmonic`, empty and attribute-free, optionally beside explicit `string` and `fret`. The retained production audit proves no natural/artificial type, sounding-pitch interpretation, timing transformation, or position authority. It is therefore classified `SAFE_METADATA_ONLY`.

### Straight mute under note/play

Observed as attribute-free `note/play/mute` with exact text `straight`, with `mute` as the only same-namespace child of `play`. The retained audit proves note-level performance/timbre provenance but no duration or scope authority. It is therefore classified `SAFE_METADATA_ONLY`.

## Observed but incomplete retained shapes

### Hammer-on

The retained audit proves that `[Air]鸟之诗.xml` reaches a `note/notations/technical/hammer-on` blocker after empty harmonic normalization. It does not retain exact attributes, text, numbering, or start/stop pairing. The taxonomy therefore records this as `BLOCKED_UNKNOWN_OR_AMBIGUOUS` and requires source re-audit before a normalization contract can be defined.

### Artificial harmonic with pitch components

The retained audit proves a Guitar Pro artificial-harmonic technical structure containing base/touching/sounding pitch semantics in `[CLANNAD]メグメル(幻想).xml`. The exact hierarchy is not retained in the repository evidence and production explicitly classified it as a legitimate blocker. It remains `BLOCKED_UNKNOWN_OR_AMBIGUOUS`.

## Not yet evidenced by retained corpus material

Pull-off, slide, bend, explicit natural harmonic, palm-mute, let-ring, tap, fingering, pluck, guitar-produced up-bow/down-bow, and additional producer-specific technical children are not promoted into supported taxonomy entries. They require corpus evidence first.

## Safety invariants

- No pitch, octave, onset, duration, voice, staff, tie, grace, or chord membership is invented or changed.
- No technique receives `PHYSICAL_SEMANTICS_SUPPORTED` in LAB-TECH-01.
- Missing exact source shape is a blocker, not a reason to guess.
- Synthetic fixtures pin only the exact two retained metadata-only shapes.
