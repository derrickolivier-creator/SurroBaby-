// Surrogacy Journey — polished UI with icons & theme toggle (v1d fixes)

const els = {
  next: document.getElementById('next-steps'),
  transferRange: document.getElementById('transfer-range'),
  pregRange: document.getElementById('preg-range'),
  eddRange: document.getElementById('edd-range'),
  embryoDayView: document.getElementById('embryo-day-view'),
  timeline: document.getElementById('timeline'),
  rows: document.getElementById('rows'),
  addMilestone: document.getElementById('add-milestone'),
  dialog: document.getElementById('milestone-dialog'),
  form: document.getElementById('milestone-form'),
  settingsDialog: document.getElementById('settings-dialog'),
  settingsForm: document.getElementById('settings-form'),
  toggleSettings: document.getElementById('toggle-settings'),
  exportBtn: document.getElementById('export'),
  importBtn: document.getElementById('import'),
  fileInput: document.getElementById('file-input'),
  shareBtn: document.getElementById('share'),
  viewerBtn: document.getElementById('viewer'),
  themeBtn: document.getElementById('toggle-theme'),
};

const S = {
  settings: {
    timezone: 'Pacific/Auckland',
    embryoDay: 5,
    cycleSuccessPct: 45,
    retryGap: { min: 28, likely: 35, max: 49 },
    blackoutDays: ['Sun','PublicHolidays'],
    theme: 'dark',
  },
  milestones: [],
  shareToken: null,
  readOnly: false,
};

function pickIcon(title){
  const t = title.toLowerCase();
  if (t.includes('ecart') || t.includes('legal')) return '⚖️';
  if (t.includes('hart') || t.includes('screen') || t.includes('blood') || t.includes('urine')) return '🧪';
  if (t.includes('semen')) return '🧬';
  if (t.includes('folic') || t.includes('supplement')) return '💊';
  if (t.includes('stimulation') || t.includes('egg') || t.includes('collection')) return '🥚';
  if (t.includes('fertilisation') || t.includes('fertilization') || t.includes('culture')) return '🧫';
  if (t.includes('quarantine') || t.includes('freeze')) return '🧊';
  if (t.includes('ship') || t.includes('logistics') || t.includes('fly') || t.includes('tauranga')) return '✈️';
  if (t.includes('holiday')) return '🎄';
  if (t.includes('hormone') || t.includes('prep')) return '🩺';
  if (t.includes('transfer')) return '🤰';
  return '📌';
}

const fmt = (d) => (d ? new Date(d).toISOString().slice(0,10) : '');
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
function parseCSV(str){ return str.split(',').map(s=>s.trim()).filter(Boolean); }
function save(){ if(S.readOnly) return; localStorage.setItem('surro_ui_v1d', JSON.stringify({settings:S.settings, milestones:S.milestones, shareToken:S.shareToken})); }
function load(){
  const saved = JSON.parse(localStorage.getItem('surro_ui_v1d') || '{}');
  if(saved.settings) S.settings = saved.settings;
  if(saved.milestones) S.milestones = saved.milestones;
  if(saved.shareToken) S.shareToken = saved.shareToken;
  document.documentElement.setAttribute('data-theme', S.settings.theme||'dark');
}

function seed(){
  if (S.milestones && S.milestones.length) return;
  const mk = (id, title, status, owner, early, durMin, durLikely, durMax, deps=[], notes='', priv='', icon='') => ({
    id, title, status, owner, early, late:'', dur:{min:durMin, likely:durLikely, max:durMax}, deps, conf: 90, notes, notesPrivate: priv, icon
  });
  S.milestones = [
    mk(1, 'ECART approval', 'done', 'Legal', '2025-07-11', 0, 0, 0, [], 'Approved 11 Jul 2025', '', '⚖️'),
    mk(2, 'HART Act screening (all)', 'done', 'Clinic', '2025-07-15', 7, 10, 14, [1], 'Blood/urine screening complete Jul 2025', '', '🧪'),
    mk(3, 'Semen analysis (sample & review)', 'active', 'Hamish/Clinic', '2025-07-31', 7, 14, 21, [2], 'Sample 31 Jul 2025 — waiting on review', '', '🧬'),
    mk(4, 'Mignon pre-cycle (folic acid)', 'active', 'Mignon', '2025-07-20', 1, 30, 90, [2], 'Folic acid started', '', '💊'),
    mk(5, 'Ovarian stimulation & egg collection (Tauranga)', 'planned', 'Mignon/Clinic', '2025-08-25', 14, 21, 28, [3], 'Clinic: Fertility Associates Tauranga', '', '🥚'),
    mk(6, 'Fertilisation & culture to freeze (Tauranga)', 'planned', 'Lab (Tauranga)', '2025-09-10', 5, 6, 7, [5], 'Create embryos; freeze at day 5–6', '', '🧫'),
    mk(7, 'Embryo quarantine', 'planned', 'Lab', '2025-09-16', 84, 84, 84, [6], '12 weeks mandatory', '', '🧊'),
    mk(8, 'Ship frozen embryos to Wellington', 'planned', 'Clinic Logistics', '2025-12-10', 3, 7, 10, [7], 'Air transfer Tauranga → Wellington + paperwork', '', '✈️'),
    mk(9, 'Clinic holiday window (approx)', 'planned', 'Clinic', '2025-12-18', 21, 21, 28, [8], 'Mid-Dec to early Jan blackout (exact dates TBD)', '', '🎄'),
    mk(10, 'Surrogate hormone prep', 'planned', 'Tasj/Clinic', '2026-01-12', 28, 35, 42, [8,9], '4–6 weeks; starts after embryos available & holidays', '', '🩺'),
    mk(11, 'Embryo transfer', 'planned', 'Clinic', '2026-02-20', 1, 3, 7, [10], 'Target late Feb 2026; Day-5 default', '', '🤰'),
  ];
}

function findById(id){ return S.milestones.find(m => m.id === id); }
function computeSchedule(){
  const order = S.milestones.slice().sort((a,b)=>a.id-b.id);
  for(const m of order){
    let earliestStart = m.early ? new Date(m.early) : null;
    for(const depId of (m.deps||[])){
      const dep = findById(depId);
      if (!dep) continue;
      const depEndLikely = addDays(dep.early, dep.dur.likely);
      if (!earliestStart || depEndLikely > earliestStart) earliestStart = depEndLikely;
    }
    if (earliestStart) m.calcEarly = earliestStart;
    m.calcEndMin = addDays(m.calcEarly, m.dur.min||0);
    m.calcEndLikely = addDays(m.calcEarly, m.dur.likely||0);
    m.calcEndMax = addDays(m.calcEarly, m.dur.max||0);
  }
}

function computeCritical(){
  const byId = new Map(S.milestones.map(m=>[m.id,m]));
  const memo = new Map();
  function lengthTo(id){
    if (memo.has(id)) return memo.get(id);
    const m = byId.get(id);
    if (!m || !m.deps || m.deps.length===0){ memo.set(id, (m?.dur?.likely)||0); return memo.get(id); }
    const bestDep = Math.max(...m.deps.map(d=>lengthTo(d)));
    const total = bestDep + (m?.dur?.likely||0);
    memo.set(id,total); return total;
  }
  const transfer = S.milestones.find(m=>m.title.toLowerCase().includes('transfer')) || S.milestones[S.milestones.length-1];
  function mark(id){
    const m = byId.get(id); if(!m) return;
    m.critical = true;
    if (!m.deps || m.deps.length===0) return;
    let best=null, bestScore=-1;
    for(const d of m.deps){
      const s = lengthTo(d);
      if (s>bestScore){ bestScore=s; best=d; }
    }
    mark(best);
  }
  mark(transfer.id);
}

function estimator(){
  const transfer = S.milestones.find(m=>m.title.toLowerCase().includes('transfer'));
  if(!transfer){ return { transfer: null, preg: null, edd: null, embryoDay:S.settings.embryoDay }; }
  const tMin = transfer.calcEndMin;
  const tMax = transfer.calcEndMax;
  const embryoDay = Number(S.settings.embryoDay||5);
  const eddShift = 266 - embryoDay;
  return { transfer: [tMin, tMax], preg: [tMin, tMax], edd: [ addDays(tMin, eddShift), addDays(tMax, eddShift) ], embryoDay };
}

function renderNext(){
  const pending = S.milestones.filter(m=>m.status!=='done').sort((a,b)=>a.calcEarly-b.calcEarly).slice(0,4);
  els.next.innerHTML = '';
  for(const m of pending){
    const li = document.createElement('li');
    const daysAway = Math.ceil((m.calcEarly - new Date())/86400000);
    li.innerHTML = `<span class="chip">${m.icon || pickIcon(m.title)}</span> <strong>${m.title}</strong> <span class="status ${m.status}">${m.status}</span> — <em>${fmt(m.calcEarly)}</em> • <span class="muted">${daysAway}d</span>`;
    els.next.appendChild(li);
  }
}

function renderEstimates(){
  const est = estimator();
  const fmtRange = (r)=> r ? (fmt(r[0]) + ' — ' + fmt(r[1])) : '—';
  els.transferRange.textContent = fmtRange(est.transfer);
  els.pregRange.textContent = fmtRange(est.preg);
  els.eddRange.textContent = fmtRange(est.edd);
  els.embryoDayView.textContent = est.embryoDay;
}

function dateToX(d, minD, maxD){
  const total = maxD - minD;
  return ((d - minD) / total) * 100;
}

function renderTimeline(){
  const minD = S.milestones.reduce((a,m)=> a ? (m.calcEarly < a ? m.calcEarly : a) : m.calcEarly, null);
  const maxD = S.milestones.reduce((a,m)=> a ? (m.calcEndMax > a ? m.calcEndMax : a) : m.calcEndMax, null);
  els.timeline.innerHTML = '';
  for(const m of S.milestones){
    const row = document.createElement('div'); row.className='mrow';
    const title = document.createElement('div'); title.className='title';
    const cp = m.critical ? `<span class="status critical">critical</span>` : '';
    title.innerHTML = `<span class="chip">${m.icon || pickIcon(m.title)}</span> ${m.title} ${cp} <span class="status ${m.status}">${m.status}</span>`;
    const bar = document.createElement('div'); bar.className='bar';
    const minX = dateToX(m.calcEarly, minD, maxD);
    const minW = Math.max(1, dateToX(m.calcEndMin, minD, maxD) - minX);
    const likelyW = Math.max(1, dateToX(m.calcEndLikely, minD, maxD) - minX);
    const maxW = Math.max(1, dateToX(m.calcEndMax, minD, maxD) - minX);
    const r1 = document.createElement('div'); r1.className='range min'; r1.style.left=minX+'%'; r1.style.width=minW+'%';
    const r2 = document.createElement('div'); r2.className='range likely'; r2.style.left=minX+'%'; r2.style.width=likelyW+'%';
    const r3 = document.createElement('div'); r3.className='range max'; r3.style.left=minX+'%'; r3.style.width=maxW+'%';
    bar.appendChild(r3); bar.appendChild(r1); bar.appendChild(r2);
    row.appendChild(title); row.appendChild(bar);
    const badges = document.createElement('div'); badges.className='badges';
    badges.innerHTML = `Owner: ${m.owner||'-'} • Starts ~ ${fmt(m.calcEarly)} • Duration L:${m.dur.likely}d (min ${m.dur.min} / max ${m.dur.max}) • Depends: ${(m.deps||[]).join(',')||'—'}`;
    row.appendChild(badges);
    els.timeline.appendChild(row);
  }
}

function renderTable(){
  els.rows.innerHTML = '';
  for(const m of S.milestones){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="iconcell">${m.icon || pickIcon(m.title)}</td>
      <td>${m.title}</td>
      <td><span class="status ${m.status}">${m.status}</span></td>
      <td>${m.owner||''}</td>
      <td>${fmt(m.calcEarly)}</td>
      <td>${m.dur.likely}d (min ${m.dur.min} / max ${m.dur.max})</td>
      <td>${(m.deps||[]).join(',')}</td>
      <td class="private">${S.readOnly ? '—' : (m.notesPrivate||'')}</td>
      <td>${S.readOnly ? '' : '<button class="pill ghost edit" data-id="'+m.id+'">Edit</button>'}</td>
    `;
    els.rows.appendChild(tr);
  }
  if (!S.readOnly){
    els.rows.querySelectorAll('.edit').forEach(btn=> btn.addEventListener('click', ()=> openEdit(parseInt(btn.dataset.id)) ));
  }
}

function openNew(){ openEdit(null); }
function openEdit(id){
  if (S.readOnly) return;
  const d = els.dialog;
  const isNew = !id;
  const m = isNew ? { id: Date.now(), title:'', owner:'', status:'planned', icon:'', early:'', late:'', dur:{min:1,likely:7,max:14}, deps:[], conf:80, notes:'', notesPrivate:'' } : S.milestones.find(x=>x.id===id);
  d.querySelector('#dialog-title').textContent = isNew ? 'New milestone' : 'Edit milestone';
  d.querySelector('#m-title').value = m.title||'';
  d.querySelector('#m-owner').value = m.owner||'';
  d.querySelector('#m-status').value = m.status||'planned';
  d.querySelector('#m-icon').value = m.icon||'';
  d.querySelector('#m-early').value = m.early||'';
  d.querySelector('#m-late').value = m.late||'';
  d.querySelector('#m-dur-min').value = m.dur.min||1;
  d.querySelector('#m-dur-likely').value = m.dur.likely||7;
  d.querySelector('#m-dur-max').value = m.dur.max||14;
  d.querySelector('#m-deps').value = (m.deps||[]).join(',');
  d.querySelector('#m-conf').value = m.conf||80;
  d.querySelector('#m-notes').value = m.notes||'';
  d.querySelector('#m-notes-private').value = m.notesPrivate||'';
  d.returnValue = '';
  if (d.showModal) { d.showModal(); } else { d.setAttribute('open',''); }
  els.form.onsubmit = (e)=>{
    e.preventDefault();
    const updated = {
      id: m.id,
      title: d.querySelector('#m-title').value.trim(),
      owner: d.querySelector('#m-owner').value.trim(),
      status: d.querySelector('#m-status').value,
      icon: d.querySelector('#m-icon').value.trim(),
      early: d.querySelector('#m-early').value,
      late: d.querySelector('#m-late').value,
      dur: {
        min: parseInt(d.querySelector('#m-dur-min').value||'1',10),
        likely: parseInt(d.querySelector('#m-dur-likely').value||'7',10),
        max: parseInt(d.querySelector('#m-dur-max').value||'14',10),
      },
      deps: parseCSV(d.querySelector('#m-deps').value).map(Number),
      conf: parseInt(d.querySelector('#m-conf').value||'80',10),
      notes: d.querySelector('#m-notes').value,
      notesPrivate: d.querySelector('#m-notes-private').value,
    };
    if (isNew){ S.milestones.push(updated); } else {
      const idx = S.milestones.findIndex(x=>x.id===m.id); S.milestones[idx] = updated;
    }
    if (d.close) d.close(); else d.removeAttribute('open');
    computeSchedule(); computeCritical(); renderAll(); save();
  };
  document.getElementById('cancel-dialog').onclick = ()=> { if (d.close) d.close(); else d.removeAttribute('open'); };
}

function openSettings(){
  const d = els.settingsDialog;
  d.querySelector('#tz').value = S.settings.timezone||'Pacific/Auckland';
  d.querySelector('#embryo-day').value = String(S.settings.embryoDay||5);
  d.querySelector('#succ').value = S.settings.cycleSuccessPct||45;
  d.querySelector('#retry-min').value = S.settings.retryGap.min||28;
  d.querySelector('#retry-likely').value = S.settings.retryGap.likely||35;
  d.querySelector('#retry-max').value = S.settings.retryGap.max||49;
  d.querySelector('#blackout').value = (S.settings.blackoutDays||[]).join(',');
  d.returnValue='';
  if (d.showModal) { d.showModal(); } else { d.setAttribute('open',''); }
  els.settingsForm.onsubmit = (e)=>{
    e.preventDefault();
    S.settings.timezone = d.querySelector('#tz').value.trim() || 'Pacific/Auckland';
    S.settings.embryoDay = parseInt(d.querySelector('#embryo-day').value||'5',10);
    S.settings.cycleSuccessPct = parseInt(d.querySelector('#succ').value||'45',10);
    S.settings.retryGap = {
      min: parseInt(d.querySelector('#retry-min').value||'28',10),
      likely: parseInt(d.querySelector('#retry-likely').value||'35',10),
      max: parseInt(d.querySelector('#retry-max').value||'49',10),
    };
    S.settings.blackoutDays = parseCSV(d.querySelector('#blackout').value);
    if (d.close) d.close(); else d.removeAttribute('open');
    save(); renderAll();
  };
  document.getElementById('cancel-settings').onclick = ()=> { if (d.close) d.close(); else d.removeAttribute('open'); };
}

els.exportBtn.onclick = ()=>{
  const data = JSON.stringify({settings:S.settings, milestones:S.milestones}, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='surrogacy-dashboard.json'; a.click();
  URL.revokeObjectURL(url);
};
els.importBtn.onclick = ()=> els.fileInput.click();
els.fileInput.onchange = (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{
    try{
      const obj = JSON.parse(r.result);
      if (obj.settings) S.settings = obj.settings;
      if (obj.milestones) S.milestones = obj.milestones;
      save(); computeSchedule(); computeCritical(); renderAll();
    } catch(err){ alert('Invalid JSON'); }
  };
  r.readAsText(f);
};

function createShare(){
  if (!S.shareToken) S.shareToken = Math.random().toString(36).slice(2);
  save();
  const url = location.origin + location.pathname + '#viewer=' + S.shareToken;
  navigator.clipboard?.writeText(url);
  alert('Share link copied to clipboard:\\n' + url + '\\nAnyone with this link will see a read-only view. Clear it by removing the hash.');
}
function checkViewer(){
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('viewer') && S.shareToken && h.get('viewer') === S.shareToken){
    S.readOnly = true;
    document.body.classList.add('readonly');
  } else {
    S.readOnly = false;
    document.body.classList.remove('readonly');
  }
}
els.shareBtn.onclick = createShare;
els.viewerBtn.onclick = ()=>{ location.hash = S.shareToken ? '#viewer='+S.shareToken : ''; checkViewer(); renderAll(); };

els.addMilestone.onclick = openNew;
els.toggleSettings.onclick = openSettings;

load();
seed();
checkViewer();
computeSchedule();
computeCritical();
renderAll();

// Viewer-mode banner
(function(){
  const bar = document.createElement('div');
  bar.style.cssText = 'position:sticky;top:0;z-index:1000;background:#b86e50;color:white;padding:8px 12px;text-align:center;display:none';
  bar.textContent = 'Read-only viewer mode — editing is disabled.';
  document.body.prepend(bar);
  const update = ()=>{ bar.style.display = (S.readOnly ? 'block':'none'); };
  const prev = checkViewer;
  checkViewer = function(){ prev(); update(); };
  update();
})();

// Theme toggle
els.themeBtn.onclick = ()=>{
  S.settings.theme = (S.settings.theme === 'dark') ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', S.settings.theme);
  save();
};
