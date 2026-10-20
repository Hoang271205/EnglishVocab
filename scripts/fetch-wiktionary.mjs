import {mkdir,readFile,writeFile,stat,rename} from 'node:fs/promises';
import {createWriteStream,createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
import {createGunzip} from 'node:zlib';
const url='https://kaikki.org/dictionary/downloads/vi/vi-extract.jsonl.gz';
const dir=new URL('../.crawl-cache/',import.meta.url);await mkdir(dir,{recursive:true});
const part=new URL('vi-extract.jsonl.gz.part',dir),file=new URL('vi-extract.jsonl.gz',dir),metaFile=new URL('source.json',dir);
let offset=0,previous=null;try{previous=JSON.parse(await readFile(metaFile,'utf8'));}catch{/* First download. */}
try{offset=(await stat(part)).size;}catch{/* No partial file. */}
if(previous?.complete){try{if((await stat(file)).size===previous.bytes){console.log(JSON.stringify({reused:true,...previous}));process.exit(0);}}catch{/* Re-download if file is missing. */}}
const headers={'User-Agent':'EnglishVocab-personal-study/0.1 (one resumable bulk download)','Accept':'application/octet-stream'};
if(offset){headers.Range='bytes='+offset+'-';if(previous?.etag)headers['If-Range']=previous.etag;}
const response=await fetch(url,{headers,signal:AbortSignal.timeout(1_800_000)});
if(!response.ok||!response.body)throw Error('Bulk source returned '+response.status);
if(response.status!==206)offset=0;
if(response.status===206&&!response.headers.get('content-range')?.startsWith('bytes '+offset+'-'))throw Error('Invalid resume offset');
const metadata={provider:'Kaikki / Vietnamese Wiktionary',url,etag:response.headers.get('etag'),lastModified:response.headers.get('last-modified'),complete:false};
await writeFile(metaFile,JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({downloading:url,resumingAt:offset}));
await pipeline(Readable.fromWeb(response.body),createWriteStream(part,{flags:offset?'a':'w'}));
const hash=createHash('sha256');for await(const chunk of createReadStream(part))hash.update(chunk);
// Validate gzip checksum before declaring a complete source. No progress/content DB is touched.
for await(const _chunk of createReadStream(part).pipe(createGunzip())){void _chunk;/* Streaming CRC validation. */}
const size=(await stat(part)).size;if(size>100_000_000)throw Error('Unexpected bulk source size');
await rename(part,file);await writeFile(metaFile,JSON.stringify({...metadata,complete:true,bytes:size,sha256:hash.digest('hex'),fetchedAt:Date.now()},null,2)+'\n');console.log('Bulk source downloaded and gzip checksum validated');
