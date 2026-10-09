/** Human/shared contract from Backend V1.18 OpenAPI; never exported to the B2B portal. */
export interface LocationView {
  publicId: string
  progress: {
    publicVersion: string
    status: string
    trackingMode: 'LEGACY' | 'DETAILED' | null
    assignmentState: 'ACTIVE' | 'ENDED' | 'NONE'
    phase: string | null
    attentionRequired: boolean
    terminalOutcome: { type: string; occurredAt: string } | null
  }
  location: {
    locationVersion: string
    assignmentGeneration: string
    availability: 'AVAILABLE' | 'UNAVAILABLE'
    unavailableReason: string | null
    sample: {
      latitude: number
      longitude: number
      accuracyMeters: number
      capturedAt: string
      receivedAt: string
      freshUntil: string
      eraseAfter: string
    } | null
  }
  observation: {
    evaluatedAt: string
    freshness: 'RECENT' | 'STALE' | 'UNAVAILABLE'
  }
}
export interface LinkMetadata {
  linkRevision: string
  linkId: string | null
  status: 'NONE' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'TERMINAL'
  createdAt: string | null
  expiresAt: string | null
  terminalAccessUntil: string | null
}
export interface LinkReceipt extends LinkMetadata {
  secretAvailable?: boolean
  url?: string
}
export interface LinkAttempt {
  state:
    | 'APPLIED_SECRET_UNAVAILABLE'
    | 'APPLIED_REVOKED'
    | 'PENDING_OR_UNKNOWN'
    | 'SUPERSEDED'
  linkRevision: string
  currentLinkId: string | null
  secretAvailable: false
}
export interface LinkMarker {
  actor: string
  publicId: string
  operation: 'ISSUE' | 'REVOKE'
  key: string
  expectedLinkRevision: string
}
