import {z} from 'zod';
import {LookupError,queryKey} from './freeDictionary';
import type {LookupProvider,LookupResult,LookupSense} from './freeDictionary';
import {findDictionaryTarget} from './readingEntry';
const httpsUrl=z.string().url().refine(value=>new URL(value).protocol==='https:');
const quoteSchema = z.object({text: z.string(), reference: z.string().optional()});
const formSchema = z.object({word: z.string(), tags: z.array(z.string())});
const senseSchema:z.ZodType<Sense>=z.lazy(()=>z.object({
 definition:z.string().min(1),examples:z.array(z.string()).default([]),
 quotes:z.array(quoteSchema).catch([]),subsenses:z.array(senseSchema).default([])
}));
interface Sense {definition:string;examples:string[];quotes:z.infer<typeof quoteSchema>[];subsenses:Sense[]}
const schema=z.object({
 word:z.string(),entries:z.array(z.object({language:z.object({code:z.string()}),partOfSpeech:z.string(),
 pronunciations:z.array(z.object({type:z.string(),text:z.string(),tags:z.array(z.string()).default([])})).default([]),
 forms:z.array(formSchema).catch([]),
 senses:z.array(senseSchema)
 })),source:z.object({url:httpsUrl,license:z.object({name:z.string().min(1),url:httpsUrl})})
});

const sentences = new Intl.Segmenter('en', {granularity: 'sentence'});
const inflectionTags = new Set(['plural', 'past', 'present', 'participle', 'gerund', 'comparative', 'superlative']);

function completeSentence(text: string) {
  return !text.includes('=') &&
    /^[“"‘']?\p{Lu}/u.test(text) && /[.!?][”"’')]*$/u.test(text);
}

function selectExample(
  query: string,
  forms: string[],
  sense: Sense,
  source: z.infer<typeof schema>['source'],
): Pick<LookupSense, 'example' | 'exampleSource'> {
  const valid = (text: string) =>
    text.length <= 10_000 && Boolean(findDictionaryTarget(text, query, forms));
  for (const example of sense.examples) {
    for (const {segment} of sentences.segment(example)) {
      const text = segment.trim();
      if (completeSentence(text) && valid(text)) return {example: text};
    }
  }

  for (const quote of sense.quotes) {
    for (const {segment} of sentences.segment(quote.text)) {
      const text = segment.trim();
      // Skip fragments, omissions, and verse when choosing a study sentence.
      if (!completeSentence(text) || /[[\]…/]/u.test(text) || text.length > 280 ||
          !valid(text)) continue;

      return {
        example: text,
        exampleSource: {
          field: 'example',
          attribution: ('Trích dẫn qua Wiktionary' +
            (quote.reference ? ' — ' + quote.reference : '')).slice(0, 10_000),
          license: source.license.name,
          url: source.url,
          status: 'unverified',
          checkedAt: null,
        },
      };
    }
  }

  return {example: null};
}

/** Keyless Wiktionary provider. No inferred CEFR or Vietnamese translation. */
export class WiktionaryDictionary implements LookupProvider {
 constructor(private readonly request:typeof fetch=fetch,private readonly timeoutMs=8000){}
 async lookup(value:string,signal?:AbortSignal):Promise<LookupResult>{
  const query=queryKey(value),timer=AbortSignal.timeout(this.timeoutMs),combined=signal?AbortSignal.any([signal,timer]):timer;
  try {
   const response=await this.request.call(globalThis,'https://freedictionaryapi.com/api/v1/entries/en/'+encodeURIComponent(query),{signal:combined,credentials:'omit',referrerPolicy:'no-referrer'});
   if(response.status===429){
    const raw=response.headers.get('Retry-After');
    const parsed=raw===null?NaN:(Number.isFinite(Number(raw))?Number(raw):(Date.parse(raw)-Date.now())/1000);
    throw new LookupError('rate-limit','Try again later',Number.isFinite(parsed)?Math.max(0,Math.ceil(parsed)):null);
   }
   if(!(response.headers.get('content-type')??'').includes('application/json'))throw new LookupError('invalid-response','Dictionary returned a non-JSON response');
   if(response.status===404)throw new LookupError('not-found','Word not found');
   if(!response.ok)throw new LookupError('network','Dictionary returned '+response.status);
   let body:unknown;try{body=await response.json();}catch(error){if(combined.aborted)throw error;throw new LookupError('invalid-response','Invalid JSON');}
   const result=schema.safeParse(body);if(!result.success)throw new LookupError('invalid-response','Unexpected dictionary response');
   const data=result.data,entries=data.entries.filter(e=>e.language.code==='en');
   const sounds=(entry:typeof entries[number]):LookupResult['phonetics']=>{
    const phonetics:LookupResult['phonetics']=[];
    for(const p of entry.pronunciations){
     if(p.type.toLowerCase()!=='ipa')continue;
     const accent=p.tags.some(t=>/^(General American|US|USA|United States|American English)$/iu.test(t))?'en-US':null;
     if(!phonetics.some(old=>old.text===p.text&&old.accent===accent))phonetics.push({text:p.text,audio:null,accent,sourceUrl:data.source.url,license:data.source.license});
    }
    return phonetics.sort((a,b)=>Number(b.accent==='en-US')-Number(a.accent==='en-US'));
   };
   const senses:LookupSense[]=[];
   const append=(partOfSpeech:string,items:Sense[],phonetics:LookupResult['phonetics'],forms:string[])=>{for(const sense of items){
    senses.push({
     partOfSpeech,
     definition:sense.definition,
     ...selectExample(query,forms,sense,data.source),
     ...(forms.length ? {exampleForms: forms} : {}),
     sourceUrls:[data.source.url],
     licenses:[data.source.license],
     phonetics,
    });
    append(partOfSpeech,sense.subsenses,phonetics,forms);
   }};
   for(const entry of entries){
    const forms = [...new Set(entry.forms
      .filter(({tags}) => !tags.includes('alternative') && tags.some((tag) => inflectionTags.has(tag)))
      .map(({word}) => word.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US'))
      .filter((word) => word !== query && word.length <= 120 && /^\p{L}[\p{L}\s'’\-]*$/u.test(word)))];
    append(entry.partOfSpeech,entry.senses,sounds(entry),forms);
   }
   if(!senses.length)throw new LookupError('not-found','No English senses found');
   const phonetics=entries.flatMap(sounds).filter((p,i,all)=>all.findIndex(other=>other.text===p.text&&other.accent===p.accent)===i);
   phonetics.sort((a,b)=>Number(b.accent==='en-US')-Number(a.accent==='en-US'));
   return {query,source:'api',provider:{name:'FreeDictionaryAPI.com',url:'https://freedictionaryapi.com/'},senses,phonetics};
  }catch(error){
   if(signal?.aborted)throw new LookupError('aborted','Lookup canceled');
   if(timer.aborted)throw new LookupError('timeout','Dictionary timed out');
   if(error instanceof LookupError)throw error;
   const failure=new LookupError('network','Dictionary unavailable');failure.cause=error;throw failure;
  }
 }
}
