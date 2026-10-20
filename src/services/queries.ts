import {VocabDB} from '../storage/db';
import type {Clock,CollectionId,CefrLevel} from '../domain/types';
export class QueryService {
 constructor(private readonly db:VocabDB,private readonly clock:Clock={now:()=>Date.now()}){}
 async overview(){return this.db.transaction('r',this.db.entries,this.db.progress,this.db.topics,async()=>{
  const [entries,progress,topics]=await Promise.all([this.db.entries.toArray(),this.db.progress.toArray(),this.db.topics.toArray()]);
  const learned=new Set(progress.map(p=>p.entryId)),now=this.clock.now();
  const due=progress.filter(p=>p.nextReviewAt<=now);
  return {learned:progress.length,due:due.length,mastered:progress.filter(p=>p.level===5).length,drafts:entries.filter(e=>e.contentStatus==='draft').length,
   unlearned:entries.filter(e=>e.contentStatus==='ready'&&!learned.has(e.id)).length,nextReviewAt:progress.length?Math.min(...progress.map(p=>p.nextReviewAt)):null,
   collections:(['ielts','daily'] as const).map(id=>{const slots=topics.filter(t=>t.collectionId===id).flatMap(t=>t.entryIds);return {id,slots:slots.length,learnedSlots:slots.filter(x=>learned.has(x)).length,target:1000};})};
 });}
 async topics(collection:'ielts'|'daily',search=''){
  return this.db.transaction('r',this.db.topics,this.db.entries,this.db.progress,async()=>{
   const topics=await this.db.topics.where('collectionId').equals(collection).sortBy('order');
   const progress=new Map((await this.db.progress.toArray()).map(p=>[p.entryId,p]));
   const ready=new Set((await this.db.entries.toArray()).filter(e=>e.contentStatus==='ready').map(e=>e.id));
   const query=search.normalize('NFKC').toLowerCase().trim();
   return topics.filter(t=>(t.nameEn+' '+t.nameVi).normalize('NFKC').toLowerCase().includes(query)).map(topic=>({
    ...topic,total:topic.entryIds.filter(id=>ready.has(id)).length,learned:topic.entryIds.filter(id=>progress.has(id)).length,
    due:topic.entryIds.filter(id=>(progress.get(id)?.nextReviewAt??Infinity)<=this.clock.now()).length
   }));
  });
 }
 async notebook(filter:{collection?:CollectionId;level?:number;due?:boolean;search?:string;cefr?:CefrLevel;topicId?:string;minWrong?:number}={}){
  return this.db.transaction('r',this.db.entries,this.db.progress,this.db.topics,async()=>{
   const entries=await this.db.entries.toArray(),progress=new Map((await this.db.progress.toArray()).map(p=>[p.entryId,p]));
   const membership=filter.collection&&filter.collection!=='personal'?new Set((await this.db.topics.where('collectionId').equals(filter.collection).toArray()).flatMap(t=>t.entryIds)):null;
   const topic=filter.topicId?await this.db.topics.get(filter.topicId):null;
   const query=filter.search?.normalize('NFKC').toLowerCase().trim()??'';
   return entries.filter(e=>(!filter.topicId||!!topic?.entryIds.includes(e.id))&&(!filter.cefr||e.cefr.level===filter.cefr)&&(!filter.minWrong||(progress.get(e.id)?.wrongCount??0)>=filter.minWrong)&&(!filter.collection||e.collectionId===filter.collection||!!membership?.has(e.id))&&(!filter.level||progress.get(e.id)?.level===filter.level)&&(!filter.due||(progress.get(e.id)?.nextReviewAt??Infinity)<=this.clock.now())&&(!query||(e.headword+' '+e.meaningVi).normalize('NFKC').toLowerCase().includes(query))).map(entry=>{
    const p=progress.get(entry.id)??null;
    return {entry,progress:p,status:entry.contentStatus==='draft'?'draft':p?p.level===5?'mastered':'reviewing':'unlearned'};
   });
  });
 }
}
