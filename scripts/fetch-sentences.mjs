import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const detailed=process.argv.includes('--detailed');
const filename=detailed?'eng_sentences_detailed.tsv.bz2':'eng_sentences_CC0.tsv.bz2';
const url='https://downloads.tatoeba.org/exports/per_language/eng/'+filename;
const file='.crawl-cache/'+filename,meta=file+'.json';await mkdir('.crawl-cache',{recursive:true});
async function hash(path){const h=createHash('sha256');for await(const c of createReadStream(path))h.update(c);return h.digest('hex');}
let previous;try{previous=JSON.parse(await readFile(meta,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(previous?.complete&&await hash(file)===previous.sha256){console.log(JSON.stringify({reused:true,...previous}));process.exit(0);}
const response=await fetch(url,{signal:AbortSignal.timeout(300000),headers:{'User-Agent':'EnglishVocab-personal-study/0.1 (bulk source retained locally)'}});if(!response.ok||!response.body)throw Error('Sentence export HTTP '+response.status);
let bytes=0;const limit=async function*(source){for await(const chunk of source){bytes+=chunk.length;if(bytes>100_000_000)throw Error('Unexpected sentence export size');yield chunk;}};
await pipeline(Readable.fromWeb(response.body),limit,createWriteStream(file+'.part'));
execFileSync('bzip2',['-t',file+'.part'],{stdio:'pipe'});const sha256=await hash(file+'.part');await rename(file+'.part',file);
const metadata={schemaVersion:1,provider:detailed?'Tatoeba English detailed export':'Tatoeba English CC0 export',url,license:detailed?'CC BY 2.0 FR':'CC0 1.0',licenseUrl:detailed?'https://creativecommons.org/licenses/by/2.0/fr/':'https://creativecommons.org/publicdomain/zero/1.0/',sha256,bytes,retrievedAt:Date.now(),lastModified:response.headers.get('last-modified'),complete:true};await writeFile(meta,JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify(metadata));
