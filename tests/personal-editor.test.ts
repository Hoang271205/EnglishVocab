import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VocabDB} from '../src/storage/db';
import {PersonalService} from '../src/services/personal';
import {StudyService} from '../src/services/study';
import {QueryService} from '../src/services/queries';
import {BackupService} from '../src/storage/backup';
import type {PersonalEditInput} from '../src/services/personalEditor';

function input(changes:Partial<PersonalEditInput>={}):PersonalEditInput {
 return {newId:crypto.randomUUID(),headword:'hobby',partOfSpeech:'n.',meaningVi:'sở thích',ipa:'',cefr:null,
  exampleSentence:'My favorite hobby is reading.',targetSurface:'hobby',note:'Ghi chú riêng',ready:true,newSense:false,...changes};
}

test('personal draft can omit IPA/meaning; readiness requires complete fields and creates no progress',async()=>{
 const db=new VocabDB(crypto.randomUUID());
 try{
  const personal=new PersonalService(db),study=new StudyService(db);
  const draft=await personal.saveManual(input({ready:false,partOfSpeech:'',meaningVi:'',exampleSentence:'',targetSurface:''}));
  assert.equal(draft.entry.contentStatus,'draft');
  assert.equal(await db.progress.count(),0);
  await assert.rejects(study.create('learn',5,[draft.entry.id]));
  const ready=await personal.saveManual(input({entryId:draft.entry.id,revision:1}));
  assert.equal(ready.entry.id,draft.entry.id);
  assert.equal(ready.entry.pronunciation.ipa,null);
  assert.equal(ready.entry.contentStatus,'ready');
  assert.equal((await new QueryService(db).details(ready.entry.id)).note,'Ghi chú riêng');
  assert.equal((await study.create('learn',5,[ready.entry.id])).items.length,1);
  assert.equal(await db.progress.count(),0);
 }finally{await db.delete();}
});

test('invalid examples/ready entries leave entries and notes unchanged',async()=>{
 const db=new VocabDB(crypto.randomUUID());
 try{
  const personal=new PersonalService(db);
  await assert.rejects(personal.saveManual(input({partOfSpeech:''})));
  await assert.rejects(personal.saveManual(input({targetSurface:'absent'})));
  await assert.rejects(personal.saveManual(input({ready:false,targetSurface:''})));
  assert.equal(await db.entries.count(),0);
  assert.equal(await db.settings.count(),0);
 }finally{await db.delete();}
});

test('meaning changes create a separate entry and preserve learned progress, captures, notes and backup',async()=>{
 const db=new VocabDB(crypto.randomUUID()),target=new VocabDB(crypto.randomUUID());
 try{
  const personal=new PersonalService(db),study=new StudyService(db,{now:()=>100});
  const saved=await personal.saveManual(input());
  let session=await study.create('learn',5,[saved.entry.id]);
  session=await study.transition(session.id,session.version,'recall');
  await study.submit({sessionId:session.id,attemptId:session.items[0]!.attemptId,expectedSessionVersion:session.version,answer:'hobby'});
  await db.captures.add({id:'original-capture',entryId:saved.entry.id,selectedText:'hobby',originalSentence:'A hobby.',sourceUrl:'https://example.org/',capturedAt:1});
  const before=await db.progress.get(saved.entry.id);
  const copied=await personal.saveManual(input({entryId:saved.entry.id,revision:1,meaningVi:'nghĩa khác',note:'Ghi chú nghĩa mới'}));
  assert.equal(copied.copied,true);
  assert.notEqual(copied.entry.id,saved.entry.id);
  assert.deepEqual(await db.progress.get(saved.entry.id),before);
  assert.equal(await db.progress.get(copied.entry.id),undefined);
  const query=new QueryService(db);
  assert.equal((await query.details(saved.entry.id)).entry.meaningVi,'sở thích');
  assert.equal((await query.details(saved.entry.id)).captures.length,1);
  assert.equal((await query.details(saved.entry.id)).note,'Ghi chú riêng');
  const backup=await new BackupService(db,()=>200).export();
  await new BackupService(target).restore(backup);
  assert.equal((await new QueryService(target).details(copied.entry.id)).note,'Ghi chú nghĩa mới');
  assert.deepEqual(await target.progress.get(saved.entry.id),before);
 }finally{await db.delete();await target.delete();}
});

test('stale edits and content changes in unfinished sessions are rejected without overwriting notes',async()=>{
 const db=new VocabDB(crypto.randomUUID());
 try{
  const personal=new PersonalService(db),study=new StudyService(db);
  const saved=await personal.saveManual(input());
  const command=input({entryId:saved.entry.id,revision:1,note:'Bản mới'});
  const edited=await personal.saveManual(command);
  assert.equal(edited.entry.revision,2);
  await assert.rejects(personal.saveManual({...command,note:'Bản cũ'}));
  assert.equal((await new QueryService(db).details(saved.entry.id)).note,'Bản mới');
  await study.create('learn',5,[saved.entry.id]);
  await assert.rejects(personal.saveManual({...command,revision:2,note:'Trong phiên'}));
  assert.equal((await new QueryService(db).details(saved.entry.id)).note,'Bản mới');
  const copy=await personal.saveManual({...command,revision:2,newSense:true});
  assert.equal(copy.copied,true);
 }finally{await db.delete();}
});

test('editing one example preserves extra examples and their source attribution',async()=>{
 const db=new VocabDB(crypto.randomUUID());
 try{
  const personal=new PersonalService(db);
  const saved=await personal.saveManual(input());
  const entry={...saved.entry,examples:[...saved.entry.examples,{id:'extra-example',prefix:'A ',targetSurface:'hobby',suffix:' helps.',acceptedAnswers:['hobby']}],
   provenance:[...saved.entry.provenance,{field:'example' as const,attribution:'Original author',license:'CC BY 4.0',url:'https://example.org/sentences',status:'verified' as const,checkedAt:null}]};
  await db.entries.put(entry);
  const edited=await personal.saveManual(input({entryId:entry.id,revision:entry.revision,exampleSentence:'Choose a hobby.',targetSurface:'hobby'}));
  assert.equal(edited.entry.examples.length,2);
  assert.equal(edited.entry.examples[1]?.id,'extra-example');
  assert.ok(edited.entry.provenance.some(source=>source.url==='https://example.org/sentences'));
 }finally{await db.delete();}
});
