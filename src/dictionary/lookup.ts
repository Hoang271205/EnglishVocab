import {normalizeAnswer} from '../domain/grading';
import {VocabDB} from '../storage/db';
import {queryKey,LookupError} from './freeDictionary';
import {WiktionaryDictionary} from './wiktionaryDictionary';
import type {LookupProvider,LookupResult} from './freeDictionary';
export class DictionaryService {
 private pending=new Map<string,Promise<LookupResult>>();
 constructor(private readonly db:VocabDB,private readonly provider:LookupProvider=new WiktionaryDictionary(),private readonly now=()=>Date.now()){}
 async lookup(word:string,options:{forceOnline?:boolean;signal?:AbortSignal}={}):Promise<LookupResult>{
  const key=queryKey(word);
  if(!options.forceOnline){
   const local=(await this.db.entries.toArray()).filter(e=>normalizeAnswer(e.headword)===normalizeAnswer(key));
   if(local.length)return {query:key,source:'local',senses:local.map(e=>({entryId:e.id,partOfSpeech:e.partOfSpeech,definition:e.meaningVi,example:e.examples[0]?e.examples[0].prefix+e.examples[0].targetSurface+e.examples[0].suffix:null,sourceUrls:e.provenance.map(s=>s.url).filter((s):s is string=>!!s),licenses:e.provenance.map(s=>({name:s.license,url:s.url}))})),phonetics:local.filter(e=>e.pronunciation.ipa).map(e=>({text:e.pronunciation.ipa,audio:null,accent:e.pronunciation.accent,sourceUrl:e.provenance.find(s=>s.field==='ipa')?.url??null,license:null}))};
   try{const cached=await this.db.lookupCache.get(key);if(cached){await this.db.lookupCache.update(key,{accessedAt:this.now()});return {...cached.payload as LookupResult,source:'cache'};}}catch{/* Cache is optional. */}
  }
  const enabled=await this.db.settings.get('onlineLookupEnabled');if(enabled?.value===false)throw new LookupError('network','Online lookup disabled');
  if(!options.signal&&this.pending.has(key))return this.pending.get(key)!;
  const promise=this.provider.lookup(key,options.signal).then(async result=>{
   try{await this.db.transaction('rw',this.db.lookupCache,async()=>{const now=this.now();await this.db.lookupCache.put({key,fetchedAt:now,accessedAt:now,payload:result});const excess=await this.db.lookupCache.count()-500;if(excess>0){const remove=await this.db.lookupCache.orderBy('accessedAt').limit(excess).primaryKeys();await this.db.lookupCache.bulkDelete(remove);}});}catch{/* Lookup can succeed when optional cache is full. */}
   return result;
  }).finally(()=>{if(!options.signal)this.pending.delete(key);});
  if(!options.signal)this.pending.set(key,promise);return promise;
 }
 async clearCache(){await this.db.lookupCache.clear();}
}
