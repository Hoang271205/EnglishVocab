import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createReadingEntry,
  dictionaryExample,
  remoteIpa,
} from '../src/dictionary/readingEntry';
import {
  makeDraft,
  restoreLetters,
} from '../src/frontend/features/review/draft';
import type {
  LookupResult,
  LookupSense,
} from '../src/dictionary/freeDictionary';
import type { Question } from '../src/domain/types';

const sense: LookupSense = {
  partOfSpeech: 'noun',
  definition: 'An activity enjoyed in free time.',
  example: 'Reading is my hobby.',
  sourceUrls: ['https://example.com/hobby'],
  licenses: [{ name: 'CC BY-SA', url: 'https://example.com/license' }],
};
const sound: LookupResult['phonetics'][number] = {
  text: '/ˈhɑbi/',
  audio: null,
  accent: 'en-US',
  sourceUrl: 'https://example.com/hobby',
  license: null,
};
const result: LookupResult = {
  query: 'hobby',
  source: 'api',
  senses: [sense],
  phonetics: [sound],
};
const input = {
  entryId: 'personal-test',
  word: 'Hobby',
  result,
  sense,
  meaningVi: ' sở thích ',
  partOfSpeech: ' n. ',
};

test('reading saves complete dictionary data with provenance and unknown CEFR', () => {
  const entry = createReadingEntry(input);
  assert.equal(entry.contentStatus, 'ready');
  assert.equal(entry.meaningVi, 'sở thích');
  assert.equal(entry.headword, 'hobby');
  assert.deepEqual(entry.cefr, { level: null, status: 'unknown', note: '' });
  assert.deepEqual(entry.pronunciation, { ipa: sound.text, accent: 'en-US' });
  assert.deepEqual(
    entry.provenance.map((source) => source.field),
    ['definition', 'example', 'meaning', 'ipa'],
  );
  assert.equal(entry.examples[0]?.targetSurface, 'hobby');
});

test('reading without translation or lookup results remains a draft', () => {
  assert.equal(
    createReadingEntry({ ...input, meaningVi: '' }).contentStatus,
    'draft',
  );
  const entry = createReadingEntry({
    ...input,
    result: null,
    sense: undefined,
  });
  assert.equal(entry.contentStatus, 'draft');
  assert.deepEqual(entry.examples, []);
  assert.deepEqual(entry.pronunciation, { ipa: null, accent: null });
  assert.equal(entry.headword, 'Hobby');
});

test('dictionary examples require one complete target and preserve original surface', () => {
  assert.deepEqual(dictionaryExample('My hobby is a hobby.', 'hobby'), []);
  assert.deepEqual(dictionaryExample('These hobbies are fun.', 'hobby'), []);
  assert.deepEqual(dictionaryExample(null, 'hobby'), []);
  const example = dictionaryExample('My HOBBY is reading.', 'hobby')[0];
  assert.equal(example?.targetSurface, 'HOBBY');
  assert.equal(example?.prefix, 'My ');
  assert.equal(example?.suffix, ' is reading.');
});

test('IPA uses the selected sense and refuses ambiguous or non-US pronunciations', () => {
  assert.equal(remoteIpa(result, sense)?.text, sound.text);
  assert.equal(
    remoteIpa(
      { ...result, phonetics: [sound, { ...sound, text: '/other/' }] },
      sense,
    ),
    null,
  );
  assert.equal(remoteIpa(result, { ...sense, phonetics: [] }), null);
  assert.equal(
    remoteIpa({ ...result, phonetics: [{ ...sound, accent: null }] }, sense),
    null,
  );
});

const question: Question = {
  attemptId: 'attempt',
  meaningVi: 'sở thích',
  partOfSpeech: 'n.',
  prefix: '',
  suffix: '',
  cells: [
    { kind: 'fixed', value: 'h' },
    { kind: 'blank' },
    { kind: 'fixed', value: 'b' },
    { kind: 'blank' },
    { kind: 'blank' },
  ],
};
test('review draft restores only missing letters, including unfinished drafts', () => {
  assert.equal(makeDraft(question, ['o', 'b', 'y']), 'hobby');
  assert.deepEqual(restoreLetters(question, 'hobby'), ['o', 'b', 'y']);
  assert.equal(makeDraft(question, ['o', '', '']), 'hob__');
  assert.deepEqual(restoreLetters(question, 'hob__'), ['o', '', '']);
  assert.deepEqual(restoreLetters(question, 'shorter'), ['', '', '']);
});
