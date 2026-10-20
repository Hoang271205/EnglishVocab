import {VocabDB} from '../storage/db';
import {SettingsService} from '../services/settings';
import {ServiceError} from '../domain/types';
import {AmericanSpeech} from './controller';
/** Pronunciation is based on saved English text, independent of dictionary/IPA coverage. */
export class EntryAudioService {
 private engine:AmericanSpeech|null=null;
 private generation=0;
 constructor(private readonly db:VocabDB,private readonly createSpeech:()=>AmericanSpeech=()=>{
  if(!globalThis.speechSynthesis)throw new ServiceError('unavailable','Trình duyệt chưa hỗ trợ giọng đọc');
  return new AmericanSpeech(globalThis.speechSynthesis);
 },private readonly voiceWaitMs=2500){}
 private speech(){return this.engine??=this.createSpeech();}
 async voices(){
  const engine=this.speech();if(engine.voices().length)return engine.voices();
  return new Promise<ReturnType<AmericanSpeech['voices']>>(resolve=>{
   let settled=false;
   let unsubscribe=()=>{};
   const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);unsubscribe();resolve(engine.voices());};
   const timer=setTimeout(finish,this.voiceWaitMs);
   unsubscribe=engine.subscribe(()=>{if(engine.voices().length)finish();});
   if(engine.voices().length)finish();
  });
 }
 async selectVoice(id:string){
  await this.voices();this.speech().select(id);await new SettingsService(this.db).update({voiceURI:id});
 }
 async speakEntry(entryId:string,options:{slow?:boolean;exampleId?:string}={}){
  const generation=++this.generation,entry=await this.db.entries.get(entryId);
  if(!entry)throw new ServiceError('not-found','Không tìm thấy từ đã lưu');
  const example=options.exampleId?entry.examples.find(e=>e.id===options.exampleId):null;
  if(options.exampleId&&!example)throw new ServiceError('not-found','Không tìm thấy câu ví dụ');
  const text=example?example.prefix+example.targetSurface+example.suffix:entry.headword;
  const [voices,settings]=await Promise.all([this.voices(),new SettingsService(this.db).get()]);
  if(generation!==this.generation)throw new ServiceError('conflict','Yêu cầu phát âm đã được thay thế hoặc dừng');
  if(!voices.length)throw new ServiceError('unavailable','Máy chưa có giọng Anh-Mỹ. Hãy cài giọng English (United States) rồi thử lại.');
  const engine=this.speech();engine.select(voices.some(v=>v.id===settings.voiceURI)?settings.voiceURI:null);
  return {...engine.speak(text,options.slow??false),entryId,kind:example?'example' as const:'word' as const};
 }
 stop(){this.generation++;this.engine?.stop();}
}
