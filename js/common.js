// सभी पेजों में साझा कोड
const SITE_NAME = 'रामकोला टाइम्स';
const CATEGORIES = ['स्थानीय','राजनीति','खेल','मनोरंजन','शिक्षा','कृषि','अपराध','व्यापार','स्वास्थ्य','अन्य'];
const STATUS_HI = { draft:'ड्राफ्ट', pending:'समीक्षा में', published:'प्रकाशित', rejected:'अस्वीकृत' };

const sb = window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fmtDate(d){
  if(!d) return '';
  return new Date(d).toLocaleDateString('hi-IN',{day:'numeric',month:'long',year:'numeric'});
}
function toast(msg, type){
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
function errMsg(e){
  const m = (e && e.message) || String(e);
  if(/Invalid login/i.test(m)) return 'ईमेल या पासवर्ड गलत है।';
  if(/row-level security/i.test(m)) return 'इस काम की अनुमति नहीं है।';
  if(/already registered|already been registered/i.test(m)) return 'यह ईमेल पहले से मौजूद है।';
  return m;
}
async function busy(btn, fn){
  btn.disabled = true;
  try { return await fn(); }
  catch(e){ console.error(e); toast(errMsg(e), 'err'); }
  finally { btn.disabled = false; }
}
function configCheck(){
  if(APP_CONFIG.SUPABASE_URL.includes('YOUR-PROJECT')){
    const b = document.createElement('div');
    b.className = 'warnbar';
    b.textContent = '⚠️ js/config.js में Supabase URL और anon key अभी नहीं डाली गई है।';
    document.body.prepend(b);
    return false;
  }
  return true;
}
async function getMyProfile(){
  const { data:{ session } } = await sb.auth.getSession();
  if(!session) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  return data;
}
async function requireRole(role){
  const p = await getMyProfile();
  if(!p || !p.active || p.role !== role){ location.replace('login.html'); return null; }
  document.body.classList.remove('hidden');
  return p;
}
async function logout(){ await sb.auth.signOut(); location.href = 'login.html'; }

// फ़ाइल का सुरक्षित नाम (हिंदी/स्पेस वाले नाम storage में दिक्कत करते हैं)
function safeName(file, forceExt){
  const m = /\.([a-zA-Z0-9]{1,5})$/.exec(file.name || '');
  const ext = forceExt || (m ? m[1].toLowerCase() : 'bin');
  return Date.now() + '_' + Math.random().toString(36).slice(2,8) + '.' + ext;
}
// फ़ोटो छोटी करना (मोबाइल की बड़ी फ़ोटो से storage बचती है)
async function compressImage(file, max = 1200, q = 0.8){
  if(!file.type.startsWith('image/')) throw new Error('कृपया सिर्फ़ फ़ोटो चुनें।');
  const bmp = await createImageBitmap(file);
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise(res => c.toBlob(res, 'image/jpeg', q));
}
function categoryOptions(sel){
  return CATEGORIES.map(c => `<option ${c===sel?'selected':''}>${c}</option>`).join('');
}
function initTabs(onChange){
  const tabs = document.querySelectorAll('.tab');
  const show = id => {
    tabs.forEach(t => t.classList.toggle('on', t.dataset.t === id));
    document.querySelectorAll('[data-sec]').forEach(s => s.classList.toggle('hidden', s.dataset.sec !== id));
    onChange && onChange(id);
  };
  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.t)));
  show(tabs[0].dataset.t);
  return show;
}
