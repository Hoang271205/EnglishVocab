import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
const harness=new URL('../.browser-check/entry-audio.js',import.meta.url);await mkdir(new URL('../.browser-check/',import.meta.url),{recursive:true});
await build({entryPoints:['tests/audio-browser-harness.ts'],outfile:harness.pathname,bundle:true,format:'iife',platform:'browser'});
const server=createServer(async(req,res)=>{
 try{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><button id="tts">Test new personal word</button><script src="/entry-audio.js"></script>');}
 else if(req.url==='/entry-audio.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(harness));}
 else{res.statusCode=404;res.end();}}catch{res.statusCode=500;res.end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(5173,'localhost',resolve);});
let browser;
try{
 browser=await chromium.launch({headless:process.env.ENGLISHVOCAB_AUDIO_HEADFUL!=='1',executablePath:process.env.ENGLISHVOCAB_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext();
 // Simulate no Internet while the local server remains available.
 await context.route('**/*',route=>new URL(route.request().url()).origin==='http://localhost:5173'?route.continue():route.abort());
 const page=await context.newPage();await page.goto('http://localhost:5173');
 const voices=await page.evaluate(async()=>{const synth=speechSynthesis;await new Promise(resolve=>{const finish=()=>{clearTimeout(timer);synth.removeEventListener('voiceschanged',finish);resolve();};const timer=setTimeout(finish,3000);synth.addEventListener('voiceschanged',finish);if(synth.getVoices().length)finish();});return synth.getVoices().filter(v=>v.lang.toLowerCase()==='en-us').map(v=>({name:v.name,local:v.localService}));});
 let tts='Unavailable in this browser mode';
 if(voices.length){
  await page.evaluate(async()=>{
   const name='native-entry-audio-test';let finish,fail;globalThis.ttsEnded=new Promise((resolve,reject)=>{finish=resolve;fail=reject;});
   const api=createBackend({name,createSpeech:()=>new AmericanSpeech(speechSynthesis,text=>{const utterance=new SpeechSynthesisUtterance(text);utterance.volume=0;utterance.onend=()=>finish(true);utterance.onerror=e=>fail(Error(e.error));return utterance;})});
   const entry={...sample(),id:'personal-native-audio',collectionId:'personal',headword:'garden journal',pronunciation:{ipa:null,accent:null},meaningVi:'',contentStatus:'draft',examples:[],acceptedLearnAnswers:[]};
   await api.personal.save({entry,capture:{id:'native-audio-capture',entryId:entry.id,selectedText:entry.headword,originalSentence:'',sourceUrl:'https://example.org/reading',capturedAt:0}});
   document.getElementById('tts').onclick=()=>{void api.audio.speakEntry(entry.id).then(result=>{globalThis.ttsResult=result;},fail);};
   globalThis.cleanupAudio=async()=>{api.close();await new VocabDB(name).delete();};
  });
  await page.locator('#tts').click();
  const completed=await page.evaluate(()=>Promise.race([globalThis.ttsEnded,new Promise((_resolve,reject)=>setTimeout(()=>reject(Error('Native TTS did not finish')),15000))]));
  assert.equal(completed,true);assert.equal(await page.evaluate(()=>globalThis.ttsResult.accent),'en-US');await page.evaluate(()=>globalThis.cleanupAudio());tts='Pass (muted native en-US utterance ended for a saved draft without IPA)';
 }
 console.log(JSON.stringify({tts,result:'Pass',phonemeAudio:'Removed; IPA chart is text-only',internetRequests:'blocked',usVoices:voices}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
