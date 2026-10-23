import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AmericanSpeech} from '../../../src/audio/controller';
import {EntryAudioService} from '../src/audio/entries';
import {IpaChartService,ipaChartSchema} from '../../../src/content/ipa';
import {VocabDB} from '../src/storage/db';
import {SettingsService} from '../src/services/settings';
import {sample} from '../../../tests/fixtures';
import {readFileSync} from 'node:fs';
function fixture(){
 const state={voices:[{lang:'en-US',voiceURI:'us-local',localService:true,name:'US Local'},{lang:'en-GB',voiceURI:'uk',localService:true,name:'UK'}],spoken:[] as {text:string;voice:{voiceURI:string};rate:number}[],listeners:new Set<()=>void>()};
 const synth={getVoices:()=>state.voices,addEventListener:(_event:string,f:()=>void)=>state.listeners.add(f),removeEventListener:(_event:string,f:()=>void)=>state.listeners.delete(f),speak:(u:typeof state.spoken[number])=>state.spoken.push(u),cancel:()=>{}} as unknown as SpeechSynthesis;
 const engine=new AmericanSpeech(synth,text=>({text} as SpeechSynthesisUtterance));return {state,engine};
}
test('new personal draft with no IPA or dictionary result can speak its headword in US English',async()=>{
 const db=new VocabDB(crypto.randomUUID()),{state,engine}=fixture();try{
 const entry={...sample(),id:'personal-new',collectionId:'personal' as const,headword:'gardening club',pronunciation:{ipa:null,accent:null},contentStatus:'draft' as const,meaningVi:'',examples:[],acceptedLearnAnswers:[]};
 await db.entries.put(entry);const audio=new EntryAudioService(db,()=>engine,0);
 assert.equal((await audio.speakEntry(entry.id,{slow:true})).accent,'en-US');assert.equal(state.spoken[0]?.text,'gardening club');assert.equal(state.spoken[0]?.rate,0.7);assert.equal(state.spoken[0]?.voice.voiceURI,'us-local');
 assert.equal(await db.progress.count(),0);assert.equal((await db.entries.get(entry.id))?.pronunciation.ipa,null);
 await assert.rejects(audio.selectVoice('uk'));assert.equal((await new SettingsService(db).get()).voiceURI,null);
 }finally{await db.delete();}
});
test('saved voice, example speech, missing US voice and late voice list are handled without UK fallback',async()=>{
 const db=new VocabDB(crypto.randomUUID()),{state,engine}=fixture();try{
 await db.entries.put(sample());const audio=new EntryAudioService(db,()=>engine,25);await audio.selectVoice('us-local');assert.equal((await new SettingsService(db).get()).voiceURI,'us-local');
 await audio.speakEntry(sample().id,{exampleId:sample().examples[0]!.id});assert.equal(state.spoken[0]?.text,'My favorite hobby is reading.');
 await assert.rejects(audio.speakEntry(sample().id,{exampleId:'missing'}));
 const us=state.voices[0]!;state.voices=[];const pending=audio.speakEntry(sample().id);
 setTimeout(()=>{state.voices=[us];for(const callback of state.listeners)callback();},1);await pending;assert.equal(state.listeners.size,0);
 state.voices=[{lang:'en-GB',voiceURI:'uk',name:'UK',localService:true}];await assert.rejects(audio.speakEntry(sample().id),/Anh-Mỹ/u);assert.equal(state.spoken.length,2);
 }finally{await db.delete();}
});
test('IPA reference is text-only, groups symbols and has no individual sound playback',async()=>{
 const raw=JSON.parse(readFileSync(new URL('../../../public/content/phonemes.json',import.meta.url),'utf8')),pack=ipaChartSchema.parse(raw);
 assert.equal(pack.phonemes.length,40);assert.equal(pack.phonemes.filter(p=>p.group==='consonant').length,24);
 const service=new IpaChartService(async()=>raw);assert.equal((await service.find('ɚ')).symbol,'ɝ');
 assert.equal('play' in service,false);assert.equal(pack.phonemes.some(p=>'file' in p||'audio' in p),false);
 await assert.rejects(service.find('not-a-symbol'));
 assert.throws(()=>ipaChartSchema.parse({...raw,phonemes:[{...raw.phonemes[0],file:'/audio/ipa/old.wav'}]}));
});
