import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {join} from 'node:path';
// Durable local source store: never delete originals or replace an existing snapshot.
const root='.crawl-archive',verify=process.argv.includes('--verify');
async function digest(path){return createHash('sha256').update(await readFile(path)).digest('hex');}
if(verify){
 const manifests=(await readdir(join(root,'manifests'))).filter(name=>name.endsWith('.json'));let checked=0;
 for(const name of manifests){const manifest=JSON.parse(await readFile(join(root,'manifests',name),'utf8'));
  for(const file of manifest.files){if(!/^[a-f0-9]{64}$/u.test(file.sha256))throw Error('Invalid archive hash');if(await digest(join(root,'objects',file.sha256))!==file.sha256)throw Error('Archive checksum mismatch: '+file.path);checked++;}
 }
 console.log(JSON.stringify({verified:true,snapshots:manifests.length,checkedFiles:checked}));
}else{
 await mkdir(join(root,'objects'),{recursive:true});await mkdir(join(root,'manifests'),{recursive:true});const files=[];
 async function collect(dir){for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=join(dir,entry.name);
  if(entry.isDirectory())await collect(path);
  else if(entry.isFile()&&!/\.(part|tmp)$/u.test(entry.name)){const sha256=await digest(path),target=join(root,'objects',sha256);
   try{await copyFile(path,target,constants.COPYFILE_EXCL);}catch(error){if(error.code!=='EEXIST')throw error;}
   if(await digest(target)!==sha256)throw Error('Archive checksum mismatch: '+path);
   files.push({path,sha256,bytes:(await readFile(path)).length});
  }
 }}
 await collect('.crawl-cache');await collect('content/crawl');
 const id=createHash('sha256').update(JSON.stringify(files)).digest('hex');
 const manifest={schemaVersion:1,createdAt:new Date().toISOString(),retention:'Keep indefinitely; no automatic cleanup. Objects contain exact source bytes. Manifest maps original paths to objects. Licenses and attribution remain inside the archived source and candidate records.',files};
 try{await writeFile(join(root,'manifests',id+'.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
 console.log(JSON.stringify({archived:true,snapshot:id,files:files.length,sourceBytes:files.reduce((n,f)=>n+f.bytes,0),originalsKept:true}));
}
