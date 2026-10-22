// Run with: node --test tests/distractors.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const extract = (from, to) => {
  const start = html.indexOf(from), end = html.indexOf(to, start);
  assert.ok(start >= 0 && end > start, 'Missing generator source: ' + from);
  return html.slice(start, end);
};
const library = html.match(/const LIB=(\{.*?\});\s*const CURATED=/s);
assert.ok(library, 'Missing language library');
const curated = html.match(/const CURATED=(\{.*?\});\s*function tokenize/s);
assert.ok(curated, 'Missing curated library');
const context = vm.createContext({});
vm.runInContext('const LIB=' + library[1] + '; const CURATED=' + curated[1] + ';' +
  extract('function tokenize(', 'function showMenu(') +
  '; globalThis.api={LIB,CURATED,tokenize,targetLanguagePool,makeSentence}', context);
const { LIB, CURATED, targetLanguagePool, makeSentence } = context.api;
for (const locale of ['es-ES','de-DE','da-DK','fr-FR','it-IT']) {
  test(locale + ': built-in and custom distractors stay within selected language pool', () => {
    const pairs = Object.values(LIB[locale]).flat();
    const custom = [['Test sentence', pairs[0][1]]];
    const pool = targetLanguagePool(locale, custom);
    const allowed = new Set(pool);
    for (const pair of [...pairs.slice(0, 6), ...custom]) {
      const sentence = makeSentence(pair, pool);
      for (const wave of sentence.waves) {
        assert.equal(wave.length, 4, 'Four choices expected');
        assert.equal(new Set(wave.map(w => w.toLocaleLowerCase())).size, wave.length, 'No duplicates');
        for (const word of wave) assert.ok(allowed.has(word), 'Unexpected foreign distractor: ' + word);
      }
    }
  });
}
test('German never inherits the old Spanish-only distractor fallback', () => {
  const pool = targetLanguagePool('de-DE', [['Test','Ich lese Bücher']]);
  const sentence = makeSentence(['Test','Ich lese Bücher'], pool);
  for (const wave of sentence.waves)
    for (const word of wave)
      assert.ok(!['ayer','mañana','nosotros','trabajo'].includes(word.toLowerCase()));
});
