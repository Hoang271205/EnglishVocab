import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AmericanSpeech} from '../src/audio/controller';
test('US speech never falls back to UK and handles late voice availability',()=>{
 let list=[{lang:'en-GB',voiceURI:'uk',name:'UK',localService:true}];let spoken='';const listeners=new Set<()=>void>();
 const synth={getVoices:()=>list,addEventListener:(_type:string,f:()=>void)=>listeners.add(f),removeEventListener:(_type:string,f:()=>void)=>listeners.delete(f),cancel:()=>{},speak:(u:{lang:string})=>{spoken=u.lang;}} as unknown as SpeechSynthesis;
 const speech=new AmericanSpeech(synth,()=>({} as SpeechSynthesisUtterance));assert.throws(()=>speech.speak('hobby'));assert.equal(spoken,'');let updates=0;const off=speech.subscribe(()=>updates++);
 list=[...list,{lang:'en-US',voiceURI:'us',name:'US',localService:true}];for(const f of listeners)f();speech.select('us');speech.speak('hobby');assert.equal(spoken,'en-US');assert.equal(updates,1);off();assert.equal(listeners.size,0);
});
