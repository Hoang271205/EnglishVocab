import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {matchSentencePairs} from './lib/crawl.ts';
const file='.crawl-cache/vie-eng.zip',data=await readFile(file);
if(data.length>5_000_000)throw Error('Unexpected sentence archive size');
execFileSync('unzip',['-t',file],{stdio:'pipe',maxBuffer:100_000});
const raw=execFileSync('unzip',['-p',file,'vie.txt'],{encoding:'utf8',maxBuffer:10_000_000});
const pairs=raw.split(/\r?\n/u).filter(Boolean).map(line=>{const [english,vietnamese,attribution,...rest]=line.split('\t');if(!english||!vietnamese||!attribution||rest.length)throw Error('Malformed sentence pair');return {english,vietnamese,attribution};});
const inputs=await Promise.all(['api-candidates.json','bulk-candidates.json'].map(name=>readFile('content/crawl/'+name,'utf8').then(JSON.parse)));
const assignments=inputs.flatMap(x=>x.assignments),candidates=inputs.flatMap(x=>x.candidates);let joined=0;
for(const candidate of candidates){const examples=matchSentencePairs(candidate,pairs);
 if(examples.length){joined++;candidate.examples=[...new Map([...candidate.examples,...examples].map(e=>[e.id,e])).values()];candidate.issues=candidate.issues.filter(issue=>issue!=='missing-sentence-example');candidate.issues.push('cross-source-alignment-needs-review');}
}
const report={schemaVersion:1,productionWrite:false,sourceUrl:'https://www.manythings.org/anki/vie-eng.zip',sha256:createHash('sha256').update(data).digest('hex'),sentencePairs:pairs.length,candidates:candidates.length,joinedCandidates:joined,candidatesWithMeaningAndExample:candidates.filter(c=>c.meaningViOptions.length&&c.examples.length).length,wordsWithMeaningAndExample:new Set(candidates.filter(c=>c.meaningViOptions.length&&c.examples.length).map(c=>c.headword.toLowerCase())).size,reviewStatus:'Matching a literal Vietnamese anchor is a candidate filter, not automatic sense/topic verification.'};
await writeFile('content/crawl/combined-candidates.json',JSON.stringify({schemaVersion:1,candidates,assignments},null,2)+'\n');await writeFile('content/crawl/sentence-run.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
