import {
  requirements,
  caseFixture,
  resource,
  providerId,
  caseId,
} from './verification-fixtures'
import type {
  Requirements,
  RepresentativeLink,
  RepresentativePrivacy,
  PrivacyReceipt,
  VerificationCase,
} from '../verification/types'
export const repRequirements: Requirements = {
  ...requirements,
  environment: 'PRODUCTION',
  representative: {
    categories: [
      'REPRESENTATIVE_INE_FRONT',
      'REPRESENTATIVE_INE_BACK',
      'REPRESENTATION_AUTHORITY_PAGE',
    ],
    checks: [
      'IDENTITY_MATCH',
      'IDENTITY_VALIDITY',
      'LEGIBLE',
      'REPRESENTED_PERSON_MATCH',
      'AUTHORITY_SUFFICIENT',
      'AUTHORITY_CURRENT',
      'LIMITS_REVIEWED',
      'INDIVIDUAL_SIGNATURE_SUFFICIENT',
    ],
    priorPersonalPrivacyRequired: true,
    accreditedBeforeFleetAcceptance: true,
    pagesField: 'authorityPages',
  },
}
export const link: RepresentativeLink = {
  id: resource,
  providerId,
  status: 'LINKED',
  revision: 1,
  restricted: false,
  canAcceptFleet: false,
  approvedCaseId: null,
  cases: [],
  environment: 'PRODUCTION',
}
export const privacy: RepresentativePrivacy = {
  subjectId: resource,
  scope: 'REPRESENTATIVE_PRIVACY',
  version: 'SYNTHETIC-FLEET-1',
  environment: 'PRODUCTION',
  privacyVersion: 'SYNTHETIC-NOTICE-1',
  privacyText:
    'AVISO SINTÉTICO SIN VALIDEZ LEGAL. Texto para probar la interfaz privada.',
  privacyHash: 'b'.repeat(64),
  specificConsents: [
    {
      id: 'identity',
      text: 'Finalidad sintética de identidad.',
      hash: 'c'.repeat(64),
    },
    {
      id: 'authority',
      text: 'Finalidad sintética de facultades.',
      hash: 'd'.repeat(64),
    },
  ],
  acceptsFleetContract: false,
}
export const privacyReceipt: PrivacyReceipt = {
  id: '66666666-6666-4666-8666-666666666666',
  subjectId: resource,
  scope: 'REPRESENTATIVE_PRIVACY',
  status: 'ACKNOWLEDGED',
  version: privacy.version,
  privacyVersion: privacy.privacyVersion,
  privacyHash: privacy.privacyHash,
  acceptsFleetContract: false,
}
export const repCase: VerificationCase = {
  ...caseFixture,
  subjectId: resource,
  resourceId: resource,
  subjectType: 'REPRESENTATIVE',
  environment: 'PRODUCTION',
  scope: { providerId, independentProfileId: null },
  data: {
    fullName: 'Persona Sintética',
    representedName: 'Organización Sintética',
    capacity: 'APPOINTMENT',
    representedPersonType: 'LEGAL_PERSON',
    declarationCurrent: true,
    identityValidUntil: '2035-01-01T00:00:00Z',
    authorityValidFrom: '2026-01-01T00:00:00Z',
    limits: 'Sólo contrato sintético',
    jointSignatureRequired: false,
    authorityPages: [],
  },
}
export const openLink = {
  ...link,
  cases: [
    {
      id: caseId,
      status: 'DRAFT' as const,
      revision: 3,
      environment: 'PRODUCTION' as const,
    },
  ],
}
