import {createMask} from '../../../../src/domain/cloze';
import {z} from 'zod';
import {contentSchema} from '../../../../src/content/schema';
import {ServiceError,POLICY} from '../../../../src/domain/types';
import type {Capture,Progress,ReviewEvent,Session,Setting} from '../../../../src/domain/types';
import {VocabDB} from './db';
const time=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER-432_000_000);
const text=z.string().min(1).max(128),level=z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal(5)]);
const progress=z.object({entryId:text,level,learnedAt:time,lastReviewedAt:time.nullable(),nextReviewAt:time,correctCount:z.number().int().nonnegative(),wrongCount:z.number().int().nonnegative(),version:z.number().int().positive()}).strict();
const event=z.object({id:text,sessionId:text,entryId:text,mode:z.enum(['learn','review']),correct:z.boolean(),reviewedAt:time,beforeLevel:level.nullable(),afterLevel:level,nextReviewAt:time,entryRevision:z.number().int().positive(),policy:z.literal(POLICY)}).strict();
const example=z.object({id:text,prefix:z.string(),targetSurface:z.string().min(1),suffix:z.string(),acceptedAnswers:z.array(z.string().min(1)).min(1)}).strict();
const cell=z.discriminatedUnion('kind',[z.object({kind:z.literal('fixed'),value:z.string().length(1)}).strict(),z.object({kind:z.literal('blank')}).strict()]);
const session=z.object({id:text,mode:z.enum(['learn','review']),version:z.number().int().positive(),index:z.number().int().nonnegative(),phase:z.enum(['front','recall','question','feedback','complete']),items:z.array(z.object({entryId:text,entryRevision:z.number().int().positive(),expectedVersion:z.number().int().nonnegative(),attemptId:text,example,cells:z.array(cell)}).strict()).min(1).max(20),draftAnswer:z.string().max(10_000),paused:z.boolean(),createdAt:time}).strict();
const capture=z.object({id:text,entryId:text,selectedText:z.string().min(1),originalSentence:z.string(),sourceUrl:z.url().refine(s=>['https:','http:'].includes(new URL(s).protocol)),capturedAt:time}).strict();
const backupSchema=z.object({schemaVersion:z.literal(1),contentVersion:z.string().min(1),schedulePolicyVersion:z.literal(POLICY),exportedAt:time,content:contentSchema,progress:z.array(progress),events:z.array(event),sessions:z.array(session),captures:z.array(capture),settings:z.array(z.object({key:text,value:z.json()}).strict())}).strict();
export class BackupService {
 constructor(private readonly db:VocabDB,private readonly now=()=>Date.now()){}
 inspect(input:unknown){
  const parsed=backupSchema.safeParse(input);if(!parsed.success)throw new ServiceError('validation',parsed.error.message);
  const b=parsed.data,entries=new Map(b.content.entries.map(e=>[e.id,e])),sessionIds=new Set(b.sessions.map(s=>s.id));
  for(const rows of [b.progress.map(x=>x.entryId),b.events.map(x=>x.id),b.sessions.map(x=>x.id),b.captures.map(x=>x.id),b.settings.map(x=>x.key)])if(new Set(rows).size!==rows.length)throw new ServiceError('validation','Duplicate backup ID');
  if(b.contentVersion!==b.content.contentVersion)throw new ServiceError('validation','Content version mismatch');
  for(const p of b.progress){if(entries.get(p.entryId)?.contentStatus!=='ready'||p.nextReviewAt<p.learnedAt||(p.lastReviewedAt!==null&&p.lastReviewedAt<p.learnedAt))throw new ServiceError('validation','Invalid progress reference or time');}
  for(const p of b.progress){
   const events=b.events.filter(e=>e.entryId===p.entryId),learned=events.filter(e=>e.mode==='learn'),reviews=events.filter(e=>e.mode==='review');
   if(learned.length!==1||!learned[0]?.correct||learned[0].reviewedAt!==p.learnedAt||p.version!==reviews.length+1||p.correctCount!==reviews.filter(e=>e.correct).length||p.wrongCount!==reviews.filter(e=>!e.correct).length)throw new ServiceError('validation','Progress/event history mismatch');
   const lastTime=reviews.length?Math.max(...reviews.map(e=>e.reviewedAt)):null;
   const latest=lastTime===null?learned:reviews.filter(e=>e.reviewedAt===lastTime);
   if(p.lastReviewedAt!==lastTime||!latest.some(e=>e.afterLevel===p.level&&e.nextReviewAt===p.nextReviewAt))throw new ServiceError('validation','Progress/event schedule mismatch');
  }
  for(const e of b.events)if(!b.progress.some(p=>p.entryId===e.entryId))throw new ServiceError('validation','Event has no progress');
  for(const c of b.captures)if(!entries.has(c.entryId))throw new ServiceError('validation','Capture reference missing');
  for(const e of b.events)if(!entries.has(e.entryId)||!sessionIds.has(e.sessionId))throw new ServiceError('validation','Event reference missing');
  let active=0;
  for(const s of b.sessions){
   if(s.phase!=='complete')active++;
   if((s.phase==='complete'&&s.index!==s.items.length)||(s.phase!=='complete'&&s.index>=s.items.length)||new Set(s.items.map(i=>i.attemptId)).size!==s.items.length)throw new ServiceError('validation','Invalid session position');
   if(s.items.some(i=>!entries.has(i.entryId)||JSON.stringify(createMask(i.example.targetSurface))!==JSON.stringify(i.cells)))throw new ServiceError('validation','Invalid session item');
   if((s.mode==='learn'&&['question','feedback'].includes(s.phase))||(s.mode==='review'&&['front','recall'].includes(s.phase)))throw new ServiceError('validation','Invalid session phase');
  }
  if(active>1)throw new ServiceError('validation','Multiple active sessions');
  return b;
 }
 async export(){return this.db.transaction('r',this.db.tables,async()=>{
  const [entries,topics,progress,events,sessions,captures,settings]=await Promise.all([this.db.entries.toArray(),this.db.topics.toArray(),this.db.progress.toArray(),this.db.events.toArray(),this.db.sessions.toArray(),this.db.captures.toArray(),this.db.settings.toArray()]);
  const contentVersion=String(settings.find(s=>s.key==='contentVersion')?.value??'unversioned');
  return this.inspect({schemaVersion:1,contentVersion,schedulePolicyVersion:POLICY,exportedAt:this.now(),content:{schemaVersion:1,contentVersion,entries,topics},progress,events,sessions,captures,settings});
 });}
 async restore(input:unknown){
  const b=this.inspect(input);
  await this.db.transaction('rw',this.db.tables,async()=>{
   const currentVersions=new Map((await this.db.sessions.toArray()).map(s=>[s.id,s.version]));
   for(const table of this.db.tables)await table.clear();
   await this.db.entries.bulkAdd(b.content.entries);await this.db.topics.bulkAdd(b.content.topics);
   await this.db.progress.bulkAdd(b.progress as Progress[]);await this.db.events.bulkAdd(b.events as ReviewEvent[]);await this.db.sessions.bulkAdd(b.sessions.map(s=>{const version=Math.max(s.version,currentVersions.get(s.id)??0)+1;if(!Number.isSafeInteger(version))throw new ServiceError('validation','Session version overflow');return {...s,version,items:s.items.map((item,index)=>index>=s.index+(s.phase==='feedback'?1:0)&&s.phase!=='complete'?{...item,attemptId:crypto.randomUUID()}:item)};}) as Session[]);await this.db.captures.bulkAdd(b.captures as Capture[]);await this.db.settings.bulkAdd(b.settings as Setting[]);
  });
  return {entries:b.content.entries.length,progress:b.progress.length};
 }
}
