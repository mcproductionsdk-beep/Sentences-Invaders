import test from 'node:test';
import assert from 'node:assert/strict';
import {handleSentenceSets} from '../sentence-sets-handler.js';

function mockDb() {
  const rows=new Map();
  const DB={prepare(sql){return {bind(...params){return {async run(){if(!sql.startsWith('INSERT INTO sentence_sets'))throw Error('Unexpected SQL');const [id,title,language,sentences]=params;if(rows.has(id))throw Error('UNIQUE constraint failed');rows.set(id,{id,title,language,sentences,created_at:'2026-10-21 00:00:00'});return {success:true}},async first(){if(!sql.startsWith('SELECT id,title,language,sentences,created_at FROM sentence_sets'))throw Error('Unexpected SQL');return rows.get(params[0])??null}}}}}};
  return {DB,rows};
}
const url='https://example.test/sentence-sets';
function post(body){return new Request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
const valid={title:'Mi rutina',language:'es-ES',pairs:[['Yo estudio español.','I study Spanish.'],['Ella come pan.','She eats bread.']]};

test('create and retrieve preserve exact target-first sentences',async()=>{
  const env=mockDb();const created=await handleSentenceSets(post(valid),env,{});
  assert.equal(created.status,201);const c=await created.json();assert.match(c.id,/^S[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(c.sentenceCount,2);
  const retrieved=await handleSentenceSets(new Request(url+'/'+c.id),env,{});
  assert.equal(retrieved.status,200);const result=await retrieved.json();
  assert.deepEqual(result.set.pairs,valid.pairs);assert.equal(result.set.language,'es-ES');
});

test('rejects malformed and oversized pairs',async()=>{
  for(const pairs of [[],[['uno','one']],[[123,'one'],['dos','two']], [['a'.repeat(1001),'one'],['dos','two']]]){
    const r=await handleSentenceSets(post({...valid,pairs}),mockDb(),{});assert.equal(r.status,400);
  }
});

test('rejects invalid language and malformed IDs',async()=>{
  assert.equal((await handleSentenceSets(post({...valid,language:''}),mockDb(),{})).status,400);
  assert.equal((await handleSentenceSets(new Request(url+'/INVALID'),mockDb(),{})).status,400);
});

test('returns 404 for unknown valid ID and does not intercept vocabulary paths',async()=>{
  assert.equal((await handleSentenceSets(new Request(url+'/SABCDEFGH'),mockDb(),{})).status,404);
  assert.equal(await handleSentenceSets(new Request('https://example.test/sets/ABC123'),mockDb(),{}),null);
});
