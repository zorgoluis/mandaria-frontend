// Real application composition; synthetic configuration and transport boundaries only.
import assert from 'node:assert/strict'
import { Socket } from 'node:net'
import { Readable } from 'node:stream'
import {
  requireBackend,
  loadSource,
  database,
  apiPort,
  resumeRun,
} from './retention-isolated-environment.mjs'

export async function startBackend() {
  requireBackend('reflect-metadata')
  const { PrismaClient } = requireBackend('@prisma/client')
  const { ConfigModule, ConfigService } = requireBackend('@nestjs/config')
  const { Test } = requireBackend('@nestjs/testing')
  const { NodeHttpHandler } = requireBackend('@smithy/node-http-handler')
  const originalEnv = { ...process.env }
  process.env.NODE_ENV = 'production'
  process.env.DATABASE_URL = database
  delete process.env.DOCUMENT_RESTORE_PIN_PATH
  const bucket = 'synthetic-production-documents'
  const config = {
    NODE_ENV: 'production',
    DATABASE_URL: database,
    DOCUMENT_DELETION_LOCAL_ENABLED: 'true',
    DOCUMENT_IMAGE_RETENTION_ENABLED: 'true',
    DOCUMENT_DELETION_STORAGE_MODE: 'SPACES',
    DRIVER_VERIFICATION_LOCAL_ENABLED: 'true',
    VERIFICATION_SPACES_ENDPOINT: 'https://nyc3.digitaloceanspaces.com',
    VERIFICATION_SPACES_BUCKET: bucket,
    VERIFICATION_SPACES_ACCESS_KEY: 'SYNTHETIC_ACCESS',
    VERIFICATION_SPACES_SECRET_KEY: 'synthetic-secret-only',
    JWT_ACCESS_SECRET: 'synthetic-access-'.repeat(3),
    JWT_REFRESH_SECRET: 'synthetic-refresh-'.repeat(3),
    INTEGRATION_JWT_SECRET: 'synthetic-integration-'.repeat(3),
    ROUTING_PROVIDER: 'google',
    GOOGLE_ROUTES_API_KEY: 'synthetic-google-config-only',
    MAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 'synthetic-resend-config-only',
    MAIL_FROM: 'Synthetic Mandaria <test@example.invalid>',
    MANDARIA_WEB_URL: 'https://example.invalid',
    B2B_WEBHOOK_SECRET_KEY: 'd'.repeat(64),
    B2B_WEBHOOK_POLL_SECONDS: '0',
    DISPATCH_SEARCH_POLL_SECONDS: '0',
  }
  const clock = { now: new Date('2027-04-01T00:00:00Z'), mailFail: false }
  const objects = new Map(),
    mail = [],
    storageCalls = []
  const forRoot = ConfigModule.forRoot,
    connect = Socket.prototype.connect,
    handle = NodeHttpHandler.prototype.handle,
    fetchOriginal = globalThis.fetch
  let app
  const db = new PrismaClient({ datasourceUrl: database })
  const close = async () => {
    await app?.close()
    await db.$disconnect()
    ConfigModule.forRoot = forRoot
    Socket.prototype.connect = connect
    NodeHttpHandler.prototype.handle = handle
    globalThis.fetch = fetchOriginal
    for (const k of Object.keys(process.env))
      if (!(k in originalEnv)) delete process.env[k]
    Object.assign(process.env, originalEnv)
  }
  try {
    Socket.prototype.connect = function (...args) {
      const first = Array.isArray(args[0]) ? args[0][0] : args[0]
      const options = typeof first === 'object' ? first : undefined
      const host =
        options?.host ?? (typeof args[1] === 'string' ? args[1] : 'localhost')
      assert(
        !options?.path && ['127.0.0.1', 'localhost', '::1'].includes(host),
        'EXTERNAL_NETWORK_FORBIDDEN',
      )
      return Reflect.apply(connect, this, args)
    }
    const storageHost = bucket + '.nyc3.digitaloceanspaces.com'
    NodeHttpHandler.prototype.handle = async function (req) {
      assert.equal(req.hostname, storageHost)
      const key = decodeURIComponent(req.path.slice(1))
      assert(key.startsWith('verification/v1/'))
      storageCalls.push(req.method)
      if (req.method === 'GET') {
        const b = objects.get(key)
        return {
          response: {
            statusCode: b ? 200 : 404,
            headers: b
              ? {
                  'content-length': String(b.length),
                  'content-type': 'image/png',
                }
              : {},
            body: Readable.from(b ? [b] : []),
          },
        }
      }
      assert.equal(req.method, 'PUT')
      assert.equal(req.headers['x-amz-acl'], 'private')
      const chunks = []
      if (req.body instanceof Uint8Array) chunks.push(Buffer.from(req.body))
      else for await (const chunk of req.body) chunks.push(Buffer.from(chunk))
      objects.set(key, Buffer.concat(chunks))
      deletionStorage.objects.set(key, {
        current: true,
        versions: [{ id: 'synthetic', marker: false }],
        uploads: [],
      })
      return {
        response: {
          statusCode: 200,
          headers: { etag: '"synthetic"' },
          body: Buffer.alloc(0),
        },
      }
    }
    globalThis.fetch = async (url, init) => {
      if (new URL(String(url)).hostname === '127.0.0.1')
        return fetchOriginal(url, init)
      assert.equal(String(url), 'https://api.resend.com/emails')
      const body = JSON.parse(String(init?.body))
      assert.equal(body.attachments, undefined)
      assert(
        [body.to].flat().every((to) => String(to).endsWith('@example.invalid')),
      )
      if (clock.mailFail)
        return Response.json(
          { message: 'Synthetic provider unavailable' },
          { status: 503 },
        )
      mail.push(body)
      return Response.json({ id: 'synthetic-mail' })
    }
    ConfigModule.forRoot = function (options) {
      const result = forRoot.call(this, {
        ...options,
        ignoreEnvFile: true,
        ignoreEnvVars: true,
        skipProcessEnv: true,
        validate: () => options.validate(config),
      })
      void result.catch(() => undefined)
      return result
    }
    const { AppModule } = await loadSource('dist/app.module.js')
    const { setup } = await loadSource('dist/setup.js')
    const { PrismaService } = await loadSource('dist/prisma/prisma.service.js')
    const { assertRecoveryAccess } = await loadSource(
      'dist/verification/recovery-access.js',
    )
    const { DELETION_STORAGE: deletionToken, DELETION_CLOCK } =
      await loadSource('dist/verification/deletion-policy.js')
    const { DeletionStorageDouble } = await loadSource(
      'test/helpers/deletion-storage-double.ts',
    )
    const deletionStorage = new DeletionStorageDouble()
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DELETION_CLOCK)
      .useValue(() => clock.now)
      .overrideProvider(deletionToken)
      .useValue(deletionStorage)
      .compile()
    app = module.createNestApplication({ logger: false })
    setup(app)
    await assertRecoveryAccess(app.get(PrismaService))
    await app.listen(apiPort, '127.0.0.1')
    const { DELETION_STORAGE } = await loadSource(
      'dist/verification/deletion-policy.js',
    )
    const { DocumentDeletionWorker } = await loadSource(
      'dist/verification/deletion-worker.js',
    )
    const { VERIFICATION_STORAGE, SpacesVerificationStorage } =
      await loadSource('dist/verification/verification-storage.js')
    const { MAIL_PROVIDER } = await loadSource('dist/mail/mail.types.js')
    const { ResendMailProvider } = await loadSource(
      'dist/mail/resend-mail.provider.js',
    )
    assert.equal(app.get(ConfigService).get('NODE_ENV'), 'production')
    assert.equal(app.get(DELETION_STORAGE).destination, 'synthetic-only')
    app.get(DocumentDeletionWorker).onModuleDestroy() // Own isolated worker: no background deletion campaign.
    assert(app.get(VERIFICATION_STORAGE) instanceof SpacesVerificationStorage)
    assert(app.get(MAIL_PROVIDER) instanceof ResendMailProvider)
    const password = 'Synthetic-Web-Password-Only!'
    const hash = await requireBackend('argon2').hash(password)
    const admin = resumeRun
      ? await db.user.findUniqueOrThrow({
          where: { email: 'admin@example.invalid' },
        })
      : await db.user.create({
          data: {
            email: 'admin@example.invalid',
            passwordHash: hash,
            role: 'SUPER_ADMIN',
            emailVerifiedAt: new Date(),
          },
        })
    const oldUser = resumeRun
      ? await db.user.findUniqueOrThrow({
          where: { email: 'history@example.invalid' },
        })
      : await db.user.create({
          data: {
            email: 'history@example.invalid',
            passwordHash: hash,
            role: 'DRIVER',
            emailVerifiedAt: new Date(),
          },
        })
    const oldDriver = resumeRun
      ? await db.driver.findFirstOrThrow({
          where: { userId: oldUser.id },
          include: { independentProfile: true },
        })
      : await db.driver.create({
          data: {
            userId: oldUser.id,
            name: 'Historia sintética',
            independentProfile: { create: {} },
          },
          include: { independentProfile: true },
        })
    const subject = resumeRun
      ? await db.verificationSubject.findFirstOrThrow({
          where: { driverId: oldDriver.id },
        })
      : await db.verificationSubject.create({
          data: {
            driverId: oldDriver.id,
            independentProfileId: oldDriver.independentProfile.id,
          },
        })
    const historicalCase = resumeRun
      ? await db.verificationCase.findFirstOrThrow({
          where: { subjectId: subject.id },
        })
      : await db.verificationCase.create({
          data: { subjectId: subject.id, presenterId: oldUser.id },
        })
    const png = await requireBackend('sharp')({
      create: { width: 12, height: 12, channels: 3, background: '#fcd' },
    })
      .png()
      .toBuffer()
    const jpeg = await requireBackend('sharp')(png).jpeg().toBuffer()
    return {
      db,
      clock,
      app,
      deletionStorage,
      close,
      password,
      admin,
      oldUser,
      historicalCase,
      objects,
      mail,
      storageCalls,
      storageHost,
      png,
      jpeg,
    }
  } catch (e) {
    await close()
    throw e
  }
}
