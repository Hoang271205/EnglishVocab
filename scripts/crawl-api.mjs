import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseApiCandidates,apiSourceSchema} from './lib/crawl.ts';
const seedFile=process.argv[2]||'content/crawl/seeds.json',maxRequests=Number(process.env.CRAWL_MAX_REQUESTS||50);
if(!Number.isInteger(maxRequests)||maxRequests<0||maxRequests>800)throw Error('CRAWL_MAX_REQUESTS must be 0–800');
const seeds=JSON.parse(await readFile(seedFile,'utf8'));
const cache=new URL('../.crawl-cache/api/',import.meta.url),stage=new URL('../content/crawl/',import.meta.url);
await mkdir(cache,{recursive:true});await mkdir(stage,{recursive:true});
const words=[...new Set(seeds.topics.flatMap(t=>t.words).map(w=>w.normalize('NFKC').trim().toLowerCase()))];
if(words.some(w=>!/^\p{L}[\p{L}\s'’\-]*$/u.test(w)||w.length>120))throw Error('Invalid seed query');
let requests=0,reused=0;const candidates=[],missing=[],deferred=[];let failure=null;
let cursor=0,completed=0;
async function worker(){while(cursor<words.length){
 const word=words[cursor++];
 const file=new URL(createHash('sha256').update(word).digest('hex')+'.json',cache);let record;
 try{record=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 if(record)reused++;
 else if(requests>=maxRequests||failure){deferred.push(word);continue;}
 else{
  const url='https://freedictionaryapi.com/api/v1/entries/en/'+encodeURIComponent(word)+'?translations=true';requests++;
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(15000),credentials:'omit',headers:{'User-Agent':'EnglishVocab-personal-study/0.1'}});
   if(response.status===429)throw Error('API rate limited; Retry-After='+response.headers.get('retry-after'));
   if(!(response.headers.get('content-type')||'').includes('application/json'))throw Error('Non-JSON provider response');
   if(response.status!==404&&!response.ok)throw Error('Provider HTTP '+response.status);
   const body=await response.json();if(response.ok)apiSourceSchema.parse(body);
   record={schemaVersion:1,url,retrievedAt:Date.now(),status:response.status,body};
   const temporary=new URL(file.href+'.tmp');await writeFile(temporary,JSON.stringify(record));await rename(temporary,file);
  }catch(error){failure={word,message:error.message};deferred.push(word);continue;}
 }
 if(record.status===404){missing.push(word);continue;}
 candidates.push(...parseApiCandidates(record.body,record.retrievedAt));
 completed++;if(completed%25===0)console.log(JSON.stringify({completed,requests,reused,candidates:candidates.length}));
}}
await Promise.all(Array.from({length:3},()=>worker()));
const unique=[...new Map(candidates.map(c=>[c.id,c])).values()];
const assignments=seeds.topics.flatMap(t=>unique.filter(c=>t.words.map(w=>w.toLowerCase()).includes(c.headword.toLowerCase())).map(c=>({topicId:t.topicId,candidateId:c.id,cefrProposal:t.cefrEstimate,reviewStatus:'needs-review'})));
const report={schemaVersion:1,mode:'source-crawl; staging only',productionWrite:false,seedWords:words.length,requests,reused,candidates:unique.length,sourceBackedVietnamese:unique.filter(c=>c.meaningViOptions.length).length,sourceBackedSentence:unique.filter(c=>c.examples.length).length,completeCandidates:unique.filter(c=>c.meaningViOptions.length&&c.examples.length).length,missing,deferred,failure};
await writeFile(new URL('api-candidates.json',stage),JSON.stringify({schemaVersion:1,candidates:unique,assignments},null,2)+'\n');await writeFile(new URL('api-run.json',stage),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
if(failure)process.exitCode=1;
