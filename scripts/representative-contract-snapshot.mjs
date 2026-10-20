import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
export const backendRoot = 'C:/Users/zorgl/Documents/mandaria-backend'
export const contractFiles = [
  'docs/FLEET-REPRESENTATIVE-PRIVATE-DOCUMENTS-IMPLEMENTATION.md',
  'docs/FLEET-REPRESENTATIVE-PRIVATE-DOCUMENTS-DESIGN.md',
  'docs/DOCUMENTARY-TEXTS-OWNER-REVIEW-2026-10-19.md',
  'docs/checks/fleet-representative-evidence.json',
  'docs/openapi.json',
  'prisma/schema.prisma',
  'prisma/migrations/20261019000200_fleet_representative_verification/migration.sql',
  'src/verification/representative.dto.ts',
  'src/verification/representative-rules.ts',
  'src/verification/representative-retention.ts',
  'src/verification/verification.controller.ts',
  'src/verification/verification.dto.ts',
  'src/verification/verification.responses.ts',
  'src/verification/verification.service.ts',
  'src/verification/verification-rules.ts',
  'src/verification/verification-storage.ts',
  'src/verification/deletion.service.ts',
  'src/verification/document-recovery.ts',
  'src/verification/recovery-v2.ts',
  'test/fleet-representative.e2e-spec.ts',
  'test/representative-recovery.e2e-spec.ts',
  'scripts/verify-fleet-representative.mjs',
  'dist/verification/verification.service.js',
  'dist/verification/verification.controller.js',
  'dist/verification/representative-rules.js',
  'dist/verification/representative.dto.js',
]
export async function contractSnapshot() {
  return Object.fromEntries(
    await Promise.all(
      contractFiles.map(async (file) => [
        file,
        createHash('sha256')
          .update(await readFile(backendRoot + '/' + file))
          .digest('hex'),
      ]),
    ),
  )
}
