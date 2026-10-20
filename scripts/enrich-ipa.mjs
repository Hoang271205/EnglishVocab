import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {contentSchema} from '../src/content/schema.ts';
import {referencePronunciation} from '../src/content/pronunciation.ts';
import {WiktionaryDictionary} from '../src/dictionary/wiktionaryDictionary.ts';
import {LookupError} from '../src/dictionary/freeDictionary.ts';
// Explicit network utility; checkpointed responses prevent repeatedly consuming the API quota.
const path=process.argv[2];if(!path)throw Error('Usage: npm run enrich:ipa -- pack.json [--write]');
const write=process.argv.includes('--write'),pack=contentSchema.parse(JSON.parse(await readFile(path,'utf8')));
const cache=resolve('.dictionary-cache');await mkdir(cache,{recursive:true});
const provider=new WiktionaryDictionary(),unresolved=[],enriched=[];
let calls=0;
for(let i=0;i<pack.entries.length;i++){
 const entry=pack.entries[i];if(entry.pronunciation.ipa)continue;
 const file=resolve(cache,createHash('sha256').update(entry.headword.toLowerCase()).digest('hex')+'.json');
 let result;
 try{result=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 if(!result){
  try{result=await provider.lookup(entry.headword);calls++;await writeFile(file,JSON.stringify(result));}
  catch(error){
   if(error instanceof LookupError&&error.code==='not-found'){result={query:entry.headword,source:'api',senses:[],phonetics:[]};await writeFile(file,JSON.stringify(result));calls++;}
   else{console.error('Stopped without changing the pack:',entry.headword,error.message);throw error;}
  }
 }
 const next=referencePronunciation(entry,result);
 if(next){pack.entries[i]=next;enriched.push(entry.id);}else unresolved.push(entry.id);
 if((i+1)%25===0)console.log(JSON.stringify({processed:i+1,enriched:enriched.length,unresolved:unresolved.length,requests:calls}));
}
contentSchema.parse(pack);
if(write&&enriched.length){pack.contentVersion=pack.contentVersion+'-usipa1';const temporary=resolve(dirname(path),'.'+Date.now()+'.ipa.tmp');await writeFile(temporary,JSON.stringify(pack,null,2)+'\n');await rename(temporary,path);}
console.log(JSON.stringify({written:write&&enriched.length>0,entries:pack.entries.length,enriched:enriched.length,missingIPA:pack.entries.filter(e=>!e.pronunciation.ipa).length,requests:calls,unresolved}));
