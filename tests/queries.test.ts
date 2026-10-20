import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VocabDB} from '../src/storage/db';
import {ContentService} from '../src/content/import';
import {QueryService} from '../src/services/queries';
import {SnapshotService} from '../src/services/snapshot';
import {sample} from './fixtures';
test('shared topic membership, CEFR/topic filters and actual topic progress',async()=>{
 const db=new VocabDB(crypto.randomUUID());try{
 const word={...sample(),collectionId:'ielts' as const,cefr:{level:'B1' as const,status:'estimated' as const,note:'Test only'}};
 const topics=[{id:'ielts-001',collectionId:'ielts',nameEn:'School',nameVi:'Trường học',order:1,entryIds:[word.id]},{id:'daily-001',collectionId:'daily',nameEn:'Daily',nameVi:'Hằng ngày',order:1,entryIds:[word.id]}];
 await new ContentService(db).import({schemaVersion:1,contentVersion:'test',entries:[word],topics});
 const q=new QueryService(db,{now:()=>0});assert.equal((await q.notebook({collection:'daily',cefr:'B1'})).length,1);assert.equal((await q.notebook({topicId:'missing'})).length,0);assert.equal((await q.topics('daily'))[0]!.total,1);
 const stats=await q.overview();assert.equal(stats.learned,0);assert.equal(stats.collections[0]!.slots,1);assert.equal(stats.collections[1]!.slots,1);
 const snapshot=await new SnapshotService(db,()=>1).export();assert.deepEqual(Object.keys(snapshot).sort(),['entries','protocol','version']);assert.equal('progress' in snapshot,false);
 }finally{await db.delete();}
});
