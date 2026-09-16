# V3 — Independent Feasibility Oracle

## Status

V3A implements the first production-independent strict guitar feasibility oracle in `guitar-polyphony-lab`.

The oracle is evidence-only. It does not change production Engine behavior, select final TAB, authorize arrangement transforms, or claim complete human left-hand playability.

## Why V3 exists

A production solver can fail for several different reasons:

- the exact musical material is physically impossible under the declared guitar configuration;
- the production search selected an earlier state that leads to a dead end;
- a bounded search/candidate limit was reached;
- a stricter physical layer such as finger assignment or hand reach rejects the shape;
- the current implementation simply lacks the required capability.

Those cases must not be collapsed into one `BLOCKED` conclusion.

V3 provides an independent reference path so production failure can be compared with reproducible physical evidence.

## V3A physical scope

`src/guitar/strictFeasibilityOracle.js` currently proves only this exact scope:

```text
written/sounding pitch must remain exact
+ pitch must exist on the declared six-string fretboard
+ simultaneous notes must use distinct strings
+ held/sustained notes must keep the same string and fret
+ no arrangement transformation is allowed
```

V3A deliberately does **not** yet model:

- left-hand finger assignment;
- barre feasibility;
- hand-span / extra-reach policy;
- ergonomic preference;
- right-hand technique;
- player-specific skill;
- arrangement or note omission.

Therefore `FEASIBLE` means feasible within the exact string/fret reachability scope above. It must not be rewritten as a claim that every resulting shape is comfortable or human-playable under all left-hand policies.

## Exhaustive reachability instead of greedy selection

The earlier research verifier chooses one lexicographic assignment at each point. That is useful as a deterministic baseline but can create a false negative when an early valid choice prevents a later held-note transition.

V3A keeps all distinct reachable string/fret states at every point, deduplicates equivalent states, and carries all reachable states forward while preserving held string/fret identity.

The maximum unique state count per six-note point is bounded by the six-string assignment space. A user-requested lower search bound produces:

```text
INDETERMINATE_LIMIT
```

not `INFEASIBLE`.

This distinction is required: reaching a computational boundary is not proof of physical impossibility.

## Result states

The oracle returns one of:

- `FEASIBLE` — at least one exact path exists within V3A scope;
- `INFEASIBLE` — no exact path exists and the oracle completed the bounded exhaustive proof;
- `INDETERMINATE_LIMIT` — the configured evidence/search bound was reached before proof.

Current hard reasons include:

- `NO_EXACT_FRETBOARD_CANDIDATE`;
- `ACTIVE_NOTE_COUNT_EXCEEDS_STRING_COUNT`;
- `NO_DISTINCT_STRING_ASSIGNMENT`;
- `NO_SUSTAINED_PATH`.

Malformed sustain evidence is rejected as `INVALID_ORACLE_INPUT`; it is not mislabeled as a physical impossibility.

## Reproducible benchmark

V3A commits a five-case internal benchmark under:

```text
fixtures/v3a/benchmark.json
artifacts/v3a/strict-feasibility-baseline.json
```

Pinned result:

```text
cases:                              5
FEASIBLE:                           2
INFEASIBLE:                         2
INDETERMINATE_LIMIT:                1
proven legacy greedy false-negative:1
```

The false-negative case is intentionally important: the legacy greedy verifier reports `BLOCKED / NO_DISTINCT_STRING_ASSIGNMENT`, while V3A proves an exact sustained path exists by preserving alternate earlier string choices.

CI regenerates the report with:

```text
scripts/run-v3a-strict-feasibility-benchmark.mjs
```

and requires exact agreement with the committed baseline through:

```text
scripts/verify-v3a-strict-feasibility-report.mjs
```

## Authority boundary

V3A is not production runtime authority.

It may prove that a current failure is **not justified by exact pitch/string/sustain reachability alone**. It may not yet conclude that the production Engine has a bug when Engine rejection comes from a stronger left-hand physical policy that V3A does not model.

The safe interpretation is:

```text
Oracle INFEASIBLE
  -> exact string/fret feasibility is disproven within V3A scope

Oracle FEASIBLE + production failure
  -> exact string/fret impossibility is NOT proven
  -> investigate stronger left-hand constraints vs production search/capability failure

Oracle INDETERMINATE_LIMIT
  -> no physical conclusion
```

## Next — V3B

V3B should add an independent left-hand physical layer and a cross-repository comparison contract against the pinned production Engine.

The next evidence split is:

```text
production failure
      |
      v
V3A exact string/fret oracle
      |
      +--> INFEASIBLE: hard exact-position contradiction
      |
      +--> FEASIBLE
              |
              v
       V3B independent left-hand oracle
              |
              +--> left-hand impossible
              |
              +--> left-hand feasible
                        |
                        v
              production search/capability gap candidate
```

Only after that second physical layer is independently reproduced should the Lab call an Engine failure a likely search/capability failure rather than a stronger physical rejection.
