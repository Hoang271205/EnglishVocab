import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialProgress,reviewProgress,HOUR,isDue} from '../src/domain/scheduler';
import {gradeAnswer,normalizeAnswer} from '../src/domain/grading';
import {createMask,assembleAnswer,validateClozeAnswer} from '../src/domain/cloze';
import {parseEntry,parseTopic,contentSchema} from '../src/content/schema';
import {sample} from './fixtures';
import {readFileSync} from 'node:fs';
test('exact review schedule, including unlimited level 5 maintenance',()=>{
 let p=initialProgress('word',0);
 for(const [due,level,next] of [[2,2,10],[10,3,34],[34,4,82],[82,5,202],[202,5,322],[322,5,442]]){
  assert.equal(p.nextReviewAt,due!*HOUR);p=reviewProgress(p,true,p.nextReviewAt);assert.equal(p.level,level);assert.equal(p.nextReviewAt,next!*HOUR);
 }
});
test('wrong at every level resets to L1; late reviews schedule from actual answer',()=>{
 for(const level of [1,2,3,4,5] as const){const p=reviewProgress({...initialProgress('x',0),level},false,200*HOUR);assert.equal(p.level,1);assert.equal(p.nextReviewAt,202*HOUR);}
 const p=initialProgress('x',0);assert.equal(isDue(p,2*HOUR),true);assert.equal(isDue(p,2*HOUR-1),false);assert.equal(reviewProgress(p,true,100*HOUR).nextReviewAt,108*HOUR);
 assert.throws(()=>initialProgress('x',NaN));assert.throws(()=>initialProgress('x',-1));
});
test('strict spelling, explicitly declared variants and Unicode normalization',()=>{
 assert.equal(normalizeAnswer('  ＤＯＮ’T  '),"don't");assert.equal(gradeAnswer(' lifelong   learning ',['lifelong learning']),true);
 assert.equal(gradeAnswer('favourite',['favorite']),false);assert.equal(gradeAnswer('favourite',['favorite','favourite']),true);
 assert.equal(gradeAnswer('hoby',['hobby']),false);assert.equal(gradeAnswer('hobby!',['hobby']),false);assert.throws(()=>gradeAnswer('  ',['hobby']));
});
test('cloze hides at least half the letters, preserves spaces/hyphens and reconstructs exactly',()=>{
 for(const target of ['a','go','hobby','well-being','public transport',"don't",'ｈｏｂｂｙ','ﬁre']){
  const mask=createMask(target),chars=Array.from(target.normalize('NFKC'));assert.equal(mask.filter(c=>c.kind==='blank').length,Math.ceil(chars.filter(c=>/\p{L}/u.test(c)).length/2));
  assert.equal(assembleAnswer(mask,chars.filter((_,i)=>mask[i]?.kind==='blank')),target.normalize('NFKC'));validateClozeAnswer(target,mask);
  assert.deepEqual(mask,createMask(target));assert.throws(()=>assembleAnswer(mask,[]));assert.throws(()=>validateClozeAnswer('',mask));
 }
});
test('schema rejects fake readiness, CEFR ranges, unknown fields and broken references',()=>{
 assert.equal(parseEntry(sample()).headword,'hobby');assert.throws(()=>parseEntry({...sample(),provenance:[{...sample().provenance[0],url:'javascript:alert(1)'}]}));assert.throws(()=>parseEntry({...sample(),meaningVi:''}));
 assert.throws(()=>parseEntry({...sample(),collectionId:'ielts'}));assert.throws(()=>parseEntry({...sample(),extra:'not allowed'}));
 assert.equal(parseEntry({...sample(),contentStatus:'draft',meaningVi:'',partOfSpeech:'',examples:[],acceptedLearnAnswers:[],cefr:{level:null,status:'unknown',note:''}}).contentStatus,'draft');
 assert.throws(()=>contentSchema.parse({schemaVersion:1,contentVersion:'test',entries:[],topics:[{id:'daily-001',collectionId:'daily',nameEn:'Test',nameVi:'Thử',order:1,entryIds:['missing']}]}));
});
test('catalog contains exactly 100 topics per collection from TOPICS.md',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../content/catalog.json',import.meta.url),'utf8')) as unknown[];
 const topics=catalog.map(parseTopic);assert.equal(topics.length,200);assert.equal(new Set(topics.map(t=>t.id)).size,200);
 for(const collection of ['ielts','daily'])assert.deepEqual(topics.filter(t=>t.collectionId===collection).map(t=>t.order),Array.from({length:100},(_,i)=>i+1));
});
