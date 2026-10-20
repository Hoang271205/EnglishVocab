import {z} from 'zod';
import {ServiceError} from '../domain/types';
const https=z.url().refine(s=>new URL(s).protocol==='https:');
export const ipaChartSchema=z.object({
 schemaVersion:z.literal(1),id:z.string(),source:z.object({author:z.string(),organization:z.string(),url:https,landingUrl:https,license:z.string(),attribution:z.string()}).strict(),notes:z.array(z.string()),
 phonemes:z.array(z.object({symbol:z.string().min(1),aliases:z.array(z.string()),group:z.enum(['consonant','vowel','diphthong']),example:z.string(),targetAccent:z.literal('en-US')}).strict()).min(1)
}).strict().superRefine((p,ctx)=>{
 const symbols=p.phonemes.flatMap(x=>[x.symbol,...x.aliases]);if(new Set(symbols).size!==symbols.length)ctx.addIssue({code:'custom',message:'Duplicate IPA symbol/alias'});
});
export class IpaChartService {
 private cached:Promise<z.infer<typeof ipaChartSchema>>|null=null;
 constructor(private readonly load:()=>Promise<unknown>=async()=>{
  const response=await fetch('/content/phonemes.json',{credentials:'omit'});if(!response.ok)throw Error('Missing IPA chart');return response.json();
 }){}
 private catalog(){return this.cached??=this.load().then(value=>ipaChartSchema.parse(value)).catch(()=>{this.cached=null;throw new ServiceError('unavailable','Không tải được bảng IPA');});}
 async list(){return structuredClone(await this.catalog());}
 async find(symbol:string){
  const catalog=await this.catalog(),phoneme=catalog.phonemes.find(p=>p.symbol===symbol||p.aliases.includes(symbol));
  if(!phoneme)throw new ServiceError('not-found','Không tìm thấy ký hiệu IPA');return structuredClone(phoneme);
 }
}
