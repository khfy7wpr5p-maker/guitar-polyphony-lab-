import { guitarConfigurationToGuitarFacts } from '../guitar/tuningConfiguration.js';
import { parseStaffConfigurationFragment } from './guitarConfigurationSerializer.js';

export class GuitarConfigurationProvenanceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'GuitarConfigurationProvenanceError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new GuitarConfigurationProvenanceError(code, message, details);
}

function signature(configuration) {
  return JSON.stringify({
    capoFret: configuration.capoFret,
    tuning: configuration.tuning.map(({ string, pitch, midi }) => ({ string, pitch, midi })),
  });
}

export function inspectMusicXmlGuitarConfigurationProvenance(xml) {
  if (typeof xml !== 'string' || xml.length === 0 || xml.length > 2_000_000) {
    fail('INVALID_MUSICXML_PROVENANCE_INPUT', 'MusicXML provenance input must be a bounded string.');
  }
  if (/<!DOCTYPE|<!ENTITY|<xi:include\b/i.test(xml)) {
    fail('UNSAFE_MUSICXML_PROVENANCE_INPUT', 'DTD, entity and XInclude syntax is not accepted by the lab provenance prototype.');
  }

  const staffDetailMatches = [...xml.matchAll(/<staff-details(?:\s[^>]*)?>([\s\S]*?)<\/staff-details>/g)];
  const configurationBlocks = staffDetailMatches
    .map((match) => match[0])
    .filter((block) => /<staff-tuning\b/.test(block));

  const technicalPositionEvidenceCount = [...xml.matchAll(
    /<technical>[\s\S]*?<string>\s*[1-6]\s*<\/string>[\s\S]*?<fret>\s*(?:0|[1-9]\d*)\s*<\/fret>[\s\S]*?<\/technical>/g,
  )].length;

  if (configurationBlocks.length === 0) {
    return Object.freeze({
      documentType: 'MusicXmlGuitarConfigurationProvenance',
      contractVersion: '1.0.0',
      status: 'ABSENT',
      configuration: null,
      guitar: null,
      explicitStaffConfigurationCount: 0,
      technicalPositionEvidenceCount,
      technicalPositionAuthority: 'NON_AUTHORITATIVE_SOURCE_FINGERING',
    });
  }

  const parsed = [];
  for (let index = 0; index < configurationBlocks.length; index += 1) {
    try {
      parsed.push(parseStaffConfigurationFragment(configurationBlocks[index]));
    } catch (error) {
      return Object.freeze({
        documentType: 'MusicXmlGuitarConfigurationProvenance',
        contractVersion: '1.0.0',
        status: 'UNSUPPORTED_EVIDENCE',
        configuration: null,
        guitar: null,
        explicitStaffConfigurationCount: configurationBlocks.length,
        technicalPositionEvidenceCount,
        technicalPositionAuthority: 'NON_AUTHORITATIVE_SOURCE_FINGERING',
        reason: Object.freeze({
          code: error?.code || 'INVALID_STAFF_CONFIGURATION',
          blockIndex: index,
        }),
      });
    }
  }

  const unique = new Map(parsed.map((configuration) => [signature(configuration), configuration]));
  if (unique.size !== 1) {
    return Object.freeze({
      documentType: 'MusicXmlGuitarConfigurationProvenance',
      contractVersion: '1.0.0',
      status: 'CONFLICT',
      configuration: null,
      guitar: null,
      explicitStaffConfigurationCount: configurationBlocks.length,
      uniqueConfigurationCount: unique.size,
      technicalPositionEvidenceCount,
      technicalPositionAuthority: 'NON_AUTHORITATIVE_SOURCE_FINGERING',
    });
  }

  const configuration = [...unique.values()][0];
  return Object.freeze({
    documentType: 'MusicXmlGuitarConfigurationProvenance',
    contractVersion: '1.0.0',
    status: 'SAFE_EXPLICIT',
    configuration,
    guitar: guitarConfigurationToGuitarFacts(configuration),
    explicitStaffConfigurationCount: configurationBlocks.length,
    uniqueConfigurationCount: 1,
    technicalPositionEvidenceCount,
    technicalPositionAuthority: 'NON_AUTHORITATIVE_SOURCE_FINGERING',
  });
}
