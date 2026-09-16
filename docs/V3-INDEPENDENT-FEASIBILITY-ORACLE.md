# V3 — Independent Feasibility Oracle

## Status

V3A and V3B are implemented as production-independent research evidence in `guitar-polyphony-lab`.

V3 does not change production Engine behavior, select final TAB, authorize arrangement transforms, or claim universal human playability. It separates strict physical evidence from production search/capability behavior.

## Why V3 exists

A production solver can fail because:

- exact musical material is physically impossible under the declared guitar configuration;
- one search path dead-ends while another valid path exists;
- a bounded search/candidate limit is reached;
- a stronger left-hand constraint rejects an otherwise valid string/fret placement;
- the implementation lacks a capability.

Those cases must not collapse into one global `BLOCKED` conclusion.

V3 provides two independent physical evidence layers.

---

## V3A — exact string/fret reachability

`src/guitar/strictFeasibilityOracle.js` proves only this scope:

```text
exact pitch
+ pitch exists on declared six-string fretboard
+ simultaneous notes use distinct strings
+ held notes keep the same string/fret
+ no arrangement transforms
```

V3A is exhaustive within its bounded state space rather than greedy. It keeps all distinct reachable string/fret states across sustained points and deduplicates equivalent states.

Result states:

```text
FEASIBLE
INFEASIBLE
INDETERMINATE_LIMIT
```

A search/evidence limit produces `INDETERMINATE_LIMIT`, not physical impossibility.

### V3A reproducible benchmark

Committed evidence:

```text
fixtures/v3a/benchmark.json
artifacts/v3a/strict-feasibility-baseline.json
scripts/run-v3a-strict-feasibility-benchmark.mjs
scripts/verify-v3a-strict-feasibility-report.mjs
```

Pinned result:

```text
cases:                               5
FEASIBLE:                            2
INFEASIBLE:                          2
INDETERMINATE_LIMIT:                 1
proven legacy greedy false-negative: 1
```

The false-negative case demonstrates that the older greedy verifier can report `BLOCKED / NO_DISTINCT_STRING_ASSIGNMENT` while an exact sustained path actually exists.

Safe interpretation:

```text
V3A INFEASIBLE
  -> exact string/fret reachability disproven within scope

V3A FEASIBLE
  -> exact string/fret impossibility not proven
  -> continue to left-hand physical validation

V3A INDETERMINATE_LIMIT
  -> no physical conclusion
```

---

## V3B — independent left-hand physical feasibility

`src/guitar/leftHandFeasibilityOracle.js` evaluates static left-hand feasibility for fixed string/fret positions independently from the production Engine implementation.

The declared policy models:

- finger `0` for open strings;
- fretting fingers `1..4`;
- one finger staying on one fret inside a static shape;
- ordered finger/fret relationships;
- reusable same-fret fingers through legal barre shapes;
- legal partial/full barre spans;
- maximum static fret span of `4`;
- conservative extra finger reach of `1`;
- bounded finger-assignment enumeration.

Result states remain:

```text
FEASIBLE
INFEASIBLE
INDETERMINATE_LIMIT
```

The oracle may emit physical reasons such as:

```text
FRET_SPAN_EXCEEDED
DISTINCT_FRET_COUNT_EXCEEDS_FINGER_COUNT
FINGER_REACH_EXCEEDED
```

and preserves assignment-bound exhaustion as:

```text
LEFT_HAND_ASSIGNMENT_LIMIT_EXCEEDED
-> INDETERMINATE_LIMIT
```

### V3B reproducible benchmark

Committed evidence:

```text
fixtures/v3b/left-hand-benchmark.json
artifacts/v3b/left-hand-benchmark-baseline.json
scripts/run-v3b-left-hand-benchmark.mjs
scripts/verify-v3b-left-hand-benchmark-report.mjs
```

Pinned result:

```text
cases:                       7
Lab FEASIBLE:                3
Lab INFEASIBLE:              3
Lab INDETERMINATE_LIMIT:     1
cross-repo comparable:       6
pinned Engine status parity: 6 / 6
```

Covered cases include:

- six open strings;
- compact C-major;
- F-major barre shape;
- static fret-span violation;
- five distinct fretted frets;
- explicit finger-reach violation;
- deliberately low assignment limit.

For the six comparable cases, normalized feasible/infeasible status matches the pinned Engine physical layer. The Engine is comparison evidence only; the Lab oracle is independently implemented.

Parity does **not** mean both implementations enumerate the same shapes or have identical internal search behavior. For example, candidate and assignment counts can differ while final normalized physical status agrees.

## V3 authority boundary

V3 provides bounded hard-constraint evidence. It does not claim:

- comfort or ergonomic quality;
- player-specific hand size/capability;
- musical preference;
- right-hand technique quality;
- final production fingering authority;
- arrangement authority;
- learned-model authority.

Therefore:

```text
V3B FEASIBLE
  -> at least one strict static left-hand realization exists under the declared policy
  -> not necessarily the best or most comfortable fingering

V3B INFEASIBLE
  -> the tested strict fixed-position realization has no admissible left-hand shape under policy
  -> recovery must be explicit, not a silent source rewrite

V3B INDETERMINATE_LIMIT
  -> no physical conclusion
```

## CI contract

Every stage/PR CI run now:

1. regenerates V3A evidence;
2. requires exact equality with the committed V3A baseline;
3. checks out the exact pinned production Engine SHA;
4. regenerates the V3B Lab ↔ Engine comparison benchmark;
5. asserts fixture expectations;
6. requires all comparable V3B cases to preserve status parity;
7. requires exact equality with the committed V3B baseline.

The pinned production Engine SHA is:

```text
1d8ced644f544f7e991f7275eda77a2ce557774e
```

## Next — provenance-tracked Arrangement / N-best contracts

With V3A and V3B complete, the next research layer is explicit recovery for material that cannot or should not remain a strict transcription.

The architecture should distinguish:

```text
SOURCE FACTS
    |
    +--> strict transcription candidate
    |        |
    |        +--> V3 feasible -> preserve as strict candidate
    |        |
    |        +--> V3 infeasible -> strict physical contradiction
    |
    v
ARRANGEMENT ALTERNATIVES
    |
    +--> omission
    +--> octave displacement
    +--> register compression
    +--> arpeggiation
    +--> voice prioritization
    +--> N-best transformed alternatives
```

Every transformed alternative must preserve original facts separately and record:

- transformation type;
- exact source targets;
- before facts;
- after facts;
- reason/policy;
- reversibility/editability;
- strict-feasibility evidence before and after transformation.

Arrangement contracts are the next step before any learned ranking system becomes authoritative.
