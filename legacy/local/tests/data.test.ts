import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VocabDB} from '../src/storage/db';
import {ContentService} from '../src/content/import';
import {PersonalService} from '../src/services/personal';
import {QueryService} from '../src/services/queries';
import {BackupService} from '../src/storage/backup';
import {StudyService} from '../src/services/study';
import {sample} from '../../../tests/fixtures';
const pack=()=>({schemaVersion:1,contentVersion:'test-v1',entries:[sample()],topics:[]});
test('content import is atomic, rejects changed identity and preserves progress',async()=>{
 const db=new VocabDB(crypto.randomUUID());try{
 const c=new ContentService(db);await c.import(pack());let s=await new StudyService(db,{now:()=>0}).create('learn',5);const study=new StudyService(db,{now:()=>0});s=await study.transition(s.id,s.version,'recall');await study.submit({sessionId:s.id,attemptId:s.items[0]!.attemptId,expectedSessionVersion:s.version,answer:'hobby'});
 await c.import({...pack(),entries:[{...sample(),revision:2}]});assert.equal(await db.progress.count(),1);
 await assert.rejects(c.import({...pack(),entries:[{...sample(),revision:3,senseKey:'different'}]}));assert.equal((await db.entries.get(sample().id))!.revision,2);
 }finally{await db.delete();}
});
test('capture save/transfer is idempotent and never creates L1; invalid batch rolls back',async()=>{
 const db=new VocabDB(crypto.randomUUID());try{
 const p=new PersonalService(db),entry={...sample(),id:'personal-1',collectionId:'personal' as const};
 const capture={id:'capture-1',entryId:entry.id,selectedText:'hobby',originalSentence:'My favorite hobby is reading.',sourceUrl:'https://example.org/reading',capturedAt:0};
 const envelope={protocol:1,type:'capture-transfer',transferId:'transfer-1',captures:[{entry,capture}]};
 await p.receive(envelope);await p.receive(envelope);assert.equal(await db.captures.count(),1);assert.equal(await db.progress.count(),0);
 await assert.rejects(p.receive({...envelope,captures:[{entry,capture:{...capture,id:'new'}},{entry,capture:{...capture,id:'bad',entryId:'missing'}}]}));assert.equal(await db.captures.count(),1);
 assert.equal((await new QueryService(db).overview()).unlearned,1);
 }finally{await db.delete();}
});
test('backup round trip preserves session/grade/schedule; corrupt restore leaves old data',async()=>{
 const db=new VocabDB(crypto.randomUUID()),target=new VocabDB(crypto.randomUUID());try{
 await new ContentService(db).import(pack());const study=new StudyService(db,{now:()=>100});let s=await study.create('learn',5);s=await study.transition(s.id,s.version,'recall');await study.submit({sessionId:s.id,attemptId:s.items[0]!.attemptId,expectedSessionVersion:s.version,answer:'hobby'});
 await db.lookupCache.add({key:'temporary',fetchedAt:0,accessedAt:0,payload:{}});
 const b=new BackupService(db,()=>200),backup=await b.export();const restore=new BackupService(target);await restore.restore(JSON.parse(JSON.stringify(backup)));
 assert.deepEqual(await target.progress.toArray(),await db.progress.toArray());assert.equal(await target.events.count(),1);assert.equal(await target.lookupCache.count(),0);
 await assert.rejects(restore.restore({...backup,schemaVersion:99}));await assert.rejects(restore.restore({...backup,progress:[{...backup.progress[0],entryId:'missing'}]}));assert.equal(await target.progress.count(),1);
 const fail=()=>{throw Error('disk failure');};target.events.hook('creating',fail);await assert.rejects(restore.restore(backup));target.events.hook('creating').unsubscribe(fail);assert.equal(await target.progress.count(),1);assert.equal(await target.events.count(),1);
 }finally{await db.delete();await target.delete();}
});

test('restoring an unfinished session invalidates old pending submissions without losing the draft',async()=>{
 const db=new VocabDB(crypto.randomUUID());try{
 await new ContentService(db).import(pack());const study=new StudyService(db,{now:()=>100});let session=await study.create('learn',5);session=await study.transition(session.id,session.version,'recall');session=await study.transition(session.id,session.version,'pause','hob');
 const backupService=new BackupService(db,()=>200),backup=await backupService.export();session=await study.transition(session.id,session.version,'resume');
 const old={sessionId:session.id,attemptId:session.items[0]!.attemptId,expectedSessionVersion:session.version,answer:'hobby'};await study.submit(old);
 await backupService.restore(backup);const restored=await study.session(session.id);assert.equal(restored.draftAnswer,'hob');assert.equal(restored.paused,true);await assert.rejects(study.submit(old));assert.equal(await db.progress.count(),0);
 }finally{await db.delete();}
});
