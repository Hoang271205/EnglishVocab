import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WiktionaryDictionary} from '../src/dictionary/wiktionaryDictionary';
import {LookupError} from '../src/dictionary/freeDictionary';
const source={url:'https://en.wiktionary.org/wiki/read',license:{name:'CC BY-SA 4.0',url:'https://creativecommons.org/licenses/by-sa/4.0/'}};
const body={word:'read',source,entries:[{language:{code:'en'},partOfSpeech:'verb',pronunciations:[
 {type:'ipa',text:'/riːd/',tags:['Received Pronunciation']},{type:'ipa',text:'/rid/',tags:['General American']},
 {type:'ipa',text:'/rɛd/',tags:['Canada']},{type:'ipa',text:'/unknown/'},{type:'other',text:'not IPA'}
],senses:[{definition:'Understand written words',examples:['I read books.'],subsenses:[{definition:'Study a subject'}]}]}]};
test('Wiktionary preserves selected sense context, attribution, and only explicit US accents',async()=>{
 let requested='';const api=new WiktionaryDictionary(async input=>{requested=String(input);return Response.json(body);});
 const result=await api.lookup(' READ ');
 assert.equal(requested,'https://freedictionaryapi.com/api/v1/entries/en/read');
 assert.equal(result.provider?.name,'FreeDictionaryAPI.com');assert.equal(result.senses.length,2);
 assert.deepEqual(result.senses[1],{partOfSpeech:'verb',definition:'Study a subject',example:null,sourceUrls:[source.url],licenses:[source.license],phonetics:result.phonetics});
 assert.equal(result.senses[0]?.example,'I read books.');assert.equal(result.phonetics[0]?.accent,'en-US');assert.equal(result.phonetics[0]?.text,'/rid/');
 assert.equal(result.phonetics.filter(p=>p.accent==='en-US').length,1);assert.equal(result.phonetics.length,4);
 assert.equal('cefr' in result.senses[0]!,false);assert.equal('meaningVi' in result.senses[0]!,false);
});
test('Wiktionary rejects unsafe attribution and malformed responses without invented sources',async()=>{
 for(const data of [{...body,source:{...source,url:'javascript:alert(1)'}},{...body,source:null},{...body,entries:[]}]){
  const api=new WiktionaryDictionary(async()=>Response.json(data));
  await assert.rejects(api.lookup('read'),(e:unknown)=>e instanceof LookupError&&['invalid-response','not-found'].includes(e.code));
 }
 let calls=0;const api=new WiktionaryDictionary(async()=>{calls++;return Response.json(body);});
 await assert.rejects(api.lookup('https://evil.example'),(e:unknown)=>e instanceof LookupError&&e.code==='invalid-query');assert.equal(calls,0);
});
test('Wiktionary exposes rate, cancellation, timeout, HTTP and JSON failures without retries',async()=>{
 for(const [status,type,code] of [[429,'text/html','rate-limit'],[404,'application/json','not-found'],[530,'text/html','invalid-response'],[503,'application/json','network'],[200,'application/json','invalid-response']] as const){
  let calls=0;const api=new WiktionaryDictionary(async()=>{calls++;return new Response('broken',{status,headers:{'Content-Type':type,'Retry-After':'60'}});});
  await assert.rejects(api.lookup('read'),(e:unknown)=>e instanceof LookupError&&e.code===code&&(code!=='rate-limit'||e.retryAfterSeconds===60));assert.equal(calls,1);
 }
 const canceled=new AbortController();canceled.abort();
 const delayed:typeof fetch=async(_url,options)=>new Promise((_resolve,reject)=>{
  const signal=options?.signal;if(signal?.aborted)reject(signal.reason);else signal?.addEventListener('abort',()=>reject(signal.reason),{once:true});
 });
 await assert.rejects(new WiktionaryDictionary(delayed).lookup('read',canceled.signal),(e:unknown)=>e instanceof LookupError&&e.code==='aborted');
 // Keep an active timer because AbortSignal.timeout is unref'ed by Node.
 const keepAlive=setTimeout(()=>{},1000);
 try{await assert.rejects(new WiktionaryDictionary(delayed,5).lookup('read'),(e:unknown)=>e instanceof LookupError&&e.code==='timeout');}finally{clearTimeout(keepAlive);}
});

test('homographs retain pronunciation per selected part of speech',async()=>{
 const verb=body.entries[0]!;
 const noun={...verb,partOfSpeech:'noun',pronunciations:[{type:'ipa',text:'/noun/',tags:['General American']}],senses:[{definition:'Noun sense',examples:[],subsenses:[]}]};
 const result=await new WiktionaryDictionary(async()=>Response.json({...body,entries:[verb,noun]})).lookup('read');
 assert.equal(result.senses[0]?.phonetics?.some(p=>p.text==='/noun/'),false);
 assert.deepEqual(result.senses[2]?.phonetics?.map(p=>p.text),['/noun/']);
});

test('native fetch retains the global receiver in browser-style providers',async()=>{
 const request:typeof fetch=async function(this:unknown){assert.equal(this,globalThis);return Response.json(body);};
 await new WiktionaryDictionary(request).lookup('read');
});
