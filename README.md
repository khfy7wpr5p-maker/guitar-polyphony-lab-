# Guitar Polyphony Lab

Evidence-first research and verification laboratory for guitar polyphony, MusicXML semantics, physical feasibility, arrangement research, and future guitar-specific ranking evidence.

The Lab independently verifies what a source score says, what is physically possible on guitar, where production behavior differs from reproducible evidence, and which future recovery/arrangement capabilities can be added without corrupting source truth.

The Lab is **not** the production TAB authority. Production behavior belongs to `musicxml-to-guitar-tab-engine`. There must be no production runtime dependency from that Engine to this repository.

## Product direction

The long-term product goal is broad-capability MusicXML-to-guitar realization, not a narrow rejection engine.

The governing rule is:

> Preserve source truth strictly, localize uncertainty, produce what can safely be produced, keep provisional output editable, and reserve whole-score blocking for genuinely global failures.

Verification-stage fail-closed boundaries must not be confused with permanent product capability limits. Future production contracts are expected to distinguish source truth, strict physical feasibility, capability availability, local review/approximation, explicit arrangement transformations, soft ranking evidence, teacher edits, and export readiness.

See `handoffs/guitar_polyphony_lab_progressive_capability_developer_prompt_2026-09-16.json` for the active progressive-capability directive.

## Implemented Lab capabilities

- **P0:** deterministic measure timeline and sonority semantics
- **P1A:** bounded MusicXML input/security gate
- **P1B:** partwise parser adapter
- **P1C:** internal compatibility corpus foundation
- **P2A:** configuration-aware fretboard candidate enumeration
- **P2B:** bounded distinct-string sonority assignment enumeration
- **V1A:** corpus provenance/licensing/expectation registry
- **V1B:** deterministic Lab ↔ production Engine semantic comparison with pinned real Engine evidence
- **V1C:** 22-case pinned external MusicXML capability regression with local unsupported outcomes and separate raw/probe evidence
- **V2A:** deterministic failure-family / layer / scope / handling taxonomy over all current V1C failure observations
- **Tuning research:** immutable Standard, Drop D, custom six-string and capo configurations
- **Technique research:** bounded source-provenance sidecars kept separate from physical authority

The Lab contains deterministic sustained/grace research verifiers, but production path selection remains outside this repository.

## Current status

| Area | Status | Verified boundary |
|---|---|---|
| MusicXML input gate and bounded partwise parser | ✅ VERIFIED | Lab reference/security contract |
| Measure timelines, voice overlap and sonority spans | ✅ VERIFIED | Per-measure deterministic semantics |
| 2-voice and 4-voice compatibility fixtures | ✅ VERIFIED | Two pinned internal fixtures; broader shapes tracked by V1C |
| Fretboard candidates and distinct-string assignments | ✅ VERIFIED | Bounded six-string research configuration |
| Sustained/grace physical verifiers | 🧪 EXPERIMENTAL | Deterministic research baselines, not production solvers |
| Technique provenance sidecars | 🟡 PARTIAL | Metadata/source evidence only |
| Engine/Lab semantic comparator | ✅ V1B SLICE COMPLETE | Real Engine artifacts pinned, hashed, compared, and reproducible in CI |
| External real-world MusicXML corpus | ✅ V1C BASELINE COMPLETE | 22 pinned MIT-licensed cases; local outcomes, hashed probe evidence and sharded committed report reproducible in CI |
| Failure intelligence | ✅ V2A FOUNDATION | 66 observed failures mapped to 8 families; semantic global-block invariant enforced; 6 generic projection cases remain for V2B refinement |
| Independent feasibility oracle | 📋 V3 PLANNED | Separate strict-physical oracle, not production runtime authority |
| Arrangement/N-best alternatives | 📋 FUTURE CAPABILITY | Explicit transformed alternatives with provenance; not source truth |
| Learned guitar evidence / FretNet / TabCNN | 📋 V4 RESEARCH | Future shadow evidence/ranking provider; no production runtime integration |

## V1B reproducible evidence loop

V1B closes the first real cross-repository evidence loop without creating a production runtime dependency. The production Engine commit is pinned to:

```text
1d8ced644f544f7e991f7275eda77a2ce557774e
```

Committed production evidence is under `artifacts/v1b-engine/`. CI checks out that exact Engine commit, regenerates the approved artifacts, requires a byte-for-byte match with committed evidence, and runs Lab semantic-comparison tests.

V1B compares source-note identity, written pitch, onset, duration, voice, staff, tie evidence, active-sonority membership, and peak polyphony. It intentionally does not claim string/fret, arrangement, reduction, rendering, playback, OMR, or cross-measure sustain-chain equivalence.

## V1C external capability baseline

V1C uses 22 pinned files from `w3c-cg/musicxmlTestSuite` at commit `77c19f7e819154c70ca1a1992e80dcda8ff82fea`.

Raw trust-boundary behavior is recorded separately from musical capability. V1C does not weaken XML security: raw files remain rejected when they contain external DOCTYPE declarations, while the offline CI-only semantic probe applies only an explicitly allowed and structurally verified transform.

Pinned probe summary:

- Lab semantic path: 17/22 supported;
- Engine production compatibility chain: 5/22 supported;
- semantic `EQUAL`: 5;
- semantic `MISMATCH`: 0;
- locally unsupported / `NOT_COMPARABLE`: 17.

These are exact pinned-case observations, not a general MusicXML conformance score. See `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md`.

## V2A failure intelligence

V2A interprets the current V1C failure evidence without changing production behavior.

Current deterministic baseline:

```text
66 failure observations
  44 raw-input trust failures
  22 semantic capability failures

semantic failures:
  16 -> REVIEW_REQUIRED candidates
   6 -> UNSUPPORTED_LOCAL / NEEDS_REFINEMENT
   0 -> BLOCKED_GLOBAL
```

The eight current families are input security, source selection, source semantic capability, rhythm compatibility, ornament compatibility, playback structure, presentation compatibility, and generic projection capability.

Only raw input trust failures may map to a global reject in this V2 taxonomy. Semantic capability evidence is prevented from becoming a global block.

`UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` remains intentionally generic: six cases are marked `UNKNOWN_LOCAL / NEEDS_FEATURE_REFINEMENT`. Fixture names and feature tags are treated as context, not causal proof.

See `docs/V2-FAILURE-INTELLIGENCE.md`.

## Architecture direction

```text
SOURCE MUSICXML
      |
      v
strict source facts / provenance
      |
      +---------------------> Lab semantic verification
      |
      v
strict guitar feasibility
      |
      +---- feasible --------> candidate / N-best solution space
      |
      +---- locally infeasible or unsupported
                  |
                  v
          V2 failure intelligence
      family / layer / scope / handling
                  |
                  v
        localized capability state
        review / approximation / recovery
                  |
                  v
        explicit arrangement transforms
        (future, provenance-tracked)
                  |
                  v
          editable guitar realization
```

Hard physical validity and source truth remain separate from preferences and learned ranking. Future learned evidence may influence soft ranking only under an explicit reviewed policy; it must not invent hard source facts or make an impossible candidate physically valid.

## Authority and safety boundaries

- Development occurs on branches and through pull requests; `main` is protected-by-process even if repository rulesets do not enforce it.
- P1A remains authoritative for bounded UTF-8 and hostile-XML rejection before Lab parsing.
- V1C semantic probing is offline test evidence only and does not alter raw input security behavior.
- V2 classifications are evidence-only; `progressiveStateCandidate` is not production runtime authority.
- No Lab module is production authority for parsing, reduction, arrangement, fingering, sustained-path selection, Canonical TAB, writing, rendering, playback, OMR, or application UI.
- Unsupported evidence contracts fail closed at the evidence/trust boundary.
- Higher-level musical capability gaps should be localized rather than automatically interpreted as whole-score product failure.
- External fixtures, models, code, or datasets require source/license provenance before promotion into repository evidence.
- Learned evidence remains below deterministic source truth and hard physical constraints.

## Roadmap

- **V1 — Polyphony Verification Foundation**
  - V1A Corpus Registry ✅
  - V1B Engine/Lab Semantic Comparator ✅
  - V1C external MusicXML capability corpus ✅ 22-case pinned baseline
- **V2 — Failure Intelligence**
  - V2A deterministic failure taxonomy + committed regression baseline ✅
  - V2B bounded live error-details/location refinement for generic projection cases **NEXT**
  - V2C semantic mismatch classification when mismatch evidence exists
- **V3 — Independent Feasibility Oracle**
  - distinguish true strict guitar infeasibility from production search failure
  - offline/CI evidence only
- **Arrangement capability**
  - explicit voice prioritization, omission, octave displacement, register compression, arpeggiation and N-best transformed alternatives
  - transformations remain provenance-tracked and editable
- **V4 — Guitar Research / learned evidence**
  - ergonomic benchmarks
  - alternate tunings and player profiles
  - TabCNN/FretNet-style evidence providers in shadow mode
  - learned ranking only after benchmark/calibration/candidate-invariance evidence

## Commands

```bash
npm ci --ignore-scripts
npm run check
npm test
```

Node.js 22 or newer is required.

## Maintained architecture documents

- `docs/ARCHITECTURE.md`
- `docs/REPOSITORY_REALITY.md`
- `docs/DOCUMENTATION_AUDIT.md`
- `docs/V1B-SEMANTIC-COMPARATOR.md`
- `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md`
- `docs/V2-FAILURE-INTELLIGENCE.md`
- `docs/FRETNET_RESEARCH.md`
- `docs/P1A-INPUT-GATE.md`
- `docs/P1B-PARSER-ADAPTER.md`
- `docs/P1C-COMPATIBILITY-MATRIX.md`
- `docs/POLYPHONY-MODEL.md`
- `docs/SUPPORTED-MUSICXML.md`
- `docs/TUNING-LAB-02.md`
- `SECURITY.md`
