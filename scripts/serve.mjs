import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
export async function startServer(directory=resolve('dist'),port=5173){
 const root=await realpath(directory).catch(()=>{throw Error('Chưa có bản build. BE đang được xây dựng; chưa có giao diện để chạy.');});
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.png':'image/png'};
 const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-cache');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(pathname.includes('\0'))throw Error('Invalid path');
   const candidate=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
   const file=await realpath(candidate);
   if(!file.startsWith(root+sep))throw Error('Forbidden');
   if(!(await stat(file)).isFile())throw Error('Not a file');
   const data=await readFile(file);res.setHeader('Content-Type',types[extname(file)]??'application/octet-stream');res.writeHead(200);res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'localhost',resolve);});return server;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 try{await startServer();console.log('EnglishVocab: http://localhost:5173');if(process.argv.includes('--open')){const command=process.platform==='darwin'?'open':process.platform==='win32'?'cmd.exe':'xdg-open';const args=process.platform==='win32'?['/c','start','','http://localhost:5173']:['http://localhost:5173'];const child=spawn(command,args,{stdio:'ignore'});child.on('error',()=>console.warn('Mở thủ công http://localhost:5173 trong trình duyệt.'));child.unref();}}catch(e){console.error(e.code==='EADDRINUSE'?'Cổng 5173 đang bận; hãy dừng phiên đang chạy.':e.message);process.exitCode=1;}
}
