import { z } from 'zod';
import type { Entry, Topic } from '../domain/types';
const text = z.string().trim().min(1).max(10_000);
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/);
const source = z.object({field:z.enum(['meaning','ipa','cefr','example','audio','definition']),attribution:text,license:text,url:z.url().refine(s=>['https:','http:'].includes(new URL(s).protocol)).nullable(),status:z.enum(['authored','verified','unverified']),checkedAt:z.number().int().nonnegative().nullable()}).strict();
const example = z.object({id, prefix:z.string().max(10_000),targetSurface:text,suffix:z.string().max(10_000),acceptedAnswers:z.array(text).min(1).max(20)}).strict();
export const entrySchema = z.object({
 id,revision:z.number().int().positive(),collectionId:z.enum(['ielts','daily','personal']),headword:text,partOfSpeech:z.string().max(100),senseKey:text,meaningVi:z.string().max(10_000),acceptedLearnAnswers:z.array(text).max(20),
 cefr:z.object({level:z.enum(['A1','A2','B1','B2','C1','C2']).nullable(),status:z.enum(['estimated','verified','unknown']),note:z.string().max(10_000)}).strict(),
 pronunciation:z.object({ipa:z.string().max(500).nullable(),accent:z.literal('en-US').nullable()}).strict(),
 examples:z.array(example).max(100),provenance:z.array(source).max(100),contentStatus:z.enum(['draft','ready'])
}).strict().superRefine((e,ctx)=>{
 const issue=(message:string)=>ctx.addIssue({code:'custom',message});
 if ((e.cefr.level === null) !== (e.cefr.status === 'unknown')) issue('CEFR level/status mismatch');
 if (e.collectionId === 'ielts' && e.cefr.level && ['A1','A2'].includes(e.cefr.level)) issue('IELTS requires B1–C2');
 if (e.collectionId === 'daily' && e.cefr.level && ['C1','C2'].includes(e.cefr.level)) issue('Daily requires A1–B2');
 if (new Set(e.examples.map(x=>x.id)).size !== e.examples.length) issue('Duplicate example ID');
 if (e.examples.some(x=>!x.acceptedAnswers.includes(x.targetSurface) || !/\p{L}/u.test(x.targetSurface))) issue('Example must accept its surface and contain letters');
 if (e.contentStatus === 'ready' && (!e.meaningVi.trim() || !e.partOfSpeech.trim() || !e.acceptedLearnAnswers.length || !e.examples.length)) issue('Ready entry is incomplete');
 if (e.contentStatus === 'ready' && e.provenance.length === 0) issue('Ready entry needs provenance');
});
export const topicSchema = z.object({id,collectionId:z.enum(['ielts','daily']),nameEn:text,nameVi:text,order:z.number().int().min(1).max(100),entryIds:z.array(id).max(10)}).strict().refine(t=>new Set(t.entryIds).size===t.entryIds.length,'Duplicate entry in topic');
export function parseEntry(value: unknown): Entry { return entrySchema.parse(value); }
export function parseTopic(value: unknown): Topic { return topicSchema.parse(value); }
export const contentSchema = z.object({schemaVersion:z.literal(1),contentVersion:text,entries:z.array(entrySchema).max(20_000),topics:z.array(topicSchema).max(200)}).strict().superRefine((p,ctx)=>{
 const ids = new Set(p.entries.map(e=>e.id));
 if(ids.size !== p.entries.length)ctx.addIssue({code:'custom',message:'Duplicate entry ID'});
 if(new Set(p.topics.map(t=>t.id)).size !== p.topics.length)ctx.addIssue({code:'custom',message:'Duplicate topic ID'});
 for(const topic of p.topics) for(const entryId of topic.entryIds) {
  const entry=p.entries.find(e=>e.id===entryId);
  if(!entry)ctx.addIssue({code:'custom',message:`Missing entry ${entryId}`});
  else if(entry.collectionId==='personal' || (topic.collectionId==='ielts' && entry.cefr.level && ['A1','A2'].includes(entry.cefr.level)) || (topic.collectionId==='daily' && entry.cefr.level && ['C1','C2'].includes(entry.cefr.level)))ctx.addIssue({code:'custom',message:`Invalid collection membership ${entryId}`});
 }
});
