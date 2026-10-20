import {ServiceError} from '../domain/types';
export interface VoiceOption {id:string;name:string;local:boolean}
export class AmericanSpeech {
 private selected:string|null=null;
 constructor(private readonly synth:SpeechSynthesis,private readonly utteranceFactory:(text:string)=>SpeechSynthesisUtterance=text=>new SpeechSynthesisUtterance(text)){}
 voices():VoiceOption[]{return this.synth.getVoices().filter(v=>v.lang.toLowerCase().replace('_','-')==='en-us').map(v=>({id:v.voiceURI,name:v.name,local:v.localService}));}
 subscribe(listener:()=>void){this.synth.addEventListener('voiceschanged',listener);return ()=>this.synth.removeEventListener('voiceschanged',listener);}
 select(id:string|null){if(id!==null&&!this.voices().some(v=>v.id===id))throw new ServiceError('unavailable','Giọng Anh-Mỹ không còn khả dụng');this.selected=id;}
 speak(text:string,slow=false){
  if(!text.trim())throw new ServiceError('validation','Nội dung đọc trống');
  const us=this.synth.getVoices().filter(v=>v.lang.toLowerCase().replace('_','-')==='en-us');
  const voice=us.find(v=>v.voiceURI===this.selected)??us.find(v=>v.localService)??us[0];
  if(!voice)throw new ServiceError('unavailable','Máy chưa có giọng Anh-Mỹ');
  const utterance=this.utteranceFactory(text);utterance.voice=voice;utterance.lang='en-US';utterance.rate=slow?0.7:1;this.synth.cancel();this.synth.speak(utterance);
  return {status:'queued' as const,accent:'en-US' as const,voiceURI:voice.voiceURI,local:voice.localService,rate:utterance.rate};
 }
 stop(){this.synth.cancel();}
}
