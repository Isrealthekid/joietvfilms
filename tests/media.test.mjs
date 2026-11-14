import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/media.ts';
import { youtubeId, emptyFilm, validateFilm } from '../lib/films.ts';

test('YouTube links accept only supported hosts and exact video IDs', () => {
  assert.equal(youtubeId('https://youtu.be/aqz-KE-bpKQ?t=10'),'aqz-KE-bpKQ');
  assert.equal(youtubeId('https://www.youtube.com/watch?v=aqz-KE-bpKQ'),'aqz-KE-bpKQ');
  assert.equal(youtubeId('https://youtube.com.evil.test/watch?v=aqz-KE-bpKQ'),null);
  assert.equal(youtubeId('javascript:alert(1)'),null);
  assert.equal(youtubeId('https://youtu.be/invalid'),null);
  assert.match(validateFilm({...emptyFilm,title:'Film',published:true}),/poster/);
});

test('upload authorization, file validation, and safe cleanup', async t => {
  let role='admin';
  let inUse=false;
  const objects=new Map();
  t.mock.method(globalThis,'fetch',async url=>{
    if(String(url).endsWith('/auth/v1/user')) return role==='expired' ? new Response('',{status:401}) : Response.json({id:'test-admin'});
    if(String(url).includes('/gallery_admins')) return Response.json(role==='admin'?[{user_id:'test-admin'}]:[]);
    if(String(url).includes('/films')) return Response.json(inUse?[{id:1}]:[]);
    throw Error('Unexpected request');
  });
  const env={SUPABASE_URL:'https://database.test',SUPABASE_PUBLISHABLE_KEY:'public-test-key',ALLOWED_ORIGINS:'https://gallery.test',POSTERS:{
    async put(key,bytes,metadata){objects.set(key,{body:bytes,httpMetadata:metadata.httpMetadata,httpEtag:'etag'});},
    async get(key){return objects.get(key)||null;},async delete(key){objects.delete(key);},
  }};
  const call=(method,path='/uploads',body,headers={})=>worker.fetch(new Request('https://media.test'+path,{method,headers:{Origin:'https://gallery.test',...headers},body}),env);
  const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
  const auth={Authorization:'Bearer test-session','Content-Type':'image/png'};
  assert.equal((await call('POST','/uploads',png,{'Content-Type':'image/png'})).status,401);
  role='viewer';assert.equal((await call('POST','/uploads',png,auth)).status,403);
  role='expired';assert.equal((await call('POST','/uploads',png,auth)).status,401);
  role='admin';
  assert.equal((await call('POST','/uploads',png,{...auth,Origin:'https://evil.test'})).status,403);
  assert.equal((await call('POST','/uploads','not a real image',auth)).status,415);
  assert.equal((await call('POST','/uploads',png,{...auth,'Content-Length':String(11*1024*1024)})).status,413);
  assert.equal((await call('POST','/uploads','<svg/>',{...auth,'Content-Type':'image/svg+xml'})).status,415);
  const upload=await call('POST','/uploads',png,auth);assert.equal(upload.status,201);
  const {key}=await upload.json();assert.equal(objects.size,1);
  const image=await call('GET','/media/'+key);assert.equal(image.status,200);assert.equal(image.headers.get('Content-Type'),'image/png');
  inUse=true;assert.equal((await call('DELETE','/uploads?key='+key,undefined,auth)).status,409);assert.equal(objects.size,1);
  inUse=false;assert.equal((await call('DELETE','/uploads?key='+key,undefined,auth)).status,200);assert.equal(objects.size,0);
  assert.equal((await call('GET','/media/'+key)).status,404);
  assert.equal((await call('DELETE','/uploads?key=arbitrary',undefined,auth)).status,400);
});
