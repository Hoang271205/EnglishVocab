import {contentSchema} from './schema';
import {VocabDB} from '../storage/db';
import {ServiceError} from '../domain/types';
export class ContentService {
 constructor(private readonly db:VocabDB){}
 inspect(input:unknown){const parsed=contentSchema.safeParse(input);if(!parsed.success)throw new ServiceError('validation',parsed.error.message);return parsed.data;}
 async import(input:unknown){
  const pack=this.inspect(input);
  return this.db.transaction('rw',this.db.entries,this.db.topics,this.db.settings,async()=>{
   for(const e of pack.entries){
    const old=await this.db.entries.get(e.id);
    if(old){
     if(old.headword!==e.headword||old.partOfSpeech!==e.partOfSpeech||old.senseKey!==e.senseKey)throw new ServiceError('conflict','A different sense needs a different entry ID');
     if(e.revision<old.revision)throw new ServiceError('conflict','Stale content revision');
     if(e.revision===old.revision&&JSON.stringify(e)!==JSON.stringify(old))throw new ServiceError('conflict','Changed content needs a newer revision');
    }
   }
   await this.db.entries.bulkPut(pack.entries);
   // Empty catalog shells register topics, but cannot erase topics populated by another pack.
   for(const topic of pack.topics){
    const old=await this.db.topics.get(topic.id);
    if(topic.entryIds.length||!old?.entryIds.length)await this.db.topics.put(topic);
   }
   await this.db.settings.put({key:'contentVersion',value:pack.contentVersion});return {entries:pack.entries.length,topics:pack.topics.length};
  });
 }
}
