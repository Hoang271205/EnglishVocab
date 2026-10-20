import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,symlink,rm,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
// JS launcher is tested in its actual Node process; no copied server implementation.
test('launcher serves correct MIME, blocks outside symlinks and refuses occupied port',async()=>{
 const root=await mkdtemp(join(tmpdir(),'englishvocab-launcher-'));let child:ReturnType<typeof spawn>|undefined;
 try{
  await mkdir(join(root,'dist'));await writeFile(join(root,'dist/index.html'),'<h1>fixture</h1>');await writeFile(join(root,'outside.txt'),'private');await symlink(join(root,'outside.txt'),join(root,'dist/leak.txt'));
  child=spawn(process.execPath,[new URL('../scripts/serve.mjs',import.meta.url).pathname],{cwd:root,stdio:['ignore','pipe','pipe']});
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server timeout')),5000);child!.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code));});child!.stdout!.once('data',()=>{clearTimeout(timer);resolve();});});
  const page=await fetch('http://localhost:5173');assert.match(page.headers.get('content-type')!,/text\/html/);assert.match(await page.text(),/fixture/);
  assert.equal((await fetch('http://localhost:5173/leak.txt')).status,404);
  const second=spawn(process.execPath,[new URL('../scripts/serve.mjs',import.meta.url).pathname],{cwd:root});let error='';second.stderr.on('data',d=>{error+=d;});assert.equal(await new Promise(r=>second.once('exit',r)),1);assert.match(error,/5173/);
  assert.equal(await readFile(join(root,'outside.txt'),'utf8'),'private');
 }finally{if(child&&child.exitCode===null){const closed=new Promise(r=>child!.once('exit',r));child.kill();await closed;}await rm(root,{recursive:true,force:true});}
});
