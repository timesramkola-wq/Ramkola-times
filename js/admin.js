let ME = null, STAFF = [];
const $ = id => document.getElementById(id);

/* ---------- खबरें ---------- */
function newsItem(n, mode){
  const btns = mode === 'pending'
    ? `<button class="btn sm ok" data-a="pub">✔ प्रकाशित करें</button>
       <button class="btn sm warn" data-a="rej">✖ अस्वीकार</button>`
    : `${n.status==='published' ? `<a class="btn sm ghost" target="_blank" href="article.html?id=${n.id}">देखें</a>
          <button class="btn sm warn" data-a="unpub">प्रकाशन रोकें</button>` : ''}
       ${n.status==='pending' ? `<button class="btn sm ok" data-a="pub">✔ प्रकाशित</button>
          <button class="btn sm warn" data-a="rej">✖ अस्वीकार</button>` : ''}
       <button class="btn sm ghost" data-a="del">हटाएँ</button>`;
  return `<div class="item" data-id="${n.id}">
    <h3>${esc(n.title)}</h3>
    <span class="badge b-${n.status}">${STATUS_HI[n.status]}</span>
    <span class="tag">${esc(n.category)}</span>
    <div class="meta">लेखक: ${esc(n.author_name || '—')} · ${fmtDate(n.created_at)}</div>
    ${n.image_url ? `<img class="thumb" src="${esc(n.image_url)}" alt="">` : ''}
    ${n.admin_note ? `<div class="note"><b>टिप्पणी:</b> ${esc(n.admin_note)}</div>` : ''}
    <details ${mode==='pending'?'open':''}><summary>पूरी खबर</summary><div class="body">${esc(n.body)}</div></details>
    <div class="actions">${btns}</div></div>`;
}

async function setStatus(n, status, btn, note){
  await busy(btn, async () => {
    const patch = { status, admin_note: note ?? null };
    const { error } = await sb.from('news').update(patch).eq('id', n.id);
    if(error) throw error;
    toast(status==='published' ? 'खबर प्रकाशित हो गई ✔' : 'स्थिति बदल गई', 'good');
    refreshNews();
  });
}
function wire(box, list){
  box.querySelectorAll('.item').forEach(el => {
    const n = list.find(x => x.id === el.dataset.id);
    const on = (a, fn) => { const b = el.querySelector(`[data-a=${a}]`); if(b) b.onclick = () => fn(b); };
    on('pub',   b => setStatus(n, 'published', b));
    on('unpub', b => setStatus(n, 'pending', b, 'प्रकाशन रोका गया'));
    on('rej',   b => {
      const note = prompt('अस्वीकार करने का कारण (स्टाफ को दिखेगा):');
      if(note !== null) setStatus(n, 'rejected', b, note.trim() || 'कृपया सुधार कर दोबारा भेजें');
    });
    on('del', async b => {
      if(!confirm('यह खबर हमेशा के लिए हटा दें?')) return;
      await busy(b, async () => {
        const { error } = await sb.from('news').delete().eq('id', n.id);
        if(error) throw error; toast('हटा दी गई', 'good'); refreshNews();
      });
    });
  });
}
async function loadPending(){
  const box = $('pendingList');
  const { data, error } = await sb.from('news').select('*').eq('status','pending').order('created_at');
  if(error){ box.innerHTML = `<div class="empty">${esc(errMsg(error))}</div>`; return; }
  box.innerHTML = data.length ? data.map(n => newsItem(n,'pending')).join('')
                              : '<div class="empty">अनुमोदन के लिए कोई खबर लंबित नहीं है 🎉</div>';
  wire(box, data);
}
async function loadAll(){
  const box = $('allList'), f = $('fstatus').value;
  let q = sb.from('news').select('*').order('created_at', { ascending:false }).limit(100);
  if(f) q = q.eq('status', f);
  const { data, error } = await q;
  if(error){ box.innerHTML = `<div class="empty">${esc(errMsg(error))}</div>`; return; }
  box.innerHTML = data.length ? data.map(n => newsItem(n,'all')).join('') : '<div class="empty">कोई खबर नहीं।</div>';
  wire(box, data);
}
function refreshNews(){ loadPending(); loadAll(); }

/* ---------- स्टाफ ---------- */
async function loadStaff(){
  const { data, error } = await sb.from('profiles').select('*').eq('role','staff').order('created_at', { ascending:false });
  const box = $('staffList');
  if(error){ box.innerHTML = `<div class="empty">${esc(errMsg(error))}</div>`; return; }
  STAFF = data;
  fillStaffSelect();
  box.innerHTML = data.length ? data.map(s => `
    <div class="item" data-id="${s.id}">
      <h3>${esc(s.full_name || '(नाम नहीं)')}
        <span class="badge ${s.active?'b-published':'b-rejected'}">${s.active?'सक्रिय':'निष्क्रिय'}</span></h3>
      <div class="meta">${esc(s.designation || '')} ${s.designation?'·':''} ${esc(s.email)} ${s.phone?'· '+esc(s.phone):''}</div>
      <div class="actions"><button class="btn sm ${s.active?'warn':'ok'}" data-a="tog">
        ${s.active?'निष्क्रिय करें':'सक्रिय करें'}</button></div>
    </div>`).join('') : '<div class="empty">अभी कोई स्टाफ नहीं जोड़ा गया।</div>';
  box.querySelectorAll('.item').forEach(el => {
    const s = data.find(x => x.id === el.dataset.id), b = el.querySelector('[data-a=tog]');
    b.onclick = () => busy(b, async () => {
      const { error } = await sb.from('profiles').update({ active: !s.active }).eq('id', s.id);
      if(error) throw error; toast('बदलाव सहेजा गया', 'good'); loadStaff();
    });
  });
}
function fillStaffSelect(){
  const act = STAFF.filter(s => s.active);
  $('cstaff').innerHTML = act.length
    ? act.map(s => `<option value="${s.id}">${esc(s.full_name || s.email)}</option>`).join('')
    : '<option value="">पहले स्टाफ जोड़ें</option>';
}
async function addStaff(){
  const name = $('sname').value.trim(), email = $('semail').value.trim(), pw = $('spw').value;
  if(pw.length < 8) throw new Error('पासवर्ड कम से कम 8 अक्षर का हो।');
  // अलग अस्थायी client: ताकि एडमिन का अपना login न बदले
  const tmp = window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY, {
    auth:{ persistSession:false, autoRefreshToken:false, detectSessionInUrl:false, storageKey:'tmp-create-staff' }
  });
  const { data, error } = await tmp.auth.signUp({ email, password: pw, options:{ data:{ full_name:name } } });
  if(error) throw error;
  if(!data.user || (data.user.identities && data.user.identities.length === 0))
    throw new Error('यह ईमेल पहले से मौजूद है।');
  const { error:e2 } = await sb.from('profiles').update({
    full_name:name, designation:$('sdes').value.trim() || null,
    phone:$('sphone').value.trim() || null, role:'staff', active:true
  }).eq('id', data.user.id);
  if(e2) throw e2;
  toast('स्टाफ जोड़ दिया गया ✔', 'good');
  $('sf').reset(); loadStaff();
}

/* ---------- प्रमाणपत्र ---------- */
async function loadCerts(){
  const box = $('certList');
  const { data, error } = await sb.from('certificates').select('*, profiles(full_name,email)')
    .order('created_at', { ascending:false });
  if(error){ box.innerHTML = `<div class="empty">${esc(errMsg(error))}</div>`; return; }
  if(!data.length){ box.innerHTML = '<div class="empty">अभी कोई प्रमाणपत्र नहीं।</div>'; return; }
  const { data:urls } = await sb.storage.from('certificates').createSignedUrls(data.map(c => c.file_path), 3600);
  const map = {}; (urls || []).forEach(u => { if(u.path) map[u.path] = u.signedUrl; });
  box.innerHTML = data.map(c => `
    <div class="item" data-id="${c.id}">
      <h3>🎓 ${esc(c.title)}</h3>
      <div class="meta">${esc(c.profiles?.full_name || c.profiles?.email || '')} · ${fmtDate(c.created_at)}</div>
      <div class="actions">
        ${map[c.file_path] ? `<a class="btn sm" target="_blank" rel="noopener" href="${esc(map[c.file_path])}">देखें</a>` : ''}
        <button class="btn sm ghost" data-a="del">हटाएँ</button>
      </div></div>`).join('');
  box.querySelectorAll('.item').forEach(el => {
    const c = data.find(x => x.id === el.dataset.id), b = el.querySelector('[data-a=del]');
    b.onclick = async () => {
      if(!confirm('यह प्रमाणपत्र हटा दें?')) return;
      await busy(b, async () => {
        await sb.storage.from('certificates').remove([c.file_path]);
        const { error } = await sb.from('certificates').delete().eq('id', c.id);
        if(error) throw error; toast('हटा दिया गया', 'good'); loadCerts();
      });
    };
  });
}
async function addCert(){
  const staffId = $('cstaff').value, f = $('cfile').files[0];
  if(!staffId) throw new Error('पहले स्टाफ चुनें।');
  if(!f) throw new Error('फ़ाइल चुनें।');
  if(f.size > 5*1024*1024) throw new Error('फ़ाइल 5 MB से छोटी होनी चाहिए।');
  const path = `${staffId}/${safeName(f)}`;
  const up = await sb.storage.from('certificates').upload(path, f, { contentType: f.type || undefined });
  if(up.error) throw up.error;
  const { error } = await sb.from('certificates').insert({
    staff_id: staffId, title: $('ctitle').value.trim(),
    issued_on: $('cdate').value || null, file_path: path
  });
  if(error){ await sb.storage.from('certificates').remove([path]); throw error; }
  toast('प्रमाणपत्र अपलोड हो गया ✔', 'good');
  $('cf').reset(); loadCerts();
}

(async function(){
  if(!configCheck()) return;
  ME = await requireRole('admin');
  if(!ME) return;
  $('me').textContent = '👤 ' + (ME.full_name || ME.email);
  $('out').onclick = logout;
  $('fstatus').onchange = loadAll;
  $('sf').onsubmit = e => { e.preventDefault(); busy($('sadd'), addStaff); };
  $('cf').onsubmit = e => { e.preventDefault(); busy($('cadd'), addCert); };
  await loadStaff();
  initTabs(id => {
    if(id==='pending') loadPending();
    if(id==='all') loadAll();
    if(id==='certs') loadCerts();
  });
})();
