import {savePersonalEdit} from './personalEditor';
import {z} from 'zod';
import {entrySchema,parseEntry} from '../content/schema';
import {VocabDB} from '../storage/db';
import {ServiceError} from '../domain/types';
const captureSchema=z.object({id:z.string().min(1).max(128),entryId:z.string().min(1).max(128),selectedText:z.string().trim().min(1).max(500),originalSentence:z.string().max(20_000),sourceUrl:z.url().refine(s=>['https:','http:'].includes(new URL(s).protocol)),capturedAt:z.number().int().nonnegative()}).strict();
export const captureTransferSchema=z.object({protocol:z.literal(1),type:z.literal('capture-transfer'),transferId:z.string().min(1).max(128),captures:z.array(z.object({capture:captureSchema,entry:entrySchema}).strict()).max(500)}).strict();
export class PersonalService {
 async saveManual(input:unknown){return savePersonalEdit(this.db,input);}
 constructor(private readonly db:VocabDB){}
 async save(input:unknown){
  const parsed=z.object({capture:captureSchema,entry:entrySchema}).strict().safeParse(input);
  if(!parsed.success)throw new ServiceError('validation',parsed.error.message);
  const {entry,capture}=parsed.data;
  if(capture.entryId!==entry.id)throw new ServiceError('validation','Capture entry mismatch');
  return this.db.transaction('rw',this.db.entries,this.db.captures,async()=>{
   const previous=await this.db.captures.get(capture.id);
   if(previous){if(JSON.stringify(previous)!==JSON.stringify(capture))throw new ServiceError('conflict','Capture ID reused');return {captureId:capture.id,entryId:previous.entryId,duplicate:true};}
   const existing=await this.db.entries.get(entry.id);
   if(existing && (existing.headword!==entry.headword||existing.partOfSpeech!==entry.partOfSpeech||existing.senseKey!==entry.senseKey))throw new ServiceError('conflict','Different sense needs a new ID');
   if(!existing){if(entry.collectionId!=='personal')throw new ServiceError('validation','New captures belong to personal library');await this.db.entries.add(entry);}
   await this.db.captures.add(capture);return {captureId:capture.id,entryId:entry.id,duplicate:false};
  });
 }
 async update(input:unknown){const entry=parseEntry(input);return this.db.transaction('rw',this.db.entries,async()=>{
  const old=await this.db.entries.get(entry.id);
  if(!old||old.collectionId!=='personal')throw new ServiceError('not-found','Personal entry missing');
  if(old.headword!==entry.headword||(old.partOfSpeech!==''&&old.partOfSpeech!==entry.partOfSpeech)||old.senseKey!==entry.senseKey)throw new ServiceError('conflict','Create a new entry for a different sense');
  if(entry.revision!==old.revision+1)throw new ServiceError('conflict','Stale content revision');
  await this.db.entries.put(entry);return entry;
 });}
 async receive(input:unknown){
  const parsed=captureTransferSchema.safeParse(input);if(!parsed.success)throw new ServiceError('validation',parsed.error.message);
  if(new TextEncoder().encode(JSON.stringify(input)).length>2_000_000)throw new ServiceError('validation','Transfer too large');
  const transfer=parsed.data;
  await this.db.transaction('rw',this.db.entries,this.db.captures,async()=>{for(const item of transfer.captures)await this.save(item);});
  return {protocol:1 as const,type:'capture-ack' as const,transferId:transfer.transferId,captureIds:transfer.captures.map(x=>x.capture.id)};
 }
}
