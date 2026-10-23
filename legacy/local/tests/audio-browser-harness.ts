import {createBackend} from '../src/backend';
import {AmericanSpeech} from '../../../src/audio/controller';
import {VocabDB} from '../src/storage/db';
import {sample} from '../../../tests/fixtures';
Object.assign(globalThis,{createBackend,AmericanSpeech,VocabDB,sample});
