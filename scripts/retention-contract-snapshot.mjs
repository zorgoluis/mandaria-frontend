import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
export const backendRoot = 'C:/Users/zorgl/Documents/mandaria-backend'
export const backendFiles = [
  'docs/DOCUMENTARY-IMAGE-RETENTION-IMPLEMENTATION.md',
  'docs/checks/image-retention-evidence.json',
  'docs/openapi.json',
  'prisma/schema.prisma',
  'prisma/migrations/20261020000100_document_image_retention/migration.sql',
  'src/config/environment.ts',
  'src/verification/image-retention.ts',
  'src/verification/verification.service.ts',
  'src/verification/verification.controller.ts',
  'src/verification/verification.dto.ts',
  'src/verification/verification.responses.ts',
  'src/verification/deletion.service.ts',
  'src/verification/deletion.controller.ts',
  'src/verification/deletion.dto.ts',
  'src/verification/deletion.responses.ts',
  'src/verification/deletion-command-receipt.ts',
  'src/verification/deletion-worker.ts',
  'src/verification/recovery-v2.ts',
  'src/mail/mail-templates.ts',
  'test/image-retention.e2e-spec.ts',
  'dist/verification/image-retention.js',
  'dist/verification/verification.service.js',
  'dist/verification/verification.controller.js',
  'dist/verification/deletion.service.js',
  'dist/verification/deletion.dto.js',
  'dist/verification/deletion-worker.js',
  'dist/mail/mail-templates.js',
]
export async function hashes(root, files) {
  return Object.fromEntries(
    await Promise.all(
      files.map(async (f) => [
        f,
        createHash('sha256')
          .update(await readFile(root + '/' + f))
          .digest('hex'),
      ]),
    ),
  )
}
export const backendSnapshot = () => hashes(backendRoot, backendFiles)
