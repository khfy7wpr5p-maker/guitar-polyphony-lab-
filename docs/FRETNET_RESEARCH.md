# FretNet research note

Status: **CURRENT_RESEARCH_RECORD**  
Date: **2026-09-16**  
Scope: external research evidence for future Guitar Polyphony Lab V4 work. No runtime integration is authorized by this document.

## Why this research exists

Guitar Polyphony Lab currently answers deterministic questions such as:

- what source notes are active together;
- what string/fret positions are physically possible under a given tuning/capo;
- what distinct-string sonority assignments exist;
- whether Lab semantic facts agree with production Engine source semantics.

Those contracts answer **what is possible and what the source says**. They do not yet answer a different research question:

> Among several physically valid guitar realizations, which string/fret realization is more likely to be used by a real guitarist in a given musical/audio context?

FretNet is relevant to that future question because it performs audio-driven, string-aware polyphonic guitar tablature transcription.

## Authoritative FretNet reference inspected

Primary repository:

- `cwitkowitz/guitar-transcription-continuous`
- paper: *FretNet: Continuous-Valued Pitch Contour Streaming for Polyphonic Guitar Tablature Transcription*
- ICASSP 2023
- license observed in repository: MIT
- GitHub repository last code push observed: 2023-06-03

The repository implements and evaluates FretNet on GuitarSet using a six-fold cross-validation workflow. The codebase includes:

- HCQT feature extraction;
- discrete per-string tablature estimation;
- continuous relative-pitch estimation;
- optional onset estimation;
- string-level note and multi-pitch evaluation;
- inference and visualization examples.

The model architecture is related to TabCNN-style convolutional guitar transcription. Its output is not merely a pitch class estimate: it retains guitar-string-aware tablature structure and can additionally represent continuous pitch deviation.

## Observed maturity boundary

The upstream project is research code, not a production service or stable package contract.

Observed limitations relevant to this Lab:

- README general usage remains incomplete/TODO;
- no GitHub Release was observed;
- inference examples expect a local trained model checkpoint;
- current repository activity is historical rather than an actively evolving production dependency;
- its audio-domain outputs do not share a reviewed contract with this Lab's MusicXML semantic identities.

Therefore the Lab must not introduce FretNet as a required runtime dependency.

## Separate repository with the same name

`HansYap/FretNet` was also inspected. It is a distinct 2026 repository using a CRNN, CQT features, GuitarSet-style per-string labels, and a committed `crnn_best.pt` checkpoint. Its inference code exposes `(frames, 6 strings, 21 classes)` probabilities for frets 0-19 plus a not-played class and discusses future audio/video fusion.

This repository is **not** the authoritative ICASSP 2023 FretNet implementation. No repository license was observed during this review. It must therefore be treated as external inspiration/evidence only and must not be copied into the Lab without a separate provenance and licensing review.

## Architectural fit

FretNet-style evidence belongs to **V4 — Guitar Research**, not to V1B and not to production authority.

Proposed future evidence flow:

```text
MusicXML
   |
   v
P1A / P1B / P0
   |
   v
source semantic truth
   |
   +------------------------------+
   |                              |
   v                              v
P2A fretboard candidates      audio performance
   |                              |
   v                              v
P2B valid assignments        FretNet-style model
   |                              |
   |                              v
   |                      string/fret evidence
   |                      + confidence/probability
   |                              |
   +---------------+--------------+
                   |
                   v
          SHADOW RESEARCH RANKER
                   |
                   v
       benchmark / evidence report
```

The deterministic candidate set remains authoritative for physical validity. Learned evidence may rank or annotate already-valid candidates only after a separately reviewed research gate.

## Non-negotiable authority rules

A FretNet-style component must never:

- create a string/fret candidate that P2A marks physically impossible;
- override tuning/capo constraints;
- mutate source pitch, onset, duration, voice, staff, or tie facts;
- silently remove a valid source note;
- become the production MusicXML parser/projector;
- become the production sustained-path authority;
- convert probabilistic confidence into a hard physical fact;
- make the production Engine depend at runtime on this Lab.

The correct relationship is:

```text
hard deterministic constraints > learned ranking/evidence
```

## Suggested future V4 contract

A future research-only evidence contract could expose bounded observations such as:

```text
GuitarPerformanceEvidence 1.x
- source/track provenance
- frame/time interval
- tuning profile used by the model
- candidate string
- candidate fret
- probability/confidence
- optional relative-pitch deviation
- optional onset evidence
- model identity/version
- dataset/training provenance
```

This contract must remain separate from `GuitarConfiguration`, P2A candidate objects, P2B assignment objects, and production Engine contracts.

## Required benchmark before any learned-ranking experiment

Before learned evidence can influence ordering, a future research PR should define:

1. a licensed or internally approved guitar-audio evaluation corpus;
2. exact mapping between audio observations and MusicXML/source-note identities where ground truth exists;
3. train/validation/test separation by performer when practical;
4. Standard tuning first, with tuning mismatch explicitly rejected rather than guessed;
5. top-1 and top-k string/fret accuracy;
6. calibration/reliability of probability outputs;
7. repeated-pitch and cross-string ambiguity metrics;
8. chord/polyphony-specific metrics;
9. evidence that deterministic candidate validity is invariant with the learned layer enabled or disabled;
10. a shadow-only report before any ranking policy change.

## Current decision

FretNet is **useful research direction, not current implementation work**.

The architectural continuation point remains:

```text
V1B comparator core: implemented
        |
        v
PIN REAL ENGINE-GENERATED PolyphonicSourceModel ARTIFACTS   <-- NEXT
        |
        v
run deterministic Lab/Engine comparisons in CI
        |
        v
V1B complete
        |
        v
V1C corpus expansion / V2 failure intelligence
        |
        v
V3 independent feasibility oracle
        |
        v
V4 FretNet-style learned evidence/ranking research
```

Do not jump directly from the current V1B branch to a learned model integration. The Lab first needs a closed, reproducible deterministic verification loop.