import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VocabDB} from '../src/storage/db';
import {ContentService} from '../src/content/import';
import {createBackend} from '../src/backend';
import {contentSchema} from '../../../src/content/schema';
import {gradeAnswer} from '../../../src/domain/grading';
import {createMask,assembleAnswer} from '../../../src/domain/cloze';
test('authored pilot has 200 usable entries, 20 populated topics, 200 shells and honest metadata',async()=>{
 const raw=JSON.parse(readFileSync(new URL('../../../public/content/pilot/pilot-200.json',import.meta.url),'utf8'));
 const pack=contentSchema.parse(raw);assert.equal(pack.entries.length,200);assert.equal(pack.topics.length,200);assert.equal(pack.topics.filter(t=>t.entryIds.length===10).length,20);assert.equal(pack.topics.reduce((n,t)=>n+t.entryIds.length,0),200);
 assert.equal(new Set(pack.entries.map(e=>e.headword)).size,200);
 for(const entry of pack.entries){
  assert.equal(entry.cefr.status,'estimated');assert.equal(entry.provenance.filter(p=>p.field!=='ipa').every(p=>p.status==='authored'),true);if(entry.pronunciation.ipa){assert.equal(entry.pronunciation.accent,'en-US');assert.equal(entry.provenance.some(p=>p.field==='ipa'&&p.url?.startsWith('https://en.wiktionary.org/')&&p.license.includes('CC BY-SA 4.0')),true);}
  const example=entry.examples[0]!,cells=createMask(example.targetSurface);assert.equal(gradeAnswer(assembleAnswer(cells,Array.from(example.targetSurface).filter((_,i)=>cells[i]?.kind==='blank')),example.acceptedAnswers),true);
 }
 const db=new VocabDB(crypto.randomUUID());try{await new ContentService(db).import(raw);assert.equal(await db.entries.count(),200);assert.equal(await db.progress.count(),0);}finally{await db.delete();}
});
test('saved audio preference and batch settings persist; internal content keys cannot be overwritten',async()=>{
 const name=crypto.randomUUID();let api=createBackend({name});try{
 assert.equal((await api.settings.get()).onlineLookupEnabled,true);await api.settings.update({voiceURI:'test-us',reviewBatchSize:20});api.close();api=createBackend({name});assert.equal((await api.settings.get()).voiceURI,'test-us');assert.equal((await api.settings.get()).reviewBatchSize,20);
 await assert.rejects(api.settings.update({contentVersion:'fake'}));await assert.rejects(api.settings.update({reviewBatchSize:100}));
 }finally{api.close();await new VocabDB(name).delete();}
});

test('separate topic packs survive catalog re-import and preserve shared dictionary entries',async()=>{
 const pilot=JSON.parse(readFileSync(new URL('../../../public/content/pilot/pilot-200.json',import.meta.url),'utf8'));
 const next=contentSchema.parse(JSON.parse(readFileSync(new URL('../../../public/content/ielts/topics-011-055/part-011-015.json',import.meta.url),'utf8')));
 assert.equal(next.entries.length,50);assert.equal(next.topics.length,5);assert.equal(next.topics.every(t=>t.entryIds.length===10),true);
 const db=new VocabDB(crypto.randomUUID());try{
  const service=new ContentService(db);await service.import(pilot);await service.import(next);
  const topics=await db.topics.toArray();assert.equal(topics.length,200);assert.equal(topics.filter(t=>t.entryIds.length===10).length,25);assert.equal(await db.entries.count(),250);
  await service.import(pilot);assert.equal((await db.topics.get('ielts-011'))?.entryIds.length,10);assert.equal(await db.entries.count(),250);assert.equal(await db.progress.count(),0);
 }finally{await db.delete();}
});
