import type {Entry} from '../domain/types';
import type {LookupResult} from '../dictionary/freeDictionary';
const parts:Record<string,string>={'n.':'noun','adj.':'adjective','v.':'verb','adv.':'adverb','prep.':'preposition','interj.':'interjection','phrasal v.':'verb','n. phrase':'noun','v. phrase':'verb','adv. phrase':'adverb'};
/** Copy only a uniquely identified US pronunciation for the matching part of speech. */
export function referencePronunciation(entry:Entry,result:LookupResult):Entry|null {
 if(entry.pronunciation.ipa||entry.headword.toLowerCase()!==result.query)return null;
 const part=parts[entry.partOfSpeech];if(!part)return null;
 const variants=result.senses.filter(s=>s.partOfSpeech===part).flatMap(s=>s.phonetics??[]).filter(p=>p.accent==='en-US'&&p.text&&p.sourceUrl&&p.license);
 const texts=[...new Set(variants.map(p=>p.text))];if(texts.length!==1)return null;
 const sound=variants[0]!;
 return {...entry,revision:entry.revision+1,pronunciation:{ipa:sound.text,accent:'en-US'},provenance:[...entry.provenance,{
  field:'ipa',attribution:`${result.provider?.name??'Dictionary'} / Wiktionary — IPA tagged General American/US; copied automatically, not manually listened`,
  license:`${sound.license!.name} (${sound.license!.url??'license URL not supplied'})`,url:sound.sourceUrl,status:'unverified',checkedAt:null
 }]};
}
