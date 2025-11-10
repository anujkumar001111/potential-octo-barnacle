// Note App MVP: Models, Repository, UI, Markdown, Autosave, Undo/Redo
// Storage: localStorage (can be swapped later)

// ---------- Models ----------
/** @typedef {{ id:string, title:string, content:string, tags:string[], createdAt:number, updatedAt:number }} Note */
/** @typedef {{ id:string, name:string, createdAt:number, updatedAt:number }} Tag */

// ---------- Utils ----------
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();
const debounce = (fn, ms=400) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

// Minimal Markdown renderer (headings, bold, italics, code, lists, links)
function renderMarkdown(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // code blocks
  html = html.replace(/```([\s\S]*?)```/g, (m, p1) => `<pre><code>${p1}</code></pre>`);
  // inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // headings
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
             .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
             .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  // unordered lists
  html = html.replace(/^(?:-\s+.+\n?)+/gm, block => {
    const items = block.trim().split(/\n/).map(line => line.replace(/^-\s+/, '')).map(i=>`<li>${i}</li>`).join('');
    return `<ul>${items}</ul>`;
  });
  // links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // paragraphs
  html = html.replace(/^(?!<h\d|<ul|<pre|\s*$)(.+)$/gm, '<p>$1</p>');
  return html;
}

// ---------- Repository (localStorage) ----------
const DB_KEYS = { notes: 'mvp.notes', tags: 'mvp.tags' };
const load = (k) => JSON.parse(localStorage.getItem(k) || '[]');
const store = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const NoteRepo = {
  all() { return load(DB_KEYS.notes).sort((a,b)=>b.updatedAt-a.updatedAt); },
  get(id) { return this.all().find(n=>n.id===id) || null; },
  create(data) {
    const n = { id: uid(), title: data.title||'Untitled', content: data.content||'', tags: data.tags||[], createdAt: now(), updatedAt: now() };
    const list = load(DB_KEYS.notes); list.unshift(n); store(DB_KEYS.notes, list); return n;
  },
  update(id, patch) {
    const list = load(DB_KEYS.notes);
    const idx = list.findIndex(n=>n.id===id); if (idx<0) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: now() };
    store(DB_KEYS.notes, list); return list[idx];
  },
  remove(id) { const list = load(DB_KEYS.notes).filter(n=>n.id!==id); store(DB_KEYS.notes, list); },
  search(q, tags=[]) {
    const qn = (q||'').toLowerCase(); const tset = new Set((tags||[]).map(s=>s.toLowerCase()));
    return this.all().filter(n=>{
      const text = `${n.title} ${n.content}`.toLowerCase();
      const tagok = tset.size===0 || n.tags.some(t=>tset.has(t.toLowerCase()));
      return (!qn || text.includes(qn)) && tagok;
    });
  }
};

const TagRepo = {
  all() { return load(DB_KEYS.tags).sort((a,b)=>a.name.localeCompare(b.name)); },
  upsert(name) {
    const norm = (name||'').trim(); if (!norm) return null;
    const list = load(DB_KEYS.tags);
    let t = list.find(x=>x.name.toLowerCase()===norm.toLowerCase());
    if (!t) { t = { id: uid(), name: norm, createdAt: now(), updatedAt: now() }; list.push(t); }
    else { t = { ...t, name: norm, updatedAt: now() }; const i=list.findIndex(x=>x.id===t.id); list[i]=t; }
    store(DB_KEYS.tags, list); return t;
  },
  remove(id) { const list = load(DB_KEYS.tags).filter(t=>t.id!==id); store(DB_KEYS.tags, list); }
};

// ---------- Undo/Redo (per-note) ----------
class History {
  constructor(limit=50){ this.limit=limit; this.stack=[]; this.index=-1; }
  push(state){
    this.stack = this.stack.slice(0, this.index+1);
    this.stack.push(state);
    if (this.stack.length>this.limit) this.stack.shift();
    this.index = this.stack.length-1;
  }
  canUndo(){ return this.index>0; }
  canRedo(){ return this.index<this.stack.length-1; }
  undo(){ if(!this.canUndo()) return null; this.index--; return this.stack[this.index]; }
  redo(){ if(!this.canRedo()) return null; this.index++; return this.stack[this.index]; }
}

// ---------- App State ----------
const App = {
  selectedId: null,
  history: new History(100),
  search: '',
  activeTags: [],
};

// ---------- Rendering ----------
function mount() {
  document.getElementById('app-root').innerHTML = `
    <div class="app-shell">
      <div class="header">
        <button id="new-note" class="primary">New Note</button>
        <button id="delete-note" class="danger">Delete</button>
        <div style="margin-left:auto; color: var(--muted)">MVP</div>
      </div>
      <aside class="sidebar">
        <div class="search-row">
          <input id="search" placeholder="Search notes..." />
        </div>
        <div class="tag-row" id="tag-row"></div>
        <div id="note-list" class="note-list"></div>
      </aside>
      <section class="editor">
        <div class="editor-toolbar">
          <input id="title" class="title" placeholder="Title" />
          <input id="tags" placeholder="Comma tags (e.g. work,ideas)" style="margin-left:8px; flex:1" />
          <button id="undo">Undo</button>
          <button id="redo">Redo</button>
        </div>
        <div class="editor-area">
          <textarea id="content" class="content" placeholder="Write in Markdown..."></textarea>
        </div>
      </section>
      <section class="preview">
        <div id="preview"></div>
      </section>
      <div class="status" id="status">Ready</div>
    </div>
  `;

  // Event wiring
  document.getElementById('new-note').onclick = onNewNote;
  document.getElementById('delete-note').onclick = onDeleteNote;
  document.getElementById('undo').onclick = onUndo;
  document.getElementById('redo').onclick = onRedo;

  document.getElementById('search').addEventListener('input', (e)=>{ App.search = e.target.value; renderList(); });
  document.getElementById('title').addEventListener('input', onEditChange);
  document.getElementById('tags').addEventListener('input', onEditChange);
  document.getElementById('content').addEventListener('input', onEditChange);

  ensureSeed();
  renderTags();
  selectFirstOrCreate();
}

function ensureSeed(){
  if (NoteRepo.all().length===0){
    const n = NoteRepo.create({ title: 'Welcome', content: '# Hello\n\n- Write notes in Markdown\n- Tags: use the field above\n\n`Undo/Redo`, autosave, search & filter.' , tags: ['welcome'] });
    TagRepo.upsert('welcome');
    App.selectedId = n.id;
  }
}

function selectFirstOrCreate(){
  const first = NoteRepo.all()[0];
  if (first) selectNote(first.id); else onNewNote();
}

function setStatus(text){ const el = document.getElementById('status'); el.textContent = text; }

function renderTags(){
  // Collect existing tags + from repo
  const tags = TagRepo.all();
  const row = document.getElementById('tag-row');
  row.innerHTML = '';
  const make = (tag)=>{
    const el = document.createElement('button');
    el.className = 'tag' + (App.activeTags.includes(tag.name)? ' active':'');
    el.textContent = `#${tag.name}`;
    el.onclick = ()=>{
      const i = App.activeTags.indexOf(tag.name);
      if (i>=0) App.activeTags.splice(i,1); else App.activeTags.push(tag.name);
      renderTags(); renderList();
    };
    return el;
  };
  tags.forEach(t=> row.appendChild(make(t)));
}

function renderList(){
  const list = document.getElementById('note-list');
  const results = NoteRepo.search(App.search, App.activeTags);
  list.innerHTML = '';
  results.forEach(n=>{
    const item = document.createElement('div');
    item.className = 'note-item' + (n.id===App.selectedId? ' active':'');
    const snippet = (n.content||'').replace(/[#`*\-\[\]\(\)]/g,'').slice(0,80);
    item.innerHTML = `
      <div class="note-item-title">${n.title||'Untitled'}</div>
      <div class="note-item-snippet">${snippet}</div>
    `;
    item.onclick = ()=> selectNote(n.id);
    list.appendChild(item);
  });
}

function selectNote(id){
  App.selectedId = id;
  const n = NoteRepo.get(id);
  if (!n) return;
  // Seed editor
  document.getElementById('title').value = n.title || '';
  document.getElementById('content').value = n.content || '';
  document.getElementById('tags').value = (n.tags||[]).join(', ');
  document.getElementById('preview').innerHTML = renderMarkdown(n.content||'');
  App.history = new History(100);
  App.history.push({ title: n.title, content: n.content, tags: [...(n.tags||[])] });
  renderList();
  setStatus(`Opened • ${new Date(n.updatedAt).toLocaleString()}`);
}

const persist = debounce(()=>{
  const id = App.selectedId; if (!id) return;
  const title = document.getElementById('title').value.trim() || 'Untitled';
  const content = document.getElementById('content').value;
  const tags = document.getElementById('tags').value.split(',').map(s=>s.trim()).filter(Boolean);
  tags.forEach(t=> TagRepo.upsert(t));
  NoteRepo.update(id, { title, content, tags });
  renderTags();
  renderList();
  setStatus('Saved');
}, 500);

function onEditChange(){
  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;
  const tags = document.getElementById('tags').value.split(',').map(s=>s.trim()).filter(Boolean);
  document.getElementById('preview').innerHTML = renderMarkdown(content);
  App.history.push({ title, content, tags });
  setStatus('Editing…');
  persist();
}

function onNewNote(){
  const n = NoteRepo.create({ title: 'Untitled', content: '', tags: [] });
  App.selectedId = n.id;
  selectNote(n.id);
  renderList();
}

function onDeleteNote(){
  if (!App.selectedId) return;
  if (!confirm('Delete this note?')) return;
  NoteRepo.remove(App.selectedId);
  const next = NoteRepo.all()[0];
  App.selectedId = next? next.id : null;
  if (next) selectNote(next.id); else onNewNote();
  renderList();
}

function onUndo(){
  const prev = App.history.undo();
  if (!prev) return;
  document.getElementById('title').value = prev.title;
  document.getElementById('content').value = prev.content;
  document.getElementById('tags').value = (prev.tags||[]).join(', ');
  document.getElementById('preview').innerHTML = renderMarkdown(prev.content||'');
  setStatus('Undo');
  persist();
}

function onRedo(){
  const next = App.history.redo();
  if (!next) return;
  document.getElementById('title').value = next.title;
  document.getElementById('content').value = next.content;
  document.getElementById('tags').value = (next.tags||[]).join(', ');
  document.getElementById('preview').innerHTML = renderMarkdown(next.content||'');
  setStatus('Redo');
  persist();
}

window.addEventListener('load', ()=>{
  mount();
  renderList();
});
