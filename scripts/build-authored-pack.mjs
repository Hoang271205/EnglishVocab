import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import {contentSchema} from '../src/content/schema.ts';
const [source,output,version]=process.argv.slice(2);
if(!source||!output||!version)throw Error('Usage: npm run content:build -- source.txt output.json content-version');
const catalog=JSON.parse(await readFile(new URL('../content/catalog.json',import.meta.url),'utf8'));
const topics=new Map(),entries=new Map();let topic;
for(const [index,line] of (await readFile(source,'utf8')).split(/\r?\n/u).entries()){
 if(!line.trim())continue;
 if(line.startsWith('# ')){
  const id=line.slice(2).trim(),found=catalog.find(t=>t.id===id);if(!found||topics.has(id))throw Error('Unknown/duplicate topic at line '+(index+1));
  topic={...found,entryIds:[]};topics.set(id,topic);continue;
 }
 const fields=line.split('|');if(!topic||fields.length!==5)throw Error('Expected topic + 5 fields at line '+(index+1));
 const [headword,partOfSpeech,level,meaningVi,sentence]=fields;
 const targets=[...sentence.matchAll(/\[([^\[\]]+)\]/gu)];if(targets.length!==1||targets[0][1]!==headword)throw Error('Mark exactly the headword at line '+(index+1));
 const target=targets[0],id='word-'+createHash('sha256').update([headword,partOfSpeech,meaningVi].join('|')).digest('hex').slice(0,20);
 const provenance=['meaning','example','cefr'].map(field=>({field,attribution:'EnglishVocab – nội dung tự biên soạn cho học cá nhân; chưa đối chiếu từ điển',license:'Original content for personal use',url:null,status:'authored',checkedAt:null}));
 const entry={id,revision:1,collectionId:topic.collectionId,headword,partOfSpeech,senseKey:id,meaningVi,acceptedLearnAnswers:[headword],cefr:{level,status:'estimated',note:'Ước lượng theo cách dùng trong mục từ; chưa đối chiếu nguồn CEFR theo nghĩa.'},pronunciation:{ipa:null,accent:null},examples:[{id:id+'-example',prefix:sentence.slice(0,target.index),targetSurface:headword,suffix:sentence.slice(target.index+target[0].length),acceptedAnswers:[headword]}],provenance,contentStatus:'ready'};
 if(entries.has(id))throw Error('Duplicate sense in source; reuse an existing entry explicitly');
 entries.set(id,entry);topic.entryIds.push(id);
}
const pack=contentSchema.parse({schemaVersion:1,contentVersion:version,entries:[...entries.values()],topics:[...topics.values()]});
// Refuse overwriting a curated/enriched pack; source changes need an explicit revision/import workflow.
try{await readFile(output);throw Error('Output exists; choose a new output path to preserve curated revisions');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(pack,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({entries:pack.entries.length,topics:pack.topics.length,output}));
