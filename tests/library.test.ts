import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {contentSchema} from '../src/content/schema';
import {VocabDB} from '../src/storage/db';
import {ContentService} from '../src/content/import';
import {StudyService} from '../src/services/study';
import {assembleAnswer,createMask} from '../src/domain/cloze';
import {gradeAnswer} from '../src/domain/grading';
test('complete IELTS 11–55 has 450 real entries; library imports and reimports without losing learning',async()=>{
 const index=JSON.parse(readFileSync(new URL('../public/content/index.json',import.meta.url),'utf8')) as {packs:{url:string;sha256:string}[];stats:{uniqueEntries:number;populatedTopics:number}};
 const packs=index.packs.map((p:{url:string;sha256:string})=>{assert.match(p.url,/^\/content\/(pilot|ielts|daily)\/[a-zA-Z0-9/_-]+\.json$/u);const bytes=readFileSync(new URL('../public'+p.url,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),p.sha256);return contentSchema.parse(JSON.parse(bytes.toString('utf8')));});
 const ielts=packs.filter((p:typeof packs[number])=>p.contentVersion.startsWith('data-02-'));
 assert.equal(ielts.reduce((n:number,p:typeof packs[number])=>n+p.entries.length,0),450);
 assert.equal(ielts.flatMap((p:typeof packs[number])=>p.topics).length,45);
 const entries=packs.flatMap((p:typeof packs[number])=>p.entries);assert.ok(entries.length>=650);assert.equal(new Set(entries.map((e:typeof entries[number])=>e.id)).size,entries.length);
 for(const e of entries){assert.equal(e.contentStatus,'ready');assert.equal(e.cefr.status,'estimated');const ex=e.examples[0]!,cells=createMask(ex.targetSurface);assert.ok(e.meaningVi);assert.equal(gradeAnswer(assembleAnswer(cells,Array.from(ex.targetSurface).filter((_,i)=>cells[i]?.kind==='blank')),ex.acceptedAnswers),true);}
 const db=new VocabDB(crypto.randomUUID());try{
  const content=new ContentService(db);for(const pack of packs)await content.import(pack);
  assert.equal(await db.entries.count(),index.stats.uniqueEntries);assert.equal(await db.topics.count(),200);assert.equal((await db.topics.toArray()).filter(t=>t.entryIds.length>0).length,index.stats.populatedTopics);
  const study=new StudyService(db,{now:()=>100});let session=await study.create('learn',5);const card=await study.front(session.id);session=await study.transition(session.id,session.version,'recall');
  await study.submit({sessionId:session.id,attemptId:session.items[0]!.attemptId,expectedSessionVersion:session.version,answer:card.headword});
  const progress=await db.progress.toArray();for(const pack of [...packs].reverse())await content.import(pack);
  assert.deepEqual(await db.progress.toArray(),progress);assert.equal(await db.events.count(),1);assert.equal(await db.entries.count(),entries.length);
 }finally{await db.delete();}
});
