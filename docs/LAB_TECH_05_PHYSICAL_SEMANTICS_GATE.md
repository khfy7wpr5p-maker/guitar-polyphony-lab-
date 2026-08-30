# LAB-TECH-05 — Physical semantics research gate

Research base: `87410f9374bce2fe9cb7622ec25c67ae82e113a4`

## Decision

No guitar technique is authorized for physical solver integration in this stage.

LAB-TECH-01 through LAB-TECH-04 established producer evidence, bounded provenance, technique fixtures, and metadata-only solver invariance. None of those findings grants permission to change candidate generation, distinct-string assignment, sustained-state behavior, or ranking.

## Findings

- Empty/unspecified harmonic, simple hammer-on, slide, natural harmonic, straight mute, fingering, pluck, and technical position evidence can remain metadata-only under their verified source-shape constraints.
- Reused-number hammer-on chains remain ambiguous for automatic pairing.
- Artificial-harmonic pitch-role chords require a separate architecture decision before they can influence solver-visible note identity.
- Let-ring does not provide enough evidence to infer sounding duration or termination.
- Pull-off, bend, palm-mute, and tap still lack retrieved Guitar Pro 7.6.0 producer evidence in the audited corpus subset.
- Explicit technical string/fret evidence is the strongest future physical candidate: with an explicit active GuitarConfiguration, source pitch/position consistency can be validated. However, using that evidence as candidate authority would change the candidate set, so it is explicitly approval-gated.

## Gate

`PHYSICAL_SEMANTICS_RESEARCH_GATE.json` records zero techniques approved for physical integration and sets `automaticPhysicalImplementationAuthorized=false`.

The next safe action is metadata-only production compatibility migration, beginning with a fresh read of the protected production repository. Any later physical-semantics implementation requires explicit user approval and an isolated regression benchmark/PR.
