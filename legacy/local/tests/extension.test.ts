import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CaptureQueue} from '../../../extension/queue';
import {VocabDB} from '../src/storage/db';
import {PersonalService} from '../src/services/personal';
import {TransferService} from '../src/services/transfer';
import {sample} from '../../../tests/fixtures';
const item=()=>({entry:{...sample(),id:'personal-x',collectionId:'personal'},capture:{id:'capture-x',entryId:'personal-x',selectedText:'hobby',originalSentence:'My hobby is reading.',sourceUrl:'https://example.org',capturedAt:0}});
test('queue uses durable storage, serializes concurrent saves and preserves items when write fails',async()=>{
 const store=new Map<string,unknown>();let fail=false;const storage={get:async(key:string)=>structuredClone(store.get(key)),set:async(key:string,value:unknown)=>{if(fail)throw Error('quota');store.set(key,structuredClone(value));}};
 const q=new CaptureQueue(storage);await Promise.all([q.save(item()),q.save(item())]);assert.equal((await new CaptureQueue(storage).list()).length,1);
 fail=true;await assert.rejects(q.save({...item(),capture:{...item().capture,id:'new'}}));assert.equal((await q.list()).length,1);
});
test('lost ACK retries safely; capture commits once and never creates progress',async()=>{
 const db=new VocabDB(crypto.randomUUID());try{
 const store=new Map<string,unknown>();const q=new CaptureQueue({get:async k=>store.get(k),set:async(k,v)=>{store.set(k,v);}});await q.save(item());let loseAck=true;
 const bridge={request:async(message:Record<string,unknown>)=>{if(message.type==='queue-transfer')return {ok:true,value:{protocol:1,type:'capture-transfer',transferId:'transfer',captures:await q.list()}};if(loseAck)return {ok:false};await q.acknowledge(message.captureIds as string[]);return {ok:true};}};
 const transfer=new TransferService(new PersonalService(db),bridge);assert.equal((await transfer.receive()).ackPending,true);assert.equal((await q.list()).length,1);loseAck=false;await transfer.receive();assert.equal((await q.list()).length,0);assert.equal(await db.captures.count(),1);assert.equal(await db.progress.count(),0);
 }finally{await db.delete();}
});
