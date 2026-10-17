/* global process, console, URL, fetch */
// Receipt-only integration. Real isolated backend; never runs delivery or reads .env.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { expect } from '@playwright/test';
import { root, web, work, database, pgPort, apiPort, requireBackend, loadSource, prepareDatabase, stopDatabase } from './deletion-isolated-environment.mjs';
import { startBrowser } from './deletion-isolated-browser.mjs';
requireBackend('reflect-metadata');
const {PrismaClient}=requireBackend('@prisma/client');
const {Test}=requireBackend('@nestjs/testing');
const {Logger}=requireBackend('@nestjs/common');
const argon2=requireBackend('argon2');
const {DeletionStorageDouble}=await loadSource('test/helpers/deletion-storage-double.ts');
await prepareDatabase();
const db=new PrismaClient({datasourceUrl:database});
const report = {
  scenarios: {},
  hashes: [],
  requests: [],
  fixtures: [
    'Synthetic administrators and subject seeded; assisted ACCOUNT request created through auxiliary HTTP',
    'Identity decision exclusively through Web; no service or delivery fixtures',
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
const recoveryCalls=[];
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
  report.harnessHashes=await fingerprint(web,['scripts/verify-deletion-receipt-only.mjs','scripts/deletion-isolated-environment.mjs','scripts/deletion-isolated-browser.mjs','scripts/deletion-session-check.mjs']);
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
    if(req.method==='GET' && req.url.includes('/commands/by-key/')) recoveryCalls.push(req.url);
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
    subject = await user('DRIVER');
  const login = async (u) =>
    (await api('POST', '/auth/login', null, { email: u.email, password }))
      .accessToken;
  const { AuthService } = await load('auth/auth.service.js');
  const a = (await app.get(AuthService).login(admin.email, password))
      .accessToken,
    b = (await app.get(AuthService).login(other.email, password)).accessToken;
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
  assert.equal(markerBefore[0].actor,admin.id);
  assert.equal(markerBefore[0].op,'resolve'); assert.equal(markerBefore[0].id,r.id);
  const applied=await db.documentDeletion.findUniqueOrThrow({where:{id:r.id}});
  assert.ok(applied.confirmedAt);
  const decisionEvents=await db.documentDeletionEvent.count({where:{requestId:r.id,kind:'IDENTITY_AND_AUTHORITY_VERIFIED'}});
  const restrictedEvents=await db.documentDeletionEvent.count({where:{requestId:r.id,kind:'RESTRICTED'}});
  assert.equal(decisionEvents,1); assert.equal(restrictedEvents,1);
  assert.equal(await db.documentDeletionGate.count({where:{requestId:r.id,kind:'USER',active:true}}),1);
  report.originalEffect={commands:1,decisionEvents,restrictionEvents:restrictedEvents,userGates:1,confirmed:true,postCount:adminPosts};
  const before = await api('GET', receiptPath(r.id, key), a);
  const foreign = await api('GET', receiptPath(r.id, key), b, undefined, 404);
  assert.equal(foreign.code, 'COMMAND_RECEIPT_UNAVAILABLE');
  assert.equal(await deletion.finalize(r.id), true); // Empty documentary inventory, no service: real H.
  const closed = await db.documentDeletion.findUniqueOrThrow({
    where: { id: r.id },
  });
  assert.ok(closed.closedAt);
  assert.equal(+closed.auditUntil - +closed.closedAt, 30 * 86400000);
  report.clock={mechanism:'injected DELETION_CLOCK',closedAt:closed.closedAt,auditUntil:closed.auditUntil,beforeExpiry:new Date(+closed.auditUntil-1),atExpiry:closed.auditUntil,sqlDateUpdates:false,systemClockChanged:false};
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

  const recoveryCount=recoveryCalls.length;
  report.postsBeforeReload=adminPosts;
  report.scenarios.purge.browserMessage=await browser.purged(adminPage);
  assert.equal(recoveryCalls.length,recoveryCount+1);
  assert.equal(recoveryCalls.at(-1),'/api/v1'+receiptPath(r.id,key));
  report.recovery={method:'GET',status:404,code:'COMMAND_RECEIPT_UNAVAILABLE',originalKey:true,originalActor:true,originalOperation:'resolve',sameRequest:true};
  const consult=adminPage.getByRole('button',{name:'Consultar recibo administrativo',exact:true});
  await expect(consult).toBeEnabled(); await consult.focus(); await expect(consult).toBeFocused();
  await adminPage.keyboard.press('Tab'); await expect(consult).not.toBeFocused();
  await expect(adminPage.getByRole('button',{name:/cancelar|cerrar intento|reintentar/i})).toHaveCount(0);
  assert.deepEqual(await db.documentDeletion.findUniqueOrThrow({where:{id:r.id}}),minimized);
  assert.equal(await db.documentDeletionCommand.count({where:{requestId:r.id}}),0);
  assert.equal(await db.documentDeletionGate.count({where:{requestId:r.id,active:true}}),gates);
  assert.equal((await db.user.findUniqueOrThrow({where:{id:subject.id}})).active,false);
  report.postsAfterReload=adminPosts;
  assert.equal(deliverPosts,0); assert.equal(await db.deliveryAssignment.count(),0);
  report.deliveryNotRun=true; report.currentStateUnchangedByRecovery=true;

  assert.deepEqual(await browser.markers(adminPage),markerBefore);
  assert.equal(adminPosts,1);
  report.scenarios.purge.browser={status:'PASS',adminPosts,markerPreserved:true,sessionPreserved:true};
  await adminPage.context().close();
  await writeFile(join(work,'purge-result.json'),JSON.stringify(report,null,2));
  report.status='PASS';
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
  report.webUnchanged=JSON.stringify(await fingerprint(web,webFiles))===JSON.stringify(report.webHashes);
  console.log(JSON.stringify({status:report.status,work,cleanup:report.cleanup}));
  await writeFile(
    join(work, 'result.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  await writeFile(
    join(work, 'attempt-' + Date.now() + '.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
}
