# Documentation audit

Fresh-read classification against the current Arrangement A2 branch source, tests, V1/V2 evidence, V3A/V3B physical evidence, A1/A2 arrangement code, committed A2 benchmark, CI, and the 2026-09-16 progressive-capability directive.

| Document set | Classification | Current meaning |
|---|---|---|
| `README.md` | CURRENT | project purpose, V1–V3 closure, A1/A2 implementation and A2B direction |
| `docs/ARCHITECTURE.md` | CURRENT | authority boundaries and current V1→V3→A1→A2 architecture |
| `docs/REPOSITORY_REALITY.md` | CURRENT_BASELINE | implementation/evidence reality including A2 benchmark and CI |
| `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md` | CURRENT | 22-case pinned external MusicXML evidence |
| `docs/V2-FAILURE-INTELLIGENCE.md` | CURRENT | V2A taxonomy + V2B refinement |
| `docs/V3-INDEPENDENT-FEASIBILITY-ORACLE.md` | CURRENT | V3A/V3B independent physical evidence |
| `docs/ARRANGEMENT-NBEST-CONTRACT.md` | CURRENT_WITH_A1_BOUNDARY | explicit source-complete arrangement representation contract |
| `docs/ARRANGEMENT-A2-BOUNDED-GENERATION.md` | CURRENT | A2 policy-driven generation, physical revalidation, benchmark and limits |
| active progressive-capability handoff | CURRENT_PRIMARY_DIRECTIVE | prevents verification restrictions from becoming permanent product ceilings |
| `docs/FRETNET_RESEARCH.md` | CURRENT_RESEARCH_RECORD | future learned evidence, not runtime authority |
| older P1/P2 documents | CURRENT_WITH_BOUNDARY_NOTE | useful bounded foundation records |
| historical integration plans | ARCHIVE_CANDIDATE | historical context only |

## Authority order

When documents disagree, use:

1. repository code and automated tests;
2. `docs/REPOSITORY_REALITY.md`;
3. `docs/ARCHITECTURE.md` plus active progressive-capability directive;
4. `README.md`;
5. current stage documents;
6. historical records.

## V1/V2/V3 closure

V1B/V1C provide reproducible Engine/source evidence. V2A/V2B localize current failure intelligence. V3A/V3B independently separate exact-position and static left-hand physical feasibility from production search/capability behavior.

Key preserved facts:

```text
V1C cases: 22
semantic EQUAL: 5
semantic MISMATCH: 0
V2 observations: 66
V2 unclassified: 0
V3A proven greedy false negative: 1
V3B cross-repo comparable status parity: 6 / 6
```

Evidence/search limits remain distinct from physical impossibility.

## Arrangement A1 closure and correction

A1 establishes source-complete transformation provenance using production-aligned decision names.

A2 exposed one A1 `1.0.0` modeling error: source groups were incorrectly capped at six, conflating source-score polyphony with target-guitar string count.

A1 `1.1.0` corrects this by allowing bounded source groups up to 128 events. This is important for piano/non-guitar input: an 8-note source sonority remains an 8-note source fact even if a guitar arrangement later realizes fewer notes.

A1 still requires every source event to be covered exactly once in every alternative, so reduction/omission cannot silently erase provenance.

## Arrangement A2 closure — initial static slice

A2 is implemented as:

```text
src/arrangement/boundedArrangementGenerator.js
test/boundedArrangementGenerator.test.js
test/arrangementLargeSourceGroup.test.js
fixtures/a2/benchmark.json
artifacts/a2/arrangement-generation-baseline.json
scripts/run-a2-arrangement-benchmark.mjs
scripts/verify-a2-arrangement-benchmark.mjs
docs/ARRANGEMENT-A2-BOUNDED-GENERATION.md
```

Current generated transforms:

```text
CHORD_REDUCED
OCTAVE_DISPLACED
```

Every emitted static candidate is revalidated by exact fretboard candidates, distinct-string assignment, and the independent V3B left-hand oracle.

Policy supports explicit priority source events. Reduction candidates may not drop those priorities.

Candidate-space exhaustion returns:

```text
PARTIAL_LIMIT
candidateSpaceComplete = false
```

not physical impossibility or global blocked status.

### Pinned A2 benchmark

```text
cases:                                   3
complete generation:                     2
partial-limit:                            1
strict-infeasible cases:                  3
cases with feasible transformed evidence: 2
```

The eight-note piano benchmark proves:

```text
8-note source truth preserved
strict simultaneous guitar realization -> INFEASIBLE
15 explicit six-note reduction candidates generated
15 / 15 physically FEASIBLE in the pinned policy slice
```

The low-pitch benchmark proves an explicit +12 octave candidate can recover physical feasibility while the source pitch remains unchanged in source facts.

## Broad-capability interpretation

A2 is evidence that a strict-transcription failure does not have to end the workflow. It may instead lead to explicit, provenance-preserving, reviewable guitar alternatives.

This does **not** mean the production Engine has been authorized to change notes automatically. Production activation is a separate consequential gate.

A1 can represent arpeggiation, but A2's current physical validator is static-sonority based. Automatic arpeggiation generation is deferred until temporal validation exists; it is not declared unsupported forever.

## Current continuation

Principal next stage:

**Arrangement A2B — temporal validation + combined-transform research + broader piano/polyphonic benchmark corpus.**

A2B should add arpeggiation timing semantics, bounded transform combinations, richer melody/bass/voice-priority contracts, and corpus evidence while preserving A1 source provenance and V3 hard-physical boundaries.

No learned ranking becomes authoritative at A2B; V4 remains shadow-only until benchmark/calibration/candidate-invariance gates are satisfied.
