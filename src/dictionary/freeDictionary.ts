import {z} from 'zod';
export interface LookupSense {partOfSpeech:string;definition:string;example:string|null;entryId?:string;phonetics?:LookupResult['phonetics'];sourceUrls:string[];licenses:{name:string;url:string|null}[]}
export interface LookupProvider {lookup(value:string,signal?:AbortSignal):Promise<LookupResult>}
export interface LookupResult {provider?:{name:string;url:string};query:string;source:'local'|'cache'|'api';senses:LookupSense[];phonetics:{text:string|null;audio:string|null;accent:'en-US'|null;sourceUrl:string|null;license:{name:string;url:string|null}|null}[]}
export class LookupError extends Error {
 constructor(public readonly code:'invalid-query'|'not-found'|'rate-limit'|'network'|'timeout'|'aborted'|'invalid-response',message:string,public readonly retryAfterSeconds:number|null=null){super(message);this.name='LookupError';}
}
const license=z.object({name:z.string(),url:z.string().optional()});
const responseSchema=z.array(z.object({sourceUrls:z.array(z.string()).optional(),license:license.optional(),phonetics:z.array(z.object({text:z.string().optional(),audio:z.string().optional(),sourceUrl:z.string().optional(),license:license.optional()})).optional(),meanings:z.array(z.object({partOfSpeech:z.string(),definitions:z.array(z.object({definition:z.string(),example:z.string().optional()}))}))})).min(1);
export function queryKey(value:string):string {
 const q=value.normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('en-US');
 if(!q||q.length>120||!/^\p{L}[\p{L}\s'’\-]*$/u.test(q))throw new LookupError('invalid-query','Select a word or short phrase');return q;
}
function safeUrl(value:string|undefined):string|null {if(!value)return null;try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}}
export class FreeDictionary {
 constructor(private readonly request:typeof fetch=fetch,private readonly timeoutMs=8000){}
 async lookup(value:string,signal?:AbortSignal):Promise<LookupResult>{
  const query=queryKey(value),timer=AbortSignal.timeout(this.timeoutMs),combined=signal?AbortSignal.any([signal,timer]):timer;
  let response:Response;
  try{response=await this.request.call(globalThis,'https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(query),{signal:combined,credentials:'omit',referrerPolicy:'no-referrer'});}
  catch{if(signal?.aborted)throw new LookupError('aborted','Lookup canceled');if(timer.aborted)throw new LookupError('timeout','Dictionary timed out');throw new LookupError('network','Dictionary unavailable');}
  if(response.status===404){if(!(response.headers.get('content-type')??'').includes('application/json'))throw new LookupError('invalid-response','Dictionary returned an HTML error page');throw new LookupError('not-found','Word not found');}
  if(response.status===429){const raw=response.headers.get('Retry-After');const seconds=raw?(Number.isFinite(Number(raw))?Number(raw):Math.max(0,(Date.parse(raw)-Date.now())/1000)):null;throw new LookupError('rate-limit','Try again later',seconds!==null&&Number.isFinite(seconds)?Math.max(0,seconds):null);}
  if(!response.ok)throw new LookupError('network','Dictionary returned '+response.status);
  let body:unknown;try{body=await response.json();}catch{throw new LookupError('invalid-response','Invalid JSON');}
  const result=responseSchema.safeParse(body);if(!result.success)throw new LookupError('invalid-response','Unexpected dictionary response');
  return {query,source:'api',senses:result.data.flatMap(e=>e.meanings.flatMap(m=>m.definitions.map(d=>({partOfSpeech:m.partOfSpeech,definition:d.definition,example:d.example??null,sourceUrls:(e.sourceUrls??[]).map(s=>safeUrl(s)).filter((s):s is string=>s!==null),licenses:e.license?[{name:e.license.name,url:safeUrl(e.license.url)}]:[]})))),phonetics:result.data.flatMap(e=>(e.phonetics??[]).map(p=>({text:p.text??null,audio:safeUrl(p.audio),accent:null,sourceUrl:safeUrl(p.sourceUrl),license:p.license?{name:p.license.name,url:safeUrl(p.license.url)}:null})))};
 }
}
