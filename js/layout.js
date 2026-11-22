// हेडर, फ़ुटर और संपर्क-जानकारी सभी पेजों में यहीं से बनती है
(function(){
  const S = (window.APP_CONFIG && APP_CONFIG.SITE) || {};
  const name = S.name || 'रामकोला टाइम्स';
  const tag = S.tagline || '';
  const page = location.pathname.split('/').pop() || 'index.html';

  const social = [
    S.facebook && `<a href="${esc(S.facebook)}" target="_blank" rel="noopener">Facebook</a>`,
    S.youtube && `<a href="${esc(S.youtube)}" target="_blank" rel="noopener">YouTube</a>`,
    S.instagram && `<a href="${esc(S.instagram)}" target="_blank" rel="noopener">Instagram</a>`,
    S.whatsapp && `<a href="https://wa.me/${esc(S.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>`
  ].filter(Boolean).join('');

  const logo = (extra) => `<a class="logo" href="index.html"><img src="assets/logo-mark.svg" alt="${esc(name)} लोगो">
    <span class="wm"><b>${esc(name)}</b><small>${extra || esc(tag)}</small></span></a>`;

  const head = document.getElementById('site-header');
  if(head){
    if(head.dataset.variant === 'panel'){
      head.innerHTML = `<header class="panelbar"><div class="wrap">${logo(esc(head.dataset.title || ''))}
        <div class="who"><span id="me"></span><br><button class="btn light sm" id="out">लॉगआउट</button></div></div></header>`;
    } else {
      const today = new Date().toLocaleDateString('hi-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
      const nav = [['index.html','होम'],['about.html','हमारे बारे में'],['contact.html','संपर्क / खबर भेजें']]
        .map(([h,t]) => `<a href="${h}" class="${h===page?'on':''}">${t}</a>`).join('');
      head.innerHTML = `
        <div class="datebar"><div class="wrap"><span>${today}</span><span>${social}</span></div></div>
        <header class="masthead"><div class="wrap">${logo()}
          <a class="btn light sm" href="login.html">🔒 स्टाफ लॉगिन</a></div></header>
        <nav class="mainnav"><div class="wrap">${nav}</div></nav>`;
    }
  }

  const foot = document.getElementById('site-footer');
  if(foot){
    const cats = (typeof CATEGORIES !== "undefined" ? CATEGORIES : []).slice(0,6)
      .map(c => `<a href="index.html?cat=${encodeURIComponent(c)}">${esc(c)}</a>`).join('');
    const contact = [
      S.address && `<p>📍 ${esc(S.address)}</p>`,
      S.phone && `<p>📞 <a style="display:inline" href="tel:${esc(S.phone.replace(/\s/g,''))}">${esc(S.phone)}</a></p>`,
      S.email && `<p>✉️ <a style="display:inline" href="mailto:${esc(S.email)}">${esc(S.email)}</a></p>`
    ].filter(Boolean).join('') || '<p>संपर्क जानकारी जल्द उपलब्ध होगी।</p>';
    foot.innerHTML = `<footer class="foot"><div class="wrap"><div class="cols">
      <div>${logo()}<p>${esc((S.about || '').slice(0,170))}${(S.about||'').length>170?'…':''}</p></div>
      <div><h4>श्रेणियाँ</h4>${cats}</div>
      <div><h4>संपर्क</h4>${contact}<a href="contact.html">खबर भेजें</a><a href="privacy.html">गोपनीयता नीति</a><a href="login.html">स्टाफ लॉगिन</a></div>
    </div></div><div class="copy">© ${new Date().getFullYear()} ${esc(name)} — सर्वाधिकार सुरक्षित</div></footer>`;
  }

  const about = document.getElementById('aboutText');
  if(about) about.innerHTML = `<p>${esc(S.about || '')}</p>` +
    (S.editor ? `<p><b>संपादक:</b> ${esc(S.editor)}</p>` : '');

  const cb = document.getElementById('contactBox');
  if(cb){
    const items = [
      S.phone && ['📞 फ़ोन', `<a href="tel:${esc(S.phone.replace(/\s/g,''))}">${esc(S.phone)}</a>`],
      S.whatsapp && ['💬 WhatsApp पर खबर भेजें', `<a href="https://wa.me/${esc(S.whatsapp)}?text=${encodeURIComponent('नमस्ते, मेरे पास एक खबर है: ')}" target="_blank" rel="noopener">मैसेज भेजें</a>`],
      S.email && ['✉️ ईमेल', `<a href="mailto:${esc(S.email)}">${esc(S.email)}</a>`],
      S.address && ['📍 पता', esc(S.address)],
      S.facebook && ['Facebook', `<a href="${esc(S.facebook)}" target="_blank" rel="noopener">पेज देखें</a>`],
      S.youtube && ['YouTube', `<a href="${esc(S.youtube)}" target="_blank" rel="noopener">चैनल देखें</a>`]
    ].filter(Boolean);
    cb.innerHTML = items.length
      ? items.map(([k,v]) => `<div class="c"><b>${k}</b>${v}</div>`).join('')
      : '<p class="empty">संपर्क जानकारी जल्द जोड़ी जाएगी।</p>';
  }
})();
