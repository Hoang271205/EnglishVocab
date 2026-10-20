import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseApiCandidates,parseBulkCandidates,splitSourceExample,matchSentencePairs,promoteCandidate,type CrawlCandidate} from '../scripts/lib/crawl';
const source={url:'https://en.wiktionary.org/wiki/room',license:{name:'CC BY-SA 4.0',url:'https://creativecommons.org/licenses/by-sa/4.0/'}};
const sense=(definition:string,word:string)=>({definition,translations:[{language:{code:'vi'},word}],examples:['This is my room.']});
function fixture(){return {word:'room',source,entries:[{language:{code:'en'},partOfSpeech:'noun',pronunciations:[{type:'ipa',text:'/rum/',tags:['US']},{type:'ipa',text:'/ruːm/',tags:['UK']},{type:'ipa',text:'room',tags:['US']}],senses:[{...sense('A chamber.','phòng'),subsenses:[{definition:'Space available.'}]},sense('Opportunity.','cơ hội'),{...sense('An obsolete sense.','cổ'),tags:['obsolete']}] }]};}
test('crawl keeps meanings in their source sense and only explicitly tagged US IPA',()=>{
 const entries=parseApiCandidates(fixture(),100);assert.equal(entries.length,3);
 assert.deepEqual(entries[0]!.meaningViOptions,['phòng']);assert.deepEqual(entries[1]!.meaningViOptions,[]);assert.deepEqual(entries[2]!.meaningViOptions,['cơ hội']);assert.deepEqual(entries[0]!.ipaUSOptions,['/rum/']);
 assert.equal(entries[1]!.reviewStatus,'needs-review');assert.ok(entries[1]!.issues.includes('missing-vietnamese'));
});
test('source sentences reject fragments, repeated answers, substrings and citation stubs',()=>{
 for(const text of ['room in a house','This room has another room.','The roomy house is beautiful.','For quotations using room, see Citations.','This is my room...'])assert.equal(splitSourceExample(text,'room'),null,text);
 const e=splitSourceExample('This is my room.','room')!;assert.equal(e.prefix+e.targetSurface+e.suffix,e.text);assert.equal(e.targetSurface,'room');
});
test('bulk filters other languages, quoted excerpts and unlabelled or respelled IPA',()=>{
 const record={word:'room',lang_code:'en',pos:'noun',sounds:[{ipa:'room',tags:['US']},{ipa:'/rum/'},{ipa:'/rʊm/',raw_tags:['Mỹ']}],senses:[{glosses:['phòng'],examples:[{text:'This is my room.',ref:'A quoted book'}]}]};
 const [c]=parseBulkCandidates(record,100);assert.deepEqual(c!.ipaUSOptions,['/rʊm/']);assert.equal(c!.examples.length,0);assert.deepEqual(parseBulkCandidates({...record,lang_code:'fr'},100),[]);
});
test('cross-source sentences retain both author IDs and their own license',()=>{
 const c=parseApiCandidates(fixture(),100)[0]!;
 const examples=matchSentencePairs(c,[{english:'This is my room.',vietnamese:'Đây là phòng của tôi.',attribution:'CC-BY 2.0 (France) Attribution: tatoeba.org #123 (Alice) & #456 (Bob)'}]);
 assert.equal(examples.length,1);assert.match(examples[0]!.source!.attribution,/#456 \(Bob\)/u);
 assert.equal(examples[0]!.source!.license,'CC BY 2.0 FR');assert.equal(examples[0]!.source!.url,'https://tatoeba.org/en/sentences/show/123');
 c.examples=examples;const selection={candidateId:c.id,topicId:'daily-011',meaningVi:'phòng',exampleId:examples[0]!.id,cefrEstimate:'A1',note:'Physical room; source sense checked.'};
 const entry=promoteCandidate(c,selection);assert.equal(entry.cefr.status,'estimated');assert.match(entry.provenance.find(p=>p.field==='example')!.license,/CC BY 2.0 FR/u);assert.match(entry.provenance.find(p=>p.field==='meaning')!.license,/CC BY-SA 4.0/u);
 assert.throws(()=>promoteCandidate(c,{...selection,meaningVi:'invented translation'}));assert.throws(()=>promoteCandidate(c,{...selection,cefrEstimate:'C2'}));
 assert.throws(()=>promoteCandidate(c,{...selection,exampleCandidateId:'other'},{...c,id:'other',partOfSpeech:'v.'}));
});
test('every selected crawled item has an explicit source meaning, split example and estimated CEFR',()=>{
 const read=(name:string)=>JSON.parse(readFileSync(new URL('../content/crawl/'+name,import.meta.url),'utf8'));
 const candidates=new Map<string,CrawlCandidate>(read('reviewed-source-extract.json').candidates.map((c:CrawlCandidate)=>[c.id,c]));
 for(const selection of read('selections.json').selections){const c=candidates.get(selection.candidateId)!;const entry=promoteCandidate(c,selection,candidates.get(selection.exampleCandidateId));assert.equal(entry.contentStatus,'ready');assert.equal(entry.cefr.status,'estimated');assert.ok(entry.provenance.every(p=>p.status!=='verified'));}
});

test('Kaikki abbreviated adjective and adverb POS are retained',()=>{
 for(const [pos,expected] of [['adj','adj.'],['adv','adv.']]){
  const [c]=parseBulkCandidates({word:'communal',lang_code:'en',pos,senses:[{glosses:['Công, chung, công cộng.']}]},100);assert.equal(c!.partOfSpeech,expected);
 }
});
