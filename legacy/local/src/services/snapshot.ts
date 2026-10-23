import { snapshotSchema } from '../../../../src/shared/schemas/snapshot';
export { snapshotSchema } from '../../../../src/shared/schemas/snapshot';
import { VocabDB } from '../storage/db';
export class SnapshotService {
 constructor(private readonly db:VocabDB,private readonly now=()=>Date.now()){}
 async export(){return this.db.transaction('r',this.db.entries,async()=>snapshotSchema.parse({protocol:1,version:this.now(),entries:await this.db.entries.toArray()}));}
}
