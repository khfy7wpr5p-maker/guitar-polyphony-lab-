# PRODUCTION_CAPO_TUNING_INTEGRATION_PLAN

Target production repository: `khfy7wpr5p-maker/musicxml-to-guitar-tab-engine`

Research source: `khfy7wpr5p-maker/guitar-polyphony-lab-`

This document is a migration plan only. TUNING-LAB-02 does not modify production.

Production fresh-read basis: `main` = `a45948af997368629fe830b1cbf08e2260965c36`.

## Global invariants

A future production implementation should use one validated GuitarConfiguration for the entire solve:

```text
stringCount = 6
tuning = non-capo open strings
capoFret = bounded non-negative integer
fret semantics = RELATIVE_FROM_CAPO
soundingMidi = openMidi + capoFret + relativeFret
```

Must remain invariant:

- source pitch/onset/duration/voice/staff/tie/grace identity are immutable
- no automatic octave shift to make capo cases playable
- no silent source-vs-user configuration conflict resolution
- no solver ranking rewrite
- exact position round-trip required
- one configuration must reach MONO/POLY/grace/canonical/writer consistently

## 1. Upload runtime

Current assumption:

- `src/app/musicXmlUploadRuntime.js` normalizes public options primarily around processing mode.
- production has `createGuitarConfiguration`, but no public capo request contract is propagated through the full runtime.

Required change:

- add hostile-safe public `guitar` request normalization
- accept six tuning pitch requests plus `capoFret`
- derive MIDI server/runtime-side
- resolve source/user authority before any physical candidate generation
- construct exactly one internal GuitarConfiguration

Risk:

- browser-supplied objects, Proxy/accessor input, stale positions, or partial configuration could become an unsafe trust-boundary bypass

Tests:

- absent guitar request => exact current Standard/capo-0 behavior
- valid Standard/Drop D/custom + capo
- malformed/partial/hostile request
- user/source agreement and conflict
- no source mutation

Fail closed when:

- incomplete/ambiguous request
- invalid tuning/capo
- conflict is unresolved

## 2. MusicXML guitar provenance normalizer

Current assumption:

- `runtimeGuitarNotationNormalizer.js` recognizes safe `staff-tuning` structure under `staff-details`.
- current safe staff-details child set does not include `capo`, so capo is not a supported normalized guitar-configuration fact.

Required change:

- parse bounded `staff-tuning` + optional `capo` as source configuration evidence
- require exact six-line guitar mapping before treating tuning as configuration evidence
- preserve original XML provenance separately from target configuration
- treat source technical string/fret as evidence only, not target solver authority

Risk:

- producer-specific or multiple-staff configurations can be ambiguous
- partial staff-tuning may look plausible but is unsafe as an exact target configuration

Tests:

- six-line Standard, Drop D, custom
- capo absent => source capo 0 only when the source staff configuration is otherwise unambiguous
- explicit capo
- duplicate/conflicting staff-details
- malformed line/order/alter/octave
- Guitar Pro corpus fixtures

Fail closed when:

- multiple unique explicit configurations occur in one immutable solve scope
- partial/contradictory tuning evidence
- mid-score capo/tuning change in the first production slice

## 3. Guitar configuration contract

Current assumption:

- `src/guitar/tuning.js` already supports six-string custom tuning and fret range.
- no capo field or explicit relative-fret semantic exists.

Required change:

- extend existing production GuitarConfiguration rather than creating a parallel capo object
- add `capoFret`
- define solver-facing fret as relative from capo
- bound absolute fret: `capoFret + relativeFret <= maximumFret`

Risk:

- breaking existing callers that interpret `fret` as absolute-from-nut

Tests:

- current Standard config exact regression
- capo 0 equivalence
- capo bounds
- tuning/capo physical bounds
- immutability

Fail closed when:

- fret semantic is not known exactly

## 4. Fretboard / candidate model

Current assumption:

- low-level fretboard is tuning-aware through GuitarConfiguration.
- candidate formula does not include capo.

Required change:

```text
relativeFret = targetMidi - openStringMidi - capoFret
absoluteFret = capoFret + relativeFret
```

- candidate only if relativeFret >= 0 and absoluteFret <= maximumFret
- `positionToMidi` must use the same configuration

Risk:

- mixing relative and absolute fret values across callers/writer

Tests:

- pitch -> candidate -> positionToMidi exact round-trip for six required configuration variants
- capo-raised low pitches become unplayable

Fail closed when:

- a position cannot round-trip exactly

## 5. MONO pipeline

Current assumption:

- `src/fingering/candidateLayerBuilder.js` can already receive tuning/fret limits.
- capo is absent from the propagated contract.

Required change:

- pass the single runtime GuitarConfiguration, not parallel tuning/capo scalars
- preserve existing MONO ranking unchanged

Risk:

- MONO and POLY could accidentally solve with different configurations

Tests:

- current Standard/capo-0 golden regressions
- Drop D + capo
- custom + capo

Fail closed when:

- runtime configuration is absent after an explicit non-default request

## 6. POLY candidate/state model

Current hard-coded assumption:

- `src/music/sustainedGuitarPositionStateModel.js` currently calls `getPositionCandidates(targetMidi)` and `positionToMidi(position)` without a GuitarConfiguration.
- current unplayable reason text is Standard-guitar-specific.

Required change:

- thread the exact GuitarConfiguration into PS-4A construction
- validate every generated position under that same configuration
- rename Standard-specific unplayable wording without changing state semantics

Risk:

- changing state enumeration order or IDs while adding configuration plumbing

Tests:

- Standard/capo-0 bit-for-bit deterministic state regression
- Standard capo 2, Drop D capo 0/2, custom capo N
- 1/2/3/4 voices
- blocked low-pitch cases

Fail closed when:

- any active pitch has no exact physical position
- distinct-string assignment is impossible

## 7. Sustained path solver

Current assumption:

- existing PS-5 deterministic ranking/transition policy is production authority.

Required change:

- do not alter ranking
- ensure all incoming position states were generated under the same GuitarConfiguration
- optionally carry configuration fingerprint/version to detect mismatch

Risk:

- accidental ranking changes disguised as capo support

Tests:

- exact Standard regression
- deterministic rerun under each configuration

Fail closed when:

- state/configuration provenance mismatch occurs

## 8. Tie handling

Current assumption:

- HOLD transitions preserve physical position across sustained logical identity.

Required change:

- keep same string + relative fret for START/CONTINUE/STOP under the immutable solve configuration
- explicitly reject mid-score capo changes in first slice

Risk:

- recomputing a held pitch at a new capo could move a tied note physically

Tests:

- tie start/continue/stop
- HOLD plus simultaneous attack
- cross-measure tie under custom tuning + capo

Fail closed when:

- held position no longer matches exact pitch under the solve configuration

## 9. Grace physical transition

Current hard-coded assumption:

- `src/music/gracePhysicalTransitionModel.js` calls `getPositionCandidates(note.pitch.midi)` and `positionToMidi(position)` without configuration.
- it also obtains sustained selection without a guitar configuration parameter.

Required change:

- pass the same GuitarConfiguration to sustained selection, exact grace candidates, anchor checks and position round-trip
- preserve held-string reservation and existing grace ranking policy

Risk:

- anchor/grace/sustain layers solving with different tuning/capo facts

Tests:

- grace -> anchor
- held strings
- capo
- custom tuning
- custom + capo
- unplayable exact grace pitch

Fail closed when:

- no exact non-held-string grace candidate/path exists

## 10. Canonical result V2

Current assumption:

- Canonical V2 already models guitar tuning, but builder support has historically defaulted to Standard facts.

Required change:

```json
{
  "guitar": {
    "stringCount": 6,
    "tuning": [],
    "capoFret": 2,
    "fretSemantics": "RELATIVE_FROM_CAPO"
  }
}
```

- facts must come from the exact internal configuration used by the solver

Risk:

- writer/result claiming one configuration while solver used another

Tests:

- result facts exact deep-equality with solve configuration
- Standard/capo-0 backward compatibility

Fail closed when:

- canonical configuration cannot be proven equal to solver configuration

## 11. MusicXML writer

Current assumption:

- `canonicalTabMusicXmlWriterV2.js` already serializes target `staff-tuning` from canonical guitar facts.
- no verified production capo serialization path is currently established.

Required change:

- emit target non-capo `staff-tuning`
- emit `<capo>N</capo>` under the same `staff-details`
- serialize technical string/fret using one explicitly documented relative-from-capo policy
- keep source fingering separate from generated target fingering

Risk:

- producer/version interpretation of technical fret with capo

Tests:

- deterministic writer snapshots
- parse -> canonical config -> write -> reparse exact configuration
- technical position round-trip to pitch under capo

Fail closed when:

- target technical fret semantics cannot be represented unambiguously

## 12. Workbench / Vercel API

First-slice request:

```json
{
  "guitar": {
    "capoFret": 2,
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

Required change:

- UI sends configuration request only
- server/runtime validates and reruns from source
- never client-side shift existing TAB positions

Risk:

- treating browser-computed MIDI/positions as authority

Tests:

- request schema
- stale-tab resistance
- invalid/hostile payload
- reset/default

Fail closed when:

- request cannot be converted to one exact internal GuitarConfiguration

## Recommended production PR sequence

1. contract + hostile-safe request/source authority normalization
2. capo-aware fretboard primitives with Standard/capo-0 regression
3. MONO plumbing
4. PS-4A / POLY plumbing without ranking changes
5. tie/sustained provenance checks
6. grace plumbing
7. Canonical V2 exact configuration facts
8. MusicXML writer round-trip
9. Workbench runtime API
10. UI only after engine contract is stable

Each step should pass the full protected production CI matrix before merge.
