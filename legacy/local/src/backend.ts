import {IpaChartService} from '../../../src/content/ipa';
import {EntryAudioService} from './audio/entries';
import type {AmericanSpeech} from '../../../src/audio/controller';
import {SettingsService} from './services/settings';
import {TransferService,BrowserExtensionBridge} from './services/transfer';
import type {ExtensionBridge} from './services/transfer';
import {VocabDB} from './storage/db';
import {StudyService} from './services/study';
import {PersonalService} from './services/personal';
import {QueryService} from './services/queries';
import {SnapshotService} from './services/snapshot';
import {ContentService} from './content/import';
import {BackupService} from './storage/backup';
import {DictionaryService} from './dictionary/lookup';
import {LookupError} from '../../../src/dictionary/freeDictionary';
import {WiktionaryDictionary} from '../../../src/dictionary/wiktionaryDictionary';
import {ServiceError} from '../../../src/domain/types';
import type {Clock} from '../../../src/domain/types';
import {ZodError} from 'zod';
function rethrow(error:unknown):never {
 if(error instanceof ServiceError||error instanceof LookupError)throw error;
 if(error instanceof ZodError)throw new ServiceError('validation',error.message);
 if(error instanceof Error&&['DatabaseClosedError','QuotaExceededError','AbortError','TransactionInactiveError','VersionError','OpenFailedError','ConstraintError','BulkError','ModifyError','NotFoundError','InvalidStateError','DataCloneError','DataError','UnknownError','ReadOnlyError','MissingAPIError'].includes(error.name))throw new ServiceError('storage',error.message);
 throw error;
}
function guarded<T extends object>(target:T):T {
 return new Proxy(target,{get(object,key){const value=Reflect.get(object,key);if(typeof value!=='function')return value;return (...args:unknown[])=>{
  try {const result=Reflect.apply(value,object,args) as unknown;
   return result instanceof Promise?result.catch(rethrow):result;
  }catch(error){return rethrow(error);}
 };}});
}
export function createBackend(options:{name?:string;clock?:Clock;request?:typeof fetch;bridge?:ExtensionBridge;createSpeech?:()=>AmericanSpeech}={}) {
 const db=new VocabDB(options.name),clock=options.clock??{now:()=>Date.now()};
 const personal=new PersonalService(db),audio=new EntryAudioService(db,options.createSpeech),ipa=new IpaChartService();
 return {
  ipa:guarded(ipa),audio:guarded(audio),settings:guarded(new SettingsService(db)),study:guarded(new StudyService(db,clock)),personal:guarded(personal),transfer:guarded(new TransferService(personal,options.bridge??new BrowserExtensionBridge())),
  queries:guarded(new QueryService(db,clock)),snapshot:guarded(new SnapshotService(db,()=>clock.now())),
  content:guarded(new ContentService(db)),backup:guarded(new BackupService(db,()=>clock.now())),
  dictionary:guarded(new DictionaryService(db,new WiktionaryDictionary(options.request??fetch),()=>clock.now())),
  close:()=>{audio.stop();db.close();}
 };
}
