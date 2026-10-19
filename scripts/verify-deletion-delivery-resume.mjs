/* global process, console, URL, fetch */
// Run with tsx. Isolated synthetic cluster only; never loads .env or writes Web.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { expect } from '@playwright/test';
import { requireRestrictedSession } from './deletion-session-check.mjs';
import { root, web, pgPort, apiPort, requireBackend, loadSource } from './deletion-isolated-environment.mjs';
const originalWork=resolve('test-results/deletion-isolated/1792223093288');
const work=join(originalWork,'delivery-resume-'+Date.now());
await mkdir(work,{recursive:true});
const database='postgresql://postgres@127.0.0.1:55444/deletion_final_1792223093288_test';
const cluster=join(originalWork,'pgdata');
const pgctl='C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe';
let pgStarted=false, userId, originalPasswordHash;
const pg=args=>spawnSync(pgctl,args,{stdio:'ignore',windowsHide:true,timeout:30000}).status;

import { startBrowser } from './deletion-isolated-browser.mjs';
requireBackend('reflect-metadata');
const {PrismaClient}=requireBackend('@prisma/client');
const {Test}=requireBackend('@nestjs/testing');
const {Logger}=requireBackend('@nestjs/common');
const argon2=requireBackend('argon2');
const {DeletionStorageDouble}=await loadSource('test/helpers/deletion-storage-double.ts');
const {ensureTestCreditPolicies}=await loadSource('test/support/credit-policies.ts');
const {fundForAward}=await loadSource('test/support/credits.ts');

const db=new PrismaClient({datasourceUrl:database});
const report = {
  scenarios: {},
  hashes: [],
  requests: [],
  fixtures:['Resume existing synthetic active assignment and ACCOUNT closure; no new service, deletion request or receipt test','Temporary synthetic driver password hash rotation for UI login, restored on cleanup; no persisted password'],
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
await writeFile(join(work,'result.json'),JSON.stringify({status:'RUNNING',stage:'preflight'},null,2));
try {
  stage('verify-owned-cluster');
  const env=JSON.parse(await readFile(join(originalWork,'environment.json'),'utf8'));
  assert.equal(resolve(env.cluster),resolve(cluster));
  assert.equal(env.database,'deletion_final_1792223093288_test');
  assert.equal(pg(['status','-D',cluster]),3);
  assert.equal(pg(['start','-D',cluster,'-l',join(originalWork,'postgres.log'),'-o','-h 127.0.0.1 -p 55444','-w']),0);
  pgStarted=true;
  const [identity]=await db.$queryRawUnsafe("SELECT current_database() AS db, host(inet_server_addr()) AS host, inet_server_port() AS port, current_setting('data_directory') AS dir");
  assert.equal(resolve(identity.dir),resolve(cluster));
  assert.equal(identity.db,env.database); assert.equal(identity.host,'127.0.0.1'); assert.equal(identity.port,55444);
  report.databaseIdentity=identity;
  report.hashes=await fingerprint(root,sourceFiles);
  report.webHashes=await fingerprint(web,webFiles);
  report.harnessHashes=await fingerprint(web,['scripts/verify-deletion-delivery-resume.mjs','scripts/deletion-isolated-browser.mjs','scripts/deletion-session-check.mjs']);
  const assignment=await db.deliveryAssignment.findFirstOrThrow({where:{status:'ACTIVE',mode:'INDEPENDENT'}});
  const driver=await db.driver.findUniqueOrThrow({where:{id:assignment.driverId}});
  const driverUser=await db.user.findUniqueOrThrow({where:{id:driver.userId}});
  assert.ok(driverUser.email.endsWith('@example.test'));
  const closure=await db.documentDeletion.findFirstOrThrow({where:{subjectUserId:driverUser.id,scope:'ACCOUNT',closedAt:null}});
  const gateBefore=await db.documentDeletionGate.findMany({where:{requestId:closure.id},orderBy:{id:'asc'}});
  assert.ok(gateBefore.some(g=>g.kind==='USER' && g.active));
  const ledgerBefore=await db.creditLedgerEntry.findMany({where:{referenceType:'DISPATCH',referenceId:assignment.dispatchId},orderBy:{id:'asc'}});
  assert.equal(ledgerBefore.filter(x=>x.type==='SERVICE_AWARD').length,1);
  const purgedBefore=await db.documentDeletion.findMany({where:{status:'PURGED'}});
  const second=await db.dispatch.findFirstOrThrow({where:{status:'OPEN'}});
  const verificationCase=await db.verificationCase.findFirstOrThrow({where:{presenterId:driverUser.id}});
  userId=driverUser.id; originalPasswordHash=driverUser.passwordHash;
  await db.user.update({where:{id:userId},data:{passwordHash:await argon2.hash(password)}});
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

  app.use((req,res,next)=>{if(req.method==='POST' && req.url.endsWith('/deliver'))deliverPosts++;next()});
  await app.listen(apiPort,'127.0.0.1');
  browser=await startBrowser(report,work);
  stage('browser-restricted-session');
  const page=await browser.context();
  await browser.login(page,driverUser.email,password);
  const projection=page.waitForResponse(r=>r.url().includes('/auth/me?projection=session'));
  projection.catch(()=>{});
  await page.reload();
  report.sessionDecision=await requireRestrictedSession(await projection,async()=>{throw Error('Unexpected 401 after fresh login')});
  await page.goto(browser.origin+'/privacy/active-service');
  await expect(page.getByRole('button',{name:'Revisar entrega',exact:true})).toBeVisible();
  await browser.viewports(page,'restricted-active-service');
  // Auxiliary authenticated negative checks; never deliver the committed service by API.
  const fresh=(await api('POST','/auth/login',null,{email:driverUser.email,password})).accessToken;
  const restricted=await api('GET','/auth/me?projection=session',fresh);
  assert.equal(restricted.accessMode,'DELETION_RESTRICTED');
  assert.deepEqual(Object.keys(restricted.identity),['id']);
  await api('POST',`/driver/dispatches/${second.id}/take`,fresh,{vehicleId:assignment.vehicleId},403);
  await api('POST',`/driver/dispatches/${second.id}/deliver`,fresh,undefined,403);
  await api('GET',`/verification-cases/${verificationCase.id}/attachments`,fresh,undefined,403);
  stage('browser-delivery');
  report.visibleAfterReload=await browser.deliver(page,assignment.dispatchId);
  const finalAssignment=await db.deliveryAssignment.findUniqueOrThrow({where:{id:assignment.id}});
  const finalDispatch=await db.dispatch.findUniqueOrThrow({where:{id:assignment.dispatchId}});
  assert.equal(finalAssignment.status,'COMPLETED'); assert.equal(finalDispatch.status,'DELIVERED');
  const completionEvents=await db.b2bOutboxEvent.count({where:{dispatchId:assignment.dispatchId,type:'DELIVERY_COMPLETED'}});
  assert.equal(completionEvents,1);
  const ledgerAfter=await db.creditLedgerEntry.findMany({where:{referenceType:'DISPATCH',referenceId:assignment.dispatchId},orderBy:{id:'asc'}});
  assert.deepEqual(ledgerAfter,ledgerBefore);
  const after=await api('GET','/auth/me?projection=session',fresh);
  assert.equal(after.accessMode,'DELETION_RESTRICTED'); assert.equal(after.capabilities.activeDeliveryResolution,false);
  await api('POST',`/driver/dispatches/${second.id}/take`,fresh,{vehicleId:assignment.vehicleId},403);
  await api('GET',`/verification-cases/${verificationCase.id}/attachments`,fresh,undefined,403);
  const state=await api('GET',`/privacy/deletion-requests/${closure.id}`,fresh);
  assert.equal(state.closedAt,null); assert.equal(+new Date(state.deadline),+closure.deadline);
  await api('GET',`/privacy/deletion-requests/${closure.id}/receipt`,fresh,undefined,409);
  assert.deepEqual(await db.documentDeletionGate.findMany({where:{requestId:closure.id},orderBy:{id:'asc'}}),gateBefore);
  assert.deepEqual(await db.documentDeletion.findMany({where:{status:'PURGED'}}),purgedBefore);
  await page.goto(browser.origin+'/privacy/deletion/'+closure.id);
  await expect(page.getByText('Pendiente; la recepción no equivale a cierre',{exact:true})).toBeVisible();
  await browser.viewports(page,'follow-up-after-delivery');
  const deliveryRequests=report.browserRequests.filter(x=>x.method==='POST' && x.path.endsWith('/deliver'));
  assert.equal(deliveryRequests.length,1); assert.equal(deliveryRequests[0].status,200);
  assert.equal(report.browserRequests.filter(x=>/execution|gps|tracking/.test(x.path)).length,0);
  report.scenarios.service={status:'PASS',browserDeliverPosts:1,dispatch:'DELIVERED',assignment:'COMPLETED',completionEvents,awardCount:1,refundCount:ledgerAfter.filter(x=>x.type==='SERVICE_REFUND').length,ledgerUnchanged:true,gatesUnchanged:true,deadlineUnchanged:true,closureH:null,sessionRestricted:true,finalUi:'No active resolution; no explicit delivery-history receipt after reload',receiptScenarioRepeated:false};
  report.status='PASS';
} catch(error) {
  report.status='FAIL'; report.failure={stage:report.stage,type:error.name,message:String(error.message).slice(0,1500)};
  process.exitCode=1;
  console.log('Failed at '+report.stage+'; see report');
} finally {
  await browser?.close(); await app?.close();
  if(userId && originalPasswordHash)await db.user.update({where:{id:userId},data:{passwordHash:originalPasswordHash}});
  await db.$disconnect(); process.chdir(web);
  report.cleanup={browserClosed:true,backendClosed:true,passwordFixtureRestored:!!originalPasswordHash,postgresStopped:!pgStarted||pg(['stop','-D',cluster,'-m','fast','-w'])===0};
  report.backendUnchanged=JSON.stringify(await fingerprint(root,sourceFiles))===JSON.stringify(report.hashes);
  await writeFile(join(work,'result.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,output:work,cleanup:report.cleanup}));
}
