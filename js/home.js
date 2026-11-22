const PAGE = 9;
let page = 0, cat = '', q = '';

function renderCats(){
  const box = document.getElementById('cats');
  box.innerHTML = ['सभी', ...CATEGORIES].map(c =>
    `<button class="chip ${(c==='सभी'&&!cat)||c===cat?'on':''}" data-c="${c}">${c}</button>`).join('');
  box.querySelectorAll('.chip').forEach(b => b.onclick = () => {
    cat = b.dataset.c === 'सभी' ? '' : b.dataset.c;
    renderCats(); load(true);
  });
}

function card(n, lead){
  const text = n.body.length > 140 ? n.body.slice(0,140) + '…' : n.body;
  return `<a class="card ${lead?'lead':''}" href="article.html?id=${encodeURIComponent(n.id)}">
    ${n.image_url ? `<img loading="lazy" src="${esc(n.image_url)}" alt="">` : ''}
    <div class="in">
      <span class="tag">${esc(n.category)}</span>
      <h3>${esc(n.title)}</h3>
      <p>${esc(text)}</p>
      <div class="meta">${esc(n.author_name || '')} · ${fmtDate(n.published_at)}</div>
    </div></a>`;
}

async function load(reset){
  if(reset){ page = 0; document.getElementById('list').innerHTML = ''; }
  const more = document.getElementById('more');
  more.disabled = true;
  let qry = sb.from('news')
    .select('id,title,body,category,image_url,author_name,published_at')
    .eq('status','published')
    .order('published_at', { ascending:false })
    .range(page*PAGE, page*PAGE + PAGE - 1);
  if(cat) qry = qry.eq('category', cat);
  if(q) qry = qry.ilike('title', `%${q}%`);
  const { data, error } = await qry;
  more.disabled = false;
  if(error){ toast(errMsg(error), 'err'); return; }
  const list = document.getElementById('list');
  list.insertAdjacentHTML('beforeend',
    data.map((n,i) => card(n, page===0 && i===0 && !cat && !q)).join(''));
  document.getElementById('empty').classList.toggle('hidden', page>0 || data.length>0);
  more.classList.toggle('hidden', data.length < PAGE);
  page++;
}

document.getElementById('searchForm').addEventListener('submit', e => {
  e.preventDefault();
  q = document.getElementById('q').value.trim().replace(/[%,()_]/g, ' ');
  load(true);
});
document.getElementById('more').onclick = () => load(false);

if(configCheck()){ renderCats(); load(true); }
