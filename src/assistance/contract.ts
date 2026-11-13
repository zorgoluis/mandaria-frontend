// Generated from local backend OpenAPI assistance 1.0.0; request DTOs only.
import type { Schema } from './types'
export interface CommandBodies {
  CREATE: {
    caseId: string
    assignmentId: string
    reason:
      'ACCESS_LOST' | 'DEVICE_COMPROMISED' | 'UNREACHABLE' | 'CASH_DISPUTE'
    description: string
  }
  CONTRIBUTE: {
    expectedCaseRevision: string
    text: string
    partyId?: string
    occurredAt?: string
    evidenceIds: string[]
  }
  REGISTER_PARTY: {
    expectedCaseRevision: string
    kind: 'DRIVER' | 'PROVIDER' | 'ORIGIN' | 'RECIPIENT' | 'EXTERNAL'
    userId?: string
    providerId?: string
    label: string
    contactSourceRef?: string
  }
  VERIFY_IDENTITY: {
    expectedCaseRevision: string
    partyId: string
    method: 'REGISTERED_CHANNEL_CALLBACK' | 'AUTHENTICATED_SELF'
    outcome: 'VERIFIED' | 'FAILED' | 'UNREACHABLE'
    contactSourceRef: string
    occurredAt: string
    verificationNoteEvidenceId: string
  }
  RECORD_EVIDENCE: {
    expectedCaseRevision: string
    kind: 'VERIFIED_CONTACT_NOTE' | 'EXISTING_INTERNAL_RECORD' | 'PRIVATE_IMAGE'
    sourceRef?: {
      type:
        | 'CONTACT_VERIFICATION_NOTE'
        | 'ASSIGNMENT'
        | 'EXECUTION_EVENT'
        | 'CUSTODY_RESOLUTION'
        | 'SHIPPING_DECLARATION'
        | 'COMMAND_RECEIPT'
      id: string
      revision?: string
      sha256: string
    }
    uploadId?: string
    observedAt: string
    supersedesId?: string
  }
  CONFIRM: {
    expectedCaseRevision: string
    partyId: string
    verificationId: string
    assertion:
      | 'NO_PICKUP'
      | 'NO_COLLECTION'
      | 'NO_ADVANCE'
      | 'NO_OBLIGATIONS'
      | 'DELIVERY_RECEIVED'
      | 'MONEY_RECEIVED'
      | 'EXCEPTION_AUTHORIZED'
    targetType: 'CASE' | 'MOVEMENT' | 'OBLIGATION'
    targetId: string
    termsHash: string
    evidenceIds: string[]
    observedAt: string
  }
  REVOKE_SESSIONS: {
    expectedCaseRevision: string
    driverId: string
    verificationId: string
    scope: 'ALL'
    reason: string
  }
  RESTRICT: {
    expectedCaseRevision: string
    driverId: string
    cause: 'ACCESS_INVESTIGATION' | 'CUSTODY_UNKNOWN' | 'CASH_PENDING'
    verificationId: string
    evidenceIds: string[]
    reason: string
  }
  RECORD_OBLIGATION: {
    expectedCaseRevision: string
    participationId: string
    concept:
      'SHIPPING_FEE' | 'GOODS' | 'COURIER_ADVANCE' | 'REFUND' | 'DIFFERENCE'
    debtorPartyId: string
    creditorPartyId: string
    beneficiaryPartyId: string
    custodianDriverId?: string
    knowledge: 'KNOWN' | 'UNKNOWN'
    expectedAmount: string | null
    currency: 'MXN'
    termsRef: string
    ordinal: number
    occurredAt: string
    evidenceIds: string[]
  }
  DECLARE_MOVEMENT: {
    expectedCaseRevision: string
    physicalMovementId: string
    sourceKind: 'DECLARATION' | 'SHIPPING_DECLARATION' | 'VERIFIED_EXTERNAL'
    sourceRef?: string
    fromPartyId: string
    toPartyId: string
    beneficiaryPartyId: string
    declaredConcepts: (
      'SHIPPING_FEE' | 'GOODS' | 'COURIER_ADVANCE' | 'REFUND' | 'DIFFERENCE'
    )[]
    amount: string
    currency: 'MXN'
    occurredAt: string
    evidenceIds: string[]
    reversesMovementId?: string
  }
  DISPUTE: {
    expectedCaseRevision: string
    obligationId?: string
    movementId?: string
    reason: string
    evidenceIds: string[]
  }
  PROPOSE:
    | {
        expectedCaseRevision: string
        type: 'ACCESS_RECOVERED'
        assignmentId: string
        expectedExecutionRevision?: string
        occurredAt: string
        reason: string
        evidenceIds: string[]
        confirmationIds: string[]
        payload: { verificationId: string; newSessionId: string }
      }
    | {
        expectedCaseRevision: string
        type: 'VERIFY_NO_OBLIGATIONS'
        assignmentId: string
        expectedExecutionRevision?: string
        occurredAt: string
        reason: string
        evidenceIds: string[]
        confirmationIds: string[]
        payload: {
          inventoryEvidenceIds: string[]
          coveredConcepts: (
            | 'SHIPPING_FEE'
            | 'GOODS'
            | 'COURIER_ADVANCE'
            | 'REFUND'
            | 'DIFFERENCE'
          )[]
        }
      }
    | {
        expectedCaseRevision: string
        type: 'VERIFY_ECONOMIC_INVENTORY'
        assignmentId: string
        expectedExecutionRevision?: string
        occurredAt: string
        reason: string
        evidenceIds: string[]
        confirmationIds: string[]
        payload: {
          obligationIds: string[]
          inventoryEvidenceIds: string[]
          coveredConcepts: (
            | 'SHIPPING_FEE'
            | 'GOODS'
            | 'COURIER_ADVANCE'
            | 'REFUND'
            | 'DIFFERENCE'
          )[]
        }
      }
    | {
        expectedCaseRevision: string
        type: 'ASSISTED_RELEASE'
        assignmentId: string
        expectedExecutionRevision?: string
        occurredAt: string
        reason: string
        evidenceIds: string[]
        confirmationIds: string[]
        payload: {
          availability: 'CONTACTABLE' | 'UNREACHABLE'
          proofSource: 'NEW_ACTION' | 'EXISTING_RELEASE'
          existingReceiptId?: string
        }
      }
    | {
        expectedCaseRevision: string
        type: 'ACCREDIT_DELIVERY'
        assignmentId: string
        expectedExecutionRevision?: string
        occurredAt: string
        reason: string
        evidenceIds: string[]
        confirmationIds: string[]
        payload: {
          proofSource: 'NEW_ACTION' | 'EXISTING_DELIVERY'
          receiverConfirmationId: string
          incidentIdsToResolve: string[]
        }
      }
    | {
        expectedCaseRevision: string
        type: 'LINK_CUSTODY_RESULT'
        assignmentId: string
        expectedExecutionRevision?: string
        occurredAt: string
        reason: string
        evidenceIds: string[]
        confirmationIds: string[]
        payload: { custodyResolutionId: string }
      }
    | {
        expectedCaseRevision: string
        type: 'ACCREDIT_MOVEMENT'
        assignmentId: string
        expectedExecutionRevision?: string
        occurredAt: string
        reason: string
        evidenceIds: string[]
        confirmationIds: string[]
        payload: {
          movementId: string
          receiverConfirmationId: string
          allocations: { obligationId: string; amount: string }[]
        }
      }
    | {
        expectedCaseRevision: string
        type: 'CORRECT_ECONOMICS'
        assignmentId: string
        expectedExecutionRevision?: string
        occurredAt: string
        reason: string
        evidenceIds: string[]
        confirmationIds: string[]
        payload: {
          targetType: 'OBLIGATION' | 'MOVEMENT'
          targetId: string
          replacementId: string
          reverseAllocationIds: string[]
          disputeId: string
        }
      }
    | {
        expectedCaseRevision: string
        type: 'RESOLVE_DISPUTE'
        assignmentId: string
        expectedExecutionRevision?: string
        occurredAt: string
        reason: string
        evidenceIds: string[]
        confirmationIds: string[]
        payload: { disputeId: string; confirmedMovementIds: string[] }
      }
    | {
        expectedCaseRevision: string
        type: 'RECORD_EXCEPTION'
        assignmentId: string
        expectedExecutionRevision?: string
        occurredAt: string
        reason: string
        evidenceIds: string[]
        confirmationIds: string[]
        payload: {
          obligationId: string
          exceptionType: 'WAIVER' | 'COMPENSATION' | 'LOSS'
          coveredAmount: string
          authorizationEvidenceId: string
          counterpartyConfirmationIds: string[]
        }
      }
    | {
        expectedCaseRevision: string
        type: 'LIFT_RESTRICTION'
        assignmentId: string
        expectedExecutionRevision?: string
        occurredAt: string
        reason: string
        evidenceIds: string[]
        confirmationIds: string[]
        payload: { restrictionId: string; basisResolutionId: string }
      }
    | {
        expectedCaseRevision: string
        type: 'RETRACT_EVIDENCE'
        assignmentId: string
        expectedExecutionRevision?: string
        occurredAt: string
        reason: string
        evidenceIds: string[]
        confirmationIds: string[]
        payload: { evidenceId: string; reason: string }
      }
  REVIEW: {
    expectedCaseRevision: string
    expectedProposalRevision: string
    snapshotHash: string
    decision: 'APPROVE' | 'REJECT' | 'REVOKE'
    reason: string
  }
  CANCEL_PROPOSAL: {
    expectedCaseRevision: string
    expectedProposalRevision: string
    reason: string
  }
  APPLY: {
    expectedCaseRevision: string
    expectedProposalRevision: string
    snapshotHash: string
  }
  CLOSE: { expectedCaseRevision: string; reason: string }
  REOPEN: {
    expectedCaseRevision: string
    reason: string
    dimension: 'OPERATIONAL' | 'ECONOMIC' | 'BOTH'
    evidenceIds: string[]
  }
  UPLOAD_EVIDENCE: {
    expectedCaseRevision: string
    mime: 'image/jpeg' | 'image/png'
    bytes: number
    sha256: string
  }
}
export const commandSchemas: Record<keyof CommandBodies, Schema> = {
  CREATE: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      caseId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      assignmentId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      reason: {
        type: 'string',
        enum: [
          'ACCESS_LOST',
          'DEVICE_COMPROMISED',
          'UNREACHABLE',
          'CASH_DISPUTE',
        ],
      },
      description: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
      },
    },
    required: ['caseId', 'assignmentId', 'reason', 'description'],
    additionalProperties: false,
  },
  CONTRIBUTE: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      text: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
      },
      partyId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      occurredAt: {
        type: 'string',
        format: 'date-time',
        pattern:
          '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
      },
      evidenceIds: {
        default: [],
        maxItems: 20,
        type: 'array',
        items: {
          type: 'string',
          format: 'uuid',
          pattern:
            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
        },
      },
    },
    required: ['expectedCaseRevision', 'text', 'evidenceIds'],
    additionalProperties: false,
  },
  REGISTER_PARTY: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      kind: {
        type: 'string',
        enum: ['DRIVER', 'PROVIDER', 'ORIGIN', 'RECIPIENT', 'EXTERNAL'],
      },
      userId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      providerId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      label: {
        type: 'string',
        minLength: 1,
        maxLength: 120,
      },
      contactSourceRef: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
      },
    },
    required: ['expectedCaseRevision', 'kind', 'label'],
    additionalProperties: false,
  },
  VERIFY_IDENTITY: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      partyId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      method: {
        type: 'string',
        enum: ['REGISTERED_CHANNEL_CALLBACK', 'AUTHENTICATED_SELF'],
      },
      outcome: {
        type: 'string',
        enum: ['VERIFIED', 'FAILED', 'UNREACHABLE'],
      },
      contactSourceRef: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
      },
      occurredAt: {
        type: 'string',
        format: 'date-time',
        pattern:
          '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
      },
      verificationNoteEvidenceId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
    },
    required: [
      'expectedCaseRevision',
      'partyId',
      'method',
      'outcome',
      'contactSourceRef',
      'occurredAt',
      'verificationNoteEvidenceId',
    ],
    additionalProperties: false,
  },
  RECORD_EVIDENCE: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      kind: {
        type: 'string',
        enum: [
          'VERIFIED_CONTACT_NOTE',
          'EXISTING_INTERNAL_RECORD',
          'PRIVATE_IMAGE',
        ],
      },
      sourceRef: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'CONTACT_VERIFICATION_NOTE',
              'ASSIGNMENT',
              'EXECUTION_EVENT',
              'CUSTODY_RESOLUTION',
              'SHIPPING_DECLARATION',
              'COMMAND_RECEIPT',
            ],
          },
          id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
          },
          revision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          sha256: {
            type: 'string',
            pattern: '^[a-f0-9]{64}$',
          },
        },
        required: ['type', 'id', 'sha256'],
        additionalProperties: false,
      },
      uploadId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      observedAt: {
        type: 'string',
        format: 'date-time',
        pattern:
          '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
      },
      supersedesId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
    },
    required: ['expectedCaseRevision', 'kind', 'observedAt'],
    additionalProperties: false,
  },
  CONFIRM: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      partyId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      verificationId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      assertion: {
        type: 'string',
        enum: [
          'NO_PICKUP',
          'NO_COLLECTION',
          'NO_ADVANCE',
          'NO_OBLIGATIONS',
          'DELIVERY_RECEIVED',
          'MONEY_RECEIVED',
          'EXCEPTION_AUTHORIZED',
        ],
      },
      targetType: {
        type: 'string',
        enum: ['CASE', 'MOVEMENT', 'OBLIGATION'],
      },
      targetId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      termsHash: {
        type: 'string',
        pattern: '^[a-f0-9]{64}$',
      },
      evidenceIds: {
        default: [],
        maxItems: 20,
        type: 'array',
        items: {
          type: 'string',
          format: 'uuid',
          pattern:
            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
        },
      },
      observedAt: {
        type: 'string',
        format: 'date-time',
        pattern:
          '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
      },
    },
    required: [
      'expectedCaseRevision',
      'partyId',
      'verificationId',
      'assertion',
      'targetType',
      'targetId',
      'termsHash',
      'evidenceIds',
      'observedAt',
    ],
    additionalProperties: false,
  },
  REVOKE_SESSIONS: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      driverId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      verificationId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      scope: {
        type: 'string',
        const: 'ALL',
      },
      reason: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
      },
    },
    required: [
      'expectedCaseRevision',
      'driverId',
      'verificationId',
      'scope',
      'reason',
    ],
    additionalProperties: false,
  },
  RESTRICT: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      driverId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      cause: {
        type: 'string',
        enum: ['ACCESS_INVESTIGATION', 'CUSTODY_UNKNOWN', 'CASH_PENDING'],
      },
      verificationId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      evidenceIds: {
        default: [],
        maxItems: 20,
        type: 'array',
        items: {
          type: 'string',
          format: 'uuid',
          pattern:
            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
        },
      },
      reason: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
      },
    },
    required: [
      'expectedCaseRevision',
      'driverId',
      'cause',
      'verificationId',
      'evidenceIds',
      'reason',
    ],
    additionalProperties: false,
  },
  RECORD_OBLIGATION: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      participationId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      concept: {
        type: 'string',
        enum: [
          'SHIPPING_FEE',
          'GOODS',
          'COURIER_ADVANCE',
          'REFUND',
          'DIFFERENCE',
        ],
      },
      debtorPartyId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      creditorPartyId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      beneficiaryPartyId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      custodianDriverId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      knowledge: {
        type: 'string',
        enum: ['KNOWN', 'UNKNOWN'],
      },
      expectedAmount: {
        anyOf: [
          {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,11})\\.[0-9]{2}$',
          },
          {
            type: 'null',
          },
        ],
      },
      currency: {
        type: 'string',
        const: 'MXN',
      },
      termsRef: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
      },
      ordinal: {
        type: 'integer',
        minimum: 0,
        maximum: 9007199254740991,
      },
      occurredAt: {
        type: 'string',
        format: 'date-time',
        pattern:
          '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
      },
      evidenceIds: {
        default: [],
        maxItems: 20,
        type: 'array',
        items: {
          type: 'string',
          format: 'uuid',
          pattern:
            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
        },
      },
    },
    required: [
      'expectedCaseRevision',
      'participationId',
      'concept',
      'debtorPartyId',
      'creditorPartyId',
      'beneficiaryPartyId',
      'knowledge',
      'expectedAmount',
      'currency',
      'termsRef',
      'ordinal',
      'occurredAt',
      'evidenceIds',
    ],
    additionalProperties: false,
  },
  DECLARE_MOVEMENT: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      physicalMovementId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      sourceKind: {
        type: 'string',
        enum: ['DECLARATION', 'SHIPPING_DECLARATION', 'VERIFIED_EXTERNAL'],
      },
      sourceRef: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
      },
      fromPartyId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      toPartyId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      beneficiaryPartyId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      declaredConcepts: {
        minItems: 1,
        maxItems: 5,
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'SHIPPING_FEE',
            'GOODS',
            'COURIER_ADVANCE',
            'REFUND',
            'DIFFERENCE',
          ],
        },
      },
      amount: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,11})\\.[0-9]{2}$',
      },
      currency: {
        type: 'string',
        const: 'MXN',
      },
      occurredAt: {
        type: 'string',
        format: 'date-time',
        pattern:
          '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
      },
      evidenceIds: {
        default: [],
        maxItems: 20,
        type: 'array',
        items: {
          type: 'string',
          format: 'uuid',
          pattern:
            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
        },
      },
      reversesMovementId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
    },
    required: [
      'expectedCaseRevision',
      'physicalMovementId',
      'sourceKind',
      'fromPartyId',
      'toPartyId',
      'beneficiaryPartyId',
      'declaredConcepts',
      'amount',
      'currency',
      'occurredAt',
      'evidenceIds',
    ],
    additionalProperties: false,
  },
  DISPUTE: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      obligationId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      movementId: {
        type: 'string',
        format: 'uuid',
        pattern:
          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
      },
      reason: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
      },
      evidenceIds: {
        default: [],
        maxItems: 20,
        type: 'array',
        items: {
          type: 'string',
          format: 'uuid',
          pattern:
            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
        },
      },
    },
    required: ['expectedCaseRevision', 'reason', 'evidenceIds'],
    additionalProperties: false,
  },
  PROPOSE: {
    oneOf: [
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          expectedCaseRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          type: {
            type: 'string',
            const: 'ACCESS_RECOVERED',
          },
          assignmentId: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
          },
          expectedExecutionRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          occurredAt: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
          },
          reason: {
            type: 'string',
            minLength: 3,
            maxLength: 2000,
          },
          evidenceIds: {
            default: [],
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          confirmationIds: {
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          payload: {
            type: 'object',
            properties: {
              verificationId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
              newSessionId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
            },
            required: ['verificationId', 'newSessionId'],
            additionalProperties: false,
          },
        },
        required: [
          'expectedCaseRevision',
          'type',
          'assignmentId',
          'occurredAt',
          'reason',
          'evidenceIds',
          'confirmationIds',
          'payload',
        ],
        additionalProperties: false,
      },
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          expectedCaseRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          type: {
            type: 'string',
            const: 'VERIFY_NO_OBLIGATIONS',
          },
          assignmentId: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
          },
          expectedExecutionRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          occurredAt: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
          },
          reason: {
            type: 'string',
            minLength: 3,
            maxLength: 2000,
          },
          evidenceIds: {
            default: [],
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          confirmationIds: {
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          payload: {
            type: 'object',
            properties: {
              inventoryEvidenceIds: {
                maxItems: 20,
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
                },
              },
              coveredConcepts: {
                minItems: 5,
                maxItems: 5,
                type: 'array',
                items: {
                  type: 'string',
                  enum: [
                    'SHIPPING_FEE',
                    'GOODS',
                    'COURIER_ADVANCE',
                    'REFUND',
                    'DIFFERENCE',
                  ],
                },
              },
            },
            required: ['inventoryEvidenceIds', 'coveredConcepts'],
            additionalProperties: false,
          },
        },
        required: [
          'expectedCaseRevision',
          'type',
          'assignmentId',
          'occurredAt',
          'reason',
          'evidenceIds',
          'confirmationIds',
          'payload',
        ],
        additionalProperties: false,
      },
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          expectedCaseRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          type: {
            type: 'string',
            const: 'VERIFY_ECONOMIC_INVENTORY',
          },
          assignmentId: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
          },
          expectedExecutionRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          occurredAt: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
          },
          reason: {
            type: 'string',
            minLength: 3,
            maxLength: 2000,
          },
          evidenceIds: {
            default: [],
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          confirmationIds: {
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          payload: {
            type: 'object',
            properties: {
              obligationIds: {
                maxItems: 20,
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
                },
              },
              inventoryEvidenceIds: {
                maxItems: 20,
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
                },
              },
              coveredConcepts: {
                minItems: 5,
                maxItems: 5,
                type: 'array',
                items: {
                  type: 'string',
                  enum: [
                    'SHIPPING_FEE',
                    'GOODS',
                    'COURIER_ADVANCE',
                    'REFUND',
                    'DIFFERENCE',
                  ],
                },
              },
            },
            required: [
              'obligationIds',
              'inventoryEvidenceIds',
              'coveredConcepts',
            ],
            additionalProperties: false,
          },
        },
        required: [
          'expectedCaseRevision',
          'type',
          'assignmentId',
          'occurredAt',
          'reason',
          'evidenceIds',
          'confirmationIds',
          'payload',
        ],
        additionalProperties: false,
      },
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          expectedCaseRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          type: {
            type: 'string',
            const: 'ASSISTED_RELEASE',
          },
          assignmentId: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
          },
          expectedExecutionRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          occurredAt: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
          },
          reason: {
            type: 'string',
            minLength: 3,
            maxLength: 2000,
          },
          evidenceIds: {
            default: [],
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          confirmationIds: {
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          payload: {
            type: 'object',
            properties: {
              availability: {
                type: 'string',
                enum: ['CONTACTABLE', 'UNREACHABLE'],
              },
              proofSource: {
                type: 'string',
                enum: ['NEW_ACTION', 'EXISTING_RELEASE'],
              },
              existingReceiptId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
            },
            required: ['availability', 'proofSource'],
            additionalProperties: false,
          },
        },
        required: [
          'expectedCaseRevision',
          'type',
          'assignmentId',
          'occurredAt',
          'reason',
          'evidenceIds',
          'confirmationIds',
          'payload',
        ],
        additionalProperties: false,
      },
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          expectedCaseRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          type: {
            type: 'string',
            const: 'ACCREDIT_DELIVERY',
          },
          assignmentId: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
          },
          expectedExecutionRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          occurredAt: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
          },
          reason: {
            type: 'string',
            minLength: 3,
            maxLength: 2000,
          },
          evidenceIds: {
            default: [],
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          confirmationIds: {
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          payload: {
            type: 'object',
            properties: {
              proofSource: {
                type: 'string',
                enum: ['NEW_ACTION', 'EXISTING_DELIVERY'],
              },
              receiverConfirmationId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
              incidentIdsToResolve: {
                maxItems: 20,
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
                },
              },
            },
            required: [
              'proofSource',
              'receiverConfirmationId',
              'incidentIdsToResolve',
            ],
            additionalProperties: false,
          },
        },
        required: [
          'expectedCaseRevision',
          'type',
          'assignmentId',
          'occurredAt',
          'reason',
          'evidenceIds',
          'confirmationIds',
          'payload',
        ],
        additionalProperties: false,
      },
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          expectedCaseRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          type: {
            type: 'string',
            const: 'LINK_CUSTODY_RESULT',
          },
          assignmentId: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
          },
          expectedExecutionRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          occurredAt: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
          },
          reason: {
            type: 'string',
            minLength: 3,
            maxLength: 2000,
          },
          evidenceIds: {
            default: [],
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          confirmationIds: {
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          payload: {
            type: 'object',
            properties: {
              custodyResolutionId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
            },
            required: ['custodyResolutionId'],
            additionalProperties: false,
          },
        },
        required: [
          'expectedCaseRevision',
          'type',
          'assignmentId',
          'occurredAt',
          'reason',
          'evidenceIds',
          'confirmationIds',
          'payload',
        ],
        additionalProperties: false,
      },
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          expectedCaseRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          type: {
            type: 'string',
            const: 'ACCREDIT_MOVEMENT',
          },
          assignmentId: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
          },
          expectedExecutionRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          occurredAt: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
          },
          reason: {
            type: 'string',
            minLength: 3,
            maxLength: 2000,
          },
          evidenceIds: {
            default: [],
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          confirmationIds: {
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          payload: {
            type: 'object',
            properties: {
              movementId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
              receiverConfirmationId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
              allocations: {
                minItems: 1,
                maxItems: 100,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    obligationId: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
                    },
                    amount: {
                      type: 'string',
                      pattern: '^(0|[1-9][0-9]{0,11})\\.[0-9]{2}$',
                    },
                  },
                  required: ['obligationId', 'amount'],
                  additionalProperties: false,
                },
              },
            },
            required: ['movementId', 'receiverConfirmationId', 'allocations'],
            additionalProperties: false,
          },
        },
        required: [
          'expectedCaseRevision',
          'type',
          'assignmentId',
          'occurredAt',
          'reason',
          'evidenceIds',
          'confirmationIds',
          'payload',
        ],
        additionalProperties: false,
      },
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          expectedCaseRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          type: {
            type: 'string',
            const: 'CORRECT_ECONOMICS',
          },
          assignmentId: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
          },
          expectedExecutionRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          occurredAt: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
          },
          reason: {
            type: 'string',
            minLength: 3,
            maxLength: 2000,
          },
          evidenceIds: {
            default: [],
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          confirmationIds: {
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          payload: {
            type: 'object',
            properties: {
              targetType: {
                type: 'string',
                enum: ['OBLIGATION', 'MOVEMENT'],
              },
              targetId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
              replacementId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
              reverseAllocationIds: {
                maxItems: 20,
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
                },
              },
              disputeId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
            },
            required: [
              'targetType',
              'targetId',
              'replacementId',
              'reverseAllocationIds',
              'disputeId',
            ],
            additionalProperties: false,
          },
        },
        required: [
          'expectedCaseRevision',
          'type',
          'assignmentId',
          'occurredAt',
          'reason',
          'evidenceIds',
          'confirmationIds',
          'payload',
        ],
        additionalProperties: false,
      },
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          expectedCaseRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          type: {
            type: 'string',
            const: 'RESOLVE_DISPUTE',
          },
          assignmentId: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
          },
          expectedExecutionRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          occurredAt: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
          },
          reason: {
            type: 'string',
            minLength: 3,
            maxLength: 2000,
          },
          evidenceIds: {
            default: [],
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          confirmationIds: {
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          payload: {
            type: 'object',
            properties: {
              disputeId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
              confirmedMovementIds: {
                maxItems: 20,
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
                },
              },
            },
            required: ['disputeId', 'confirmedMovementIds'],
            additionalProperties: false,
          },
        },
        required: [
          'expectedCaseRevision',
          'type',
          'assignmentId',
          'occurredAt',
          'reason',
          'evidenceIds',
          'confirmationIds',
          'payload',
        ],
        additionalProperties: false,
      },
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          expectedCaseRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          type: {
            type: 'string',
            const: 'RECORD_EXCEPTION',
          },
          assignmentId: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
          },
          expectedExecutionRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          occurredAt: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
          },
          reason: {
            type: 'string',
            minLength: 3,
            maxLength: 2000,
          },
          evidenceIds: {
            default: [],
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          confirmationIds: {
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          payload: {
            type: 'object',
            properties: {
              obligationId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
              exceptionType: {
                type: 'string',
                enum: ['WAIVER', 'COMPENSATION', 'LOSS'],
              },
              coveredAmount: {
                type: 'string',
                pattern: '^(0|[1-9][0-9]{0,11})\\.[0-9]{2}$',
              },
              authorizationEvidenceId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
              counterpartyConfirmationIds: {
                maxItems: 20,
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
                },
              },
            },
            required: [
              'obligationId',
              'exceptionType',
              'coveredAmount',
              'authorizationEvidenceId',
              'counterpartyConfirmationIds',
            ],
            additionalProperties: false,
          },
        },
        required: [
          'expectedCaseRevision',
          'type',
          'assignmentId',
          'occurredAt',
          'reason',
          'evidenceIds',
          'confirmationIds',
          'payload',
        ],
        additionalProperties: false,
      },
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          expectedCaseRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          type: {
            type: 'string',
            const: 'LIFT_RESTRICTION',
          },
          assignmentId: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
          },
          expectedExecutionRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          occurredAt: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
          },
          reason: {
            type: 'string',
            minLength: 3,
            maxLength: 2000,
          },
          evidenceIds: {
            default: [],
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          confirmationIds: {
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          payload: {
            type: 'object',
            properties: {
              restrictionId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
              basisResolutionId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
            },
            required: ['restrictionId', 'basisResolutionId'],
            additionalProperties: false,
          },
        },
        required: [
          'expectedCaseRevision',
          'type',
          'assignmentId',
          'occurredAt',
          'reason',
          'evidenceIds',
          'confirmationIds',
          'payload',
        ],
        additionalProperties: false,
      },
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          expectedCaseRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          type: {
            type: 'string',
            const: 'RETRACT_EVIDENCE',
          },
          assignmentId: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
          },
          expectedExecutionRevision: {
            type: 'string',
            pattern: '^(0|[1-9][0-9]{0,18})$',
          },
          occurredAt: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$',
          },
          reason: {
            type: 'string',
            minLength: 3,
            maxLength: 2000,
          },
          evidenceIds: {
            default: [],
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          confirmationIds: {
            maxItems: 20,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
            },
          },
          payload: {
            type: 'object',
            properties: {
              evidenceId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
              },
              reason: {
                type: 'string',
                minLength: 3,
                maxLength: 2000,
              },
            },
            required: ['evidenceId', 'reason'],
            additionalProperties: false,
          },
        },
        required: [
          'expectedCaseRevision',
          'type',
          'assignmentId',
          'occurredAt',
          'reason',
          'evidenceIds',
          'confirmationIds',
          'payload',
        ],
        additionalProperties: false,
      },
    ],
  },
  REVIEW: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      expectedProposalRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      snapshotHash: {
        type: 'string',
        pattern: '^[a-f0-9]{64}$',
      },
      decision: {
        type: 'string',
        enum: ['APPROVE', 'REJECT', 'REVOKE'],
      },
      reason: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
      },
    },
    required: [
      'expectedCaseRevision',
      'expectedProposalRevision',
      'snapshotHash',
      'decision',
      'reason',
    ],
    additionalProperties: false,
  },
  CANCEL_PROPOSAL: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      expectedProposalRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      reason: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
      },
    },
    required: ['expectedCaseRevision', 'expectedProposalRevision', 'reason'],
    additionalProperties: false,
  },
  APPLY: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      expectedProposalRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      snapshotHash: {
        type: 'string',
        pattern: '^[a-f0-9]{64}$',
      },
    },
    required: [
      'expectedCaseRevision',
      'expectedProposalRevision',
      'snapshotHash',
    ],
    additionalProperties: false,
  },
  CLOSE: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      reason: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
      },
    },
    required: ['expectedCaseRevision', 'reason'],
    additionalProperties: false,
  },
  REOPEN: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      reason: {
        type: 'string',
        minLength: 3,
        maxLength: 2000,
      },
      dimension: {
        type: 'string',
        enum: ['OPERATIONAL', 'ECONOMIC', 'BOTH'],
      },
      evidenceIds: {
        default: [],
        maxItems: 20,
        type: 'array',
        items: {
          type: 'string',
          format: 'uuid',
          pattern:
            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',
        },
      },
    },
    required: ['expectedCaseRevision', 'reason', 'dimension', 'evidenceIds'],
    additionalProperties: false,
  },
  UPLOAD_EVIDENCE: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      expectedCaseRevision: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]{0,18})$',
      },
      mime: {
        type: 'string',
        enum: ['image/jpeg', 'image/png'],
      },
      bytes: {
        type: 'integer',
        minimum: 1,
        maximum: 5242880,
      },
      sha256: {
        type: 'string',
        pattern: '^[a-f0-9]{64}$',
      },
    },
    required: ['expectedCaseRevision', 'mime', 'bytes', 'sha256'],
    additionalProperties: false,
  },
}
export const commandRoutes = {
  CREATE: '',
  CONTRIBUTE: '/{id}/contributions',
  REGISTER_PARTY: '/{id}/parties',
  VERIFY_IDENTITY: '/{id}/identity-verifications',
  RECORD_EVIDENCE: '/{id}/evidence',
  CONFIRM: '/{id}/confirmations',
  REVOKE_SESSIONS: '/{id}/session-revocations',
  RESTRICT: '/{id}/restrictions',
  RECORD_OBLIGATION: '/{id}/obligations',
  DECLARE_MOVEMENT: '/{id}/movement-declarations',
  DISPUTE: '/{id}/disputes',
  PROPOSE: '/{id}/proposals',
  REVIEW: '/{id}/proposals/{p}/reviews',
  CANCEL_PROPOSAL: '/{id}/proposals/{p}/cancel',
  APPLY: '/{id}/proposals/{p}/apply',
  CLOSE: '/{id}/close',
  REOPEN: '/{id}/reopen',
  UPLOAD_EVIDENCE: '/{id}/evidence-uploads',
} as const
