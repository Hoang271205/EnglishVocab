import {z} from 'zod';
import {parseEntry} from '../../../../src/content/schema';
import {ServiceError} from '../../../../src/domain/types';
import type {Entry, Example, Source} from '../../../../src/domain/types';
import {VocabDB} from '../storage/db';

const editorSchema = z.object({
 entryId:z.string().max(128).optional(),
 revision:z.number().int().positive().optional(),
 newId:z.string().uuid(),
 headword:z.string().trim().min(1,'Cần nhập từ tiếng Anh.').max(500),
 partOfSpeech:z.string().trim().max(100),
 meaningVi:z.string().trim().max(10_000),
 ipa:z.string().trim().max(500),
 cefr:z.enum(['A1','A2','B1','B2','C1','C2']).nullable(),
 exampleSentence:z.string().trim().max(10_000),
 targetSurface:z.string().trim().max(500),
 note:z.string().max(10_000),
 ready:z.boolean(),
 newSense:z.boolean()
}).strict();

export type PersonalEditInput = z.infer<typeof editorSchema>;
export const personalNotesSchema = z.record(z.string(), z.string().max(10_000));

export async function savePersonalEdit(db:VocabDB, input:unknown) {
 const data=editorSchema.parse(input);
 return db.transaction('rw',db.entries,db.progress,db.sessions,db.settings,async()=>{
  const old=data.entryId?await db.entries.get(data.entryId):undefined;
  if(data.entryId&&(!old||old.collectionId!=='personal'))throw new ServiceError('not-found','Không tìm thấy từ cá nhân.');
  if(old&&data.revision!==old.revision)throw new ServiceError('conflict','Từ đã được sửa ở nơi khác. Hãy mở lại để lấy bản mới nhất.');

  const changedMeaning=!!old?.meaningVi.trim()&&old.meaningVi.trim()!==data.meaningVi;
  const changedType=!!old?.partOfSpeech&&old.partOfSpeech!==data.partOfSpeech;
  const copied=!!old&&(data.newSense||old.headword!==data.headword||changedMeaning||changedType);
  const id=old&&!copied?old.id:'personal-'+data.newId;

  if((!old||copied)&&await db.entries.get(id))throw new ServiceError('conflict','Mục này đã được lưu. Hãy đóng form và làm mới Sổ tay.');

  if(old&&!copied){
   const progress=await db.progress.get(old.id);
   if(progress&&!data.ready)throw new ServiceError('validation','Từ đã học cần giữ trạng thái sẵn sàng; không thể chuyển về nháp.');
   const sessions=await db.sessions.toArray();
   const inUse=sessions.some(s=>s.phase!=='complete'&&s.items.slice(s.index+(s.phase==='feedback'?1:0)).some(item=>item.entryId===old.id));
   if(inUse)throw new ServiceError('conflict','Từ đang nằm trong một phiên chưa hoàn tất. Hãy hoàn thành phiên trước khi sửa nội dung.');
  }

  let first:Example|undefined;
  if(data.exampleSentence||data.targetSurface){
   if(!data.exampleSentence||!data.targetSurface)throw new ServiceError('validation','Hãy điền cả câu ví dụ và từ/cụm từ xuất hiện trong câu.');
   const position=data.exampleSentence.indexOf(data.targetSurface);
   if(position<0||!/\p{L}/u.test(data.targetSurface))throw new ServiceError('validation','Từ trong câu phải xuất hiện đúng cách viết, kể cả chữ hoa/thường.');
   const previous=old?.examples[0];
   first={
    id:previous&&!copied?previous.id:crypto.randomUUID(),
    prefix:data.exampleSentence.slice(0,position),
    targetSurface:data.targetSurface,
    suffix:data.exampleSentence.slice(position+data.targetSurface.length),
    acceptedAnswers:previous?.targetSurface===data.targetSurface?previous.acceptedAnswers:[data.targetSurface]
   };
  }

  const examples=[...(first?[first]:[]),...(old?.examples.slice(1)??[])];
  const sources:Source[]=[...(old?.provenance??[])];
  function manual(field:Source['field']){
   if(field!=='example'||(old?.examples.length??0)<=1){
    for(let i=sources.length-1;i>=0;i--)if(sources[i]?.field===field)sources.splice(i,1);
   }
   sources.push({field,attribution:'Người dùng tự nhập',license:'Nội dung cá nhân',url:null,status:'authored',checkedAt:null});
  }
  if(!old||old.meaningVi!==data.meaningVi)manual('meaning');
  if((old?.pronunciation.ipa??'')!==data.ipa)manual('ipa');
  const previousExample=old?.examples[0];
  if((previousExample?previousExample.prefix+previousExample.targetSurface+previousExample.suffix:'')!==data.exampleSentence||(previousExample?.targetSurface??'')!==data.targetSurface)manual('example');
  if((old?.cefr.level??null)!==data.cefr)manual('cefr');

  const cefrUnchanged=!!old&&old.cefr.level===data.cefr;
  const entry:Entry=parseEntry({
   id,revision:old&&!copied?old.revision+1:1,collectionId:'personal',
   headword:data.headword,partOfSpeech:data.partOfSpeech,
   senseKey:old&&!copied?old.senseKey:'manual-'+data.newId,
   meaningVi:data.meaningVi,
   acceptedLearnAnswers:old?.headword===data.headword&&old.acceptedLearnAnswers.length?old.acceptedLearnAnswers:[data.headword],
   cefr:cefrUnchanged?old.cefr:{level:data.cefr,status:data.cefr?'estimated':'unknown',note:data.cefr?'Người dùng tự gán mức tham khảo.':''},
   pronunciation:{ipa:data.ipa||null,accent:data.ipa?'en-US':null},
   examples,provenance:sources,contentStatus:data.ready?'ready':'draft'
  });
  await db.entries.put(entry);
  const notes=personalNotesSchema.parse((await db.settings.get('personalNotes'))?.value??{});
  await db.settings.put({key:'personalNotes',value:{...notes,[entry.id]:data.note}});
  return {entry,copied};
 });
}
