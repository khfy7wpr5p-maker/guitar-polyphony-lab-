# PRODUCTION_INTEGRATION_PLAN — Custom Per-String Tuning

Production repository: `khfy7wpr5p-maker/musicxml-to-guitar-tab-engine`

Fresh-read reference inspected read-only: `a45948af997368629fe830b1cbf08e2260965c36`

This document is an integration plan only. TUNING-LAB-01 does not mutate the production repository.

## Governing invariants

Production adoption must preserve these invariants:

1. Tuning changes only pitch-to-string/fret realization.
2. Source pitch, onset, duration, voice, staff and tie facts are immutable.
3. No octave shift may be inferred from a tuning request.
4. One normalized guitar configuration must be propagated through every physical layer.
5. Canonical result tuning must be the exact tuning used by the solver.
6. Writer output must use target solver tuning, not source-provenance tuning.
7. Existing Standard behavior remains the default and is regression-identical.
8. Existing solver ranking policies must not change as part of tuning propagation.

## Current production contract findings

### `src/guitar/tuning.js`

Current production already has `createGuitarConfiguration()` and accepts a six-entry custom `tuning`. It validates six unique string numbers, MIDI range and optional pitch/MIDI agreement, then sorts by string number.

Gap for a public request boundary:

- current tuning entries are `{ number, pitch, midi }` rather than the proposed browser `{ string, pitch }` shape;
- MIDI is presently the authoritative required fact in typical callers;
- the boundary is not hardened to the same Proxy/getter/exact-data-property standard used by newer runtime contracts;
- the normalized contract does not explicitly distinguish request provenance from actual solver facts.

Recommendation: add one hostile-safe public normalization adapter, derive MIDI server-side, and then feed the existing internal `createGuitarConfiguration()` shape. Avoid two competing tuning validators in production.

### `src/guitar/fretboard.js`

Current state is already suitable at the low level:

- `getPositionCandidates(midi, options)` creates/uses a guitar configuration;
- `positionToMidi(position, tuning)` can round-trip against an explicit tuning.

Do not rewrite this layer. Tighten call-site propagation and regression tests.

## Layer-by-layer production migration

### 1. Upload runtime

File: `src/app/musicXmlUploadRuntime.js`

Current hard-coded Standard points:

- module-level `STANDARD_GUITAR = createGuitarConfiguration()`;
- module-level Standard min/max MIDI bounds;
- `normalizeOptions()` accepts only `processing`;
- POLY canonical and grace calls receive no guitar configuration.

Required input contract:

```text
options.guitar.tuning[6]
  string
  pitch
```

Required propagation:

1. hostile-safe normalize `options.guitar`;
2. derive one internal immutable `guitarConfiguration`;
3. compute playable range from that configuration rather than module-level Standard constants;
4. pass the same configuration to MONO candidate generation, POLY sustained physical generation, Canonical V2 production, grace physical transition and writer provenance;
5. preserve Standard when `options.guitar` is omitted.

Regression risk: HIGH. This is the public trust boundary and route fan-out point.

Recommended tests:

- omitted guitar options exactly match current Standard result;
- Drop D accepts D2 without rewriting source pitch;
- malformed/hostile tuning blocks before conversion;
- tuning changes do not alter route selection, source identity or source semantic facts;
- requested configuration appears exactly in result facts and writer output.

### 2. MONO candidate builder

File: `src/fingering/candidateLayerBuilder.js`

Current state:

- builder options already allow `tuning`, `minimumFret`, `maximumFret`;
- `createGuitarConfiguration(guitarOptions)` is already used;
- candidate generation calls `getPositionCandidates(targetPitch.midi, guitarConfiguration)`.

Hard-coded Standard gap: primarily upstream propagation, not this candidate builder.

Required propagation:

- upload/runtime must pass normalized tuning into this existing option;
- ensure all callers use the same normalized configuration rather than reconstructing semantically equivalent copies where provenance matters.

Regression risk: LOW to MEDIUM.

Recommended tests:

- current Standard candidate layers are byte/deep-equal;
- Drop D changes only candidate positions;
- pitch facts and source references remain unchanged;
- existing `writtenPitchOctaveShift` behavior remains a separate explicit register feature and is never triggered by tuning.

### 3. POLY V2 pipeline

Primary file: `src/music/sustainedGuitarPositionStateModel.js`

Current hard-coded Standard points:

- `getPositionCandidates(targetMidi)` is called without tuning;
- generated positions are checked with `positionToMidi(position)` without tuning;
- result `guitar` facts include only contract version/string count/default fret range, not the actual tuning.

Required input contract:

- accept an already-normalized `guitarConfiguration` or a narrowly versioned equivalent at the physical boundary.

Required propagation:

```text
POLY source
 -> active sonority
 -> sustained position states (tuning-aware)
 -> sustained physical states
 -> transitions
 -> sustained path selection
 -> sustained canonical selection
```

Only the position candidate and exact round-trip semantics change. Downstream ranking receives different physical candidates but its policy/cost ordering must remain untouched.

Regression risk: HIGH because sustained state identity feeds transitions and final selection.

Recommended tests:

- Standard PS-4A state signatures exactly unchanged;
- Drop D state candidates reflect sixth-string D2/E2 positions;
- 2/3/4-voice sonorities;
- candidate limits remain enforced;
- impossible alternate tuning still fails closed rather than displacing pitches.

### 4. Canonical Result V2

Files:

- `src/contracts/canonicalTabResultV2Contract.js`
- `src/tab/canonicalTabResultV2BuilderSupport.js`
- `src/tab/canonicalTabResultV2.js`

Current state:

- the V2 contract already contains `guitar.tuning` and validates six `{ number, pitch, midi }` entries through `createGuitarConfiguration()`;
- `createGuitarFacts()` currently calls `createGuitarConfiguration()` with no options, so it always emits Standard;
- `createCanonicalTabResultV2()` has no guitar-configuration input.

Required propagation:

- make `createGuitarFacts()` consume the exact normalized configuration used by physical selection;
- pass that same configuration into Canonical V2 construction;
- validate that result tuning equals solver tuning, not merely a separately reconstructed request.

Regression risk: MEDIUM to HIGH because Canonical V2 is a cross-layer contract.

Recommended tests:

- Standard V2 fixture remains identical;
- Drop D V2 result reports sixth string D2/38;
- selected positions round-trip against result tuning;
- deliberate mismatch between solver configuration and result configuration is rejected.

### 5. Sustained solver and tie continuity

Files include:

- `src/music/sustainedGuitarPositionStateModel.js`
- `src/music/sustainedLeftHandPhysicalStateModel.js`
- `src/music/sustainedGuitarTransitionModel.js`
- `src/music/sustainedPolyphonicPathSolver.js`
- sustained canonical selector call chain.

Current hard-coded Standard root: PS-4A position generation. The PS-5 solver already requires held logical notes to retain exact string/fret across HOLD transitions.

Required propagation:

- construct PS-4A candidates from requested tuning;
- propagate configuration identity or tuning facts through model headers as needed for consistency validation;
- keep HOLD string/fret stability exactly as currently implemented;
- never re-finger a held note merely because a later call reconstructed a different tuning.

Regression risk: HIGH.

Recommended tests:

- tie start/stop across measures keeps the exact same physical position;
- simultaneous attacks cannot steal held strings;
- Standard selected path/cost/signature remains unchanged;
- Drop D bass tie remains stable while upper voices attack/release;
- tuning mismatch between adjacent model stages is rejected.

### 6. Grace physical transition

File: `src/music/gracePhysicalTransitionModel.js`

Current hard-coded Standard points:

- `getPositionCandidates(note.pitch.midi)`;
- `positionToMidi(position)` for grace candidates;
- `positionToMidi(anchorDisposition.selectedPosition)` for anchor validation;
- `createSustainedPolyphonicPathSelection(source, runtime)` receives no tuning.

Required propagation:

- accept the same normalized configuration used for the anchor/sustained solution;
- use it for grace candidates, anchor round-trip and sustained-path lookup;
- preserve current held-string reservation and lexicographic grace transition policy unchanged.

Regression risk: HIGH for grace + sustained interactions.

Recommended tests:

- exact Drop D grace pitch D2;
- anchor exactness under alternate tuning;
- held sixth string blocks a D2 grace when it is the only exact position;
- Standard grace snapshots remain unchanged;
- no grace timing is synthesized.

### 7. MusicXML writer

File: `src/writers/canonicalTabMusicXmlWriterV2.js`

Current state is already largely target-tuning-ready:

- `prepareTuning(canonicalTabResult)` reads `result.guitar.tuning`;
- `writeStaffTuning()` writes six `<staff-tuning>` facts;
- line mapping is deterministic: line 1 -> string 6 through line 6 -> string 1.

Hard-coded Standard gap: upstream Canonical V2 currently always supplies Standard facts.

Required propagation:

- no writer ranking/semantic rewrite;
- ensure Canonical result contains the actual target solver tuning;
- keep source MusicXML provenance separate from target TAB staff tuning.

Regression risk: MEDIUM.

Recommended tests:

- Standard writer snapshot unchanged;
- Drop D writes line 1 as D2;
- Custom round-trip through MusicXML staff-tuning;
- source contains Standard staff-tuning but request is Drop D: target writer must emit Drop D;
- source contains alternate tuning but request/default policy resolves Standard: writer must emit actual solver target, not source provenance, unless a future explicit policy says otherwise.

### 8. Workbench / runtime API

No UI implementation is part of this Lab task.

Proposed request:

```json
{
  "guitar": {
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

Browser responsibility:

- collect six requested pitches;
- submit the original source plus request;
- display returned target tuning/string/fret facts.

Browser must not:

- derive semantic MIDI authority;
- modify source notes;
- reuse old positions under new tuning;
- decide whether an invalid tuning is physically supported.

Runtime responsibility:

```text
original MusicXML + tuning request
 -> validate/normalize
 -> re-run solver
 -> generate new Canonical TAB
 -> serialize target staff tuning
```

Regression risk: MEDIUM to HIGH because caching/re-solve behavior can otherwise preserve stale positions.

Recommended tests:

- changing one string forces a new solve;
- original source hash is unchanged;
- result tuning equals request-normalized tuning;
- stale selected positions cannot be reused.

## Production implementation order

Recommended sequencing to keep changes reviewable:

1. harden/normalize public tuning request into one production guitar configuration;
2. add explicit configuration propagation to sustained PS-4A and exact round-trips;
3. propagate through sustained transition/path/canonical selection without ranking changes;
4. make Canonical V2 guitar facts originate from the same configuration;
5. tune-aware grace propagation;
6. upload/runtime request plumbing and range checks;
7. writer regression proving target tuning serialization;
8. Workbench UI only after runtime contract is stable.

## Regression gates before production merge

Minimum production gate:

- all current Standard tests green with identical deterministic facts;
- new Standard explicit-vs-default equality tests;
- Drop D single/2/3/4 voice;
- sustained and cross-measure tie tests;
- grace held-string tests;
- hostile tuning request tests;
- Canonical V2 tuning/selected-position consistency;
- MusicXML staff-tuning round-trip;
- upload runtime no-silent-musical-change invariant;
- existing full Node 18/20/22 and renderer CI matrix green.

## Deliberately excluded from this migration

- capo;
- 7-string/8-string support;
- partial capo;
- alternate temperament;
- solver ranking rewrite;
- source pitch transformation;
- automatic octave displacement caused by tuning;
- importing Lab runtime code into production.
