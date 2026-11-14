'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, ArrowUpRight, Check, Film as FilmIcon, ImagePlus, LoaderCircle, LogOut, Plus, Search, Trash2, X } from 'lucide-react';
import { getSupabase, isConfigured, mediaApiUrl } from '../../lib/supabase';
import { emptyFilm, type Film, type FilmInput, validateFilm, youtubeId } from '../../lib/films';
import './dashboard.css';

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(false);
  const [films, setFilms] = useState<Film[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All films');
  const [editing, setEditing] = useState<Film | 'new' | null>(null);
  const [draft, setDraft] = useState<FilmInput>({...emptyFilm});
  const [cast, setCast] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (!isConfigured) { setAuthReady(true); return; }
    const db = getSupabase();
    let active = true;
    db.auth.getSession().then(({data,error}) => { if (active) { setSession(data.session); setAuthReady(true); if (error) setError(error.message); } });
    const {data:{subscription}} = db.auth.onAuthStateChange((_event,next) => { setSession(next); setAuthReady(true); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    setAuthorized(false);
    if (!session) { setFilms([]); setEditing(null); return; }
    let active = true;
    setChecking(true);
    (async () => {
      const db = getSupabase();
      const {data:{user},error:authError} = await db.auth.getUser();
      if (authError || !user) throw new Error('Your session has expired. Please sign in again.');
      const {data,error:memberError} = await db.from('gallery_admins').select('user_id').eq('user_id',user.id).maybeSingle();
      if (memberError) throw memberError;
      if (!data) throw new Error('This account does not have administrator access.');
      if (!active) return;
      setAuthorized(true);
      const {data:rows,error:listError} = await db.from('films').select('*').order('sort_order').order('id');
      if (listError) throw listError;
      if (active) setFilms(rows || []);
    })().catch(e => { if(active) setError(e.message || 'Unable to load the dashboard.'); }).finally(() => { if(active) setChecking(false); });
    return () => { active = false; };
  }, [session?.user.id]);

  useEffect(() => {
    if (!file) { setPreview(draft.poster_url); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, draft.poster_url]);

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const {error} = await getSupabase().auth.signInWithPassword({email:email.trim(),password});
      if (error) throw error;
      setPassword('');
    } catch(e) { setError(e instanceof Error ? e.message : 'Sign-in failed.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    const {error} = await getSupabase().auth.signOut();
    if(error) setError(error.message); else { setSession(null); setAuthorized(false); setError(''); }
  }
  function openEditor(film: Film | 'new') {
    setEditing(film); setError(''); setNotice(''); setFile(null);
    setDraft(film === 'new' ? {...emptyFilm, sort_order:films.length ? Math.max(...films.map(f=>f.sort_order))+1 : 0} : {...film});
    setCast(film === 'new' ? '' : film.cast_names.join(', '));
  }
  function closeEditor() {
    if (busy) return;
    setEditing(null); setFile(null); setError('');
  }
  async function mediaRequest(method: 'POST' | 'DELETE', body?: File, key?: string) {
    if (!mediaApiUrl) throw new Error('Poster storage is not connected yet.');
    const {data:{session}} = await getSupabase().auth.getSession();
    if(!session) throw new Error('Please sign in again.');
    const response = await fetch(`${mediaApiUrl}/uploads${key ? `?key=${encodeURIComponent(key)}` : ''}`, {
      method,headers:{Authorization:`Bearer ${session.access_token}`,...(body ? {'Content-Type':body.type} : {})},body,
    });
    const result = await response.json();
    if(!response.ok) throw new Error(result.error || 'The poster upload failed.');
    return result as {key:string;url:string};
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if(busy || !editing) return;
    const input: FilmInput = {
      title:draft.title.trim(),subtitle:draft.subtitle.trim(),genre:draft.genre.trim(),release_year:draft.release_year,
      runtime_minutes:draft.runtime_minutes,director:draft.director.trim(),cast_names:cast.split(',').map(s=>s.trim()).filter(Boolean),
      synopsis:draft.synopsis.trim(),youtube_url:draft.youtube_url.trim(),poster_url:draft.poster_url,poster_key:draft.poster_key,
      color:draft.color,is_new:draft.is_new,published:draft.published,sort_order:draft.sort_order,
    };
    const video = youtubeId(input.youtube_url);
    if (video) input.youtube_url = `https://www.youtube.com/watch?v=${video}`;
    const validation = validateFilm({...input, poster_url:file ? 'https://pending.invalid/poster' : input.poster_url});
    if(validation) { setError(validation); return; }
    setBusy(true); setError(''); setNotice('');
    let uploadedKey = '';
    let saved = false;
    try {
      if(file) { const uploaded = await mediaRequest('POST',file); input.poster_url = uploaded.url; input.poster_key = uploaded.key; uploadedKey = uploaded.key; }
      const db = getSupabase();
      const request = editing === 'new' ? db.from('films').insert(input) : db.from('films').update(input).eq('id',editing.id).eq('updated_at',editing.updated_at);
      const {data,error} = await request.select('*').single();
      if(error) throw new Error(error.code === 'PGRST116' ? 'This film changed in another session. Close the editor, refresh, and try again.' : error.message);
      saved = true;
      const oldKey = editing === 'new' ? '' : editing.poster_key;
      setFilms(previous => [...previous.filter(f=>f.id!==data.id),data].sort((a,b)=>a.sort_order-b.sort_order || a.id-b.id));
      setEditing(null); setFile(null);
      setNotice(input.published ? 'Film published. It is now available in the gallery.' : 'Draft saved. Only administrators can see it.');
      if(uploadedKey && oldKey && oldKey !== uploadedKey) {
        try { await mediaRequest('DELETE',undefined,oldKey); } catch { setNotice('Film saved. The previous poster remains in storage and can be cleaned up later.'); }
      }
    } catch(e) {
      setError(e instanceof Error ? e.message : 'Unable to save this film.');
      if(uploadedKey && !saved) { try { await mediaRequest('DELETE',undefined,uploadedKey); } catch { /* Retain the original save error. */ } }
    } finally { setBusy(false); }
  }
  async function remove(film: Film) {
    if(!window.confirm(`Delete “${film.title}”? This removes the film from the gallery.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const {data,error} = await getSupabase().from('films').delete().eq('id',film.id).eq('updated_at',film.updated_at).select('id').single();
      if(error || !data) throw new Error(error?.message || 'Film could not be deleted. Refresh and try again.');
      setFilms(previous=>previous.filter(f=>f.id!==film.id));
      setNotice('Film deleted.');
      if(film.poster_key) { try { await mediaRequest('DELETE',undefined,film.poster_key); } catch { setNotice('Film deleted. Its poster remains in storage and can be cleaned up later.'); } }
    } catch(e) { setError(e instanceof Error ? e.message : 'Unable to delete film.'); }
    finally { setBusy(false); }
  }
  const shown = films.filter(f => `${f.title} ${f.director}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'All films' || (filter === 'Published' ? f.published : !f.published)));
  const loading = !authReady || checking;

  if(!session || !authorized) return <main className="dashboard login-page">
    <a className="dash-wordmark" href="/">JTVF<span>THE FILM GALLERY</span></a>
    <section className="login-card"><span className="dash-eyebrow">BEHIND THE FRAMES</span><h1>Your stories.<br/>Your gallery.</h1><p>Sign in to curate films, upload artwork, and bring your next story to the wall.</p>
      {!isConfigured ? <div className="dash-message">The dashboard is waiting for its database connection. Follow the setup guide in the repository to connect Supabase.</div> : loading ? <p className="loading-line"><LoaderCircle className="spin" size={18}/> Checking your session…</p> : session ? <><p role="alert" className="dash-error">{error || 'Administrator access is required.'}</p><button className="dash-primary" onClick={logout}>Sign out</button></> : <form onSubmit={login}>
        <label>Email address<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
        {error && <p role="alert" className="dash-error">{error}</p>}
        <button className="dash-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<ArrowUpRight size={17}/></button>
      </form>}
      <a className="back-gallery" href="/"><ArrowLeft size={14}/> Back to the gallery</a>
    </section><span className="login-caption">A space for the stories you want to tell.</span>
  </main>;

  return <main className="dashboard dashboard-shell">
    <aside className="dash-sidebar"><a className="dash-wordmark" href="/">JTVF<span>THE FILM GALLERY</span></a><p className="dash-eyebrow">WORKSPACE</p><span className="sidebar-active"><FilmIcon size={17}/> Film library <b>{films.length}</b></span><a href="/" target="_blank" rel="noreferrer">View gallery<ArrowUpRight size={16}/></a><div className="sidebar-account"><span>{session.user.email}</span><button onClick={logout}><LogOut size={15}/> Sign out</button></div></aside>
    <div className="dash-content"><header className="dash-header"><span>Gallery / <strong>Film library</strong></span><span className="admin-badge"><span/> ADMINISTRATOR</span></header>
      <div className="dash-title-row"><div><span className="dash-eyebrow">THE COLLECTION</span><h1>Film library</h1><p>Every great story starts with a frame.</p></div><button className="dash-primary" onClick={()=>openEditor('new')} disabled={busy}><Plus size={17}/> Add a film</button></div>
      <div className="dash-stats"><div><span>Total films</span><strong>{films.length.toString().padStart(2,'0')}</strong></div><div><span>On the gallery wall</span><strong>{films.filter(f=>f.published).length.toString().padStart(2,'0')}</strong></div><div><span>Work in progress</span><strong>{films.filter(f=>!f.published).length.toString().padStart(2,'0')}</strong></div></div>
      {notice && <p className="dash-success" role="status"><Check size={16}/>{notice}</p>}
      {error && !editing && <p className="dash-error" role="alert">{error}</p>}
      {!mediaApiUrl && <p className="dash-message">Poster storage is not connected yet. You can save film details as drafts.</p>}
      <section className="library-panel"><div className="library-toolbar"><div className="library-tabs">{['All films','Published','Drafts'].map(t=><button key={t} className={filter===t?'active':''} onClick={()=>setFilter(t)}>{t}</button>)}</div><label className="library-search"><Search size={16}/><input aria-label="Search films" placeholder="Find a film…" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
        <div className="film-table-wrap"><table className="film-table"><thead><tr><th>Film</th><th>Status</th><th>Year</th><th>Order</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{shown.map(f=><tr key={f.id}><td><div className="film-cell">{f.poster_url ? <img src={f.poster_url} alt=""/> : <span className="poster-placeholder"><FilmIcon size={20}/></span>}<div><button className="film-edit-title" onClick={()=>openEditor(f)} disabled={busy}>{f.title}</button><span>{f.genre || 'Uncategorized'}{f.is_new && <b className="table-new">NEW</b>}</span></div></div></td><td><span className={`status-pill ${f.published?'published':''}`}>{f.published?'Published':'Draft'}</span></td><td>{f.release_year || '—'}</td><td>{f.sort_order}</td><td><div className="row-actions"><button onClick={()=>openEditor(f)} disabled={busy}>Edit</button><button aria-label={`Delete ${f.title}`} onClick={()=>remove(f)} disabled={busy}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>
        {!shown.length && <div className="library-empty"><FilmIcon size={30}/><h2>{films.length?'No matching films':'The wall is yours.'}</h2><p>{films.length?'Try another title or filter.':'Add your first film, upload its poster, and make it part of the collection.'}</p>{!films.length && <button onClick={()=>openEditor('new')} className="dash-secondary"><Plus size={16}/> Add your first film</button>}</div>}
      </section><p className="library-footnote">Published films appear in the gallery automatically. Drafts stay in your workspace.</p>
    </div>
    {editing && <div className="editor-backdrop"><section className="film-editor" role="dialog" aria-modal="true" aria-labelledby="editor-title" onKeyDown={event=>{
      if(event.key==='Escape') closeEditor();
      if(event.key==='Tab') { const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]')); const first=controls[0],last=controls[controls.length-1]; if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();} else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();} }
    }}><header><div><span className="dash-eyebrow">CURATE YOUR COLLECTION</span><h2 id="editor-title">{editing==='new'?'A new story':'Edit film'}</h2></div><button aria-label="Close editor" onClick={closeEditor} disabled={busy}><X size={22}/></button></header>
      <form onSubmit={save}><fieldset disabled={busy}><div className="editor-columns"><div className="poster-upload-column"><label className="poster-upload">{preview?<img src={preview} alt="Poster preview"/>:<><ImagePlus size={28}/><strong>Add poster artwork</strong><span>JPEG, PNG or WebP<br/>Up to 10 MB</span></>}<input aria-label="Upload poster" type="file" accept="image/jpeg,image/png,image/webp" disabled={!mediaApiUrl || busy} onChange={e=>{const next=e.target.files?.[0];if(!next)return;if(!['image/jpeg','image/png','image/webp'].includes(next.type)||next.size>10*1024*1024){setError('Choose a JPEG, PNG, or WebP image under 10 MB.');e.target.value='';return;}setFile(next);setError('');}}/></label><p className="poster-tip">Portrait artwork looks best.<br/>Click the image to replace it.</p><label className="checkbox-label"><input type="checkbox" checked={draft.is_new} onChange={e=>setDraft({...draft,is_new:e.target.checked})}/><span>Show “NEW” ribbon</span></label><label>Gallery order<input type="number" min="-100000" max="100000" step="1" value={draft.sort_order} onChange={e=>setDraft({...draft,sort_order:Number(e.target.value)})}/></label><p className="poster-tip">Lower numbers appear first.</p></div>
      <div className="editor-fields"><label>Film title <span>*</span><input autoFocus required maxLength={160} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Give your story a name"/></label><label>Tagline<input maxLength={240} value={draft.subtitle} onChange={e=>setDraft({...draft,subtitle:e.target.value})} placeholder="A few words to set the scene"/></label><div className="field-row"><label>Genre<input maxLength={80} value={draft.genre} onChange={e=>setDraft({...draft,genre:e.target.value})}/></label><label>Release year<input type="number" min="1888" max="2200" value={draft.release_year??''} onChange={e=>setDraft({...draft,release_year:e.target.value?Number(e.target.value):null})}/></label><label>Runtime (minutes)<input type="number" min="1" max="1440" value={draft.runtime_minutes??''} onChange={e=>setDraft({...draft,runtime_minutes:e.target.value?Number(e.target.value):null})}/></label></div><label>Director<input maxLength={160} value={draft.director} onChange={e=>setDraft({...draft,director:e.target.value})}/></label><label>Cast<input value={cast} onChange={e=>setCast(e.target.value)} placeholder="Separate names with commas"/></label><label>Synopsis<textarea rows={5} maxLength={4000} value={draft.synopsis} onChange={e=>setDraft({...draft,synopsis:e.target.value})} placeholder="What is this film about?"/></label><label>YouTube video link<input type="url" value={draft.youtube_url} onChange={e=>setDraft({...draft,youtube_url:e.target.value})} placeholder="https://www.youtube.com/watch?v=…"/></label><p className="poster-tip">Adds a Play button to the film’s gallery details.</p><label className="checkbox-label publish-toggle"><input type="checkbox" checked={draft.published} onChange={e=>setDraft({...draft,published:e.target.checked})}/><span><strong>Publish to the gallery</strong><small>Turn off to keep this film as a draft.</small></span></label></div></div></fieldset>
      {error && <p role="alert" className="dash-error">{error}</p>}<footer className="editor-footer"><button type="button" className="dash-secondary" onClick={closeEditor} disabled={busy}>Cancel</button><button className="dash-primary" disabled={busy}>{busy?<><LoaderCircle size={16} className="spin"/> Saving…</>:<><Check size={16}/>{draft.published?'Save & publish':'Save draft'}</>}</button></footer></form>
    </section></div>}
  </main>;
}
