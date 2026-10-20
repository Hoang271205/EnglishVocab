import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FreeDictionary,LookupError} from '../src/dictionary/freeDictionary';
import {DictionaryService} from '../src/dictionary/lookup';
import {VocabDB} from '../src/storage/db';
import {sample} from './fixtures';
const body=[{phonetics:[{text:'/test/',audio:'https://example.org/test-us.mp3'}],sourceUrls:['https://example.org/test'],meanings:[{partOfSpeech:'noun',definitions:[{definition:'A check'}]}]}];
test('API keeps missing fields unknown, validates queries and handles API errors without infinite retries',async()=>{
 const p=new FreeDictionary(async()=>Response.json(body));const result=await p.lookup(' Test ');assert.equal(result.query,'test');assert.equal(result.senses[0]!.example,null);assert.equal(result.phonetics[0]!.accent,null);assert.equal('cefr' in result,false);
 await assert.rejects(p.lookup('https://example.org'),(e:unknown)=>e instanceof LookupError&&e.code==='invalid-query');
 for(const [status,code] of [[404,'not-found'],[429,'rate-limit'],[500,'network']] as const){const api=new FreeDictionary(async()=>new Response('',{status,headers:{'Retry-After':'10','Content-Type':'application/json'}}));await assert.rejects(api.lookup('word'),(e:unknown)=>e instanceof LookupError&&e.code===code);}
});
test('local precedes cache, concurrent online requests share work, clearing cache preserves entries',async()=>{
 const db=new VocabDB(crypto.randomUUID());try{
 let calls=0;const api=new FreeDictionary(async()=>{calls++;await new Promise(r=>setTimeout(r,5));return Response.json(body);});const service=new DictionaryService(db,api);
 await db.entries.add(sample());assert.equal((await service.lookup('hobby')).source,'local');assert.equal(calls,0);
 await Promise.all([service.lookup('test'),service.lookup('TEST')]);assert.equal(calls,1);assert.equal((await service.lookup('test')).source,'cache');
 await service.clearCache();assert.equal(await db.entries.count(),1);assert.equal(await db.progress.count(),0);
 }finally{await db.delete();}
});

test('HTML 404 is a provider response failure rather than a missing word',async()=>{
 const api=new FreeDictionary(async()=>new Response('<html>404</html>',{status:404,headers:{'Content-Type':'text/html'}}));
 await assert.rejects(api.lookup('hobby'),(e:unknown)=>e instanceof LookupError&&e.code==='invalid-response');
});
