import {snapshotSchema} from '../src/services/snapshot';
import {normalizeAnswer} from '../src/domain/grading';
import {CaptureQueue} from './queue';
import {WiktionaryDictionary} from '../src/dictionary/wiktionaryDictionary';
import {z} from 'zod';
const queue=new CaptureQueue({get:async key=>(await chrome.storage.local.get(key))[key],set:async(key,value)=>{await chrome.storage.local.set({[key]:value});}});
const provider=new WiktionaryDictionary();
const pending=new Map<string,string[]>();
const messageSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('snapshot-update'),snapshot:z.unknown()}).strict(),
 z.object({type:z.literal('queue-save'),item:z.unknown()}).strict(),z.object({type:z.literal('queue-export')}).strict(),z.object({type:z.literal('queue-transfer')}).strict(),
 z.object({type:z.literal('queue-ack'),transferId:z.string(),captureIds:z.array(z.string()).max(500)}).strict(),z.object({type:z.literal('lookup'),query:z.string().max(120),forceOnline:z.boolean().optional()}).strict()
]);
function isLocal(sender:ExtensionSender){try{return new URL(sender.url??'').origin==='http://localhost:5173';}catch{return false;}}
chrome.runtime.onMessage.addListener((raw,sender,respond)=>{
 if(sender.id!==chrome.runtime.id){respond({ok:false,error:'Untrusted sender'});return false;}
 const parsed=messageSchema.safeParse(raw);if(!parsed.success){respond({ok:false,error:'Invalid message'});return false;}
 const message=parsed.data;
 void (async()=>{
  if(message.type==='queue-save')return queue.save(message.item);
  if(message.type==='lookup'){
   const key=normalizeAnswer(message.query);
   if(!message.forceOnline){
    const raw=(await chrome.storage.local.get('snapshot')).snapshot;
    const snapshot=snapshotSchema.safeParse(raw);
    const entries=snapshot.success?snapshot.data.entries.filter(e=>normalizeAnswer(e.headword)===key):[];
    if(entries.length)return {query:key,source:'local',senses:entries.map(e=>({entryId:e.id,partOfSpeech:e.partOfSpeech,definition:e.meaningVi,example:e.examples[0]?e.examples[0].prefix+e.examples[0].targetSurface+e.examples[0].suffix:null,sourceUrls:e.provenance.map(s=>s.url).filter(Boolean),licenses:e.provenance.map(s=>({name:s.license,url:s.url}))})),phonetics:entries.filter(e=>e.pronunciation.ipa).map(e=>({text:e.pronunciation.ipa,audio:null,accent:e.pronunciation.accent}))};
   }
   // Worker cache is independent from the web cache, and survives suspension.
   const rawCache=(await chrome.storage.local.get('lookupCache')).lookupCache;
   const cached=Array.isArray(rawCache)?rawCache.filter(x=>x&&typeof x==='object'&&'query' in x):[];
   const found=cached.find(x=>x.query===key);
   if(found&&!message.forceOnline)return {...found,source:'cache'};
   const result=await provider.lookup(message.query);
   try{await chrome.storage.local.set({lookupCache:[...cached.filter(x=>x.query!==result.query),result].slice(-500)});}catch{/* Optional cache must not hide a successful lookup. */}
   return result;
  }
  if(message.type==='queue-export')return {protocol:1,type:'capture-transfer',transferId:crypto.randomUUID(),captures:await queue.list()};
  if(!isLocal(sender))throw Error('Transfer only allowed on http://localhost:5173');
  if(message.type==='snapshot-update'){
   const snapshot=snapshotSchema.parse(message.snapshot);
   if(new TextEncoder().encode(JSON.stringify(snapshot)).length>8_000_000)throw Error('Snapshot too large');
   const old=snapshotSchema.safeParse((await chrome.storage.local.get('snapshot')).snapshot);
   if(old.success&&old.data.version>snapshot.version)throw Error('Snapshot is stale');
   await chrome.storage.local.set({snapshot});return {updated:true,version:snapshot.version};
  }
  if(message.type==='queue-transfer'){
   if(pending.size>100)pending.clear();
   const captures=await queue.list(),transferId=crypto.randomUUID();pending.set(transferId,captures.map(x=>x.capture.id));return {protocol:1,type:'capture-transfer',transferId,captures};
  }
  const expected=pending.get(message.transferId);
  if(!expected||message.captureIds.length!==expected.length||new Set(message.captureIds).size!==expected.length||message.captureIds.some(id=>!expected.includes(id)))throw Error('Unexpected ACK');
  const result=await queue.acknowledge(message.captureIds);pending.delete(message.transferId);return result;
 })().then(value=>respond({ok:true,value}),error=>respond({ok:false,error:error instanceof Error?error.message:'Extension operation failed'}));
 return true;
});
