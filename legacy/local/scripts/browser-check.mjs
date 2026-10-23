import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {mkdir,readFile,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../../../.browser-check/',import.meta.url);
await mkdir(root,{recursive:true});
await build({entryPoints:['legacy/local/tests/browser-harness.ts'],outfile:new URL('harness.js',root).pathname,bundle:true,format:'iife',platform:'browser'});
const server=createServer(async(req,res)=>{
 if(req.url==='/harness.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL('harness.js',root)));}
 else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><title>BE test harness</title><script src="/harness.js"></script>');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(5173,'localhost',resolve);});
const profile=new URL('profile/',root).pathname;
const chrome=process.env.ENGLISHVOCAB_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const options={headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})};
const failures=[];
let context;
const results=[];
try {
 context=await chromium.launchPersistentContext(profile,options);
 let page=await context.newPage();page.on('pageerror',e=>failures.push(e.message));
 await page.goto('http://localhost:5173');await page.waitForFunction(()=>globalThis.StudyService);
 const command=await page.evaluate(async()=>{
  const db=new VocabDB('native-test');await db.delete();await db.open();await db.entries.add(sample());
  const service=new StudyService(db,{now:()=>0});let session=await service.create('learn',5);session=await service.transition(session.id,session.version,'recall');
  db.close();return {sessionId:session.id,attemptId:session.items[0].attemptId,expectedSessionVersion:session.version,answer:'hobby'};
 });
 const second=await context.newPage();second.on('pageerror',e=>failures.push(e.message));await second.goto('http://localhost:5173');await second.waitForFunction(()=>globalThis.StudyService);
 const grade=async(page)=>page.evaluate(async cmd=>{const db=new VocabDB('native-test');const result=await new StudyService(db,{now:()=>0}).submit(cmd);db.close();return result;},command);
 await Promise.all([grade(page),grade(second)]);
 const count=await page.evaluate(async()=>{const db=new VocabDB('native-test');const count=await db.events.count();db.close();return count;});
 assert.equal(count,1);await second.close();results.push('native IndexedDB in two independent tabs: one grading event');
 await page.reload();await page.waitForFunction(()=>globalThis.VocabDB);
 assert.equal(await page.evaluate(async()=>{const d=new VocabDB('native-test');const n=await d.progress.count();d.close();return n;}),1);results.push('reload preserves progress');
 await context.close();context=await chromium.launchPersistentContext(profile,options);page=await context.newPage();
 await page.goto('http://localhost:5173');await page.waitForFunction(()=>globalThis.VocabDB);
 const restarted=await page.evaluate(async()=>{
  const d=new VocabDB('native-test'),s=new StudyService(d,{now:()=>2*3_600_000});
  const p=await d.progress.get('daily-hobby');const session=await s.create('review',10);d.close();return {p,session};
 });assert.equal(restarted.p.level,1);assert.equal(restarted.p.nextReviewAt,7_200_000);assert.equal(restarted.session.mode,'review');results.push('browser process restart preserves schedule; due review after +2h');
 const upgrade=await page.evaluate(async()=>{
  const old=new Dexie('migration-test');old.version(1).stores({entries:'id, headword, collectionId, contentStatus',topics:'id, collectionId, *entryIds',progress:'entryId, nextReviewAt, level',events:'id, entryId, sessionId, reviewedAt',sessions:'id, mode',captures:'id, entryId',settings:'key'});
  await old.table('entries').put(sample());old.close();
  const next=new VocabDB('migration-test');await next.open();const n=await next.entries.count(),v=next.verno;await next.delete();return {n,v};
 });assert.deepEqual(upgrade,{n:1,v:2});results.push('schema v1 → v2 migration preserves entries');
 const rollback=await page.evaluate(async()=>{
  const d=new VocabDB('rollback-test');await d.entries.add(sample());const s=new StudyService(d,{now:()=>0});let session=await s.create('learn',5);session=await s.transition(session.id,session.version,'recall');
  d.events.hook('creating',()=>{throw Error('injected failure')});let rejected=false;
  try{await s.submit({sessionId:session.id,attemptId:session.items[0].attemptId,expectedSessionVersion:session.version,answer:'hobby'});}catch{rejected=true;}
  const counts=[await d.progress.count(),await d.events.count()];await d.delete();return {rejected,counts};
 });assert.equal(rollback.rejected,true);assert.deepEqual(rollback.counts,[0,0]);results.push('native transaction failure rolls back grade and progress');
 const backupCheck=await page.evaluate(async()=>{
  const db=new VocabDB('native-test'),target=new VocabDB('native-restore');
  const backup=await new BackupService(db).export();await new BackupService(target).restore(backup);
  const before=await target.progress.toArray();let rejected=false;try{await new BackupService(target).restore({...backup,schemaVersion:99});}catch{rejected=true;}
  const after=await target.progress.toArray();const session=await target.sessions.toArray();await target.delete();db.close();return {before,after,rejected,sessions:session.length};
 });assert.deepEqual(backupCheck.before,backupCheck.after);assert.equal(backupCheck.rejected,true);assert.equal(backupCheck.before.length,1);assert.ok(backupCheck.sessions>0);results.push('native backup/restore round trip and invalid-file rejection preserve progress/session');

 const manifest=JSON.parse(await readFile(new URL('../../../public/content/index.json',import.meta.url),'utf8'));
 const packs=await Promise.all(manifest.packs.map(p=>readFile(new URL('../../../public'+p.url,import.meta.url),'utf8').then(JSON.parse)));
 const library=await page.evaluate(async({packs})=>{
  const name='native-production-library';let now=0;const backend=createBackend({name,clock:{now:()=>now}}),db=new VocabDB(name);
  try{
   await db.delete();await db.open();for(const pack of packs)await backend.content.import(pack);
   const entry=packs.flatMap(p=>p.entries).find(e=>e.id.startsWith('crawl-'));if(!entry)throw Error('Crawled entry fixture missing');
   let session=await backend.study.create('learn',5,[entry.id]);const front=await backend.study.front(session.id);
   session=await backend.study.transition(session.id,session.version,'recall');
   let result=await backend.study.submit({sessionId:session.id,attemptId:session.items[0].attemptId,expectedSessionVersion:session.version,answer:front.headword});
   const learned=result.progress,intervals=[],levels=[];
   for(const correct of [true,true,true,true,true,false]){
    now=result.progress.nextReviewAt;session=await backend.study.create('review',10,[entry.id]);
    const question=await backend.study.question(session.id);if('headword' in question||'pronunciation' in question)throw Error('Question exposes answer');
    result=await backend.study.submit({sessionId:session.id,attemptId:session.items[0].attemptId,expectedSessionVersion:session.version,answer:correct?entry.examples[0].targetSurface:'',...(correct?{}:{forgotten:true})});
    intervals.push((result.progress.nextReviewAt-now)/3600000);levels.push(result.progress.level);
    session=await backend.study.session(session.id);await backend.study.transition(session.id,session.version,'next');
   }
   const before=await db.progress.toArray();for(const pack of [...packs].reverse())await backend.content.import(pack);
   const after=await db.progress.toArray();const backup=await backend.backup.export();
   return {entries:await db.entries.count(),topics:await db.topics.count(),learned,levels,intervals,reimportPreserved:JSON.stringify(before)===JSON.stringify(after),backupProgress:backup.progress.length};
  }finally{backend.close();await db.delete();}
 },{packs});
 assert.equal(library.entries,manifest.stats.uniqueEntries);assert.equal(library.topics,200);assert.equal(library.learned.nextReviewAt,7200000);
 assert.deepEqual(library.levels,[2,3,4,5,5,1]);assert.deepEqual(library.intervals,[8,24,48,120,120,2]);assert.equal(library.reimportPreserved,true);assert.equal(library.backupProgress,1);
 results.push('full production library: guarded backend learns crawled entry, reviews to L5 +5d, wrong resets L1 +2h, reimport preserves progress and backup');
 if(process.argv.includes('--live-dictionary')){
  const live=await page.evaluate(async()=>{try{const result=await new WiktionaryDictionary().lookup('hello');return {source:result.source,senses:result.senses.length};}catch(error){return {error:error.message,cause:error.cause?.message};}});
  assert.equal(live.source,'api',JSON.stringify(live));assert.ok(live.senses>0);results.push('live FreeDictionaryAPI.com succeeds with browser CORS from localhost:5173');
 }
 assert.equal(failures.length,0);
 const report={executedAt:new Date().toISOString(),browser:context.browser()?.version()??'Chrome persistent context',origin:'http://localhost:5173',result:'Pass',checks:results,limits:['Extension checks run separately; quota exhaustion and audio listening remain untested']};
 console.log(JSON.stringify(report,null,2));
} finally {
 await context?.close();await new Promise(resolve=>server.close(resolve));await rm(profile,{recursive:true,force:true});
}
