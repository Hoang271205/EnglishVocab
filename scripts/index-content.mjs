import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {contentSchema} from '../src/content/schema.ts';
const base=new URL('../public/content/',import.meta.url),files=[];
async function walk(url){for(const entry of await readdir(url,{withFileTypes:true})){const child=new URL(entry.name+(entry.isDirectory()?'/':''),url);if(entry.isDirectory())await walk(child);else if(entry.name.endsWith('.json'))files.push(child);}}
await walk(base);
const packs=[],entries=new Map(),topics=new Map();
for(const file of files.sort((a,b)=>a.pathname.localeCompare(b.pathname))){
 if(!/\/(pilot|ielts|daily)\//u.test(file.pathname))continue;
 const bytes=await readFile(file),pack=contentSchema.parse(JSON.parse(bytes.toString('utf8')));
 for(const entry of pack.entries){const old=entries.get(entry.id);if(old&&JSON.stringify(old)!==JSON.stringify(entry))throw Error('Conflicting entry across packs: '+entry.id);entries.set(entry.id,entry);}
 for(const topic of pack.topics){const old=topics.get(topic.id);if(old?.entryIds.length&&topic.entryIds.length&&JSON.stringify(old)!==JSON.stringify(topic))throw Error('Conflicting topic across packs: '+topic.id);if(!old||topic.entryIds.length)topics.set(topic.id,topic);}
 packs.push({url:'/content/'+file.pathname.slice(base.pathname.length),contentVersion:pack.contentVersion,entries:pack.entries.length,slots:pack.topics.reduce((n,t)=>n+t.entryIds.length,0),sha256:createHash('sha256').update(bytes).digest('hex')});
}
const list=[...entries.values()],catalog=[...topics.values()];
const stats={targetSlots:2000,slots:catalog.reduce((n,t)=>n+t.entryIds.length,0),uniqueEntries:list.length,topicShells:catalog.length,populatedTopics:catalog.filter(t=>t.entryIds.length).length,estimatedCefr:list.filter(e=>e.cefr.status==='estimated').length,verifiedCefr:list.filter(e=>e.cefr.status==='verified').length,missingIPA:list.filter(e=>!e.pronunciation.ipa).length};
const output={schemaVersion:1,packs,stats};await writeFile(new URL('index.json',base),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(stats));
