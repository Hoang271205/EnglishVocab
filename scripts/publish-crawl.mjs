import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import {promoteCandidate,selectionSchema} from './lib/crawl.ts';
import {contentSchema} from '../src/content/schema.ts';
const input=process.argv[2]||'content/crawl/selections.json',write=process.argv.includes('--write');
const selections=JSON.parse(await readFile(input,'utf8')).selections.map(s=>selectionSchema.parse(s));
const stage=JSON.parse(await readFile('content/crawl/combined-candidates.json','utf8'));
const candidates=new Map(stage.candidates.map(c=>[c.id,c]));
const catalog=JSON.parse(await readFile('content/catalog.json','utf8'));
const groups=new Map();
for(const selection of selections){
 const candidate=candidates.get(selection.candidateId);if(!candidate)throw Error('Unknown selected candidate');
 const entry=promoteCandidate(candidate,selection,selection.exampleCandidateId?candidates.get(selection.exampleCandidateId):undefined);
 const topic=catalog.find(t=>t.id===selection.topicId);if(!topic)throw Error('Unknown topic');
 const group=groups.get(topic.id)||{topic,entries:new Map()};group.entries.set(entry.id,entry);groups.set(topic.id,group);
}
const outputs=[];
for(const {topic,entries:newEntries} of groups.values()){
 const range=topic.order<=55?'011-055':'056-100';if(topic.order<=10)throw Error('Pilot topics are curated separately');
 const path='public/content/'+topic.collectionId+'/topics-'+range+'/crawled-'+topic.id+'.json';let old;
 try{old=contentSchema.parse(JSON.parse(await readFile(path,'utf8')));}catch(error){if(error.code!=='ENOENT')throw error;}
 if(!old){const index=JSON.parse(await readFile('public/content/index.json','utf8'));for(const pack of index.packs){const existing=contentSchema.parse(JSON.parse(await readFile('public'+pack.url,'utf8')));if(existing.topics.some(t=>t.id===topic.id&&t.entryIds.length))throw Error('Topic already populated by a different pack: '+topic.id);}}
 const entries=new Map((old?.entries||[]).map(e=>[e.id,e]));
 for(const [id,next] of newEntries){const previous=entries.get(id);if(previous){next.revision=previous.revision;if(JSON.stringify(next)!==JSON.stringify(previous))next.revision++;}entries.set(id,next);}
 const list=[...entries.values()].sort((a,b)=>a.id.localeCompare(b.id));
 const version='crawl-'+topic.id+'-'+createHash('sha256').update(JSON.stringify(list)).digest('hex').slice(0,12);
 const pack=contentSchema.parse({schemaVersion:1,contentVersion:version,entries:list,topics:[{...topic,entryIds:list.map(e=>e.id)}]});outputs.push({path,pack});
}
// Validate every output before writing any topic file; database/progress is never touched.
if(write)for(const {path,pack} of outputs){await mkdir(dirname(path),{recursive:true});const temporary=path+'.tmp';await writeFile(temporary,JSON.stringify(pack,null,2)+'\n');await rename(temporary,path);}
console.log(JSON.stringify({write,selections:selections.length,topics:outputs.length,files:outputs.map(o=>o.path),entries:outputs.reduce((n,o)=>n+o.pack.entries.length,0)}));
