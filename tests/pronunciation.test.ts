import {test} from 'node:test';
import assert from 'node:assert/strict';
import {referencePronunciation} from '../src/content/pronunciation';
import type {LookupResult} from '../src/dictionary/freeDictionary';
import {sample} from './fixtures';
const phonetic={text:'/ˈhɑbi/',audio:null,accent:'en-US' as const,sourceUrl:'https://en.wiktionary.org/wiki/hobby',license:{name:'CC BY-SA 4.0',url:'https://creativecommons.org/licenses/by-sa/4.0/'}};
const result:LookupResult={query:'hobby',source:'api',provider:{name:'FreeDictionaryAPI.com',url:'https://freedictionaryapi.com/'},phonetics:[phonetic],senses:[{partOfSpeech:'noun',definition:'An activity',example:null,phonetics:[phonetic],sourceUrls:[phonetic.sourceUrl],licenses:[phonetic.license]}]};
test('IPA enrichment requires one explicit US pronunciation for the matching POS and preserves identity',()=>{
 const entry={...sample(),pronunciation:{ipa:null,accent:null}};
 const next=referencePronunciation(entry,result)!;assert.equal(next.id,entry.id);assert.equal(next.senseKey,entry.senseKey);assert.equal(next.revision,entry.revision+1);assert.equal(next.pronunciation.ipa,phonetic.text);
 assert.equal(next.provenance.at(-1)?.status,'unverified');assert.equal(entry.pronunciation.ipa,null);
 assert.equal(referencePronunciation(entry,{...result,senses:[{...result.senses[0]!,partOfSpeech:'verb'}]}),null);
 assert.equal(referencePronunciation(entry,{...result,senses:[{...result.senses[0]!,phonetics:[{...phonetic,accent:null}]}]}),null);
 assert.equal(referencePronunciation(entry,{...result,senses:[{...result.senses[0]!,phonetics:[phonetic,{...phonetic,text:'/other/'}]}]}),null);
 assert.equal(referencePronunciation(next,result),null);
});
