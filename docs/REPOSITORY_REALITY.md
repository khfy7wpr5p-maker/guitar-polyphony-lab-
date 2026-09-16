# Repository reality

Fresh-read scope: current `stage/v1b-semantic-comparator` branch, source/tests, package scripts, CI, compatibility fixtures, committed Engine evidence, and the active progressive-capability directive as of 2026-09-16.

This document describes repository reality, not production capability claims for `musicxml-to-guitar-tab-engine`.

## Current architecture

```text
MusicXML
  -> P1A bounded input gate
  -> P1B partwise parser
  -> P0 measure timeline / sonority spans
  -> Lab semantic snapshot -------------------------+
                                                      |
Pinned production Engine evidence                    |
  -> PolyphonicSourceModel 1.0.0 -------------------+
                                                      |
                                                      v
                                           V1B comparator
                                                      |
                                                      v
                                          deterministic report

P0 facts may also feed:
  -> P2A fretboard candidates
  -> P2B distinct-string assignments
  -> sustained/grace research verifiers
  -> fixtures / hashes / benchmark evidence
```

Technique provenance is a parallel metadata/source-evidence sidecar and currently has no authority to alter physical candidates or production behavior.

## Implemented contracts

| Module | Current role | Failure / authority boundary |
|---|---|---|
| `src/musicxml/inputGate.js` | bounded UTF-8 / hostile-XML trust gate | rejects invalid or unsafe input before parsing |
| `src/musicxml/partwiseParser.js` | bounded MusicXML semantic extraction | evidence layer does not guess unsupported shapes |
| `src/polyphony/measureTimeline.js` | cursor/voice/chord timeline and active sonority reconstruction | deterministic per-measure reference semantics |
| `src/verification/semanticComparator.js` | Lab ↔ Engine semantic snapshot normalization/comparison | accepts only reviewed Engine evidence contract `PolyphonicSourceModel 1.0.0` |
| `src/guitar/tuningConfiguration.js` | six-string tuning/capo configuration | bounded deterministic research contract |
| `src/guitar/fretboardCandidates.js` | physical string/fret candidates per pitch | impossible pitch yields factual no-candidate evidence |
| `src/guitar/sonorityAssignments.js` | bounded distinct-string assignments | strict physical feasibility; not arrangement authority |
| sustained/grace verifier modules | deterministic research baselines | experimental; not production path authority |
| `src/musicxml/guitarTechniqueProvenance.js` | source technique metadata/provenance | no physical-solver authority |

## V1B real Engine evidence

V1B no longer relies only on synthetic Engine-shaped unit-test values.

Pinned production repository:

```text
khfy7wpr5p-maker/musicxml-to-guitar-tab-engine
```

Pinned production commit:

```text
1d8ced644f544f7e991f7275eda77a2ce557774e
```

Committed evidence:

| Fixture | Fixture SHA-256 | Artifact SHA-256 |
|---|---|---|
| `fixtures/compat/ps6-counterpoint-2v.musicxml` | `33a477a500e654a5731980f494ee16d8d0b7a83048114788976f4804e3332bf7` | `967352508ca5e9f64efbdde79e74ed2167e00824064f4d16fbfa0081b6708bf4` |
| `fixtures/compat/ps6-counterpoint-4v-tie.musicxml` | `47122b0aa38b6f9a7fdc974ec47c436ee1b2cead4f822d242b1712b399638c1a` | `be5a61a0e46314242584fbbc5a903e1aa97e241341e95836eb24f080a56ed8b1` |

Files live under `artifacts/v1b-engine/`, with provenance in `manifest.json`.

`test/v1bEngineArtifacts.test.js` verifies:

- fixture hash;
- artifact hash;
- Engine repository/SHA/contract identity;
- Lab semantic snapshot against the real Engine artifact;
- zero semantic mismatches for the approved slice.

## CI reality

`.github/workflows/ci.yml` runs for PRs to `main` and pushes to `stage/**`.

The V1B CI loop now performs:

1. locked Lab install;
2. syntax checks;
3. complete Node test suite;
4. checkout of the exact pinned Engine SHA;
5. locked Engine dependency install;
6. real Engine artifact generation via `parseParsedMusicXmlDocument()` and `projectParsedMusicXmlToPolyphonicSourceModel()`;
7. byte-for-byte `diff` against the committed V1B artifacts;
8. upload of regenerated evidence.

This is a CI evidence dependency only. The Lab runtime/package does not import Engine code.

## Polyphony / physical coverage

| Feature | Current reality |
|---|---|
| 2-voice sustained overlap | ✅ pinned fixture + Lab tests + real Engine V1B evidence |
| 3-voice dedicated fixture | 🟡 absent; V1C target |
| 4-voice/tie evidence | ✅ pinned fixture + Lab tests + real Engine V1B evidence |
| Lab ↔ Engine semantic comparator | ✅ V1B approved two-fixture reproducible slice |
| cross-measure sustain-chain joining | ⚠️ outside V1B comparison contract |
| six-string candidate enumeration | ✅ deterministic Lab research contract |
| distinct-string sonority assignment | ✅ deterministic Lab research contract |
| production arrangement transformations | ❌ not implemented in Lab as production authority |
| MIDI/audio runtime evidence | ❌ not current runtime capability |
| learned guitar evidence | 📋 V4 research direction |

## Comparator boundary

V1B compares:

- `partId + measureIndex + sourceNoteIndex` identity;
- written pitch;
- onset/duration divisions;
- voice;
- staff;
- tie start/stop evidence;
- active-sonority membership;
- peak polyphony.

It does not compare cross-measure sustain chains, physical string/fret state, arrangement/reduction decisions, Canonical TAB, rendering, playback, OMR, or MIDI.

## Progressive-capability reality

The active architecture directive explicitly prevents treating current verification boundaries as the permanent product ceiling.

Future capability contracts are expected to distinguish:

- `SUPPORTED`;
- `APPROXIMATE`;
- `REVIEW_REQUIRED`;
- `UNSUPPORTED_LOCAL`;
- `BLOCKED_GLOBAL`.

Unsupported musical detail should ultimately be localized to the smallest truthful scope when surrounding facts remain usable. Global blocking is reserved for genuinely global trust/parse/invariant failures or an explicitly strict operation whose global precondition is absent.

This does not weaken V1B source-fact comparison. Exact evidence comparison at the source layer is what permits higher layers to recover or arrange transparently without inventing source facts.

## Current continuation point

**V1B approved two-fixture evidence loop is implemented. V1C is next.**

V1C should broaden the corpus toward real-world MusicXML shapes with explicit source/license provenance and capability classification. It should collect localized unsupported/review observations rather than reducing every capability gap to binary whole-score pass/fail.

After V1C, the planned direction remains:

```text
V2 localized failure intelligence
  -> V3 independent strict feasibility oracle
  -> explicit arrangement / N-best alternatives
  -> V4 ergonomic + learned evidence in shadow mode
```

## Remaining known work

- V1C broader licensed/approved MusicXML corpus.
- Dedicated 3-voice and additional real-world notation/polyphony shapes.
- V2 localized failure/recovery taxonomy.
- V3 independent feasibility oracle.
- Explicit arrangement contracts and provenance-tracked transformations.
- V4 TabCNN/FretNet/ergonomic evidence providers after benchmark/calibration gates.
- Repository protection/ruleset enforcement remains a separate repository-administration concern.
