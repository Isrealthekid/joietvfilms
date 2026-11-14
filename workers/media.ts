import type { R2Bucket, ExecutionContext } from '@cloudflare/workers-types';

export interface Env {
  POSTERS: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  ALLOWED_ORIGINS: string;
}
const MAX_BYTES = 10 * 1024 * 1024;
const types: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const keyPattern = /^posters\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

function isImage(bytes: Uint8Array, type: string) {
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === 'image/png') return [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  return new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP';
}

export default {
  async fetch(request: Request, env: Env, ctx: Pick<ExecutionContext, 'cache'>): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = env.ALLOWED_ORIGINS.split(',').map(v => v.trim()).filter(Boolean);
    const headers: Record<string,string> = { 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' };
    if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (value: object, status = 200) => Response.json(value, { status, headers: { ...headers, 'Cache-Control': 'no-store' } });

    if (request.method === 'OPTIONS') {
      if (!origin || !allowed.includes(origin)) return reply({error:'Origin is not allowed.'},403);
      return new Response(null, {status:204, headers:{...headers,'Cache-Control':'no-store','Access-Control-Allow-Methods':'GET, HEAD, POST, DELETE, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}});
    }
    try {
      if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname.startsWith('/media/')) {
        const key = url.pathname.slice('/media/'.length);
        if (!keyPattern.test(key)) return reply({error:'Not found.'},404);
        const object = await env.POSTERS.get(key);
        if (!object) return reply({error:'Not found.'},404);
        // Posters are public assets: share a cache entry across frontend origins.
        // Admin operations below keep their strict origin allowlist and no-store.
        const authenticated = request.headers.has('Authorization');
        return new Response(request.method === 'HEAD' ? null : object.body as unknown as ReadableStream, {headers:{
          'Access-Control-Allow-Origin':'*',
          'X-Content-Type-Options':'nosniff',
          'Content-Type':object.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control':authenticated ? 'no-store' : 'public, max-age=3600, s-maxage=86400',
          'Cache-Tag':`poster:${key}`,
          'ETag':object.httpEtag,
        }});
      }
      if (url.pathname !== '/uploads' || !['POST','DELETE'].includes(request.method)) return reply({error:'Not found.'},404);
      if (origin && !allowed.includes(origin)) return reply({error:'Origin is not allowed.'},403);
      if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return reply({error:'Media service is not configured.'},503);
      const authorization = request.headers.get('Authorization') || '';
      if (!/^Bearer \S+$/.test(authorization)) return reply({error:'Sign in to upload posters.'},401);
      const authHeaders = {Authorization:authorization, apikey:env.SUPABASE_PUBLISHABLE_KEY};
      const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {headers:authHeaders});
      if (!userResponse.ok) return reply({error:'Your session has expired. Sign in again.'},401);
      const user = await userResponse.json() as {id?:string};
      if (!user.id) return reply({error:'Invalid session.'},401);
      const adminResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/gallery_admins?user_id=eq.${encodeURIComponent(user.id)}&select=user_id`, {headers:authHeaders});
      if (!adminResponse.ok) return reply({error:'Unable to verify administrator access.'},503);
      const admins = await adminResponse.json() as unknown[];
      if (!Array.isArray(admins) || admins.length !== 1) return reply({error:'Administrator access is required.'},403);

      if (request.method === 'DELETE') {
        const key = url.searchParams.get('key') || '';
        if (!keyPattern.test(key)) return reply({error:'Invalid poster key.'},400);
        // Never remove a poster still referenced by any film, including drafts.
        const used = await fetch(`${env.SUPABASE_URL}/rest/v1/films?poster_key=eq.${encodeURIComponent(key)}&select=id&limit=1`, {headers:authHeaders});
        if (!used.ok) return reply({error:'Unable to check poster usage.'},503);
        const rows = await used.json() as unknown[];
        if (!Array.isArray(rows) || rows.length) return reply({error:'This poster is still attached to a film.'},409);
        await env.POSTERS.delete(key);
        const purge = await ctx.cache.purge({tags:[`poster:${key}`]});
        if (!purge.success) return reply({error:'Poster removed from storage, but cache cleanup failed. Retry deletion.'},503);
        return reply({deleted:true});
      }
      const type = request.headers.get('Content-Type') || '';
      if (!types[type]) return reply({error:'Upload a JPEG, PNG, or WebP image.'},415);
      const length = Number(request.headers.get('Content-Length'));
      if (length > MAX_BYTES) return reply({error:'Posters must be 10 MB or smaller.'},413);
      if (!request.body) return reply({error:'Choose an image.'},400);
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const {value,done} = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BYTES) { await reader.cancel(); return reply({error:'Posters must be 10 MB or smaller.'},413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
      if (size < 12 || !isImage(bytes,type)) return reply({error:'This file is not a valid supported image.'},415);
      const key = `posters/${crypto.randomUUID()}.${types[type]}`;
      await env.POSTERS.put(key, bytes, {httpMetadata:{contentType:type},customMetadata:{uploadedBy:user.id}});
      return reply({key,url:`${url.origin}/media/${key}`},201);
    } catch {
      return reply({error:'The media service is temporarily unavailable. Please try again.'},503);
    }
  },
};
