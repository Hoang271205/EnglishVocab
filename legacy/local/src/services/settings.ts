import {z} from 'zod';
import {VocabDB} from '../storage/db';
import {ServiceError} from '../../../../src/domain/types';
const settingsSchema=z.object({
 voiceURI:z.string().max(500).nullable(),onlineLookupEnabled:z.boolean(),learnBatchSize:z.union([z.literal(5),z.literal(10)]),
 reviewBatchSize:z.union([z.literal(10),z.literal(20)]),dailyNewWordTarget:z.number().int().min(1).max(1000)
}).strict();
const defaults={voiceURI:null,onlineLookupEnabled:true,learnBatchSize:10,reviewBatchSize:10,dailyNewWordTarget:10};
export class SettingsService {
 constructor(private readonly db:VocabDB){}
 async get(){
  const rows=await this.db.settings.toArray();const result={...defaults,...Object.fromEntries(rows.filter(r=>r.key in defaults).map(r=>[r.key,r.value]))};
  const parsed=settingsSchema.safeParse(result);if(!parsed.success)throw new ServiceError('validation','Invalid saved settings');return parsed.data;
 }
 async update(input:unknown){
  const parsed=settingsSchema.partial().safeParse(input);if(!parsed.success)throw new ServiceError('validation','Invalid settings');
  return this.db.transaction('rw',this.db.settings,async()=>{for(const [key,value] of Object.entries(parsed.data))await this.db.settings.put({key,value});return this.get();});
 }
}
