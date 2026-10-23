import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VocabDB} from '../src/storage/db';
import {StudyService} from '../src/services/study';
import {HOUR} from '../../../src/domain/scheduler';
import {sample} from '../../../tests/fixtures';
async function setup(){const db=new VocabDB('test-'+crypto.randomUUID());await db.entries.add(sample());let now=0;return {db,service:new StudyService(db,{now:()=>now}),setTime:(t:number)=>{now=t;}};}
test('viewing, failed rewrite, viewing again, pausing do not learn; commit once after correct',async()=>{
 const {db,service}=await setup();try{
 let s=await service.create('learn',5);assert.equal(JSON.stringify(s).includes('hobby'),false);assert.equal(await db.progress.count(),0);await assert.rejects(service.submit({sessionId:s.id,attemptId:s.items[0]!.attemptId,expectedSessionVersion:s.version,answer:'hobby'}));
 s=await service.transition(s.id,s.version,'recall');assert.equal((await service.submit({sessionId:s.id,attemptId:s.items[0]!.attemptId,expectedSessionVersion:s.version,answer:'hoby'})).kind,'retry');assert.equal(await db.progress.count(),0);
 s=await service.transition(s.id,s.version,'pause','hob');assert.equal((await service.session(s.id)).draftAnswer,'hob');s=await service.transition(s.id,s.version,'resume');
 const command={sessionId:s.id,attemptId:s.items[0]!.attemptId,expectedSessionVersion:s.version,answer:'HOBBY'};
 const r=await service.submit(command);assert.equal(r.kind,'committed');await service.submit(command);assert.equal(await db.events.count(),1);assert.equal((await db.progress.get('daily-hobby'))!.nextReviewAt,2*HOUR);assert.equal((await service.session(s.id)).phase,'complete');
 }finally{await db.delete();}
});
test('review first result wins, question DTO hides full answer, incomplete answer does not grade',async()=>{
 const {db,service,setTime}=await setup();try{
 let s=await service.create('learn',5);s=await service.transition(s.id,s.version,'recall');await service.submit({sessionId:s.id,attemptId:s.items[0]!.attemptId,expectedSessionVersion:s.version,answer:'hobby'});
 await assert.rejects(service.create('review',10));setTime(2*HOUR);s=await service.create('review',10);
 const q=await service.question(s.id);assert.equal('headword' in q,false);assert.equal('ipa' in q,false);assert.equal(JSON.stringify(q).includes('hobby'),false);
 await assert.rejects(service.submit({sessionId:s.id,attemptId:s.items[0]!.attemptId,expectedSessionVersion:s.version,answer:''}));assert.equal(await db.events.count(),1);
 const command={sessionId:s.id,attemptId:s.items[0]!.attemptId,expectedSessionVersion:s.version,answer:'',forgotten:true};await service.submit(command);await service.submit({...command,forgotten:false,answer:'hobby'});
 assert.equal((await db.progress.get('daily-hobby'))!.level,1);assert.equal((await db.progress.get('daily-hobby'))!.nextReviewAt,4*HOUR);assert.equal(await db.events.count(),2);assert.equal((await service.feedback(s.id)).event.correct,false);await assert.rejects(service.question(s.id));
 }finally{await db.delete();}
});
test('same attempt in two connections commits once; stale session fails',async()=>{
 const {db,service}=await setup();const db2=new VocabDB(db.name);try{
 let s=await service.create('learn',5);s=await service.transition(s.id,s.version,'recall');const cmd={sessionId:s.id,attemptId:s.items[0]!.attemptId,expectedSessionVersion:s.version,answer:'hobby'};
 const r=await Promise.all([service.submit(cmd),new StudyService(db2).submit(cmd)]);assert.equal(r[0]!.kind,'committed');assert.equal(r[1]!.kind,'committed');assert.equal(await db.events.count(),1);
 await assert.rejects(service.transition(s.id,s.version,'front'));
 }finally{db2.close();await db.delete();}
});
test('failed transaction rolls back progress, event and session together',async()=>{
 const {db,service}=await setup();try{
 let s=await service.create('learn',5);s=await service.transition(s.id,s.version,'recall');
 const fail=()=>{throw Error('injected disk failure');};db.events.hook('creating',fail);
 await assert.rejects(service.submit({sessionId:s.id,attemptId:s.items[0]!.attemptId,expectedSessionVersion:s.version,answer:'hobby'}));db.events.hook('creating').unsubscribe(fail);
 assert.equal(await db.progress.count(),0);assert.equal(await db.events.count(),0);assert.equal((await service.session(s.id)).phase,'recall');
 }finally{await db.delete();}
});
