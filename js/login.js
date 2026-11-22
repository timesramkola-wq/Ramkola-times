function goPanel(p){
  location.replace(p.role === 'admin' ? 'admin.html' : 'staff.html');
}

(async function(){
  if(!configCheck()) return;
  const p = await getMyProfile();
  if(p && p.active) goPanel(p);
})();

document.getElementById('f').addEventListener('submit', e => {
  e.preventDefault();
  busy(document.getElementById('go'), async () => {
    const { error } = await sb.auth.signInWithPassword({
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('pw').value
    });
    if(error) throw error;
    const p = await getMyProfile();
    if(!p || !p.active){
      await sb.auth.signOut();
      throw new Error('आपका खाता अभी सक्रिय नहीं है। एडमिन से संपर्क करें।');
    }
    goPanel(p);
  });
});
