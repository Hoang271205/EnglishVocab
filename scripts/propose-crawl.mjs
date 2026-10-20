import fs from 'node:fs';
const candidates=JSON.parse(fs.readFileSync('content/crawl/combined-candidates.json')).candidates;
const topics=JSON.parse(fs.readFileSync('content/crawl/seeds.json')).topics;
const saved=JSON.parse(fs.readFileSync('content/crawl/selections.json')).selections;
const api=new Map(candidates.map(c=>[c.id,c]));const nounTopics=new Set(['daily-011','daily-012','daily-015','daily-016','daily-017','daily-018','daily-019','daily-020','daily-021','daily-022','daily-024','daily-025','daily-026','daily-027','daily-028','daily-029','daily-031','daily-032','daily-033','daily-034','daily-035','daily-036','daily-037','daily-038','daily-039','daily-040','daily-041','daily-042','daily-043','daily-044','daily-045','daily-046','daily-047','daily-048','daily-049','daily-050','daily-051','daily-052','daily-053','daily-054','daily-055','daily-056','daily-058','daily-059','daily-060','daily-061','daily-062','daily-070','daily-071','daily-072','daily-073','daily-074','daily-075','daily-076','daily-077','daily-078','daily-079','daily-080','daily-081','daily-082','daily-083','daily-084','daily-085','daily-086','daily-087','daily-088','daily-089','daily-090','daily-091','daily-092','daily-093','daily-094','daily-095','daily-096','daily-097','daily-098','daily-099','daily-100']);
const adjectives=new Set('reckless rural communal demographic multicultural indigenous bilingual multilingual linguistic disposable progressive fiscal restorative humanitarian bilateral multilateral environmental responsible biodegradable circular ethical conscientious organic sentient collective authentic delicious spicy sweet sour salty bitter crispy fresh bland allergic vegetarian vegan tight loose small medium large cheap expensive reasonable left right straight opposite single sunny cloudy rainy windy snowy warm cold dizzy unconscious tired awake balanced anxious overwhelmed calm available busy free pending confused constructive specific glad happy great sure grateful kind helpful thoughtful generous beautiful lovely excellent amazing talented impressive fantastic brilliant pleasant personal comfortable uncomfortable useful suitable suspicious secure current local international romantic fair true'.split(' '));
const verbs=new Set('chop slice peel boil fry bake stir simmer roast season sweep mop vacuum dust tidy clean wash wipe scrub rinse fold leak iron move in split reduce turn cancel claim jog run stretch sleep rest snore relax worry cope explain clarify repeat understand improve appreciate study revise practice memorise pass fail invite join welcome come host plan arrange meet decide suggest accept love decline regret apologise forgive excuse thank agree disagree believe think feel prefer consider suppose chat withdraw transfer insert enter restart disconnect weigh collect notify dispatch trim dye book reschedule confirm postpone bring forward resolve escalate text reply send receive mute connect freeze reconnect login logout register verify reset crash update repair focus flash upload share dub stream recommend report block date trust respect wish decorate toast celebrate intend hope expect promise choose compare divide cooperate contribute take turns solve fix manage handle prevent remember happen refuse try'.split(' '));
const rows=[];
for(const topic of topics)for(const word of topic.words){
 const previous=saved.find(s=>s.topicId===topic.topicId&&api.get(s.candidateId)?.headword.toLowerCase()===word.toLowerCase());
 const expected=adjectives.has(word)?'adj.':verbs.has(word)?'v.':nounTopics.has(topic.topicId)||topic.topicId.startsWith('ielts')?'n.':null;
 let options=candidates.filter(c=>c.headword.toLowerCase()===word.toLowerCase()&&c.meaningViOptions.length&&c.examples.length);
 options=options.filter(c=>c.meaningViOptions.some(v=>v.length<=250&&!/^(Như |Xem |\(.*\) Như )/u.test(v)));
 const score=c=>(c.partOfSpeech===expected?100:0)+(c.id.startsWith('sense-')?10:0)+(c.definitionEn?5:0);
 options.sort((a,b)=>score(b)-score(a));
 const c=previous?api.get(previous.candidateId):options[0];let selection=previous;
 if(c&&!previous){
 const pattern=word.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
 const usage=new RegExp('(?:to|can|could|will|would|should|must|may|might|please|not) '+pattern+'\\b','iu');
 const rank=e=>(e.source?0:200)+(e.translationVi?20:0)+(c.partOfSpeech==='v.'&&usage.test(e.text)?80:0)+(e.text.split(' ').length>=6?10:0)-Math.abs(e.text.length-65)/10;
 const examples=c.examples.slice().sort((a,b)=>rank(b)-rank(a));const example=examples[0];
 const meaning=c.meaningViOptions.find(v=>v.length<=250&&!/^(Như |Xem )/u.test(v));
 selection={candidateId:c.id,topicId:topic.topicId,meaningVi:meaning,exampleId:example.id,cefrEstimate:topic.cefrEstimate,note:'Pending sense/context review; do not publish automatically.'};
 }
 const ex=selection?(api.get(selection.exampleCandidateId??selection.candidateId)?.examples.find(e=>e.id===selection.exampleId)):null;
 rows.push({row:rows.length+1,word,topicId:topic.topicId,expectedPos:expected,pos:c?.partOfSpeech,definition:c?.definitionEn,selection,example:ex?.text,alreadyPublished:!!previous,alternatives:options.slice(0,12).map(o=>({id:o.id,pos:o.partOfSpeech,vi:o.meaningViOptions,definition:o.definitionEn}))});
}
fs.writeFileSync('content/crawl/proposals.json',JSON.stringify({schemaVersion:1,status:'needs-review',rows},null,2)+'\n');
console.log(JSON.stringify({rows:rows.length,proposed:rows.filter(r=>r.selection).length,missing:rows.filter(r=>!r.selection).map(r=>({row:r.row,word:r.word,topic:r.topicId}))}));
