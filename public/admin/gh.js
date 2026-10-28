// GitHub-klient til admin: læser og skriver indholdsfiler i repoet.
// Alle ændringer i én gemning samles i ét commit (Git Data API), så Vercel kun bygger én gang.

const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; }
}

/* ---------- Base64 med æøå ---------- */
export function encodeText(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}
export function decodeText(b64) {
  const bin = atob(String(b64 || '').replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export class GitHub {
  constructor({ token, owner, repo, branch }) {
    Object.assign(this, { token, owner, repo, branch });
  }

  async req(method, path, body, { raw = false } = {}) {
    const res = await fetch(API + path, {
      method,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const text = await res.text();
    let data = text;
    if (!raw) { try { data = text ? JSON.parse(text) : null; } catch { data = text; } }
    if (!res.ok) {
      const msg = (data && data.message) || `GitHub svarede ${res.status}`;
      throw new GitHubError(msg, res.status, data);
    }
    return data;
  }

  get base() { return `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}`; }

  user() { return this.req('GET', '/user'); }
  repoInfo() { return this.req('GET', this.base); }

  /** Filer i en mappe: [{ name, path, sha, size }] – tom liste, hvis mappen ikke findes. */
  async list(dir) {
    try {
      const items = await this.req('GET', `${this.base}/contents/${encodePath(dir)}?ref=${encodeURIComponent(this.branch)}`);
      return Array.isArray(items) ? items.filter((x) => x.type === 'file') : [];
    } catch (err) {
      if (err.status === 404) return [];
      throw err;
    }
  }

  /** Tekstfil med sha, eller null hvis den ikke findes. */
  async read(path) {
    try {
      const f = await this.req('GET', `${this.base}/contents/${encodePath(path)}?ref=${encodeURIComponent(this.branch)}`);
      if (f.content != null && f.encoding === 'base64') return { path, sha: f.sha, text: decodeText(f.content) };
      // Store filer (> 1 MB) sendes uden indhold – hent dem rå.
      const text = await this.req('GET', `${this.base}/contents/${encodePath(path)}?ref=${encodeURIComponent(this.branch)}`, null, { raw: true });
      return { path, sha: f.sha, text };
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  /** Filens indhold som tekst (uden sha). */
  async readRaw(path) {
    return this.req('GET', `${this.base}/contents/${encodePath(path)}?ref=${encodeURIComponent(this.branch)}`, null, { raw: true });
  }

  /**
   * Gem flere filer i ét commit.
   * changes: [{ path, text } | { path, base64 } | { path, delete: true }]
   * expect:  { [path]: sha | null } – stop hvis filen er ændret et andet sted siden den blev hentet.
   */
  async commit(changes, message, { expect = {} } = {}) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const ref = await this.req('GET', `${this.base}/git/ref/heads/${encodeURIComponent(this.branch)}`);
      const headSha = ref.object.sha;
      const head = await this.req('GET', `${this.base}/git/commits/${headSha}`);

      // Er filen ændret et andet sted (fx i et andet faneblad), siden den blev hentet?
      let conflict = null;
      for (const [path, sha] of Object.entries(expect)) {
        const now = await this.fileSha(path, headSha);
        if ((now || null) !== (sha || null)) { conflict = path; break; }
      }
      if (conflict) {
        // GitHub kan være et øjeblik om at vise den nyeste version lige efter en gemning – vent og prøv igen.
        if (attempt < 3) { await sleep(1200 * (attempt + 1)); continue; }
        throw new GitHubError(`Filen ${conflict} er blevet ændret et andet sted, siden du åbnede den. Genindlæs siden, og prøv igen.`, 409);
      }

      const tree = [];
      const blobs = {};
      for (const c of changes) {
        if (c.delete) { tree.push({ path: c.path, mode: '100644', type: 'blob', sha: null }); blobs[c.path] = null; continue; }
        const blob = await this.req('POST', `${this.base}/git/blobs`, c.base64 != null ? { content: c.base64, encoding: 'base64' } : { content: encodeText(c.text), encoding: 'base64' });
        tree.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
        blobs[c.path] = blob.sha;
      }
      const newTree = await this.req('POST', `${this.base}/git/trees`, { base_tree: head.tree.sha, tree });
      const newCommit = await this.req('POST', `${this.base}/git/commits`, { message, tree: newTree.sha, parents: [headSha] });
      try {
        await this.req('PATCH', `${this.base}/git/refs/heads/${encodeURIComponent(this.branch)}`, { sha: newCommit.sha, force: false });
        return { sha: newCommit.sha, blobs };
      } catch (err) {
        // Nogen nåede at gemme samtidig – prøv igen oven på den nye version.
        if (err.status === 422 && attempt < 3) continue;
        throw err;
      }
    }
    throw new GitHubError('Kunne ikke gemme. Prøv igen.', 409);
  }

  /** Filens sha på en given version – null, hvis filen ikke findes. (Slås op i mappelisten, så GitHub ikke svarer 404.) */
  async fileSha(path, ref = this.branch) {
    const i = path.lastIndexOf('/');
    const dir = i === -1 ? '' : path.slice(0, i);
    const name = path.slice(i + 1);
    try {
      const items = await this.req('GET', `${this.base}/contents/${encodePath(dir)}?ref=${encodeURIComponent(ref)}`);
      const hit = Array.isArray(items) ? items.find((x) => x.name === name && x.type === 'file') : null;
      return hit ? hit.sha : null;
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  commits(n = 6) { return this.req('GET', `${this.base}/commits?sha=${encodeURIComponent(this.branch)}&per_page=${n}`); }

  /** Byggestatus for et commit: 'success' | 'pending' | 'failure' | 'unknown' og evt. link til loggen. */
  async buildStatus(sha) {
    try {
      const s = await this.req('GET', `${this.base}/commits/${sha}/status`);
      const vercel = (s.statuses || []).find((x) => /vercel/i.test(x.context || '')) || (s.statuses || [])[0];
      if (vercel) return { state: vercel.state === 'error' ? 'failure' : vercel.state, url: vercel.target_url || '', text: vercel.description || '' };
    } catch { /* ignorer */ }
    try {
      const c = await this.req('GET', `${this.base}/commits/${sha}/check-runs?per_page=20`);
      const run = (c.check_runs || []).find((x) => /vercel/i.test((x.app && x.app.slug) || x.name || '')) || (c.check_runs || [])[0];
      if (run) {
        const state = run.status !== 'completed' ? 'pending' : ['success', 'neutral', 'skipped'].includes(run.conclusion) ? 'success' : 'failure';
        return { state, url: run.details_url || run.html_url || '', text: run.output && run.output.title || '' };
      }
    } catch { /* ignorer */ }
    return { state: 'unknown', url: '', text: '' };
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function encodePath(p) { return String(p).split('/').map(encodeURIComponent).join('/'); }
