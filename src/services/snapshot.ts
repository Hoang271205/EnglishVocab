import {z} from 'zod';
import {entrySchema} from '../content/schema';
import {VocabDB} from '../storage/db';
export const snapshotSchema=z.object({protocol:z.literal(1),version:z.number().int().nonnegative(),entries:z.array(entrySchema).max(20_000)}).strict();
export class SnapshotService {
 constructor(private readonly db:VocabDB,private readonly now=()=>Date.now()){}
 async export(){return this.db.transaction('r',this.db.entries,async()=>snapshotSchema.parse({protocol:1,version:this.now(),entries:await this.db.entries.toArray()}));}
}
