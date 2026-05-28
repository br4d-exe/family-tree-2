/* =========================================================
   Heritage — Family Tree
   Beginner-friendly, single-file logic.
   DATA MODEL
   ----------
   Each member: {
     id: string,
     name: string,
     birth: number,
     bio: string,
     occupation: string,
     photo: string (URL or dataURL),
     parents: [id, id],      // 0, 1, or 2 parent ids
     spouseId: string|null,  // optional partner (for couple rendering)
     branch: number|null     // 1..6 for color coding (inherited from child-of-grandparents)
   }
   Tree is stored as a flat object: { [id]: member }
   ========================================================= */
// ---------- 1. DEFAULT FAMILY DATA ----------
// Edit names, years, occupations, bios here — everything will re-render.
const DEFAULT_DATA = (() => {
  const ph = (seed) => `https://i.pravatar.cc/200?img=${seed}`;
  const d = {};
  const add = (m) => { d[m.id] = { spouseId:null, parents:[], branch:null, ...m }; };
  // Generation 1 — Grandparents
  add({ id:'gp1', name:'Benson Okioma',   birth:1958, occupation:'Retired Accountant', bio:'The family patriarch.', photo: ph(12), spouseId:'gp2' });
  add({ id:'gp2', name:'Druscillah Okioma',  birth:1960, occupation:'Shopkeeper',  bio:'A devoted Sda.', photo: ph(45), spouseId:'gp1' });
  // Generation 2 — 6 children of GP1+GP2
  const kids = [
    ['c1','Godfrey Mogendi',1982,'Accountant','D.',ph(13), 1],
    ['c6','Damaris Kemue', 1983,'Shopkeeper',   'Has a small shop.',ph(47), 2],
    ['c2','Juliet Moraa', 1983,'Accountant',     'has a business.',ph(14), 3],
    ['c3','Diana OKeno', 1986,'Manager','Travels for rerec.',ph(48), 4],
    ['c4','Clinton Gisore', 1992,'Parliamentarian', 'loves Meat.',ph(15), 5],
    ['c5','Olivia Okeno', 1996,'Manager',   'Loves Fashion.',ph(49), 6],
  ];
  kids.forEach(([id,name,birth,occ,bio,photo,branch]) =>
    add({ id, name, birth, occupation:occ, bio, photo, parents:['gp1','gp2'], branch })
  );
  // Generation 3 — 11 grandchildren
  // c1 (Godfrey) -> 4 kids
  ['Wayne','Cynthia','warren','gavin'].forEach((n,i)=>
    add({ id:`g1_${i+1}`, name:`${n} `, birth:2008+i*2, occupation:['Student','Student','Student','Toddler'][i], bio:`Child.`, photo: ph(50+i), parents:['c1','s1'], branch:1 }));
  // c2 (Juliet) -> 1 kid (me)
  add({ id:`g2_1`, name:'Bradley Akuom', birth:2007, occupation:'Student', bio:'That’s me — building things on the web.', photo: ph(60), parents:['c2','s2'], branch:2 });
  // c3 (Diana) -> 3 kids
  ['Ian','Anisa','Tina'].forEach((n,i)=>
    add({ id:`g3_${i+1}`, name:`${n} khalwale`, birth:2013+i*2, occupation:['Student','student','student'][i], bio:`k.`, photo: ph(61+i), parents:['c3','s3'], branch:3 }));
  // c4 -> 0 kids
  // c5 (Olivia) -> 1 kid
  add({ id:`g5_1`, name:'Reina Nyakio', birth:2024, occupation:'Toddler', bio:'R.', photo: ph(64), parents:['c5','s5'], branch:5 });
  // c6 (Damaris) -> 2 kids
  ['Louis','Michelle'].forEach((n,i)=>
    add({ id:`g6_${i+1}`, name:`${n} M`, birth:2008+i, occupation:'Student', bio:`K.`, photo: ph(65+i), parents:['c6','s6'], branch:6 }));
  return d;
})();
// ---------- 2. STATE ----------
const STORAGE_KEY = 'heritage_family_v1';
let data = loadData();
let zoom = 1;
let admin = false;
let collapsed = new Set();   // ids of members whose children are hidden
let currentId = null;        // open in modal
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e){}
  return structuredClone(DEFAULT_DATA);
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
// ---------- 3. TREE HELPERS ----------
function childrenOf(id) {
  return Object.values(data).filter(m => m.parents.includes(id));
}
// Couples whose 'primary' member's parents are [a,b]
function couplesOfParents(aId, bId) {
  // Get all members who are children of (a,b) and not spouses-in.
  const kids = Object.values(data).filter(m =>
    m.parents.length === 2 &&
    m.parents.includes(aId) && m.parents.includes(bId)
  );
  // Sort by birth
  kids.sort((x,y)=> (x.birth||0)-(y.birth||0));
  return kids;
}
function parentNames(m) {
  return m.parents.map(p => data[p]?.name).filter(Boolean).join(' & ') || '—';
}
function childNames(m) {
  return childrenOf(m.id).map(c=>c.name).join(', ') || '—';
}
// ---------- 4. RENDER DESKTOP TREE ----------
const treeEl = document.getElementById('tree');
const mobileEl = document.getElementById('mobileTree');
function render() {
  renderDesktop();
  renderMobile();
  applyZoom();
}
function renderDesktop() {
  treeEl.innerHTML = '';
  // GEN 1 — grandparents couple (find a "root couple": members with no parents and a spouse)
  const roots = Object.values(data).filter(m => m.parents.length === 0 && m.spouseId && data[m.spouseId] && data[m.spouseId].parents.length===0);
  // Pick first pairing only (one root couple)
  const seenRoot = new Set();
  const rootCouple = [];
  for (const m of roots) {
    if (seenRoot.has(m.id)) continue;
    rootCouple.push([m, data[m.spouseId]]);
    seenRoot.add(m.id); seenRoot.add(m.spouseId);
    break;
  }
  const gen1 = document.createElement('div');
  gen1.className = 'generation';
  gen1.innerHTML = `<div class="gen-label">Generation I · Grandparents</div>`;
  const gen1Row = document.createElement('div'); gen1Row.className = 'row-nodes';
  rootCouple.forEach(([a,b]) => gen1Row.appendChild(renderCouple(a,a.id === 'gp1' ? b : null)));
  gen1.appendChild(gen1Row);
  treeEl.appendChild(gen1);
  if (!rootCouple.length) return;
  const [gpA, gpB] = rootCouple[0];
  // GEN 2 — children of grandparents (with spouses)
  const gen2List = couplesOfParents(gpA.id, gpB.id);
  if (!gen2List.length) return;
  const gen2 = document.createElement('div');
  gen2.className = 'generation';
  gen2.innerHTML = `<div class="gen-label">Generation II · Parents</div>`;
  const gen2Row = document.createElement('div');
  gen2Row.className = 'row-nodes';
  gen2.appendChild(connectorDown());
  gen2List.forEach(child => {
    // Each child becomes a branch with their spouse + their children below
    const branch = document.createElement('div');
    branch.className = 'child-wrap';
    const couple = renderCard(child);
    branch.appendChild(couple);
    // GEN 3 children of this couple
    const grand = child.spouseId
      ? couplesOfParents(child.id, child.spouseId)
      : childrenOf(child.id);
    if (grand.length) {
      const childRow = document.createElement('div');
      childRow.className = 'children-row' + (grand.length===1 ? ' single' : '');
      if (collapsed.has(child.id)) childRow.classList.add('collapsed');
      grand.forEach(gc => {
        const wrap = document.createElement('div');
        wrap.className = 'child-wrap';
        wrap.appendChild(renderCard(gc));
        childRow.appendChild(wrap);
      });
      branch.appendChild(childRow);
      // Collapse toggle on the parent card
      const toggle = document.createElement('button');
      toggle.className = 'toggle';
      toggle.textContent = collapsed.has(child.id) ? '+' : '−';
      toggle.title = 'Expand / collapse';
      toggle.onclick = (e) => {
        e.stopPropagation();
        if (collapsed.has(child.id)) collapsed.delete(child.id);
        else collapsed.add(child.id);
        render();
      };
      couple.appendChild(toggle);
    }
    gen2Row.appendChild(branch);
  });
  gen2.appendChild(gen2Row);
  treeEl.appendChild(gen2);
  // GEN 3 label as a footer (only if any grandkids exist)
  const hasG3 = gen2List.some(c => childrenOf(c.id).length>0);
  if (hasG3) {
    const gen3 = document.createElement('div');
    gen3.className = 'generation';
    gen3.innerHTML = `<div class="gen-label">Generation III · Grandchildren</div>`;
    treeEl.appendChild(gen3);
  }
}
function renderCouple(a, b) {
  const couple = document.createElement('div');
  couple.className = 'couple';
  couple.appendChild(renderCard(a));
  if (b) {
    const heart = document.createElement('div');
    heart.className = 'heart'; heart.textContent = '♥';
    couple.appendChild(heart);
    couple.appendChild(renderCard(b));
  }
  return couple;
}
function renderCard(m) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.id = m.id;
  if (m.branch) el.dataset.branch = m.branch;
  el.innerHTML = `
    <img class="avatar" src="${m.photo || placeholder(m.name)}" alt="${m.name}" onerror="this.src='${placeholder(m.name)}'"/>
    <div class="name">${escapeHtml(m.name)}</div>
    <div class="meta">b. ${m.birth || '—'}</div>
    ${m.occupation ? `<div class="occ">${escapeHtml(m.occupation)}</div>` : ''}
  `;
  el.onclick = () => openModal(m.id);
  return el;
}
function connectorDown() {
  const c = document.createElement('div'); c.className='connector-down'; return c;
}
// ---------- 5. RENDER MOBILE (collapsible cards) ----------
function renderMobile() {
  mobileEl.innerHTML = '';
  // Build hierarchy starting from root couple
  const roots = Object.values(data).filter(m => m.parents.length===0 && m.spouseId);
  if (!roots.length) return;
  const root = roots[0];
  const g1 = mGroup('Generation I · Grandparents');
  g1.appendChild(mCard(root, [data[root.spouseId]]));
  mobileEl.appendChild(g1);
  const children = couplesOfParents(root.id, root.spouseId);
  const g2 = mGroup('Generation II · Parents');
  children.forEach(c => {
    const sub = c.spouseId ? couplesOfParents(c.id, c.spouseId) : childrenOf(c.id);
    const card = mCard(c, c.spouseId ? [data[c.spouseId]] : []);
    if (sub.length) {
      const wrap = card.querySelector('.m-children');
      sub.forEach(gc => wrap.appendChild(mCard(gc, [])));
    }
    g2.appendChild(card);
  });
  mobileEl.appendChild(g2);
}
function mGroup(label) {
  const g = document.createElement('div'); g.className='m-group';
  g.innerHTML = `<div class="m-gen-label">${label}</div>`;
  return g;
}
function mCard(m, partners) {
  const card = document.createElement('div');
  card.className = 'm-card';
  if (m.branch) card.style.borderLeft = `4px solid var(--b${m.branch}-ink)`;
  card.innerHTML = `
    <div class="m-card-head">
      <img src="${m.photo||placeholder(m.name)}" alt="" onerror="this.src='${placeholder(m.name)}'"/>
      <div class="info">
        <div class="n">${escapeHtml(m.name)}${partners.length? ' &amp; '+escapeHtml(partners[0].name):''}</div>
        <div class="m">${m.occupation||''} · b. ${m.birth||'—'}</div>
      </div>
      <span class="m-chev">›</span>
    </div>
    <div class="m-children"></div>
  `;
  const head = card.querySelector('.m-card-head');
  head.addEventListener('click', (e) => {
    // Tap chevron / blank area toggles; tap on name opens modal.
    if (e.target.closest('.info')) { openModal(m.id); return; }
    card.classList.toggle('open');
  });
  return card;
}
// ---------- 6. MODAL ----------
const modal = document.getElementById('modal');
function openModal(id) {
  currentId = id;
  const m = data[id]; if (!m) return;
  document.getElementById('mPhoto').src = m.photo || placeholder(m.name);
  document.getElementById('mName').textContent = m.name;
  document.getElementById('mMeta').textContent = `${m.occupation||'—'} · Born ${m.birth||'—'}`;
  document.getElementById('fName').value = m.name;
  document.getElementById('fBirth').value = m.birth||'';
  document.getElementById('fOcc').value = m.occupation||'';
  document.getElementById('fBio').value = m.bio||'';
  const firstParent = m.parents && m.parents[0] && data[m.parents[0]];
  const fParentsEl = document.getElementById('fParents');
  if(fParentsEl) fParentsEl.textContent = firstParent ? firstParent.name : '—';
  document.getElementById('fChildren').textContent = childNames(m);
  modal.classList.remove('hidden');
}
function closeModal(){ modal.classList.add('hidden'); currentId=null; }
modal.addEventListener('click', e => { if (e.target.matches('[data-close]')) closeModal(); });
document.getElementById('saveBtn').onclick = () => {
  if (!currentId) return;
  const m = data[currentId];
  m.name = document.getElementById('fName').value.trim() || m.name;
  m.birth = parseInt(document.getElementById('fBirth').value) || null;
  m.occupation = document.getElementById('fOcc').value;
  m.bio = document.getElementById('fBio').value;
  saveData(); render(); closeModal();
};
document.getElementById('deleteBtn').onclick = () => {
  if (!currentId) return;
  if (!confirm('Delete this member? Their children will lose this parent link.')) return;
  // Remove parent link from children
  Object.values(data).forEach(x => x.parents = x.parents.filter(p=>p!==currentId));
  // Unset spouse
  Object.values(data).forEach(x => { if (x.spouseId===currentId) x.spouseId=null; });
  delete data[currentId];
  saveData(); render(); closeModal();
};
document.getElementById('addChildBtn').onclick = () => {
  if (!currentId) return;
  const m = data[currentId];
  const parents = m.spouseId ? [m.id, m.spouseId] : [m.id];
  const id = 'n_' + Date.now();
  data[id] = {
    id, name:'New Member', birth: new Date().getFullYear(), occupation:'', bio:'',
    photo: placeholder('New'), parents, spouseId:null, branch: m.branch || null
  };
  saveData(); render(); openModal(id);
};
// Photo upload
document.getElementById('mPhotoInput').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file || !currentId) return;
  const reader = new FileReader();
  reader.onload = () => {
    data[currentId].photo = reader.result;
    document.getElementById('mPhoto').src = reader.result;
    saveData(); render();
  };
  reader.readAsDataURL(file);
});
// ---------- 7. TOP BAR CONTROLS ----------
const zoomLabel = document.getElementById('zoomLabel');
const treeWrap  = document.getElementById('treeWrap');

function applyZoom() {
  treeEl.style.transform = `scale(${zoom})`;
  zoomLabel.textContent = Math.round(zoom * 100) + '%';

  // KEY FIX: CSS scale() does NOT expand layout box, so scroll stops short.
  // We manually inflate the wrapper's min-dimensions to match the scaled size,
  // ensuring the scroll container grows right + down AND left/top stay reachable.
  requestAnimationFrame(() => {
    const naturalW = treeEl.scrollWidth  * zoom;
    const naturalH = treeEl.scrollHeight * zoom;
    const pad = 240; // matches CSS padding (120px × 2 sides)
    treeWrap.style.minWidth  = (naturalW + pad) + 'px';
    treeWrap.style.minHeight = (naturalH + pad) + 'px';
  });
}
document.getElementById('zoomIn').onclick   = () => { zoom = Math.min(2, zoom+0.1); applyZoom(); };
document.getElementById('zoomOut').onclick  = () => { zoom = Math.max(0.4, zoom-0.1); applyZoom(); };
document.getElementById('zoomReset').onclick= () => { zoom = 1; applyZoom(); };
// Ctrl/⌘ + wheel zoom
document.getElementById('stage').addEventListener('wheel', e => {
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  zoom = Math.min(2, Math.max(0.4, zoom + (e.deltaY<0 ? 0.08 : -0.08)));
  applyZoom();
}, { passive:false });
// Theme toggle
const themeBtn = document.getElementById('themeToggle');
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  themeBtn.textContent = t==='dark' ? '☀️' : '🌙';
  localStorage.setItem('heritage_theme', t);
}
setTheme(localStorage.getItem('heritage_theme') || 'light');
themeBtn.onclick = () => setTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
// Admin toggle
const adminBtn = document.getElementById('adminToggle');
adminBtn.onclick = () => {
  admin = !admin;
  document.body.classList.toggle('admin', admin);
  adminBtn.textContent = `Edit mode: ${admin?'On':'Off'}`;
  adminBtn.classList.toggle('primary', admin);
};
// Add member (top-level)
document.getElementById('addBtn').onclick = () => {
  const id = 'n_' + Date.now();
  data[id] = { id, name:'New Member', birth:new Date().getFullYear(), occupation:'', bio:'',
    photo: placeholder('New'), parents:[], spouseId:null, branch:null };
  saveData(); render(); openModal(id);
};
// Search
const searchEl = document.getElementById('search');
const resultsEl = document.getElementById('searchResults');
searchEl.addEventListener('input', () => {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) { resultsEl.classList.add('hidden'); resultsEl.innerHTML=''; return; }
  const matches = Object.values(data).filter(m =>
    m.name.toLowerCase().includes(q) ||
    (m.occupation||'').toLowerCase().includes(q)
  ).slice(0, 10);
  resultsEl.innerHTML = matches.map(m => `
    <div class="res" data-id="${m.id}">
      <img src="${m.photo||placeholder(m.name)}" onerror="this.src='${placeholder(m.name)}'"/>
      <div><div style="font-size:13px;font-weight:600">${escapeHtml(m.name)}</div>
      <div style="font-size:11px;color:var(--text-soft)">${escapeHtml(m.occupation||'')} · b. ${m.birth||'—'}</div></div>
    </div>`).join('') || `<div class="res" style="color:var(--text-soft)">No matches</div>`;
  resultsEl.classList.remove('hidden');
});
resultsEl.addEventListener('click', e => {
  const r = e.target.closest('.res'); if (!r || !r.dataset.id) return;
  resultsEl.classList.add('hidden'); searchEl.value='';
  const card = document.querySelector(`.card[data-id="${r.dataset.id}"]`);
  if (card) {
    card.scrollIntoView({ behavior:'smooth', block:'center', inline:'center' });
    card.classList.add('hit'); setTimeout(()=>card.classList.remove('hit'), 1200);
  }
  openModal(r.dataset.id);
});
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) resultsEl.classList.add('hidden');
});
// Export as PDF (uses html2canvas + jsPDF)
document.getElementById('exportBtn').onclick = async () => {
  const target = window.matchMedia('(max-width:820px)').matches ? mobileEl : treeEl;
  try {
    const canvas = await html2canvas(target, { backgroundColor:null, scale: 2 });
    const img = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? 'l':'p', unit:'pt', format:[canvas.width, canvas.height] });
    pdf.addImage(img, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('family-tree.pdf');
  } catch(e) {
    alert('Export failed: ' + e.message);
  }
};
// ---------- 8. UTILITIES ----------
function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function placeholder(name) {
  const initials = (name||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
    <rect width='100%' height='100%' fill='%23d8ece4'/>
    <text x='50%' y='54%' text-anchor='middle' font-family='Inter,sans-serif' font-size='80' fill='%232f6f5e' font-weight='700'>${initials}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + svg.replace(/#/g,'%23').replace(/\n/g,'');
}
// ---------- 9. BOOT ----------
render();
// Reset data helper (open console and type: resetFamily())
window.resetFamily = () => { localStorage.removeItem(STORAGE_KEY); data = structuredClone(DEFAULT_DATA); collapsed = new Set(); render(); };
