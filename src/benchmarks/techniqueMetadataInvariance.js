import { createHash } from 'node:crypto';

import { generateFretboardCandidates } from '../guitar/fretboardCandidates.js';
import { enumerateSonorityAssignments } from '../guitar/sonorityAssignments.js';
import { verifySustainedPolyphonyWithTuning } from '../guitar/sustainedTuningVerifier.js';
import { STANDARD_TUNING_CONFIGURATION } from '../guitar/tuningConfiguration.js';

const FORBIDDEN_PROVENANCE_FIELDS = new Set([
  'pitch',
  'octave',
  'onset',
  'duration',
  'voice',
  'staff',
  'tie',
  'grace',
  'chordMembership',
  'candidate',
  'candidates',
  'ranking',
  'solverState',
]);

export class TechniqueMetadataInvarianceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'TechniqueMetadataInvarianceError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new TechniqueMetadataInvarianceError(code, message, details);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(value) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function clone(value) {
  return structuredClone(value);
}

function assertDenseArray(value, path, maxLength) {
  if (!Array.isArray(value) || value.length > maxLength) {
    fail('INVALID_BENCHMARK_INPUT', `${path} must be a bounded array.`, { path });
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      fail('INVALID_BENCHMARK_INPUT', `${path} must be dense.`, { path, index });
    }
  }
  return value;
}

function validateTechniqueSidecar(techniqueProvenanceByLogicalNoteId) {
  if (
    !techniqueProvenanceByLogicalNoteId
    || typeof techniqueProvenanceByLogicalNoteId !== 'object'
    || Array.isArray(techniqueProvenanceByLogicalNoteId)
  ) {
    fail('INVALID_TECHNIQUE_SIDECAR', 'Technique provenance sidecar must be a plain object map.');
  }

  const normalized = {};
  for (const logicalNoteId of Object.keys(techniqueProvenanceByLogicalNoteId).sort()) {
    if (typeof logicalNoteId !== 'string' || logicalNoteId.length === 0 || logicalNoteId.length > 256) {
      fail('INVALID_TECHNIQUE_SIDECAR', 'Technique sidecar keys must be bounded logical note ids.', {
        logicalNoteId,
      });
    }
    const records = assertDenseArray(
      techniqueProvenanceByLogicalNoteId[logicalNoteId],
      `techniqueProvenanceByLogicalNoteId.${logicalNoteId}`,
      32,
    );
    normalized[logicalNoteId] = Object.freeze(records.map((record, index) => {
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        fail('INVALID_TECHNIQUE_PROVENANCE', 'Technique sidecar entries must be provenance records.', {
          logicalNoteId,
          index,
        });
      }
      if (record.documentType !== 'GuitarTechniqueProvenance') {
        fail('INVALID_TECHNIQUE_PROVENANCE', 'Technique sidecar entry is not GuitarTechniqueProvenance.', {
          logicalNoteId,
          index,
        });
      }
      if (record.capabilityClass !== 'SAFE_METADATA_ONLY') {
        fail(
          'NON_METADATA_TECHNIQUE_FORBIDDEN',
          'LAB-TECH-04 accepts only SAFE_METADATA_ONLY technique provenance.',
          { logicalNoteId, index, capabilityClass: record.capabilityClass },
        );
      }
      for (const field of FORBIDDEN_PROVENANCE_FIELDS) {
        if (Object.hasOwn(record, field)) {
          fail(
            'MUSICAL_FACT_AUTHORITY_FORBIDDEN',
            'Technique metadata must not carry source musical facts or solver authority.',
            { logicalNoteId, index, field },
          );
        }
      }
      return record;
    }));
  }
  return Object.freeze(normalized);
}

function logicalNoteIds(points) {
  const ids = new Set();
  for (const point of assertDenseArray(points, 'points', 10_000)) {
    for (const note of assertDenseArray(point.notes, `${point.pointId ?? 'point'}.notes`, 6)) {
      if (typeof note.logicalNoteId !== 'string' || note.logicalNoteId.length === 0) {
        fail('INVALID_BENCHMARK_INPUT', 'Each benchmark note must carry logicalNoteId.');
      }
      ids.add(note.logicalNoteId);
    }
  }
  return ids;
}

function assertSidecarReferencesKnownNotes(points, sidecar) {
  const ids = logicalNoteIds(points);
  for (const logicalNoteId of Object.keys(sidecar)) {
    if (!ids.has(logicalNoteId)) {
      fail('UNKNOWN_TECHNIQUE_NOTE_ID', 'Technique sidecar references an unknown logical note id.', {
        logicalNoteId,
      });
    }
  }
}

function candidateSnapshot(points, tuningConfiguration) {
  return Object.freeze(points.map((point) => Object.freeze({
    pointId: point.pointId,
    notes: Object.freeze(point.notes.map((note) => Object.freeze({
      logicalNoteId: note.logicalNoteId,
      pitch: note.pitch,
      candidates: Object.freeze(generateFretboardCandidates(note.pitch, tuningConfiguration).map((candidate) =>
        Object.freeze({
          string: candidate.string,
          fret: candidate.fret,
          pitchMidi: candidate.pitchMidi,
        }))),
    }))),
  })));
}

function rankingSnapshot(points, tuningConfiguration) {
  return Object.freeze(points.map((point) => {
    const notesWithCandidates = point.notes.map((note) => Object.freeze({
      id: note.logicalNoteId,
      pitch: note.pitch,
      ...(note.voice !== undefined && note.voice !== null ? { voice: note.voice } : {}),
      ...(note.staff !== undefined && note.staff !== null ? { staff: note.staff } : {}),
      fretboardCandidates: generateFretboardCandidates(note.pitch, tuningConfiguration),
    }));
    const assignments = enumerateSonorityAssignments(notesWithCandidates);
    return Object.freeze({
      pointId: point.pointId,
      assignmentCount: assignments.length,
      assignments: Object.freeze(assignments.map((assignment) => Object.freeze(
        assignment.map((entry) => `${entry.noteId}:${entry.pitch}@${entry.string}:${entry.fret}`),
      ))),
    });
  }));
}

function solveSnapshot(points, tuningConfiguration, sidecar) {
  validateTechniqueSidecar(sidecar);
  assertSidecarReferencesKnownNotes(points, sidecar);
  return Object.freeze({
    candidates: candidateSnapshot(points, tuningConfiguration),
    ranking: rankingSnapshot(points, tuningConfiguration),
    sustained: verifySustainedPolyphonyWithTuning(points, tuningConfiguration),
  });
}

function assertEqualInvariant(name, baseline, withMetadata) {
  if (stableJson(baseline) !== stableJson(withMetadata)) {
    fail('METADATA_INVARIANCE_VIOLATION', `${name} changed when SAFE_METADATA_ONLY provenance was present.`, {
      invariant: name,
      baselineSha256: sha256(baseline),
      withMetadataSha256: sha256(withMetadata),
    });
  }
}

export function benchmarkTechniqueMetadataInvariance({
  caseId,
  sourceMusicalFacts,
  points,
  techniqueProvenanceByLogicalNoteId,
  tuningConfiguration = STANDARD_TUNING_CONFIGURATION,
  determinismRuns = 2,
}) {
  if (typeof caseId !== 'string' || caseId.length === 0 || caseId.length > 128) {
    fail('INVALID_BENCHMARK_INPUT', 'caseId must be a bounded non-empty string.');
  }
  if (!Number.isSafeInteger(determinismRuns) || determinismRuns !== 2) {
    fail('INVALID_DETERMINISM_RUN_COUNT', 'LAB-TECH-04 requires exactly two determinism runs.', {
      determinismRuns,
    });
  }
  assertDenseArray(sourceMusicalFacts, 'sourceMusicalFacts', 10_000);
  assertDenseArray(points, 'points', 10_000);

  const factsBefore = clone(sourceMusicalFacts);
  const pointsBefore = clone(points);
  const sidecar = validateTechniqueSidecar(techniqueProvenanceByLogicalNoteId);
  assertSidecarReferencesKnownNotes(points, sidecar);

  const baselineRuns = [];
  const metadataRuns = [];
  for (let run = 0; run < determinismRuns; run += 1) {
    baselineRuns.push(solveSnapshot(points, tuningConfiguration, {}));
    metadataRuns.push(solveSnapshot(points, tuningConfiguration, sidecar));
  }

  assertEqualInvariant('candidate-set', baselineRuns[0].candidates, metadataRuns[0].candidates);
  assertEqualInvariant('assignment-ranking', baselineRuns[0].ranking, metadataRuns[0].ranking);
  assertEqualInvariant('physical-result', baselineRuns[0].sustained, metadataRuns[0].sustained);
  assertEqualInvariant('baseline-determinism', baselineRuns[0], baselineRuns[1]);
  assertEqualInvariant('metadata-determinism', metadataRuns[0], metadataRuns[1]);
  assertEqualInvariant('source-musical-facts', factsBefore, sourceMusicalFacts);
  assertEqualInvariant('solver-input-points', pointsBefore, points);

  return Object.freeze({
    documentType: 'TechniqueMetadataInvarianceBenchmarkResult',
    contractVersion: '1.0.0',
    stage: 'LAB-TECH-04',
    caseId,
    status: 'PASS',
    determinismRuns,
    techniqueRecordCount: Object.values(sidecar).reduce((sum, records) => sum + records.length, 0),
    invariants: Object.freeze({
      sourceMusicalFactsUnchanged: true,
      solverInputUnchanged: true,
      candidateSetUnchanged: true,
      assignmentRankingUnchanged: true,
      physicalResultUnchanged: true,
      deterministic: true,
    }),
    hashes: Object.freeze({
      sourceMusicalFactsSha256: sha256(sourceMusicalFacts),
      solverInputSha256: sha256(points),
      candidatesSha256: sha256(baselineRuns[0].candidates),
      rankingSha256: sha256(baselineRuns[0].ranking),
      physicalResultSha256: sha256(baselineRuns[0].sustained),
      baselineRunSha256: sha256(baselineRuns[0]),
      metadataRunSha256: sha256(metadataRuns[0]),
    }),
  });
}
