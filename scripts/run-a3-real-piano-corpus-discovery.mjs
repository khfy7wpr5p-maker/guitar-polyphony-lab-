import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { parseMusicXmlPartwise } from '../src/musicxml/partwiseParser.js';
import { buildMeasureTimeline } from '../src/polyphony/measureTimeline.js';
import { spelledPitchToMidi } from '../src/guitar/fretboardCandidates.js';
import { buildArrangementTimelineSidecar } from '../src/arrangement/arrangementTimelineSidecar.js';
import { generateTimelineBackedArpeggiationAlternatives } from '../src/arrangement/timelineBackedArpeggiationGenerator.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERIFIED_MUSICXML_DOCTYPE = /<!DOCTYPE\s+score-partwise\s+PUBLIC\s+"-\/\/Recordare\/\/DTD MusicXML\s+[0-9]+(?:\.[0-9]+)*\s+Partwise\/\/EN"\s+"http:\/\/www\.musicxml\.org\/dtds\/partwise\.dtd"\s*>\s*/g;
const ANY_DOCTYPE = /<!DOCTYPE\b/i;
const ANY_ENTITY = /<!ENTITY\b/i;
const MAX_XML_BUFFER = 20 * 1024 * 1024;
const MAX_DENSE_GROUPS_PER_CASE = 8;

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = { externalRoot: null, output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--external-root') {
      options.externalRoot = argv[index + 1] || null;
      index += 1;
    } else if (token === '--output') {
      options.output = argv[index + 1] || null;
      index += 1;
    } else {
      fail(`Unknown argument: ${token}`);
    }
  }
  if (!options.externalRoot || !options.output) {
    fail('Usage: node scripts/run-a3-real-piano-corpus-discovery.mjs --external-root <path> --output <file>');
  }
  return options;
}

function gitHead(root) {
  return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function gitBlobSha(filePath) {
  return execFileSync('git', ['hash-object', filePath], { encoding: 'utf8' }).trim();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function errorSummary(error) {
  return Object.freeze({
    status: 'UNSUPPORTED_LOCAL',
    errorCode: typeof error?.code === 'string' ? error.code : (error?.name ?? 'ERROR'),
    message: error instanceof Error ? error.message : String(error),
  });
}

function extractMxl(mxlPath) {
  const containerXml = execFileSync(
    'unzip',
    ['-p', mxlPath, 'META-INF/container.xml'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 },
  );
  const match = containerXml.match(/<rootfile\b[^>]*\bfull-path=["']([^"']+)["'][^>]*>/i);
  if (!match) fail(`MXL_CONTAINER_ROOTFILE_MISSING ${mxlPath}`);
  const rootfile = match[1];
  if (
    rootfile.startsWith('/')
    || rootfile.includes('\\')
    || rootfile.split('/').some((segment) => segment === '..')
  ) {
    fail(`MXL_CONTAINER_ROOTFILE_UNSAFE ${mxlPath}: ${rootfile}`);
  }
  const xml = execFileSync(
    'unzip',
    ['-p', mxlPath, rootfile],
    { encoding: 'utf8', maxBuffer: MAX_XML_BUFFER },
  );
  if (!xml.trim()) fail(`MXL_ROOTFILE_EMPTY ${mxlPath}: ${rootfile}`);
  return Object.freeze({ containerXml, rootfile, xml });
}

function semanticProbe(xml) {
  if (ANY_ENTITY.test(xml)) {
    return Object.freeze({
      status: 'REJECTED_UNSAFE_DECLARATION',
      transform: null,
      xml: null,
      reason: 'ENTITY_DECLARATION_PRESENT',
    });
  }
  if (!ANY_DOCTYPE.test(xml)) {
    return Object.freeze({
      status: 'READY',
      transform: 'IDENTITY_NO_DOCTYPE',
      xml,
      reason: null,
    });
  }
  const matches = [...xml.matchAll(VERIFIED_MUSICXML_DOCTYPE)];
  if (matches.length !== 1) {
    return Object.freeze({
      status: 'REJECTED_UNSAFE_DECLARATION',
      transform: null,
      xml: null,
      reason: 'DOCTYPE_NOT_SINGLE_VERIFIED_RECORDARE_PARTWISE',
    });
  }
  const transformed = xml.replace(VERIFIED_MUSICXML_DOCTYPE, '');
  if (ANY_DOCTYPE.test(transformed) || ANY_ENTITY.test(transformed)) {
    return Object.freeze({
      status: 'REJECTED_UNSAFE_DECLARATION',
      transform: null,
      xml: null,
      reason: 'DECLARATION_REMAINS_AFTER_VERIFIED_TRANSFORM',
    });
  }
  return Object.freeze({
    status: 'READY',
    transform: 'REMOVE_VERIFIED_MUSICXML_PARTWISE_EXTERNAL_DOCTYPE',
    xml: transformed,
    reason: null,
  });
}

function parseObservation(xml) {
  try {
    const parsed = parseMusicXmlPartwise(xml, { maxBytes: MAX_XML_BUFFER });
    return Object.freeze({
      status: 'SUPPORTED',
      errorCode: null,
      parsed,
    });
  } catch (error) {
    return Object.freeze({ ...errorSummary(error), parsed: null });
  }
}

function attackGroups(notes) {
  const byOnset = new Map();
  for (const note of notes) {
    const bucket = byOnset.get(note.onset) ?? [];
    bucket.push(note);
    byOnset.set(note.onset, bucket);
  }
  return [...byOnset.entries()]
    .map(([onset, group]) => ({ onset, notes: group }))
    .sort((left, right) => left.onset - right.onset);
}

function sourceForDenseGroup(part, measure, onset, notes) {
  const sourceGroupId = `a3:p${part.index}:m${measure.index}:o${onset}`;
  const events = notes.map((note) => Object.freeze({
    sourceEventId: note.id,
    midi: spelledPitchToMidi(note.pitch),
    voice: String(note.voice),
    staff: note.staff,
  }));
  return Object.freeze({
    sourceGroupId,
    source: Object.freeze({
      partId: part.id,
      events: Object.freeze(events),
      groups: Object.freeze([Object.freeze({
        sourceGroupId,
        sourceEventIds: Object.freeze(events.map((event) => event.sourceEventId)),
      })]),
    }),
  });
}

function validateDenseGroup(part, measure, onset, notes) {
  const groupSource = sourceForDenseGroup(part, measure, onset, notes);
  try {
    const sidecar = buildArrangementTimelineSidecar(part, groupSource.source);
    const generation = generateTimelineBackedArpeggiationAlternatives(
      groupSource.source,
      sidecar,
      {
        sourceGroupId: groupSource.sourceGroupId,
        spreadDivisions: 1,
        orderStrategies: ['SOURCE_ORDER', 'ASCENDING_PITCH', 'DESCENDING_PITCH'],
        maxAlternatives: 3,
      },
    );
    return Object.freeze({
      partId: part.id,
      measureIndex: measure.index,
      measureNumber: measure.number,
      onsetDivisions: onset,
      sourceEventCount: notes.length,
      strictSimultaneousSixStringStatus: 'INFEASIBLE',
      strictReason: 'ACTIVE_ATTACK_COUNT_EXCEEDS_STRING_COUNT',
      sourceTimingAuthority: sidecar.sourceTimingAuthority,
      sourceNoteLossAllowed: generation.sourceNoteLossAllowed,
      targetTimingAuthority: generation.targetTimingAuthority,
      generationStatus: generation.generation.status,
      emittedAlternativeCount: generation.generation.emittedAlternativeCount,
      validationStatusCounts: generation.validationStatusCounts ?? {},
    });
  } catch (error) {
    return Object.freeze({
      partId: part.id,
      measureIndex: measure.index,
      measureNumber: measure.number,
      onsetDivisions: onset,
      sourceEventCount: notes.length,
      strictSimultaneousSixStringStatus: 'INFEASIBLE',
      strictReason: 'ACTIVE_ATTACK_COUNT_EXCEEDS_STRING_COUNT',
      sourceTimingAuthority: false,
      sourceNoteLossAllowed: false,
      targetTimingAuthority: false,
      generationStatus: 'VALIDATION_ERROR',
      emittedAlternativeCount: 0,
      validationStatusCounts: {},
      errorCode: typeof error?.code === 'string' ? error.code : (error?.name ?? 'ERROR'),
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function analyzeParsed(parsed) {
  let measureCount = 0;
  let noteCount = 0;
  let tieEventCount = 0;
  let maxActivePolyphony = 0;
  let maxAttackGroupSize = 0;
  let activeSpansOverSix = 0;
  let denseAttackGroupCount = 0;
  const staffs = new Set();
  const voices = new Set();
  const denseGroups = [];

  for (const part of parsed.parts) {
    for (const measure of part.measures) {
      measureCount += 1;
      const timeline = buildMeasureTimeline(measure.events);
      noteCount += timeline.notes.length;
      for (const note of timeline.notes) {
        staffs.add(`${part.id}:${note.staff}`);
        voices.add(`${part.id}:${note.voice}`);
        if (note.tieStart || note.tieStop) tieEventCount += 1;
      }
      for (const span of timeline.sonoritySpans) {
        maxActivePolyphony = Math.max(maxActivePolyphony, span.activeNotes.length);
        if (span.activeNotes.length > 6) activeSpansOverSix += 1;
      }
      for (const group of attackGroups(timeline.notes)) {
        maxAttackGroupSize = Math.max(maxAttackGroupSize, group.notes.length);
        if (group.notes.length > 6) {
          denseAttackGroupCount += 1;
          if (denseGroups.length < MAX_DENSE_GROUPS_PER_CASE) {
            denseGroups.push(validateDenseGroup(part, measure, group.onset, group.notes));
          }
        }
      }
    }
  }

  const noLossFeasibleDenseGroups = denseGroups.filter(
    (group) => (group.validationStatusCounts.FEASIBLE ?? 0) > 0,
  ).length;

  return Object.freeze({
    partCount: parsed.parts.length,
    measureCount,
    noteCount,
    staffLaneCount: staffs.size,
    voiceLaneCount: voices.size,
    tieEventCount,
    maxActivePolyphony,
    activeSpansOverSix,
    maxAttackGroupSize,
    denseAttackGroupCount,
    denseAttackGroupsAudited: denseGroups.length,
    noLossFeasibleDenseGroups,
    denseGroups: Object.freeze(denseGroups),
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'fixtures/a3/piano-corpus-manifest.json'), 'utf8'),
  );
  const externalRoot = path.resolve(options.externalRoot);
  const observedHead = gitHead(externalRoot);
  if (observedHead !== manifest.source.commitSha) {
    fail(`SOURCE_PROVENANCE_MISMATCH external commit: expected ${manifest.source.commitSha}, got ${observedHead}`);
  }

  const cases = [];
  for (const item of manifest.cases) {
    const sourceFile = path.resolve(externalRoot, item.sourcePath);
    if (!sourceFile.startsWith(`${externalRoot}${path.sep}`)) {
      fail(`SOURCE_PROVENANCE_MISMATCH path escapes external root: ${item.sourcePath}`);
    }
    const stat = fs.statSync(sourceFile);
    const observedBlobSha = gitBlobSha(sourceFile);
    if (observedBlobSha !== item.sourceBlobSha) {
      fail(`SOURCE_PROVENANCE_MISMATCH ${item.caseId}: expected blob ${item.sourceBlobSha}, got ${observedBlobSha}`);
    }
    if (stat.size !== item.byteLength) {
      fail(`SOURCE_PROVENANCE_MISMATCH ${item.caseId}: expected ${item.byteLength} bytes, got ${stat.size}`);
    }

    const packageBytes = fs.readFileSync(sourceFile);
    const extracted = extractMxl(sourceFile);
    const raw = parseObservation(extracted.xml);
    const probe = semanticProbe(extracted.xml);
    const probeObservation = probe.status === 'READY'
      ? parseObservation(probe.xml)
      : Object.freeze({ status: probe.status, errorCode: probe.reason, parsed: null });
    const analysis = probeObservation.parsed ? analyzeParsed(probeObservation.parsed) : null;

    cases.push(Object.freeze({
      caseId: item.caseId,
      role: item.role,
      sourcePath: item.sourcePath,
      sourceBlobSha: item.sourceBlobSha,
      sourceByteLength: item.byteLength,
      sourceSha256: sha256(packageBytes),
      mxlRootfile: extracted.rootfile,
      extractedXmlSha256: sha256(Buffer.from(extracted.xml, 'utf8')),
      raw: Object.freeze({
        status: raw.status,
        errorCode: raw.errorCode,
      }),
      semanticProbe: Object.freeze({
        status: probe.status,
        transform: probe.transform,
        reason: probe.reason,
        transformedXmlSha256: probe.xml ? sha256(Buffer.from(probe.xml, 'utf8')) : null,
      }),
      probe: Object.freeze({
        status: probeObservation.status,
        errorCode: probeObservation.errorCode,
      }),
      analysis,
    }));
  }

  const supported = cases.filter((item) => item.probe.status === 'SUPPORTED');
  const report = Object.freeze({
    documentType: 'A3RealPianoCorpusDiscoveryReport',
    contractVersion: '1.0.0',
    authority: 'LAB_RESEARCH_CORPUS_EVIDENCE_ONLY',
    productionAuthority: false,
    sourceNoteLossAllowed: false,
    source: manifest.source,
    policy: manifest.policy,
    summary: Object.freeze({
      caseCount: cases.length,
      probeSupportedCount: supported.length,
      probeUnsupportedCount: cases.length - supported.length,
      totalParsedNotes: supported.reduce((sum, item) => sum + (item.analysis?.noteCount ?? 0), 0),
      maximumObservedActivePolyphony: supported.reduce(
        (maximum, item) => Math.max(maximum, item.analysis?.maxActivePolyphony ?? 0),
        0,
      ),
      denseAttackGroupCount: supported.reduce(
        (sum, item) => sum + (item.analysis?.denseAttackGroupCount ?? 0),
        0,
      ),
      denseAttackGroupsAudited: supported.reduce(
        (sum, item) => sum + (item.analysis?.denseAttackGroupsAudited ?? 0),
        0,
      ),
      noLossFeasibleDenseGroups: supported.reduce(
        (sum, item) => sum + (item.analysis?.noLossFeasibleDenseGroups ?? 0),
        0,
      ),
    }),
    cases: Object.freeze(cases),
  });

  const output = path.resolve(options.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(report.summary)}\n`);
}

main();
