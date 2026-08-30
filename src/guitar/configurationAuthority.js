import { types as utilTypes } from 'node:util';

import {
  STANDARD_GUITAR_CONFIGURATION,
  guitarConfigurationToGuitarFacts,
  resolveGuitarConfiguration,
} from './tuningConfiguration.js';

const { isProxy } = utilTypes;

export const GUITAR_CONFIGURATION_AUTHORITY_POLICY =
  'EXPLICIT_USER_THEN_SAFE_MUSICXML_THEN_STANDARD_WITH_CONFLICT_BLOCK_1.0';

export class GuitarConfigurationAuthorityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'GuitarConfigurationAuthorityError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new GuitarConfigurationAuthorityError(code, message, details);
}

function descriptorsForRequest(request) {
  if (
    !request
    || typeof request !== 'object'
    || Array.isArray(request)
    || isProxy(request)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(request))
  ) {
    fail('INVALID_AUTHORITY_REQUEST', 'Authority request must be a non-proxy plain object.');
  }
  const descriptors = Object.getOwnPropertyDescriptors(request);
  for (const key of Reflect.ownKeys(request)) {
    if (typeof key !== 'string' || !['userConfiguration', 'sourceConfiguration'].includes(key)) {
      fail('INVALID_AUTHORITY_REQUEST', 'Authority request contains an unknown field.', {
        field: typeof key === 'symbol' ? key.toString() : key,
      });
    }
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      fail('INVALID_AUTHORITY_REQUEST', 'Authority request fields must be enumerable data properties.', {
        field: key,
      });
    }
  }
  return descriptors;
}

function sameConfiguration(left, right) {
  if (left.capoFret !== right.capoFret || left.tuning.length !== right.tuning.length) return false;
  return left.tuning.every((entry, index) => {
    const other = right.tuning[index];
    return entry.string === other.string
      && entry.pitch === other.pitch
      && entry.midi === other.midi;
  });
}

function resolved(configuration, authority, evidence) {
  return Object.freeze({
    documentType: 'GuitarConfigurationAuthorityResult',
    contractVersion: '1.0.0',
    policy: GUITAR_CONFIGURATION_AUTHORITY_POLICY,
    status: 'RESOLVED',
    authority,
    conflict: null,
    configuration,
    guitar: guitarConfigurationToGuitarFacts(configuration),
    evidence: Object.freeze({ ...evidence }),
  });
}

export function resolveGuitarConfigurationAuthority(request = {}) {
  const descriptors = descriptorsForRequest(request);
  const rawUser = Object.hasOwn(descriptors, 'userConfiguration')
    ? descriptors.userConfiguration.value
    : null;
  const rawSource = Object.hasOwn(descriptors, 'sourceConfiguration')
    ? descriptors.sourceConfiguration.value
    : null;

  const user = rawUser === null ? null : resolveGuitarConfiguration(rawUser);
  const source = rawSource === null ? null : resolveGuitarConfiguration(rawSource);

  if (user && source) {
    if (!sameConfiguration(user, source)) {
      return Object.freeze({
        documentType: 'GuitarConfigurationAuthorityResult',
        contractVersion: '1.0.0',
        policy: GUITAR_CONFIGURATION_AUTHORITY_POLICY,
        status: 'CONFLICT',
        authority: null,
        configuration: null,
        guitar: null,
        conflict: Object.freeze({
          code: 'USER_SOURCE_GUITAR_CONFIGURATION_CONFLICT',
          user: guitarConfigurationToGuitarFacts(user),
          source: guitarConfigurationToGuitarFacts(source),
        }),
        evidence: Object.freeze({ user: true, source: true, standardFallbackUsed: false }),
      });
    }
    return resolved(user, 'USER_AND_SOURCE_AGREE', {
      user: true,
      source: true,
      standardFallbackUsed: false,
    });
  }

  if (user) {
    return resolved(user, 'USER_EXPLICIT', {
      user: true,
      source: false,
      standardFallbackUsed: false,
    });
  }

  if (source) {
    return resolved(source, 'MUSICXML_EXPLICIT', {
      user: false,
      source: true,
      standardFallbackUsed: false,
    });
  }

  return resolved(STANDARD_GUITAR_CONFIGURATION, 'STANDARD_DEFAULT', {
    user: false,
    source: false,
    standardFallbackUsed: true,
  });
}
