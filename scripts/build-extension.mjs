import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist-extension',{recursive:true});
await build({entryPoints:['extension/service-worker.ts','extension/bridge.ts'],outdir:'dist-extension',bundle:true,format:'iife',platform:'browser',target:'chrome120'});
await copyFile('extension/manifest.json','dist-extension/manifest.json');
console.log('Built dist-extension (backend worker/bridge; selection UI pending Gate-BE)');
