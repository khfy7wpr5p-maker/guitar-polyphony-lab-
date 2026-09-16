# Guitar Polyphony Lab

Evidence-first research and verification laboratory for bounded guitar-polyphony semantics, physical feasibility, and future guitar-specific ranking research.

The Lab exists to independently verify what a MusicXML source says, what is physically possible on guitar, and where production behavior differs from independently reproducible evidence.

This repository is intentionally **not** the production TAB or sustained-path authority. Production behavior belongs to `musicxml-to-guitar-tab-engine`. The Lab produces fixtures, semantic reference/oracle behavior, differential verification, failure reproduction, feasibility evidence, and research results that may later support a separately reviewed production PR.

There must be no production runtime dependency from `musicxml-to-guitar-tab-engine` to this repository.
