import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {Source} from '../../src/domain/types';
import {entrySchema} from '../../src/content/schema';
const text=z.string().trim().min(1);
const language=z.object({code:z.string()});
interface ApiSense {definition:string;examples:string[];tags:string[];translations:{language:{code:string};word:string}[];subsenses:ApiSense[]}
const sense:z.ZodType<ApiSense>=z.lazy(()=>z.object({definition:text,examples:z.array(z.string()).default([]),tags:z.array(z.string()).default([]),translations:z.array(z.object({language,word:text})).default([]),subsenses:z.array(sense).default([])}));
const sourceSchema=z.object({url:z.url().refine(s=>new URL(s).hostname==='en.wiktionary.org'&&new URL(s).protocol==='https:'),license:z.object({name:text,url:z.url().refine(s=>new URL(s).protocol==='https:')})});
export const apiSourceSchema=z.object({word:text,entries:z.array(z.object({language,partOfSpeech:text,pronunciations:z.array(z.object({type:z.string(),text:z.string(),tags:z.array(z.string()).default([])})).default([]),senses:z.array(sense)})),source:sourceSchema});
const pos:Record<string,string>={adj:'adj.',adv:'adv.',prep:'prep.',intj:'interj.',pron:'pron.',conj:'conj.',det:'det.',num:'num.',noun:'n.',verb:'v.',adjective:'adj.',adverb:'adv.',preposition:'prep.',interjection:'interj.',phrase:'phrase',pronoun:'pron.',conjunction:'conj.',determiner:'det.'};
const digest=(value:string)=>createHash('sha256').update(value).digest('hex').slice(0,24);
export interface CrawlExample {id:string;text:string;prefix:string;targetSurface:string;suffix:string;translationVi?:string;source?:{provider:string;url:string;license:string;licenseUrl:string;attribution:string}}
export interface CrawlCandidate {
 id:string;headword:string;partOfSpeech:string;meaningViOptions:string[];definitionEn:string|null;examples:CrawlExample[];ipaUSOptions:string[];
 source:{provider:string;url:string;license:string;licenseUrl:string;retrievedAt:number;sourceHash:string};
 issues:string[];reviewStatus:'needs-review';
}
export function splitSourceExample(input:string,headword:string):CrawlExample|null {
 const sentence=input.normalize('NFKC').trim().replace(/\s+/gu,' ');
 if(sentence.length>300||sentence.split(' ').length<4||!/[.!?][”"']?$/u.test(sentence)||/[.]{2,}[”"']?$/u.test(sentence)||/…/u.test(sentence)||!/^['"“]?[A-Z]/u.test(sentence)||/^(For quotations|See (also|Citations)|Citations:)/u.test(sentence))return null;
 const escaped=headword.normalize('NFKC').replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
 const matches=[...sentence.matchAll(new RegExp('(?<![\\p{L}\\p{N}_])'+escaped+'(?![\\p{L}\\p{N}_])','giu'))];
 if(matches.length!==1)return null;const match=matches[0]!;
 return {id:'example-'+digest(sentence),text:sentence,prefix:sentence.slice(0,match.index),targetSurface:match[0],suffix:sentence.slice(match.index!+match[0].length)};
}
function excluded(tags:string[]){return tags.some(t=>/^(archaic|obsolete|vulgar|offensive|rare|form-of)$/iu.test(t));}
export function parseApiCandidates(input:unknown,retrievedAt:number):CrawlCandidate[]{
 const data=apiSourceSchema.parse(input),output:CrawlCandidate[]=[];
 for(const entry of data.entries.filter(e=>e.language.code==='en'&&pos[e.partOfSpeech])){
  const ipaUSOptions=[...new Set(entry.pronunciations.filter(p=>p.type==='ipa'&&p.tags.some(t=>/^(General[ -]American|US|United States|American English)$/iu.test(t))&&/^[/\[].+[/\]]$/u.test(p.text)).map(p=>p.text))];
  const append=(items:ApiSense[],parentExcluded=false)=>{for(const item of items){
   const rejected=parentExcluded||excluded(item.tags);
   if(!rejected){
    const meaningViOptions=[...new Set(item.translations.filter(t=>t.language.code==='vi').map(t=>t.word))];
    const examples=item.examples.map(e=>splitSourceExample(e,data.word)).filter((e):e is CrawlExample=>!!e);
    const id='sense-'+digest(JSON.stringify([data.word,entry.partOfSpeech,item.definition]));
    output.push({id,headword:data.word,partOfSpeech:pos[entry.partOfSpeech]!,meaningViOptions,definitionEn:item.definition,examples,ipaUSOptions,
     source:{provider:'FreeDictionaryAPI.com / English Wiktionary',url:data.source.url,license:data.source.license.name,licenseUrl:data.source.license.url,retrievedAt,sourceHash:createHash('sha256').update(JSON.stringify(item)).digest('hex')},
     issues:[...(!meaningViOptions.length?['missing-vietnamese']:[]),...(!examples.length?['missing-sentence-example']:[]),...(ipaUSOptions.length!==1?['missing-or-ambiguous-us-ipa']:[])],reviewStatus:'needs-review'});
   }
   append(item.subsenses,rejected);
  }};append(entry.senses);
 }
 return output.filter((c,i,all)=>all.findIndex(other=>other.id===c.id)===i);
}
export const selectionSchema=z.object({candidateId:text,exampleCandidateId:text.optional(),topicId:z.string().regex(/^(daily|ielts)-\d{3}$/u),meaningVi:text,exampleId:text,cefrEstimate:z.enum(['A1','A2','B1','B2','C1','C2']),note:text}).strict();
export function promoteCandidate(candidate:CrawlCandidate,input:unknown,linkedExampleCandidate?:CrawlCandidate){
 const selection=selectionSchema.parse(input);
 if(selection.candidateId!==candidate.id||!candidate.meaningViOptions.includes(selection.meaningVi))throw Error('Selection must reference a source-backed sense and Vietnamese meaning');
 const exampleCandidate=selection.exampleCandidateId?linkedExampleCandidate:candidate;
 if(!exampleCandidate||exampleCandidate.id!==(selection.exampleCandidateId??candidate.id)||exampleCandidate.headword.toLowerCase()!==candidate.headword.toLowerCase()||exampleCandidate.partOfSpeech!==candidate.partOfSpeech)throw Error('Linked example must be explicitly reviewed for the same word and part of speech');
 const example=exampleCandidate.examples.find(e=>e.id===selection.exampleId);if(!example)throw Error('Select an example from the reviewed source sense');
 const id='crawl-'+candidate.id;
 const fields:Source['field'][]=candidate.definitionEn?['meaning','definition']:['meaning'];
 const provenance:Source[]=fields.map(field=>({field,attribution:candidate.source.provider+'; selected from source sense. NFKC/whitespace normalized; example split for cloze.',license:candidate.source.license+' ('+candidate.source.licenseUrl+')',url:candidate.source.url,status:'unverified' as const,checkedAt:null}));
 const exampleSource=example.source??exampleCandidate.source;
 provenance.push({field:'example',attribution:('attribution' in exampleSource?exampleSource.attribution:exampleSource.provider)+'; source sentence split for cloze; NFKC/whitespace normalized.',license:exampleSource.license+' ('+exampleSource.licenseUrl+')',url:exampleSource.url,status:'unverified',checkedAt:null});
 if(candidate.ipaUSOptions.length===1)provenance.push({field:'ipa',attribution:candidate.source.provider+'; explicitly US-tagged source transcription',license:candidate.source.license+' ('+candidate.source.licenseUrl+')',url:candidate.source.url,status:'unverified',checkedAt:null});
 return entrySchema.parse({id,revision:1,collectionId:selection.topicId.startsWith('daily')?'daily':'ielts',headword:candidate.headword,partOfSpeech:candidate.partOfSpeech,senseKey:candidate.id,meaningVi:selection.meaningVi,acceptedLearnAnswers:[candidate.headword],cefr:{level:selection.cefrEstimate,status:'estimated',note:selection.note+' CEFR is an editorial estimate, not provided or verified by Wiktionary.'},pronunciation:{ipa:candidate.ipaUSOptions.length===1?candidate.ipaUSOptions[0]:null,accent:candidate.ipaUSOptions.length===1?'en-US':null},examples:[{id:example.id,prefix:example.prefix,targetSurface:example.targetSurface,suffix:example.suffix,acceptedAnswers:[example.targetSurface]}],provenance:[...provenance,{field:'cefr',attribution:'EnglishVocab editorial estimate',license:'Original editorial annotation',url:null,status:'authored',checkedAt:null}],contentStatus:'ready'});
}

const bulkSense=z.object({glosses:z.array(z.string()).default([]),tags:z.array(z.string()).default([]),raw_tags:z.array(z.string()).default([]),examples:z.array(z.object({text:z.string(),ref:z.string().optional()})).default([])});
export const bulkRecordSchema=z.object({word:text,lang_code:z.string(),pos:z.string(),senses:z.array(bulkSense).default([]),sounds:z.array(z.object({ipa:z.string().optional(),tags:z.array(z.string()).default([]),raw_tags:z.array(z.string()).default([])})).default([])});
export function parseBulkCandidates(input:unknown,retrievedAt:number):CrawlCandidate[]{
 const data=bulkRecordSchema.parse(input);if(data.lang_code!=='en'||!pos[data.pos])return [];
 const ipaUSOptions=[...new Set(data.sounds.filter(p=>p.ipa&&/^[/\[].+[/\]]$/u.test(p.ipa)&&[...p.tags,...p.raw_tags].some(t=>/^(General[ -]American|US|United States|American English|Mỹ|Anh-Mỹ|Hoa Kỳ)$/iu.test(t))).map(p=>p.ipa!))];
 return data.senses.filter(s=>!excluded(s.tags)&&!s.raw_tags.some(t=>/^(từ cổ|lỗi thời|tục|hiếm)$/iu.test(t))).filter(s=>s.glosses.some(g=>g.trim())).map(s=>{
  const meaningViOptions=s.glosses.map(g=>g.trim()).filter(Boolean),id='vi-sense-'+digest(JSON.stringify([data.word,data.pos,meaningViOptions]));
  const examples=s.examples.filter(e=>!e.ref).map(e=>splitSourceExample(e.text,data.word)).filter((e):e is CrawlExample=>!!e);
  return {id,headword:data.word,partOfSpeech:pos[data.pos]!,meaningViOptions,definitionEn:null,examples,ipaUSOptions,
   source:{provider:'Vietnamese Wiktionary contributors; extracted by Kaikki / Wiktextract',url:'https://vi.wiktionary.org/wiki/'+encodeURIComponent(data.word.replaceAll(' ','_')),license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',retrievedAt,sourceHash:createHash('sha256').update(JSON.stringify(s)).digest('hex')},
   issues:[...(!examples.length?['missing-sentence-example']:[]),...(ipaUSOptions.length!==1?['missing-or-ambiguous-us-ipa']:[])],reviewStatus:'needs-review' as const};
 });
}

export function matchSentencePairs(candidate:CrawlCandidate,pairs:{english:string;vietnamese:string;attribution:string}[]):CrawlExample[]{
 const anchors=candidate.meaningViOptions.flatMap(g=>g.replace(/\([^)]*\)/gu,'').split(/[,;.!]/u)).map(g=>g.trim().normalize('NFKC').toLowerCase()).filter(g=>g.length>=3);
 const matches:CrawlExample[]=[];
 for(const pair of pairs){
  if(!pair.english.toLowerCase().includes(candidate.headword.toLowerCase()))continue;
  if(!pair.attribution.startsWith('CC-BY 2.0 (France) Attribution:'))continue;
  const ids=[...pair.attribution.matchAll(/#(\d+) \(([^)]+)\)/gu)];if(ids.length!==2)continue;
  const vi=pair.vietnamese.normalize('NFKC').toLowerCase();
  if(!anchors.some(a=>new RegExp('(?<![\\p{L}\\p{N}])'+a.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&')+'(?![\\p{L}\\p{N}])','u').test(vi)))continue;
  const example=splitSourceExample(pair.english,candidate.headword);if(!example)continue;
  matches.push({...example,translationVi:pair.vietnamese,source:{provider:'Tatoeba / ManyThings',url:'https://tatoeba.org/en/sentences/show/'+ids[0]![1],license:'CC BY 2.0 FR',licenseUrl:'https://creativecommons.org/licenses/by/2.0/fr/',attribution:pair.attribution+'; https://www.manythings.org/anki/; translated sentence https://tatoeba.org/en/sentences/show/'+ids[1]![1]}});
 }
 return [...new Map(matches.map(e=>[e.id,e])).values()].sort((a,b)=>a.text.length-b.text.length).slice(0,5);
}
