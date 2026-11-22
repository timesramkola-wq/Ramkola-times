let ME = null, editing = null; // editing = जिस खबर को सुधार रहे हैं

const $ = id => document.getElementById(id);

async function loadCerts(){
  const box = $('certList');
  const { data, error } = await sb.from('certificates').select('*')
    .eq('staff_id', ME.id).order('created_at', { ascending:false });
  if(error){ box.innerHTML = `<div class="empty">${esc(errMsg(error))}</div>`; return; }
  if(!data.length){ box.innerHTML = '<div class="empty">अभी कोई प्रमाणपत्र अपलोड नहीं हुआ है।</div>'; return; }
  const { data:urls } = await sb.storage.from('certificates')
    .createSignedUrls(data.map(c => c.file_path), 3600);
  const map = {};
  (urls || []).forEach(u => { if(u.path) map[u.path] = u.signedUrl; });
  box.innerHTML = data.map(c => `
    <div class="item">
      <h3>🎓 ${esc(c.title)}</h3>
      <div class="meta">${c.issued_on ? 'तारीख: ' + fmtDate(c.issued_on) + ' · ' : ''}अपलोड: ${fmtDate(c.created_at)}</div>
      <div class="actions">${map[c.file_path]
        ? `<a class="btn sm" target="_blank" rel="noopener" href="${esc(map[c.file_path])}">देखें / डाउनलोड करें</a>`
        : '<span class="small">फ़ाइल उपलब्ध नहीं</span>'}</div>
    </div>`).join('');
}

async function loadMine(){
  const box = $('mineList');
  const { data, error } = await sb.from('news').select('*')
    .eq('author_id', ME.id).order('created_at', { ascending:false });
  if(error){ box.innerHTML = `<div class="empty">${esc(errMsg(error))}</div>`; return; }
  if(!data.length){ box.innerHTML = '<div class="empty">आपने अभी कोई खबर नहीं लिखी है।</div>'; return; }
  box.innerHTML = data.map(n => `
    <div class="item" data-id="${n.id}">
      <h3>${esc(n.title)}</h3>
      <span class="badge b-${n.status}">${STATUS_HI[n.status]}</span>
      <span class="tag">${esc(n.category)}</span>
      <div class="meta">${fmtDate(n.created_at)}</div>
      ${n.status==='rejected' && n.admin_note ? `<div class="note"><b>एडमिन की टिप्पणी:</b> ${esc(n.admin_note)}</div>` : ''}
      <details><summary>विवरण देखें</summary><div class="body">${esc(n.body)}</div></details>
      <div class="actions">
        ${n.status==='published'
          ? `<a class="btn sm ok" href="article.html?id=${n.id}" target="_blank">वेबसाइट पर देखें</a>`
          : `<button class="btn sm" data-a="edit">सुधारें</button>
             <button class="btn sm ghost" data-a="del">हटाएँ</button>`}
      </div>
    </div>`).join('');
  box.querySelectorAll('.item').forEach(el => {
    const n = data.find(x => x.id === el.dataset.id);
    const e = el.querySelector('[data-a=edit]'), d = el.querySelector('[data-a=del]');
    if(e) e.onclick = () => startEdit(n);
    if(d) d.onclick = () => delNews(n, d);
  });
}

function resetForm(){
  editing = null;
  $('nf').reset(); $('prev').classList.add('hidden');
  $('formTitle').textContent = 'नई खबर लिखें';
  $('cancelEdit').classList.add('hidden');
}
function startEdit(n){
  editing = n;
  $('title').value = n.title; $('body').value = n.body; $('cat').value = n.category;
  if(n.image_url){ $('prev').src = n.image_url; $('prev').classList.remove('hidden'); }
  $('formTitle').textContent = 'खबर सुधारें';
  $('cancelEdit').classList.remove('hidden');
  tabShow('write'); window.scrollTo(0,0);
}
async function delNews(n, btn){
  if(!confirm('यह खबर हटा दें?')) return;
  await busy(btn, async () => {
    const { error } = await sb.from('news').delete().eq('id', n.id);
    if(error) throw error;
    toast('खबर हटा दी गई', 'good'); loadMine();
  });
}

async function save(status, btn){
  const title = $('title').value.trim(), body = $('body').value.trim();
  if(!title || !body){ toast('शीर्षक और विवरण ज़रूरी हैं', 'err'); return; }
  await busy(btn, async () => {
    let image_url = editing ? editing.image_url : null;
    const f = $('img').files[0];
    if(f){
      if(f.size > 15*1024*1024) throw new Error('फ़ोटो बहुत बड़ी है।');
      const blob = await compressImage(f);
      const path = `${ME.id}/${safeName({name:'x.jpg'}, 'jpg')}`;
      const up = await sb.storage.from('news-images').upload(path, blob, { contentType:'image/jpeg' });
      if(up.error) throw up.error;
      image_url = sb.storage.from('news-images').getPublicUrl(path).data.publicUrl;
    }
    const row = { title, body, category: $('cat').value, image_url, status, admin_note: null };
    const res = editing
      ? await sb.from('news').update(row).eq('id', editing.id)
      : await sb.from('news').insert({ ...row, author_id: ME.id });
    if(res.error) throw res.error;
    toast(status === 'pending' ? 'खबर समीक्षा के लिए भेज दी गई ✔' : 'ड्राफ्ट सहेज लिया गया ✔', 'good');
    resetForm(); loadMine(); tabShow('mine');
  });
}

let tabShow;
(async function(){
  if(!configCheck()) return;
  ME = await requireRole('staff');
  if(!ME) return;
  $('me').textContent = '👤 ' + (ME.full_name || ME.email);
  $('out').onclick = logout;
  $('cat').innerHTML = categoryOptions('स्थानीय');
  $('img').onchange = () => {
    const f = $('img').files[0];
    if(f){ $('prev').src = URL.createObjectURL(f); $('prev').classList.remove('hidden'); }
  };
  $('saveDraft').onclick = e => save('draft', e.target);
  $('nf').onsubmit = e => { e.preventDefault(); save('pending', $('submitNews')); };
  $('cancelEdit').onclick = resetForm;
  tabShow = initTabs(id => { if(id==='mine') loadMine(); if(id==='certs') loadCerts(); });
})();
