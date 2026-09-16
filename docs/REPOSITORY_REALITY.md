# Repository reality

Fresh-read scope: current `stage/v1c-external-capability-corpus` branch, source/tests, package scripts, CI, internal compatibility fixtures, committed V1B Engine evidence, pinned V1C external evidence, and the active progressive-capability directive as of 2026-09-16.

This document describes repository reality, not general production capability claims for `musicxml-to-guitar-tab-engine`.

## Current architecture

```text
internal MusicXML
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

pinned external MusicXML 4.0 corpus
  -> raw trust-boundary observations
  -> pinned DTD-free offline semantic probes
  -> Lab + pinned Engine production compatibility chain
  -> V1C local capability report

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
| `src/corpus/v1cCapabilityCorpus.js` | validates pinned external corpus provenance, hashes, local outcomes and probe policy | rejects unpinned/observational manifest entries; local musical unsupported states remain valid evidence |
| `scripts/run-v1c-capability-corpus.mjs` | CI-only raw/probe observation against pinned external source and pinned Engine compatibility chain | does not weaken raw trust boundary; exact transform/provenance drift fails |
| `src/guitar/tuningConfiguration.js` | six-string tuning/capo configuration | bounded deterministic research contract |
| `src/guitar/fretboardCandidates.js` | physical string/fret candidates per pitch | impossible pitch yields factual no-candidate evidence |
| `src/guitar/sonorityAssignments.js` | bounded distinct-string assignments | strict physical feasibility; not arrangement authority |
| sustained/grace verifier modules | deterministic research baselines | experimental; not production path authority |
| `src/musicxml/guitarTechniqueProvenance.js` | source technique metadata/provenance | no physical-solver authority |

## V1B real Engine evidence

Pinned production repository and commit:

```text
khfy7wpr5p-maker/musicxml-to-guitar-tab-engine
1d8ced644f544f7e991f7275eda77a2ce557774e
```

Committed V1B evidence:

| Fixture | Fixture SHA-256 | Artifact SHA-256 |
|---|---|---|
| `fixtures/compat/ps6-counterpoint-2v.musicxml` | `33a477a500e654a5731980f494ee16d8d0b7a83048114788976f4804e3332bf7` | `967352508ca5e9f64efbdde79e74ed2167e00824064f4d16fbfa0081b6708bf4` |
| `fixtures/compat/ps6-counterpoint-4v-tie.musicxml` | `47122b0aa38b6f9a7fdc974ec47c436ee1b2cead4f822d242b1712b399638c1a` | `be5a61a0e46314242584fbbc5a903e1aa97e241341e95836eb24f080a56ed8b1` |

Files live under `artifacts/v1b-engine/`, with provenance in its manifest. `test/v1bEngineArtifacts.test.js` validates fixture/artifact hashes, Engine identity, contract identity, and zero semantic mismatches for the approved slice.

## V1C external capability evidence

Pinned external source:

```text
repository: w3c-cg/musicxmlTestSuite
commit:     77c19f7e819154c70ca1a1992e80dcda8ff82fea
license:    MIT
```

The initial V1C manifest contains 11 MusicXML 4.0 cases. It pins each source Git blob SHA, raw SHA-256, transformed semantic-probe SHA-256, raw Lab/Engine outcome, probe Lab/Engine outcome, and semantic comparison outcome.

All selected upstream files carry the standard external MusicXML 4.0 DOCTYPE. Therefore raw trust-boundary behavior is intentionally:

```text
Lab:    UNSUPPORTED_LOCAL / DOCTYPE_NOT_ALLOWED
Engine: UNSUPPORTED_LOCAL / UNSAFE_XML_DECLARATION
```

V1C then creates a CI-only semantic probe by removing exactly the pinned standard external DOCTYPE. The transformed bytes are hash-pinned. This does not modify P1A or authorize application-time DTD stripping.

The Engine probe path is the pinned production compatibility normalization chain, not the bare low-level projector:

```text
parseParsedMusicXmlDocument
  -> projectParsedMusicXmlThroughPolyProductionCompatibilityChain
```

Initial 11-case probe summary:

| Observation | Count |
|---|---:|
| Lab `SUPPORTED` | 9 |
| Lab `UNSUPPORTED_LOCAL` | 2 |
| Engine `SUPPORTED` | 3 |
| Engine `UNSUPPORTED_LOCAL` | 8 |
| semantic `EQUAL` | 3 |
| semantic `MISMATCH` | 0 |
| semantic `NOT_COMPARABLE` | 8 |

The three equality cases are the pinned rhythm/backup, basic-chord, and piano/multistaff fixtures. This is an exact-fixture baseline, not a general support percentage or conformance score.

Committed report: `artifacts/v1c/capability-report.json`.

Detailed contract: `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md`.

## CI reality

`.github/workflows/ci.yml` runs for PRs to `main` and pushes to `stage/**`.

Current CI performs:

1. locked Lab install;
2. syntax checks;
3. complete Node test suite;
4. checkout exact pinned Engine SHA;
5. locked Engine dependency install;
6. real V1B Engine artifact generation;
7. byte-for-byte V1B evidence reproduction;
8. checkout exact external V1C corpus commit;
9. verify V1C source/blob/raw/probe provenance;
10. run V1C raw and semantic-probe observations through Lab and pinned Engine production compatibility chain;
11. fail on pinned outcome drift;
12. semantically compare regenerated V1C report with committed baseline;
13. upload regenerated V1B and V1C evidence.

These are CI evidence dependencies only. The Lab runtime/package does not import the Engine or external corpus as runtime dependencies.

## Polyphony / capability coverage

| Feature | Current reality |
|---|---|
| 2-voice sustained overlap | ✅ internal pinned fixture + V1B real Engine evidence |
| 3-voice external shape | 🟡 observed by V1C `42b`; Lab parses probe, pinned Engine records local unsupported projection feature |
| 4-voice/tie evidence | ✅ internal pinned fixture + V1B real Engine evidence |
| backup/polyphony external shape | ✅ V1C semantic equality for exact `03b` fixture |
| basic chord external shape | ✅ V1C semantic equality for exact `21a` fixture |
| piano/multistaff external shape | ✅ V1C semantic equality for exact `43a` fixture |
| tuplets | 🟡 V1C exact fixture locally unsupported by pinned Engine triplet time-modification path |
| grace notation | 🟡 V1C exact fixture unsupported by both current Lab and pinned Engine probe paths |
| simple and alternative repeat barlines | 🟡 V1C exact fixtures locally unsupported by pinned Engine repeat-barline path |
| fretboard/frame metadata | 🟡 exact V1C fixture locally unsupported by pinned Engine projection path; not a claim about all guitar metadata |
| multipart TAB-staff stress fixture | 🟡 not isolated; Lab requires part selection and Engine encounters grace limitation first |
| Lab ↔ Engine semantic comparator | ✅ V1B approved slice + three equal V1C external probes |
| cross-measure sustain-chain joining | ⚠️ outside V1B/V1C semantic comparison contract |
| six-string candidate enumeration | ✅ deterministic Lab research contract |
| distinct-string sonority assignment | ✅ deterministic Lab research contract |
| production arrangement transformations | ❌ not implemented in Lab as production authority |
| MIDI/audio runtime evidence | ❌ not current runtime capability |
| learned guitar evidence | 📋 V4 research direction |

## Comparator boundary

V1B/V1C semantic comparison covers:

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

The active architecture directive prevents treating verification boundaries as the permanent product ceiling.

Future capability contracts are expected to distinguish:

- `SUPPORTED`;
- `APPROXIMATE`;
- `REVIEW_REQUIRED`;
- `UNSUPPORTED_LOCAL`;
- `BLOCKED_GLOBAL`.

V1C currently records strict evidence states for exact fixtures. It deliberately keeps musical unsupported states local to each case. This does not itself implement production approximation/recovery; it establishes reproducible evidence for V2 and later product recovery work.

Unsupported musical detail should ultimately be localized to the smallest truthful scope when surrounding facts remain usable. Global blocking is reserved for genuine global trust/parse/invariant failures or an explicitly strict operation whose global precondition is absent.

## Current continuation point

**V1B is complete and V1C now has an initial 11-case pinned external baseline.**

The immediate continuation is broader **isolated V1C capability coverage**, especially tuplets, grace subtypes, multivoice/presentation variants, repeat structures, guitar/TAB-specific metadata, ties/octave shifts/directions, and `.mxl` transport.

After sufficient V1C coverage:

```text
V2 localized failure intelligence
  -> V3 independent strict feasibility oracle
  -> explicit arrangement / N-best alternatives
  -> V4 ergonomic + learned evidence in shadow mode
```

## Remaining known work

- Expand V1C with additional isolated licensed MusicXML fixtures before broader support conclusions.
- Improve generic `UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` observations into more specific evidence where isolated fixtures justify it.
- V2 localized failure/recovery taxonomy.
- V3 independent feasibility oracle.
- Explicit arrangement contracts and provenance-tracked transformations.
- V4 TabCNN/FretNet/ergonomic evidence providers after benchmark/calibration gates.
- Repository protection/ruleset enforcement remains a separate repository-administration concern.
