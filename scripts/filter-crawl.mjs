import {spawnSync} from 'node:child_process';
// Offline by default. Archive current working results before regenerating staging.
const steps=[['scripts/archive-crawl.mjs'],['--import','tsx','scripts/crawl-api.mjs'],['--import','tsx','scripts/crawl-bulk.mjs'],['--import','tsx','scripts/crawl-sentences.mjs'],['--import','tsx','scripts/crawl-cc0.mjs'],['--import','tsx','scripts/crawl-cc0.mjs','--detailed'],['scripts/propose-crawl.mjs']];
for(const args of steps){const result=spawnSync(process.execPath,args,{stdio:'inherit',env:{...process.env,CRAWL_MAX_REQUESTS:'0'}});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);}
console.log('Offline candidates regenerated. Review proposals and select senses/examples before crawl:publish. Nothing was added to the learning database.');
