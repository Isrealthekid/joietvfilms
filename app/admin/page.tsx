'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react';
import { youtubeId } from '../../lib/films';
import { ytThumb, type StoredFilm } from '../../lib/catalog';
import './admin.css';

// The films live in data/films.json in the site's repository. This page edits that file through
// GitHub; once it is saved, the site rebuilds itself and the new films appear.
const OWNER = 'Isrealthekid';
const REPO = 'joietvfilms';
const BRANCH = 'main';
const FILE = 'data/films.json';
const TOKEN_KEY = 'jtvf-github-token';

const GENRES = ['Drama', 'Romance', 'Horror', 'Comedy', 'Thriller', 'Documentary', 'Adventure', 'Action', 'Mystery', 'Animation'];
const RATINGS = ['G', 'PG', '12', '15', '16+', '18', 'NR'];

const blank = (): StoredFilm => ({
  id: 0,
  title: '',
  subtitle: '',
  genre: 'Drama',
  year: String(new Date().getFullYear()),
  length: '',
  director: 'Joy Karenate-Egbuson',
  cast: '',
  description: '',
  poster: '',
  youtubeUrl: '',
  isNew: false,
  published: true,
  rating: '',
  writer: '',
  producer: '',
  language: 'English',
  tags: '',
  releaseDate: '',
});

const encode = (text: string) => btoa(unescape(encodeURIComponent(text)));
const decode = (b64: string) => decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));

async function gh(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${text.slice(0, 160)}`);
  }
  return res.json();
}

/** Shrinks a picked image to a web-sized JPEG (about 900px wide) and returns it as base64. */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 900 / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error('Image failed'))), 'image/jpeg', 0.86));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'film';

export default function Admin() {
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [films, setFilms] = useState<StoredFilm[]>([]);
  const [sha, setSha] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<StoredFilm | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TOKEN_KEY);
      if (saved) setToken(saved);
    } catch {}
  }, []);

  async function load(t = token) {
    setBusy(true);
    setNote(null);
    try {
      const data = await gh(t, `contents/${FILE}?ref=${BRANCH}`);
      setFilms(JSON.parse(decode(data.content)));
      setSha(data.sha);
      setDirty(false);
    } catch (e) {
      const msg = (e as Error).message;
      setNote({
        kind: 'error',
        text: msg.startsWith('401')
          ? 'GitHub did not accept that token. Check you copied all of it, then try again.'
          : msg.startsWith('404')
            ? 'That token cannot see the films repository. Make sure it was made with the "repo" box ticked, by the account that was invited.'
            : `Could not load the films. ${msg}`,
      });
      if (msg.startsWith('401') || msg.startsWith('404')) signOut();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (token) void load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function signIn() {
    const t = tokenInput.trim();
    if (!t) return;
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {}
    setToken(t);
    setTokenInput('');
  }

  function signOut() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
    setToken('');
    setFilms([]);
  }

  const change = (next: StoredFilm[]) => {
    setFilms(next);
    setDirty(true);
    setNote(null);
  };

  const move = (i: number, d: number) => {
    const next = [...films];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    change(next);
  };

  async function publish() {
    setBusy(true);
    setNote(null);
    try {
      const res = await gh(token, `contents/${FILE}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: 'Update films (from the films manager)',
          content: encode(JSON.stringify(films, null, 2) + '\n'),
          sha,
          branch: BRANCH,
        }),
      });
      setSha(res.content.sha);
      setDirty(false);
      setNote({ kind: 'ok', text: 'Published! The site updates by itself in about 1 to 2 minutes.' });
    } catch (e) {
      const msg = (e as Error).message;
      setNote({
        kind: 'error',
        text: msg.startsWith('409')
          ? 'The list was changed somewhere else. Refresh this page and make your changes again.'
          : msg.startsWith('403') || msg.startsWith('404')
            ? 'Your token is not allowed to save to the site. It needs the "repo" box ticked, and your account needs Write access.'
            : `Could not publish. ${msg}`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveFilm(film: StoredFilm, posterFile: File | null) {
    let poster = film.poster;
    if (posterFile) {
      const name = `${slug(film.title)}-${Date.now()}.jpg`;
      await gh(token, `contents/public/posters/${name}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Add poster for ${film.title}`,
          content: await shrink(posterFile),
          branch: BRANCH,
        }),
      });
      poster = `/posters/${name}`;
    }
    const saved = { ...film, poster };
    if (!saved.id) saved.id = Math.max(0, ...films.map((f) => f.id)) + 1;
    const exists = films.some((f) => f.id === saved.id);
    change(exists ? films.map((f) => (f.id === saved.id ? saved : f)) : [...films, saved]);
    setEditing(null);
  }

  const counts = useMemo(
    () => ({
      live: films.filter((f) => f.published && f.youtubeUrl).length,
      soon: films.filter((f) => f.published && !f.youtubeUrl).length,
      draft: films.filter((f) => !f.published).length,
    }),
    [films]
  );

  /* ---------- Not signed in ---------- */
  if (!token) {
    return (
      <main className="adm">
        <div className="adm-card adm-login">
          <h1>Films manager</h1>
          <p>Add, edit and re-order the films on films.thejoietv.com. You sign in once with a GitHub access token, and this browser remembers it.</p>
          <ol>
            <li>
              Open{' '}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=Joie%20TV%20films%20manager"
                target="_blank"
                rel="noreferrer"
              >
                this GitHub page <ExternalLink size={13} />
              </a>{' '}
              while signed in as the account that was invited to the films repository.
            </li>
            <li>Choose how long it should last, leave the &ldquo;repo&rdquo; box ticked, and press <b>Generate token</b>.</li>
            <li>Copy the long code that starts with <code>ghp_</code> and paste it here.</li>
          </ol>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              signIn();
            }}
          >
            <input
              type="password"
              placeholder="Paste your GitHub token"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              autoComplete="off"
            />
            <button className="adm-btn primary" type="submit" disabled={!tokenInput.trim()}>
              Sign in
            </button>
          </form>
          {note && <p className={`adm-note ${note.kind}`}>{note.text}</p>}
          <p className="adm-small">The token stays in this browser only. Anyone with it can change the site, so don&rsquo;t share it.</p>
        </div>
      </main>
    );
  }

  /* ---------- Signed in ---------- */
  return (
    <main className="adm">
      <header className="adm-top">
        <div>
          <h1>Films manager</h1>
          <p className="adm-small">
            {counts.live} live &middot; {counts.soon} coming soon &middot; {counts.draft} hidden
          </p>
        </div>
        <div className="adm-top-actions">
          <a className="adm-btn ghost" href="/" target="_blank" rel="noreferrer">
            View site <ExternalLink size={14} />
          </a>
          <button className="adm-btn ghost" onClick={signOut}>
            Sign out
          </button>
          <button className="adm-btn primary" onClick={() => setEditing(blank())} disabled={busy}>
            <Plus size={16} /> Add a film
          </button>
        </div>
      </header>

      {note && <p className={`adm-note ${note.kind}`}>{note.text}</p>}

      <p className="adm-help">
        Films show on the site in this order. The film that is <b>coming soon</b> (no YouTube link yet) becomes the big film at the top.
      </p>

      <ul className="adm-list">
        {films.map((f, i) => {
          const thumb = f.poster || ytThumb(f.youtubeUrl);
          const soon = !f.youtubeUrl;
          return (
            <li key={f.id} className={`adm-row ${f.published ? '' : 'is-hidden'}`}>
              <div className="adm-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {thumb ? <img src={thumb} alt="" /> : <span>No picture</span>}
              </div>
              <div className="adm-info">
                <strong>{f.title}</strong>
                <span>{[f.year, f.genre].filter(Boolean).join(' · ')}</span>
                <span className="adm-chips">
                  {!f.published && <i className="gray">Hidden</i>}
                  {f.published && soon && <i className="pink">Coming soon</i>}
                  {f.published && !soon && <i className="green">Live</i>}
                  {f.isNew && <i className="orange">New</i>}
                </span>
              </div>
              <div className="adm-actions">
                <button aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp size={16} />
                </button>
                <button aria-label="Move down" onClick={() => move(i, 1)} disabled={i === films.length - 1}>
                  <ArrowDown size={16} />
                </button>
                <button aria-label={`Edit ${f.title}`} onClick={() => setEditing(f)}>
                  <Pencil size={16} />
                </button>
                <button
                  aria-label={`Delete ${f.title}`}
                  onClick={() => {
                    if (confirm(`Delete "${f.title}"? You can still change your mind until you press Publish.`))
                      change(films.filter((x) => x.id !== f.id));
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          );
        })}
        {!films.length && !busy && <li className="adm-empty">No films yet. Press &ldquo;Add a film&rdquo; to start.</li>}
      </ul>

      {busy && <p className="adm-small">Working…</p>}

      {dirty && (
        <div className="adm-bar">
          <span>You have changes that are not on the site yet.</span>
          <button className="adm-btn ghost" onClick={() => void load()} disabled={busy}>
            Undo changes
          </button>
          <button className="adm-btn primary" onClick={() => void publish()} disabled={busy}>
            {busy ? 'Publishing…' : 'Publish to the site'}
          </button>
        </div>
      )}

      {editing && <Editor film={editing} onCancel={() => setEditing(null)} onSave={saveFilm} />}
    </main>
  );
}

function Editor({
  film,
  onCancel,
  onSave,
}: {
  film: StoredFilm;
  onCancel: () => void;
  onSave: (film: StoredFilm, poster: File | null) => Promise<void>;
}) {
  const [f, setF] = useState<StoredFilm>(film);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof StoredFilm>(k: K, v: StoredFilm[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shownPic = preview || f.poster || ytThumb(f.youtubeUrl);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return setError('Give the film a title.');
    if (f.youtubeUrl.trim() && !youtubeId(f.youtubeUrl.trim()))
      return setError('That doesn’t look like a YouTube link. Paste the full link from the address bar or the Share button.');
    setSaving(true);
    setError('');
    try {
      await onSave({ ...f, title: f.title.trim(), youtubeUrl: f.youtubeUrl.trim() }, file);
    } catch (err) {
      setError(`Could not save. ${(err as Error).message}`);
      setSaving(false);
    }
  }

  return (
    <div className="adm-modal" onClick={onCancel}>
      <form className="adm-sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="adm-sheet-head">
          <h2>{film.id ? 'Edit film' : 'Add a film'}</h2>
          <button type="button" className="adm-x" aria-label="Close" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <div className="adm-grid">
          <h3 className="wide adm-sect">The film</h3>
          <label className="wide">
            <span>YouTube link</span>
            <input
              value={f.youtubeUrl}
              onChange={(e) => set('youtubeUrl', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              autoFocus
            />
            <small>
              The film plays from YouTube. Leave this empty for a film that is <b>coming soon</b>, then add the link on release day and publish again.
            </small>
          </label>

          <div className="wide adm-poster">
            <div className="adm-poster-pic">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {shownPic ? <img src={shownPic} alt="" /> : <span>No thumbnail yet</span>}
            </div>
            <div>
              <span className="lbl">Thumbnail</span>
              <p className="adm-small">
                The picture people see on the site. Upload a wide still or a tall poster. If you skip it, the site uses the picture from your YouTube video.
              </p>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {(f.poster || file) && (
                <button
                  type="button"
                  className="adm-link"
                  onClick={() => {
                    setFile(null);
                    set('poster', '');
                  }}
                >
                  Remove thumbnail
                </button>
              )}
            </div>
          </div>

          <h3 className="wide adm-sect">About the film</h3>
          <label className="wide">
            <span>Title *</span>
            <input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Resonance" />
          </label>
          <label className="wide">
            <span>Tagline</span>
            <input value={f.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="One short line under the title" />
          </label>
          <label className="wide">
            <span>Summary</span>
            <textarea rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="What is the film about?" />
          </label>
          <label>
            <span>Genre</span>
            <input list="genres" value={f.genre} onChange={(e) => set('genre', e.target.value)} />
            <datalist id="genres">
              {GENRES.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </label>
          <label>
            <span>Mood tags</span>
            <input value={f.tags ?? ''} onChange={(e) => set('tags', e.target.value)} placeholder="e.g. Emotional, Slow-burn" />
          </label>
          <label>
            <span>Year</span>
            <input value={f.year} onChange={(e) => set('year', e.target.value)} inputMode="numeric" />
          </label>
          <label>
            <span>Length</span>
            <input value={f.length} onChange={(e) => set('length', e.target.value)} placeholder="e.g. 12 min" />
          </label>
          <label>
            <span>Age rating</span>
            <input list="ratings" value={f.rating ?? ''} onChange={(e) => set('rating', e.target.value)} placeholder="e.g. 15" />
            <datalist id="ratings">
              {RATINGS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </label>
          <label>
            <span>Language</span>
            <input value={f.language ?? ''} onChange={(e) => set('language', e.target.value)} />
          </label>

          <h3 className="wide adm-sect">Who made it</h3>
          <label>
            <span>Director</span>
            <input value={f.director} onChange={(e) => set('director', e.target.value)} />
          </label>
          <label>
            <span>Writer</span>
            <input value={f.writer ?? ''} onChange={(e) => set('writer', e.target.value)} />
          </label>
          <label className="wide">
            <span>Producer</span>
            <input value={f.producer ?? ''} onChange={(e) => set('producer', e.target.value)} />
          </label>
          <label className="wide">
            <span>Cast (actors)</span>
            <input value={f.cast} onChange={(e) => set('cast', e.target.value)} placeholder="Names, separated by commas" />
          </label>

          <h3 className="wide adm-sect">Showing on the site</h3>
          {!f.youtubeUrl.trim() && (
            <label className="wide">
              <span>Release date (for coming soon)</span>
              <input value={f.releaseDate ?? ''} onChange={(e) => set('releaseDate', e.target.value)} placeholder="e.g. December 2026" />
              <small>Shows on the big film at the top, like &ldquo;Coming December 2026&rdquo;.</small>
            </label>
          )}
          <label className="check">
            <input type="checkbox" checked={f.isNew} onChange={(e) => set('isNew', e.target.checked)} />
            <span>Show a &ldquo;New&rdquo; tag</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={f.published} onChange={(e) => set('published', e.target.checked)} />
            <span>Show on the site (untick to hide it)</span>
          </label>
        </div>

        {error && <p className="adm-note error">{error}</p>}

        <div className="adm-sheet-foot">
          <button type="button" className="adm-btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="adm-btn primary" disabled={saving}>
            {saving ? 'Saving…' : film.id ? 'Save film' : 'Add film'}
          </button>
        </div>
        <p className="adm-small" style={{ padding: '0 24px 18px' }}>
          This adds it to your list. Nothing is on the site until you press <b>Publish to the site</b>.
        </p>
      </form>
    </div>
  );
}
