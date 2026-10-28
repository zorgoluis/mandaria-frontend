import type { ReferenceCatalog } from '../assistance/admin-references'
import { referenceSections } from '../assistance/admin-references'
import { ids } from './assistance-fixture'
export function referenceCatalog(): ReferenceCatalog {
  const date = '2026-10-25T12:00:00.000Z'
  const items = {
    parties: [
      {
        id: ids.party,
        kind: 'DRIVER',
        label: 'Parte sintética',
        contactSourceRef: 'USER:canonical',
        methods: ['REGISTERED_CHANNEL_CALLBACK'],
      },
    ],
    stops: [
      {
        id: ids.dispatch,
        type: 'PICKUP',
        sequence: 1,
        contactSourceRef: 'STOP:canonical',
        registrationKinds: ['ORIGIN', 'EXTERNAL'],
      },
    ],
    participations: [
      {
        id: ids.obligation,
        assignmentId: ids.assignment,
        driverId: ids.party,
        providerId: null,
        vehicleId: null,
        startedAt: date,
        endedAt: null,
      },
    ],
    'recovery-sessions': [
      {
        id: ids.evidence,
        newSessionId: ids.proposal,
        expiresAt: '2099-01-01T00:00:00Z',
      },
    ],
    'release-receipts': [
      {
        id: 'opaque:release',
        existingReceiptId: ids.dispatch,
        assignmentId: ids.assignment,
        createdAt: date,
      },
    ],
    'shipping-declarations': [
      {
        id: ids.dispatch,
        sourceRef: ids.assignment,
        amount: '123456789012.34',
        currency: 'MXN',
        occurredAt: date,
        toPartyIds: [ids.party],
        declaredConcepts: ['SHIPPING_FEE'],
      },
    ],
    'evidence-sources': [
      {
        id: 'opaque:note',
        kind: 'VERIFIED_CONTACT_NOTE',
        sourceRef: {
          type: 'CONTACT_VERIFICATION_NOTE',
          id: ids.proposal,
          sha256: 'a'.repeat(64),
        },
        partyId: ids.party,
      },
    ],
  }
  return Object.fromEntries(
    referenceSections.map((section) => [
      section,
      {
        schemaVersion: 1,
        caseId: ids.case,
        caseRevision: '3',
        materialRevision: '2',
        section,
        commandsEnabled: true,
        asOf: date,
        items: items[section],
        nextPageToken: null,
      },
    ]),
  ) as ReferenceCatalog
}
