// Sentence endpoints for Boring Teacher Vocabulary API.
// Staging module: integrate into the existing Worker's fetch handler only after tests.
// The existing /sets routes must remain unchanged.
export async function handleSentenceSets(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const reply = (data, status) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=UTF-8',...corsHeaders}});
  if (path === '/sentence-sets' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return reply({error:'Invalid JSON.'},400); }
    const title = typeof body?.title === 'string' ? body.title.trim().slice(0,100) : 'Sentence Set';
    const language = typeof body?.language === 'string' ? body.language.trim() : '';
    if (!/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(language)) return reply({error:'Invalid language.'},400);
    if (!Array.isArray(body.pairs) || body.pairs.length < 2 || body.pairs.length > 100) return reply({error:'Provide 2–100 sentence pairs.'},400);
    const pairs=[];
    for (const pair of body.pairs) {
      if (!Array.isArray(pair) || pair.length!==2 || pair.some(x=>typeof x!=='string')) return reply({error:'Invalid sentence pair.'},400);
      const clean=pair.map(x=>x.trim());
      if(clean.some(x=>!x || x.length>1000)) return reply({error:'Sentence length must be 1–1000 characters.'},400);
      pairs.push(clean);
    }
    let id,created=false;
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for(let attempt=0;attempt<5&&!created;attempt++){
      const bytes=new Uint8Array(8);crypto.getRandomValues(bytes);
      id='S'+Array.from(bytes,b=>alphabet[b%alphabet.length]).join('');
      try { await env.DB.prepare('INSERT INTO sentence_sets (id,title,language,sentences) VALUES (?,?,?,?)').bind(id,title||'Sentence Set',language,JSON.stringify(pairs)).run();created=true; }
      catch(error){if(!String(error).toLowerCase().includes('unique'))throw error;}
    }
    if(!created)return reply({error:'Could not allocate ID.'},500);
    return reply({ok:true,id,title:title||'Sentence Set',language,sentenceCount:pairs.length},201);
  }
  if(path.startsWith('/sentence-sets/') && request.method==='GET'){
    const id=path.slice('/sentence-sets/'.length).toUpperCase();
    if(!/^S[A-HJ-NP-Z2-9]{8}$/.test(id))return reply({error:'Invalid sentence set ID.'},400);
    const row=await env.DB.prepare('SELECT id,title,language,sentences,created_at FROM sentence_sets WHERE id=?').bind(id).first();
    if(!row)return reply({error:'Sentence set not found.'},404);
    return reply({ok:true,set:{id:row.id,title:row.title,language:row.language,pairs:JSON.parse(row.sentences),createdAt:row.created_at}},200);
  }
  return null;
}
