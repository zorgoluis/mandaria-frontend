/* global process, console, URL, fetch */
// Run with tsx. Isolated synthetic cluster only; never loads .env or writes Web.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync, fork } from 'node:child_process';
import { root, web, work, database, pgPort, apiPort, requireBackend, loadSource, prepareDatabase, stopDatabase } from './deletion-isolated-environment.mjs';
import { startBrowser } from './deletion-isolated-browser.mjs';
requireBackend('reflect-metadata');
const {PrismaClient}=requireBackend('@prisma/client');
const {Test}=requireBackend('@nestjs/testing');
const {Logger}=requireBackend('@nestjs/common');
const argon2=requireBackend('argon2');
const {DeletionStorageDouble}=await loadSource('test/helpers/deletion-storage-double.ts');
const {ensureTestCreditPolicies}=await loadSource('test/support/credit-policies.ts');
const {fundForAward}=await loadSource('test/support/credits.ts');
await prepareDatabase();
const db=new PrismaClient({datasourceUrl:database});
const report = {
  scenarios: {},
  hashes: [],
  requests: [],
  fixtures: [
    'Synthetic users/provider/independent profile/vehicle and credit policies seeded; documentary policy default preserved',
    'Pricing, B2B request/quote/accept and independent take via real HTTP',
    'No manual command deletion or retention date changes',
  ],
  externalServices: false,
  productChanges: false,
};
const stage = (s) => {
  report.stage = s;
  console.log(s);
  void writeFile(join(work,'progress.json'),JSON.stringify({stage:s},null,2));
};
const load = (p) => import(pathToFileURL(join(root, 'dist', p)).href);
const password = randomBytes(24).toString('hex');
let app, browser, dropRequestId, droppedKey;
let adminPosts=0, deliverPosts=0;
let clock = new Date();
const capturedMail = [];
Logger.overrideLogger(false);
Object.assign(process.env, {
  DATABASE_URL: database,
  NODE_ENV: 'test',
  JWT_ACCESS_SECRET: randomBytes(48).toString('hex'),
  JWT_REFRESH_SECRET: randomBytes(48).toString('hex'),
  INTEGRATION_JWT_SECRET: randomBytes(48).toString('hex'),
  JWT_ACCESS_EXPIRES_IN: '3600',
  JWT_REFRESH_EXPIRES_IN: '7200',
  INTEGRATION_ACCESS_TOKEN_EXPIRES_IN: '3600',
  DOCUMENT_DELETION_LOCAL_ENABLED: 'true',
  DRIVER_VERIFICATION_LOCAL_ENABLED: 'true',
  MAIL_PROVIDER: 'local_outbox',
  CORS_ORIGINS: 'http://127.0.0.1:4218',
  DISPATCH_TTL_MINUTES: '60',
  LOCAL_DELIVERY_ASSIGNMENT_TTL_MINUTES: '5',
});
const sourceFiles = [
  'src/auth/auth.guards.ts',
  'src/auth/auth.controller.ts',
  'src/users/users.service.ts',
  'src/verification/deletion.service.ts',
  'src/verification/deletion-command-receipt.ts',
  'src/independent-drivers/independent-dispatches.service.ts',
  'src/deliveries/delivery-completion.ts',
  'src/drivers/drivers.service.ts',
  'dist/auth/auth.guards.js',
  'dist/verification/deletion.service.js',
  'dist/independent-drivers/independent-dispatches.service.js',
  'docs/openapi.json',
  'scripts/verify-deletion-final-contract.mjs',
  'scripts/verify-deletion-final-browser.mjs',
];
async function fingerprint(base, files) {
  return Promise.all(
    files.map(async (file) => ({
      file,
      sha256: createHash('sha256')
        .update(await readFile(join(base, file)))
        .digest('hex'),
    })),
  );
}
const webFiles = [
  'src/deletion/ActiveService.tsx',
  'src/deletion/pages.tsx',
  'src/deletion/pending.ts',
  'src/deletion/service.ts',
  'src/auth/session.ts',
  'src/services/api.ts',
  'src/app/App.tsx',
];
async function api(method, path, token, body, status = 200, key) {
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(key ? { 'Idempotency-Key': key } : {}),
  };
  const r = await fetch(`http://127.0.0.1:4217/api/v1${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await r.json();
  report.requests.push({
    method,
    path: path.replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/g, ':uuid'),
    status: r.status,
  });
  if (r.status !== status)
    throw Error(
      `${method} ${path.split('?')[0]} expected ${status}, got ${r.status} ${json.code ?? ''}`,
    );
  return json;
}
const receiptPath = (id, key) =>
  `/admin/privacy/deletion-requests/${id}/commands/by-key/${key}`;
try {
  stage('preflight');
  const [identity] =
    await db.$queryRaw`SELECT current_database() AS db, host(inet_server_addr()) AS host, inet_server_port() AS port, current_setting('data_directory') AS dir`;
  assert.equal(
    identity.dir.replaceAll('\\', '/'),
    join(work, 'pgdata').replaceAll('\\', '/'),
  );
  assert.equal(identity.host, '127.0.0.1');
  assert.equal(identity.port, pgPort);
  report.database = identity.db;
  report.cluster = identity.dir;
  report.backend = {
    head: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim(),
    branch: execFileSync('git', ['branch', '--show-current'], {
      cwd: root,
      encoding: 'utf8',
    }).trim(),
    uncommitted: true,
  };
  report.web = {
    head: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: web,
      encoding: 'utf8',
    }).trim(),
    uncommitted: true,
  };
  report.hashes = await fingerprint(root, sourceFiles);
  report.webHashes = await fingerprint(web, webFiles);
  // AppModule ConfigModule reads cwd: isolate it from all existing dotenv files.
  process.chdir(work);
  const { AppModule } = await load('app.module.js');
  const { setup } = await load('setup.js');
  const { ROUTING_PROVIDER } = await load('routing/routing.types.js');
  const { MAIL_PROVIDER } = await load('mail/mail.types.js');
  const { DELETION_STORAGE, DELETION_CLOCK } = await load(
    'verification/deletion-policy.js',
  );
  const { DocumentDeletionWorker } = await load(
    'verification/deletion-worker.js',
  );
  const { DocumentDeletionService } = await load(
    'verification/deletion.service.js',
  );
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ROUTING_PROVIDER)
    .useValue({
      name: 'fake',
      async calculateRoute() {
        return {
          distanceMeters: 4200,
          durationSeconds: 700,
          routingProvider: 'fake',
          calculatedAt: new Date(),
        };
      },
    })
    .overrideProvider(MAIL_PROVIDER)
    .useValue({
      name: 'fake',
      async sendUserInvitation() {},
      async sendPartnerApplicationNotice() {},
      async sendDocumentDeletion(m) {
        capturedMail.push(m);
      },
    })
    .overrideProvider(DELETION_STORAGE)
    .useValue(new DeletionStorageDouble())
    .overrideProvider(DELETION_CLOCK)
    .useValue(() => clock)
    // Only the timer is omitted. Real finalize/maintenance are invoked explicitly below.
    .overrideProvider(DocumentDeletionWorker)
    .useValue({})
    .compile();
  app = module.createNestApplication({ logger: false, bodyParser: false });
  setup(app);
  app.use((req,res,next)=>{
    if(req.method==='POST' && req.url.endsWith('/deliver')) deliverPosts++;
    if(req.method==='POST' && dropRequestId && req.url.endsWith('/'+dropRequestId+'/resolve')) {
      adminPosts++;
      const original=res.json.bind(res);
      res.json=(body)=>{
        if(res.statusCode===200 && !droppedKey){
          droppedKey=req.headers['idempotency-key'];
          void db.documentDeletionCommand.count({where:{requestId:dropRequestId,key:droppedKey}}).then(count=>{
            report.postCommit={verifiedBeforeDrop:count===1,commands:count};
            res.destroy();
          });
          return res;
        }
        return original(body);
      };
    }
    next();
  });
  await app.listen(apiPort, '127.0.0.1');
  browser=await startBrowser(report);
  await writeFile(join(work,'preflight.json'),JSON.stringify({status:'PASS',smoke:report.browserSmoke},null,2));
  const deletion = app.get(DocumentDeletionService);
  const hash = await argon2.hash(password);
  const user = async (role) =>
    db.user.create({
      data: {
        email: `${randomUUID()}@example.test`,
        passwordHash: hash,
        role,
        emailVerifiedAt: new Date(),
      },
    });
  const admin = await user('SUPER_ADMIN'),
    other = await user('SUPER_ADMIN'),
    subject = await user('DRIVER'),
    driverUser = await user('DRIVER');
  const login = async (u) =>
    (await api('POST', '/auth/login', null, { email: u.email, password }))
      .accessToken;
  const { AuthService } = await load('auth/auth.service.js');
  const a = (await app.get(AuthService).login(admin.email, password))
      .accessToken,
    b = (await app.get(AuthService).login(other.email, password)).accessToken,
    old = await login(driverUser);
  stage('receipt-real-maintenance');
  const r = await api(
    'POST',
    '/privacy/deletion-requests',
    a,
    { scope: 'ACCOUNT', subjectUserId: subject.id, acknowledgment: true },
    202,
    randomUUID(),
  );
  const adminPage=await browser.context();
  dropRequestId=r.id;
  await browser.adminDecision(adminPage,r.id,admin.email,password);
  const key=droppedKey;
  assert.ok(key);
  assert.equal(report.postCommit.verifiedBeforeDrop,true);
  const markerBefore=await browser.markers(adminPage);
  assert.equal(markerBefore.length,1);
  assert.equal(markerBefore[0].key,key);
  assert.equal(markerBefore[0].accepted,undefined);
  assert.equal(
    await db.documentDeletionCommand.count({ where: { requestId: r.id, key } }),
    1,
  );
  const before = await api('GET', receiptPath(r.id, key), a);
  const foreign = await api('GET', receiptPath(r.id, key), b, undefined, 404);
  assert.equal(foreign.code, 'COMMAND_RECEIPT_UNAVAILABLE');
  assert.equal(await deletion.finalize(r.id), true); // Empty documentary inventory, no service: real H.
  const closed = await db.documentDeletion.findUniqueOrThrow({
    where: { id: r.id },
  });
  assert.ok(closed.closedAt);
  assert.equal(+closed.auditUntil - +closed.closedAt, 30 * 86400000);
  clock = new Date(+closed.auditUntil - 1);
  await deletion.maintenance();
  assert.equal(
    await db.documentDeletionCommand.count({ where: { requestId: r.id, key } }),
    1,
  );
  for (let i = 0; i < 2; i++)
    assert.deepEqual(await api('GET', receiptPath(r.id, key), a), before);
  assert.equal(
    +(await db.documentDeletion.findUniqueOrThrow({ where: { id: r.id } }))
      .auditUntil,
    +closed.auditUntil,
  );
  clock = new Date(+closed.auditUntil);
  await deletion.maintenance();
  const minimized = await db.documentDeletion.findUniqueOrThrow({
    where: { id: r.id },
  });
  assert.equal(minimized.status, 'PURGED');
  assert.equal(minimized.contact, null);
  assert.equal(minimized.evidenceRef, null);
  assert.equal(minimized.subjectUserId, null);
  assert.equal(
    await db.documentDeletionCommand.count({ where: { requestId: r.id } }),
    0,
  );
  assert.equal(
    await db.documentDeletionEvent.count({ where: { requestId: r.id } }),
    0,
  );
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: subject.id } })).active,
    false,
  );
  const gates = await db.documentDeletionGate.count({
    where: { requestId: r.id, active: true },
  });
  assert.ok(gates > 0);
  const unavailable = await api(
    'GET',
    receiptPath(r.id, key),
    a,
    undefined,
    404,
  );
  const missing = await api(
    'GET',
    receiptPath(r.id, randomUUID()),
    a,
    undefined,
    404,
  );
  assert.equal(unavailable.code, missing.code);
  assert.equal(unavailable.message, foreign.message);
  await deletion.maintenance();
  assert.deepEqual(
    await db.documentDeletion.findUniqueOrThrow({ where: { id: r.id } }),
    minimized,
  );
  assert.equal(
    await db.documentDeletionGate.count({
      where: { requestId: r.id, active: true },
    }),
    gates,
  );
  report.scenarios.purge = {
    status: 'PASS',
    commandsBefore: 1,
    commandsAfter: 0,
    eventsAfter: 0,
    gateCount: gates,
    accountActive: false,
    requestStatus: 'PURGED',
    auditWindowDays: 30,
    beforeExpiryPreserved: true,
    repeatMaintenanceIdempotent: true,
    absenceCode: unavailable.code,
  };

  report.scenarios.purge.browserMessage=await browser.purged(adminPage);
  assert.deepEqual(await browser.markers(adminPage),markerBefore);
  assert.equal(adminPosts,1);
  report.scenarios.purge.browser={status:'PASS',adminPosts,markerPreserved:true,sessionPreserved:true};
  await adminPage.context().close();
  await writeFile(join(work,'purge-result.json'),JSON.stringify(report,null,2));
  stage('service-real-http-setup');
  clock = new Date();
  await ensureTestCreditPolicies(db);
  const provider = await db.deliveryProvider.create({
    data: {
      name: 'Synthetic final check',
      code: randomUUID(),
      type: 'FLEET',
      status: 'ACTIVE',
      maxDrivers: 10,
      maxVehicles: 10,
    },
  });
  const driver = await db.driver.create({
    data: {
      providerId: provider.id,
      userId: driverUser.id,
      name: 'Synthetic final driver',
      status: 'ACTIVE',
      availability: 'AVAILABLE',
    },
  });
  await api('POST', `/admin/drivers/${driver.id}/independent`, a, {
    reason: 'Synthetic precondition',
  });
  const profile = await db.independentDriverProfile.findUniqueOrThrow({
    where: { driverId: driver.id },
  });
  const vehicle = await db.vehicle.create({
    data: {
      independentDriverProfileId: profile.id,
      identifier: randomUUID().slice(0, 8).toUpperCase(),
      type: 'BICYCLE',
      status: 'ACTIVE',
    },
  });
  const zone = await api(
    'POST',
    '/admin/service-zones',
    a,
    {
      code: 'FINAL_' + randomUUID().slice(0, 8).toUpperCase(),
      name: 'Synthetic zone',
      currency: 'MXN',
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [-96.5, 19.5],
            [-96.4, 19.5],
            [-96.4, 19.6],
            [-96.5, 19.6],
            [-96.5, 19.5],
          ],
        ],
      },
    },
    201,
  );
  await api('POST', `/admin/service-zones/${zone.id}/activate`, a, undefined);
  const plan = await api(
    'POST',
    '/admin/rate-plans',
    a,
    {
      serviceZoneId: zone.id,
      serviceType: 'LOCAL_DELIVERY',
      quoteValidityMinutes: 60,
      bands: [
        { minDistanceMeters: 0, maxDistanceMeters: 100000, amount: '60' },
      ],
    },
    201,
  );
  await api('POST', `/admin/rate-plans/${plan.id}/activate`, a);
  await api(
    'POST',
    `/admin/providers/${provider.id}/service-coverages`,
    a,
    { serviceZoneId: zone.id, serviceType: 'LOCAL_DELIVERY' },
    201,
  );
  const integration = await api(
    'POST',
    '/admin/integrations',
    a,
    {
      name: 'Synthetic final',
      code: 'FINAL_' + randomUUID().slice(0, 8).toUpperCase(),
    },
    201,
  );
  const credential = await api(
    'POST',
    `/admin/integrations/${integration.id}/credentials`,
    a,
    {
      scopes: [
        'deliveries:create',
        'deliveries:read',
        'quotes:create',
        'quotes:read',
        'quotes:accept',
      ],
    },
    201,
  );
  const b2b = (
    await api('POST', '/integrations/token', null, {
      clientId: credential.clientId,
      clientSecret: credential.clientSecret,
    })
  ).accessToken;
  async function open() {
    const stops = ['PICKUP', 'DROPOFF'].map((type, i) => ({
      type,
      sequence: i + 1,
      address: `Synthetic stop ${i}`,
      latitude: 19.52 + i * 0.02,
      longitude: -96.48 + i * 0.02,
      contactName: 'Synthetic',
      contactPhone: '9614443322',
    }));
    const req = await api(
      'POST',
      '/delivery-requests',
      b2b,
      {
        externalReference: 'FINAL_' + randomUUID(),
        stops,
        packages: [
          { category: 'FOOD', description: 'Synthetic food', quantity: 1 },
        ],
        financialContext: {
          goodsValue: '80.00',
          goodsPaymentMode: 'COURIER_ADVANCE',
          currency: 'MXN',
        },
      },
      201,
      randomUUID(),
    );
    const quote = await api(
      'POST',
      `/delivery-requests/${req.publicId}/quotes`,
      b2b,
      undefined,
      201,
    );
    await api('POST', `/delivery-quotes/${quote.publicId}/accept`, b2b);
    return db.dispatch.findFirstOrThrow({
      where: { deliveryQuote: { publicId: quote.publicId } },
    });
  }
  const dispatch = await open(),
    second = await open();
  await fundForAward(db, dispatch.id, { driverId: driver.id });
  await api('POST', `/driver/dispatches/${dispatch.id}/take`, old, {
    vehicleId: vehicle.id,
  });
  const assignment = await db.deliveryAssignment.findFirstOrThrow({
    where: { dispatchId: dispatch.id, status: 'ACTIVE' },
  });
  assert.equal(assignment.mode, 'INDEPENDENT');
  const ledgerBefore = await db.creditLedgerEntry.findMany({
    where: { referenceType: 'DISPATCH', referenceId: dispatch.id },
    orderBy: { id: 'asc' },
  });
  assert.equal(
    ledgerBefore.filter((x) => x.type === 'SERVICE_AWARD').length,
    1,
  );
  // A pending document fixture makes non-finalization of H observable; no image bytes or writer simulated as complete.
  const verificationSubject = await db.verificationSubject.create({
    data: { driverId: driver.id, independentProfileId: profile.id },
  });
  const verificationCase = await db.verificationCase.create({
    data: { subjectId: verificationSubject.id, presenterId: driverUser.id },
  });
  const attachmentId = randomUUID();
  await db.verificationAttachment.create({
    data: {
      id: attachmentId,
      caseId: verificationCase.id,
      category: 'FACE_PHOTO',
      quarantineKey: `verification/v1/quarantine/${attachmentId}/source`,
      objectKey: `verification/v1/providers/${provider.id}/${verificationCase.id}/${attachmentId}/original`,
      expiresAt: new Date(Date.now() + 300000),
    },
  });
  clock = new Date();
  stage('browser-account-closure');
  const driverPage=await browser.context();
  const closure=await browser.accountClosure(driverPage,dispatch.id,driverUser.email,password);
  await api('GET', '/auth/me?projection=session', old, undefined, 401);
  const fresh = await login(driverUser);
  const restricted = await api('GET', '/auth/me?projection=session', fresh);
  assert.deepEqual(restricted, {
    accessMode: 'DELETION_RESTRICTED',
    identity: { id: driverUser.id },
    capabilities: { deletionFollowUp: true, activeDeliveryResolution: true },
  });
  const gateBefore = await db.documentDeletionGate.findMany({
    where: { requestId: closure.id },
    orderBy: { id: 'asc' },
  });
  assert.ok(gateBefore.some((g) => g.kind === 'USER' && g.active));
  await api('GET', `/driver/dispatches/${dispatch.id}`, fresh);
  await api(
    'POST',
    `/driver/dispatches/${second.id}/take`,
    fresh,
    { vehicleId: vehicle.id },
    403,
  );
  await api(
    'POST',
    `/driver/dispatches/${second.id}/deliver`,
    fresh,
    undefined,
    403,
  );
  await api(
    'GET',
    `/verification-cases/${verificationCase.id}/attachments`,
    fresh,
    undefined,
    403,
  );

  stage('browser-legacy-delivery');
  const finalMessage=await browser.deliver(driverPage,dispatch.id);
  assert.equal((await db.dispatch.findUniqueOrThrow({where:{id:dispatch.id}})).status,'DELIVERED');
  const finalAssignment = await db.deliveryAssignment.findUniqueOrThrow({
    where: { id: assignment.id },
  });
  assert.equal(finalAssignment.status, 'COMPLETED');
  const outbox = await db.b2bOutboxEvent.count({
    where: { dispatchId: dispatch.id, type: 'DELIVERY_COMPLETED' },
  });
  assert.equal(outbox, 1);
  assert.deepEqual(
    await db.creditLedgerEntry.findMany({
      where: { referenceType: 'DISPATCH', referenceId: dispatch.id },
      orderBy: { id: 'asc' },
    }),
    ledgerBefore,
  );
  // Existing restricted allowlist ceases to admit deliver after ACTIVE ends; no new logistics replay is invented.
  await api(
    'POST',
    `/driver/dispatches/${dispatch.id}/deliver`,
    fresh,
    undefined,
    403,
  );
  assert.equal(
    await db.b2bOutboxEvent.count({
      where: { dispatchId: dispatch.id, type: 'DELIVERY_COMPLETED' },
    }),
    1,
  );
  const after = await api('GET', '/auth/me?projection=session', fresh);
  assert.equal(after.capabilities.activeDeliveryResolution, false);
  await api(
    'POST',
    `/driver/dispatches/${second.id}/take`,
    fresh,
    { vehicleId: vehicle.id },
    403,
  );
  await api(
    'GET',
    `/verification-cases/${verificationCase.id}/attachments`,
    fresh,
    undefined,
    403,
  );
  const state = await api(
    'GET',
    `/privacy/deletion-requests/${closure.id}`,
    fresh,
  );
  assert.equal(state.closedAt, null);
  assert.equal(state.deadline, closure.deadline);
  await api(
    'GET',
    `/privacy/deletion-requests/${closure.id}/receipt`,
    fresh,
    undefined,
    409,
  );
  assert.deepEqual(
    await db.documentDeletionGate.findMany({
      where: { requestId: closure.id },
      orderBy: { id: 'asc' },
    }),
    gateBefore,
  );
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: driverUser.id } })).active,
    true,
  );
  report.scenarios.service = {
    status: 'PASS',
    browser: true,
    visibleAfterReload: finalMessage,
    tracking: 'LEGACY',
    assignment: 'COMPLETED',
    dispatch: 'DELIVERED',
    deliverPosts,
    completionOutbox: outbox,
    awardCount: 1,
    refundCount: 0,
    closureH: null,
    deadlinesPreserved: true,
    gatesPreserved: true,
    repeatDeliver: 403,
  };

  assert.deepEqual(await fingerprint(web, webFiles), report.webHashes);
  await driverPage.goto(browser.origin+'/privacy/deletion/'+closure.id);
  await browser.viewports(driverPage,'follow-up-after-delivery');
  report.scenarios.service.followUpVisible=await driverPage.locator('main').innerText();
  report.scenarios.service.browserDeliverPosts=1;
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.failure = {
    stage: report.stage,
    type: error.name,
    message: String(error.message).slice(0, 800),
  };
  console.error(
    'Scenario failed at ' + report.stage + '; inspect sanitized evidence',
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
  await app?.close();
  await db.$disconnect();
  process.chdir(web);
  report.cleanup={postgresStopped:await stopDatabase(),browserClosed:true,backendClosed:true};
  report.backendUnchanged=JSON.stringify(await fingerprint(root,sourceFiles))===JSON.stringify(report.hashes);
  await writeFile(
    join(work, 'result.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  await writeFile(
    join(work, 'attempt-' + Date.now() + '.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
}
