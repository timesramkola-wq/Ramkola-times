(async function(){
  const box = document.getElementById('art');
  if(!configCheck()) return;
  const id = new URLSearchParams(location.search).get('id');
  if(!id){ box.innerHTML = '<div class="empty">खबर नहीं मिली।</div>'; return; }
  const { data:n, error } = await sb.from('news').select('*')
    .eq('id', id).eq('status','published').maybeSingle();
  if(error || !n){ box.innerHTML = '<div class="empty">यह खबर उपलब्ध नहीं है।</div>'; return; }
  document.title = n.title + ' — ' + SITE_NAME;
  const paras = n.body.split(/\n+/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
  const url = location.href;
  const wa = 'https://wa.me/?text=' + encodeURIComponent(n.title + '\n' + url);
  box.innerHTML = `
    <span class="tag">${esc(n.category)}</span>
    <h1>${esc(n.title)}</h1>
    <div class="meta">${esc(n.author_name || '')} · ${fmtDate(n.published_at)}</div>
    ${n.image_url ? `<img class="hero-img" src="${esc(n.image_url)}" alt="">` : ''}
    <div class="txt">${paras}</div>
    <div class="actions"><a class="btn ok" target="_blank" rel="noopener" href="${wa}">WhatsApp पर शेयर करें</a></div>`;
})();
