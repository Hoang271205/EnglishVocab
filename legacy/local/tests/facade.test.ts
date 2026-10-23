import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBackend} from '../src/backend';
import {ServiceError} from '../../../src/domain/types';
import {VocabDB} from '../src/storage/db';
test('FE-facing facade maps validation and closed database errors without reporting success',async()=>{
 const name=crypto.randomUUID(),api=createBackend({name});
 try{
  await assert.rejects(api.content.import({invalid:true}),(e:unknown)=>e instanceof ServiceError&&e.code==='validation');
  await api.queries.overview();api.close();
  await assert.rejects(api.queries.overview(),(e:unknown)=>e instanceof ServiceError&&e.code==='storage');
 }finally{api.close();await new VocabDB(name).delete();}
});
