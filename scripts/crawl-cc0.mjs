import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {splitSourceExample} from './lib/crawl.ts';
const detailed=process.argv.includes('--detailed');
const label=detailed?'detailed':'cc0',file='.crawl-cache/'+(detailed?'eng_sentences_detailed.tsv.bz2':'eng_sentences_CC0.tsv.bz2'),data=await readFile(file),metadata=JSON.parse(await readFile(file+'.json','utf8'));
if(!metadata.complete||createHash('sha256').update(data).digest('hex')!==metadata.sha256)throw Error('CC0 source checksum mismatch');
const child=spawn('bzip2',['-dc',file],{stdio:['ignore','pipe','pipe']});
const exit=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>code===0?resolve():reject(Error('Sentence decompression failed')));});
child.stderr.resume();const rows=createInterface({input:child.stdout,crlfDelay:Infinity});
const seeds=JSON.parse(await readFile('content/crawl/seeds.json','utf8'));
const words=[...new Set(seeds.topics.flatMap(t=>t.words).map(w=>w.toLowerCase()))];
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const pattern=new RegExp('(?<![\\p{L}\\p{N}_])(?:'+words.slice().sort((a,b)=>b.length-a.length).map(escape).join('|')+')(?![\\p{L}\\p{N}_])','giu');
const pool=new Map(words.map(w=>[w,[]]));let records=0;
for await(const row of rows){if(!row.trim())continue;const fields=row.split('\t'),[id,lang,text]=fields,owner=detailed?fields[3]:null,modified=detailed?fields[5]:fields[3];if(!/^\d+$/u.test(id)||lang!=='eng'||!text||!modified||fields.length!==(detailed?6:4))throw Error('Invalid source sentence row');records++;
 if(detailed&&(!owner||owner==='\\N'))continue;
 if(text.length>180||/\b(fuck|shit|kill|rape|suicide|nigger|bitch)\w*\b/iu.test(text))continue;
 const matched=new Set([...text.matchAll(pattern)].map(m=>m[0].toLowerCase()));
 for(const word of matched){const example=splitSourceExample(text,word);if(!example)continue;const list=pool.get(word);list.push({...example,source:{provider:metadata.provider,url:'https://tatoeba.org/en/sentences/show/'+id,license:metadata.license,licenseUrl:metadata.licenseUrl,attribution:'Tatoeba sentence #'+id+(detailed?' by '+owner:'; exported as CC0')+'; last modified '+modified}});if(list.length>80){list.sort((a,b)=>a.text.length-b.text.length);list.length=40;}}
}
await exit;
for(const [word,examples] of pool)pool.set(word,[...new Map(examples.map(e=>[e.text,e])).values()].sort((a,b)=>a.text.length-b.text.length).slice(0,40));
await writeFile('content/crawl/'+label+'-example-pool.json',JSON.stringify({schemaVersion:1,source:metadata,records,words:Object.fromEntries(pool)},null,2)+'\n');
const stage=JSON.parse(await readFile('content/crawl/combined-candidates.json','utf8'));let augmented=0;
for(const candidate of stage.candidates){const examples=pool.get(candidate.headword.toLowerCase())||[];if(!examples.length)continue;candidate.examples=[...new Map([...candidate.examples,...examples].map(e=>[e.id,e])).values()];candidate.issues=candidate.issues.filter(i=>i!=='missing-sentence-example');candidate.issues.push(label+'-sentence-sense-alignment-needs-review');augmented++;}
await writeFile('content/crawl/combined-candidates.json',JSON.stringify(stage,null,2)+'\n');
const report={schemaVersion:1,sourceSha256:metadata.sha256,records,matchedWords:[...pool.values()].filter(e=>e.length).length,missingWords:[...pool].filter(([,e])=>!e.length).map(([w])=>w),augmentedCandidates:augmented,reviewStatus:'Exact word matches only; meaning/POS/context must be reviewed before publication.'};await writeFile('content/crawl/'+label+'-run.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
