import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { contentSchema } from '../src/content/schema.ts';
import { compareTopics } from '../src/domain/topic-order.ts';
import { buildPart2Plan } from '../server/src/scripts/part2-import-plan.ts';

const root='content/crawl/part2-release-2026-11-20';
const bytes=await readFile(`${root}/content.json`);
const pack=contentSchema.parse(JSON.parse(bytes.toString('utf8')));
const catalog=JSON.parse(await readFile('content/catalog.json','utf8'));
const ledger=JSON.parse(await readFile(`${root}/editorial-review.json`,'utf8'));
const errors=[],baseline=new Map(),rawEntries=new Map();
const hash=value=>createHash('sha256').update(value).digest('hex');
async function scan(path){
 for(const item of await readdir(path,{withFileTypes:true})){
  const file=`${path}/${item.name}`;
  if(item.isDirectory())await scan(file);
  else if(item.name.endsWith('.json')){
   const value=JSON.parse(await readFile(file,'utf8'));
   for(const entry of value.entries??[])baseline.set(entry.id,{_id:entry.id,...entry});
  }
 }
}
await scan('public/content');
await scan('content/crawl/review-2026-11-17-import-10-per-topic-revised/publish-packs');
for(const parent of catalog){
 const raw=JSON.parse(await readFile(`content/crawl/research-part2-2026-11-20/${parent.collectionId}/${parent.id}-part-2.json`,'utf8'));
 for(const e of raw.entries)rawEntries.set(e.id,e);
}
const plan=buildPart2Plan({package:pack,catalog,snapshot:{entries:[...baseline.values()],topics:catalog.map(t=>({_id:t.id,...t}))}});
let edited=0,hasIpa=0,heldIpa=0;
const inputHashes={};
for(const entry of pack.entries){
 const raw=rawEntries.get(entry.id);if(!raw){errors.push(`Missing draft ${entry.id}`);continue;}
 const fields=Object.fromEntries(['id','headword','partOfSpeech','meaningVi','example'].map(k=>[k,raw[k]]));
 const canonical='{'+Object.keys(fields).sort().map(k=>JSON.stringify(k)+': '+JSON.stringify(fields[k])).join(', ')+'}';
 inputHashes[entry.id]=hash(canonical);
 if(ledger.entries[entry.id]?.decision!=='reviewed-authored'||ledger.entries[entry.id]?.contentSha256!==inputHashes[entry.id])errors.push(`Review record mismatch ${entry.id}`);
 else edited++;
 for(const key of ['headword','partOfSpeech','meaningVi'])if(entry[key]!==raw[key])errors.push(`Draft mismatch ${entry.id}/${key}`);
 if(entry.examples.length!==1||entry.examples[0].prefix+entry.examples[0].targetSurface+entry.examples[0].suffix!==raw.example)errors.push(`Sentence changed ${entry.id}`);
 if(entry.pronunciation.ipa){
  hasIpa++;
  if(entry.pronunciation.ipa!==raw.ipa||!entry.provenance.some(s=>s.field==='ipa'&&s.url?.includes('dictionary.cambridge.org')))errors.push(`IPA without reviewed dictionary reference ${entry.id}`);
 }else if(raw.ipa)heldIpa++;
 if(entry.provenance.some(s=>s.status==='verified'))errors.push(`Unexpected verified assertion ${entry.id}`);
 if(entry.cefr.level!==null)errors.push(`Unexpected CEFR assertion ${entry.id}`);
}
if(edited!==2000)errors.push('Incomplete editorial review');
const ordered=[...catalog,...pack.topics].sort(compareTopics);
for(const c of ['ielts','daily']){
 const list=ordered.filter(t=>t.collectionId===c);
 if(list.length!==200)errors.push(`Incorrect UI part count ${c}`);
 for(let i=0;i<list.length;i+=2)if(list[i+1].parentTopicId!==list[i].id)errors.push(`UI pair mismatch ${c}/${i}`);
}
const result={mode:'offline-release-audit-no-database',sha256:hash(bytes),schema:'pass',topics:pack.topics.length,entries:pack.entries.length,editoriallyReviewedEntries:edited,reviewedDictionaryIpaIncluded:hasIpa,bulkIpaWithheld:heldIpa,cefrUnknown:pack.entries.filter(e=>e.cefr.level===null).length,topicPairs:200,newEntriesPlannedAgainstLocalBaseline:plan.entriesToInsert.length,newTopicsPlannedAgainstLocalBaseline:plan.topicsToInsert.length,sourceVerification:'Editorial review completed for all entries; dictionary verification is not asserted. Bulk IPA omitted; attribution retained.',errors};
await writeFile(`${root}/audit.json`,JSON.stringify(result,null,2)+'\n');
await writeFile(`${root}/reviewed-input-hashes.json`,JSON.stringify(inputHashes,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
