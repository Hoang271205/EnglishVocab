import { ServiceError, POLICY } from '../domain/types';
import type { Clock, Entry, GradeResult, Progress, Question, Session, SessionView, SubmitCommand } from '../domain/types';
import { VocabDB } from '../storage/db';
import { createMask, validateClozeAnswer } from '../domain/cloze';
import { gradeAnswer } from '../domain/grading';
import { initialProgress, reviewProgress } from '../domain/scheduler';
function view(s:Session):SessionView { return {...s,items:s.items.map(i=>({attemptId:i.attemptId}))}; }
export class StudyService {
 constructor(private readonly db: VocabDB, private readonly clock: Clock = {now:()=>Date.now()}, private readonly makeId:()=>string = ()=>crypto.randomUUID()) {}
 async active(): Promise<SessionView | null> {
  const sessions = await this.db.sessions.toArray();

  const unfinished = sessions
    .filter((session) => session.phase !== 'complete')
    .sort(
      (first, second) =>
        first.createdAt - second.createdAt ||
        first.id.localeCompare(second.id),
    )[0];

  return unfinished ? view(unfinished) : null;
 }

 async saveDraft(
  id: string,
  version: number,
  answer: string,
): Promise<SessionView> {
  return this.db.transaction('rw', this.db.sessions, async () => {
    const session = await this.loadSession(id);

    if (session.version !== version) {
      throw new ServiceError(
        'conflict',
        'Phiên đã thay đổi ở tab khác. Hãy tải lại phiên.',
      );
    }

    const canAnswer =
      (session.mode === 'learn' && session.phase === 'recall') ||
      (session.mode === 'review' && session.phase === 'question');

    if (!canAnswer || session.paused) {
      throw new ServiceError(
        'conflict',
        'Phiên hiện không ở bước nhập đáp án.',
      );
    }

    session.draftAnswer = answer.slice(0, 10_000);
    session.version++;

    await this.db.sessions.put(session);

    return view(session);
  });
}

 async create(mode:'learn'|'review', limit:5|10|20, entryIds?:string[]): Promise<SessionView> {
  if ((mode==='learn' && ![5,10].includes(limit)) || (mode==='review' && ![10,20].includes(limit))) throw new ServiceError('validation','Invalid batch');
  return this.db.transaction('rw',this.db.entries,this.db.progress,this.db.sessions,async()=>{
   const active=await this.db.sessions.toArray();
   const unfinished=active.find(s=>s.phase!=='complete');
   if(unfinished) throw new ServiceError('conflict','Resume the unfinished session');
   const all=await this.db.entries.toArray();
   const ready=new Map(all.filter(e=>e.contentStatus==='ready').map(e=>[e.id,e]));
   const progress=await this.db.progress.toArray();
   const learned=new Map(progress.map(p=>[p.entryId,p]));
   const eligible=(entryIds ? [...new Set(entryIds)] : [...ready.keys()]).filter(id=>ready.has(id));
   const now=this.clock.now();
   let selected=eligible.filter(id=>mode==='learn' ? !learned.has(id) : (learned.get(id)?.nextReviewAt ?? Infinity)<=now);
   if(mode==='review')selected=selected.sort((a,b)=>learned.get(a)!.nextReviewAt-learned.get(b)!.nextReviewAt || a.localeCompare(b));
   selected=selected.slice(0,limit);
   if(!selected.length)throw new ServiceError('not-found','No eligible entries');
   const s:Session={id:this.makeId(),mode,version:1,index:0,phase:mode==='learn'?'front':'question',draftAnswer:'',paused:false,createdAt:now,
    items:selected.map(id=>{const e=ready.get(id)!;const example=e.examples[0];if(!example)throw new ServiceError('validation','Missing example');return {entryId:id,entryRevision:e.revision,expectedVersion:learned.get(id)?.version ?? 0,attemptId:this.makeId(),example,cells:createMask(example.targetSurface)};})};
   await this.db.sessions.add(s);return view(s);
  });
 }
 private async loadSession(id:string):Promise<Session>{const s=await this.db.sessions.get(id);if(!s)throw new ServiceError('not-found','Session not found');return s;}
 async session(id:string):Promise<SessionView>{return view(await this.loadSession(id));}
 async transition(id:string, version:number, action:'recall'|'front'|'next'|'pause'|'resume', draftAnswer=''):Promise<SessionView>{
  return this.db.transaction('rw',this.db.sessions,async()=>{
   const s=await this.loadSession(id);if(s.version!==version)throw new ServiceError('conflict','Session changed in another tab');
   if(action==='pause'){s.paused=true;s.draftAnswer=draftAnswer.slice(0,10_000);}
   else if(action==='resume')s.paused=false;
   else if(s.paused)throw new ServiceError('conflict','Resume first');
   else if(action==='recall'&&s.mode==='learn'&&s.phase==='front')s.phase='recall';
   else if(action==='front'&&s.mode==='learn'&&s.phase==='recall'){s.phase='front';s.draftAnswer='';}
   else if(action==='next'&&s.mode==='review'&&s.phase==='feedback'){s.index++;s.phase=s.index>=s.items.length?'complete':'question';s.draftAnswer='';}
   else throw new ServiceError('conflict','Invalid transition');
   s.version++;await this.db.sessions.put(s);return view(s);
  });
 }
 async question(id:string):Promise<Question>{
  const s=await this.loadSession(id),item=s.items[s.index];
  if(!item||!['recall','question'].includes(s.phase)||s.paused)throw new ServiceError('conflict','Not answering');
  const e=await this.db.entries.get(item.entryId);if(!e)throw new ServiceError('not-found','Entry missing');
  return {attemptId:item.attemptId,meaningVi:e.meaningVi,partOfSpeech:e.partOfSpeech,prefix:s.mode==='review'?item.example.prefix:'',suffix:s.mode==='review'?item.example.suffix:'',cells:s.mode==='review'?item.cells:[]};
 }
 async front(id:string):Promise<Entry>{
  const s=await this.loadSession(id);if(s.phase!=='front'||s.paused)throw new ServiceError('conflict','Not showing front');
  const item=s.items[s.index];const e=item && await this.db.entries.get(item.entryId);if(!e)throw new ServiceError('not-found','Entry missing');return e;
 }
 async feedback(id:string){
  return this.db.transaction('r',this.db.sessions,this.db.entries,this.db.events,this.db.progress,async()=>{
   const session=await this.loadSession(id),item=session.items[session.index];
   if(!item||session.phase!=='feedback')throw new ServiceError('conflict','Feedback is available only after grading');
   const [entry,event,progress]=await Promise.all([this.db.entries.get(item.entryId),this.db.events.get(item.attemptId),this.db.progress.get(item.entryId)]);
   if(!entry||!event||!progress)throw new ServiceError('storage','Feedback record missing');
   return {entry,event,progress};
  });
 }
 async submit(command:SubmitCommand):Promise<GradeResult|{kind:'retry'}>{
  return this.db.transaction('rw',this.db.entries,this.db.progress,this.db.events,this.db.sessions,async()=>{
   const previous=await this.db.events.get(command.attemptId);
   if(previous){
    if(previous.sessionId!==command.sessionId)throw new ServiceError('conflict','Attempt belongs to a different session');
    const progress=await this.db.progress.get(previous.entryId);if(!progress)throw new ServiceError('storage','Missing progress');
    return {kind:'committed',event:previous,progress};
   }
   const s=await this.loadSession(command.sessionId),item=s.items[s.index];
   if(!item||s.paused||s.version!==command.expectedSessionVersion||item.attemptId!==command.attemptId||!['recall','question'].includes(s.phase))throw new ServiceError('conflict','Stale attempt');
   const e=await this.db.entries.get(item.entryId);if(!e||e.contentStatus!=='ready'||e.revision!==item.entryRevision)throw new ServiceError('conflict','Content changed');
   const before=await this.db.progress.get(e.id);
   if((before?.version ?? 0)!==item.expectedVersion)throw new ServiceError('conflict','Progress changed in another tab');
   if(command.forgotten && s.mode==='learn')throw new ServiceError('validation','Learning requires a correct rewrite');
   if(s.mode==='review'&&!command.forgotten)validateClozeAnswer(command.answer,item.cells);
   const correct=command.forgotten ? false : gradeAnswer(command.answer,s.mode==='learn'?e.acceptedLearnAnswers:item.example.acceptedAnswers);
   if(!correct&&s.mode==='learn')return {kind:'retry'};
   const now=this.clock.now();
   if(s.mode==='review'&&(!before||before.nextReviewAt>now))throw new ServiceError('conflict','Word is not due');
   const progress:Progress=s.mode==='learn'?initialProgress(e.id,now):reviewProgress(before!,correct,now);
   const event={id:item.attemptId,sessionId:s.id,entryId:e.id,mode:s.mode,correct,reviewedAt:now,beforeLevel:before?.level ?? null,afterLevel:progress.level,nextReviewAt:progress.nextReviewAt,entryRevision:e.revision,policy:POLICY};
   await this.db.progress.put(progress);await this.db.events.add(event);
   if(s.mode==='learn'){s.index++;s.phase=s.index>=s.items.length?'complete':'front';}else s.phase='feedback';
   s.version++;s.draftAnswer='';await this.db.sessions.put(s);
   return {kind:'committed',event,progress};
  });
 }
}
