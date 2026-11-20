import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { contentSchema } from '../src/content/schema.ts';

const base = 'content/crawl/research-part2-2026-11-20';
const output = 'content/crawl/part2-release-2026-11-20';
await mkdir(output, { recursive: true });
const catalog = JSON.parse(await readFile('content/catalog.json', 'utf8'));
const optional = async (path) => {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return {};
    throw e;
  }
};
const surfaces = await optional(`${output}/cloze-surfaces.json`);
const ledger = await optional(`${output}/editorial-review.json`);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const canonical = (value) => value.replace(/[’‘]/gu, "'");
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const irregular = {
  be: ['am', 'is', 'are', 'was', 'were', 'been', 'being'],
  have: ['has', 'had', 'having'],
  do: ['does', 'did', 'done', 'doing'],
  go: ['goes', 'went', 'gone', 'going'],
  take: ['takes', 'took', 'taken', 'taking'],
  make: ['makes', 'made', 'making'],
  get: ['gets', 'got', 'gotten', 'getting'],
  give: ['gives', 'gave', 'given', 'giving'],
  feel: ['feels', 'felt', 'feeling'],
  find: ['finds', 'found', 'finding'],
  leave: ['leaves', 'left', 'leaving'],
  pay: ['pays', 'paid', 'paying'],
  set: ['sets', 'setting'],
  put: ['puts', 'putting'],
  say: ['says', 'said', 'saying'],
  buy: ['buys', 'bought', 'buying'],
  choose: ['chooses', 'chose', 'chosen', 'choosing'],
  keep: ['keeps', 'kept', 'keeping'],
  send: ['sends', 'sent', 'sending'],
  hold: ['holds', 'held', 'holding'],
  fall: ['falls', 'fell', 'fallen', 'falling'],
  break: ['breaks', 'broke', 'broken', 'breaking'],
  run: ['runs', 'ran', 'running'],
  wear: ['wears', 'wore', 'worn', 'wearing'],
  read: ['reads', 'reading'],
  think: ['thinks', 'thought', 'thinking'],
  sit: ['sits', 'sat', 'sitting'],
  write: ['writes', 'wrote', 'written', 'writing'],
  speak: ['speaks', 'spoke', 'spoken', 'speaking'],
  stand: ['stands', 'stood', 'standing'],
  draw: ['draws', 'drew', 'drawn', 'drawing'],
  see: ['sees', 'saw', 'seen', 'seeing'],
  bring: ['brings', 'brought', 'bringing'],
  cut: ['cuts', 'cutting'],
};
function forms(word) {
  const set = new Set([
    word,
    ...(irregular[word] ?? []),
    word + 's',
    word + 'es',
    word + 'd',
    word + 'ed',
    word + 'ing',
  ]);
  if (word.endsWith('e')) set.add(word.slice(0, -1) + 'ing');
  if (word.endsWith('y')) {
    set.add(word.slice(0, -1) + 'ies');
    set.add(word.slice(0, -1) + 'ied');
  }
  if (/[aeiou][bcdfgklmnpqrstvwz]$/iu.test(word)) {
    set.add(word + word.at(-1) + 'ed');
    set.add(word + word.at(-1) + 'ing');
  }
  return [...set]
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join('|');
}
function locate(entry) {
  const sentence = canonical(entry.example),
    head = canonical(entry.headword);
  const explicit = surfaces[entry.id];
  const literal = explicit ?? head;
  const exact = new RegExp(
    `(?<![\\p{L}\\p{N}])${escape(canonical(literal))}(?![\\p{L}\\p{N}])`,
    'iu',
  ).exec(sentence);
  if (exact)
    return {
      index: exact.index,
      length: exact[0].length,
      method: explicit ? 'reviewed-override' : 'exact',
    };
  if (explicit) return null;
  const words = head.split(/\s+/u);
  const pattern = words.map((w) => `(?:${forms(w)})`).join('\\s+');
  const match = new RegExp(
    `(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`,
    'iu',
  ).exec(sentence);
  return match
    ? { index: match.index, length: match[0].length, method: 'inflection' }
    : null;
}
const entries = [],
  topics = [],
  unresolved = [],
  surfaceLog = [],
  ipaHeld = [];
const unreviewed = [];
for (const parent of catalog) {
  const file = `${base}/${parent.collectionId}/${parent.id}-part-2.json`;
  const raw = JSON.parse(await readFile(file, 'utf8'));
  const ids = [];
  for (const e of raw.entries) {
    const fields = Object.fromEntries(
      ['id', 'headword', 'partOfSpeech', 'meaningVi', 'example'].map((k) => [
        k,
        e[k],
      ]),
    );
    // Python's canonical serialization used in the editorial ledger, including spacing.
    const pythonJson =
      '{' +
      Object.keys(fields)
        .sort()
        .map((k) => JSON.stringify(k) + ': ' + JSON.stringify(fields[k]))
        .join(', ') +
      '}';
    const reviewed = ledger.entries?.[e.id];
    if (
      reviewed?.decision !== 'reviewed-authored' ||
      reviewed.contentSha256 !== hash(pythonJson)
    )
      unreviewed.push(e.id);
    const found = locate(e);
    if (!found) {
      unresolved.push({
        topicId: parent.id,
        id: e.id,
        headword: e.headword,
        example: e.example,
      });
      continue;
    }
    const surface = e.example.slice(found.index, found.index + found.length);
    surfaceLog.push({
      topicId: parent.id,
      entryId: e.id,
      headword: e.headword,
      surface,
      method: found.method,
      example: e.example,
    });
    const keepIpa = Boolean(
      e.ipa && e.provenance.ipaSourceUrl?.includes('dictionary.cambridge.org'),
    );
    if (e.ipa && !keepIpa)
      ipaHeld.push({
        entryId: e.id,
        headword: e.headword,
        ipa: e.ipa,
        source: e.provenance.ipaSourceUrl,
        reason:
          'Local bulk IPA remains unverified; retained in draft and audit but omitted from imported pronunciation.',
      });
    const meaningLicense =
      e.provenance.meaningLicense ?? raw.sourcePolicy.meaningLicense;
    const exampleLicense =
      e.provenance.exampleLicense ?? raw.sourcePolicy.exampleLicense;
    const provenance = [
      {
        field: 'meaning',
        attribution: e.provenance.meaning,
        license: meaningLicense,
        url: e.provenance.meaningSourceUrl ?? null,
        status: 'authored',
        checkedAt: null,
      },
      {
        field: 'example',
        attribution: e.provenance.example,
        license: exampleLicense,
        url: null,
        status: 'authored',
        checkedAt: null,
      },
    ];
    if (keepIpa)
      provenance.push({
        field: 'ipa',
        attribution: e.provenance.ipa,
        license: e.provenance.ipaLicense ?? raw.sourcePolicy.ipaAttribution,
        url: e.provenance.ipaSourceUrl,
        status: 'unverified',
        checkedAt: null,
      });
    if (e.ipa && !keepIpa)
      provenance.push({
        field: 'ipa',
        attribution: `${e.provenance.ipa}; original draft IPA ${e.ipa} withheld pending verification`,
        license: e.provenance.ipaLicense,
        url: e.provenance.ipaSourceUrl,
        status: 'unverified',
        checkedAt: null,
      });
    entries.push({
      id: e.id,
      revision: 1,
      collectionId: parent.collectionId,
      headword: e.headword,
      partOfSpeech: e.partOfSpeech,
      senseKey: e.id,
      meaningVi: e.meaningVi,
      acceptedLearnAnswers: [e.headword],
      cefr: {
        level: null,
        status: 'unknown',
        note: 'No verified CEFR for this sense.',
      },
      pronunciation: {
        ipa: keepIpa ? e.ipa : null,
        accent: keepIpa ? 'en-US' : null,
      },
      examples: [
        {
          id: e.id + '-example',
          prefix: e.example.slice(0, found.index),
          targetSurface: surface,
          suffix: e.example.slice(found.index + found.length),
          acceptedAnswers: [surface],
        },
      ],
      provenance,
      contentStatus: 'ready',
    });
    ids.push(e.id);
  }
  topics.push({
    id: parent.id + '-part-2',
    collectionId: parent.collectionId,
    nameEn: parent.nameEn + ' (Part 2)',
    nameVi: parent.nameVi + ' (Phần 2)',
    order: parent.order + 100,
    part: 2,
    parentTopicId: parent.id,
    entryIds: ids,
  });
}
for (const [name, data] of [
  ['unresolved-surfaces.json', unresolved],
  ['surface-review.json', surfaceLog],
  ['held-ipa.json', ipaHeld],
  ['unreviewed-entry-ids.json', unreviewed],
])
  await writeFile(`${output}/${name}`, JSON.stringify(data, null, 2) + '\n');
if (unresolved.length || unreviewed.length) {
  console.log(
    JSON.stringify({
      unresolved: unresolved.length,
      unreviewed: unreviewed.length,
      preparedSurfaces: surfaceLog.length,
    }),
  );
  if (!process.argv.includes('--prepare')) process.exitCode = 1;
} else {
  const pack = contentSchema.parse({
    schemaVersion: 1,
    contentVersion: 'part2-reviewed-2026-11-20-v1',
    entries,
    topics,
  });
  const bytes = JSON.stringify(pack, null, 2) + '\n';
  // Never overwrite a previously approved package; corrections get a new release.
  await writeFile(`${output}/content.json`, bytes, { flag: 'wx' });
  console.log(
    JSON.stringify({
      topics: topics.length,
      entries: entries.length,
      sha256: hash(bytes),
      heldIPA: ipaHeld.length,
    }),
  );
}
