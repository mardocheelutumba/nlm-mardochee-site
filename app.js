// app.js (module, front) - version complète
const qs = (s,c=document) => c.querySelector(s);
const qsa = (s,c=document) => Array.from(c.querySelectorAll(s));

/* DOM */
const mobileBtn = qs('#mobileMenuBtn');
const sidebar = qs('#sidebar');
const overlay = qs('#sidebarOverlay');
const sidebarClose = qs('#sidebarCloseBtn');
const themeBtn = qs('#themeToggleBtn');

const welcomeCard = qs('#welcomeCard');
const welcomeActions = qsa('.welcome-actions .btn');

const coursesList = qs('#coursesList');
const newCourseForm = qs('#newCourseForm');
const articlesList = qs('#articlesList');

const chatForm = qs('#chatForm');
const chatInput = qs('#chatInput');
const chatBox = qs('#chatBox');
const verifyBtn = qs('#verifyBtn');
const factResult = qs('#factResult');

const newsFeed = qs('#newsFeed');
const recentComments = qs('#recentComments');

/* Local storage helpers */
const storage = {
  get(k,d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch(e){return d} },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)) }catch(e){} }
};

/* Init */
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initTheme();
  initWelcome();
  initCourses();
  initArticles();
  initChat();
  loadNews();
  loadRecentComments();
});

/* ---------------- Sidebar ---------------- */
function initSidebar(){
  mobileBtn?.addEventListener('click', ()=> { sidebar.classList.add('open'); overlay.classList.add('active'); });
  sidebarClose?.addEventListener('click', closeSidebar);
  overlay?.addEventListener('click', closeSidebar);
  qsa('.nav-main a').forEach(a => a.addEventListener('click', ()=> { if(window.innerWidth < 992) closeSidebar(); }));
  document.addEventListener('keydown', e => { if(e.key==='Escape') closeSidebar(); });
}
function closeSidebar(){ sidebar.classList.remove('open'); overlay.classList.remove('active'); }

/* ---------------- Theme ---------------- */
function initTheme(){
  const t = localStorage.getItem('theme') || 'dark';
  applyTheme(t);
  themeBtn?.addEventListener('click', ()=>{
    const next = document.body.classList.toggle('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  });
}
function applyTheme(name){
  if(name==='light'){ document.body.classList.add('light-mode'); themeBtn && (themeBtn.textContent='Clair'); }
  else { document.body.classList.remove('light-mode'); themeBtn && (themeBtn.textContent='Sombre'); }
}

/* ---------------- Welcome ---------------- */
function initWelcome(){
  welcomeActions.forEach(btn => btn.addEventListener('click', (e)=> {
    const action = e.currentTarget.dataset.action;
    if(action==='ask') scrollTo('#chat'), chatInput?.focus();
    if(action==='cours') scrollTo('#cours');
    if(action==='actus') scrollTo('#articles');
    welcomeCard.style.display = 'none';
  }));
}
function scrollTo(sel){ const el = qs(sel); el && el.scrollIntoView({behavior:'smooth'}); }

/* ---------------- Courses ---------------- */
function initCourses(){
  const courses = storage.get('nlm_courses', []);
  renderCourses(courses);
  newCourseForm?.addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(newCourseForm);
    const title = fd.get('title'), plan = fd.get('plan');
    const course = { id: 'c_'+Date.now(), title, plan, created: new Date().toISOString() };
    courses.unshift(course);
    storage.set('nlm_courses', courses);
    renderCourses(courses);
    newCourseForm.reset();
    scrollTo('#cours');
  });
}
function renderCourses(list){
  coursesList.innerHTML = '';
  if(!list?.length) coursesList.innerHTML = '<div class="card small">Aucun cours pour l\'instant.</div>';
  list.forEach(c => {
    const el = document.createElement('div'); el.className='card';
    el.innerHTML = `<h4>${escapeHtml(c.title)}</h4><div class="muted small">Créé: ${new Date(c.created).toLocaleString()}</div><p>${escapeHtml(c.plan||'')}</p><div style="margin-top:8px"><button class="btn ghost" data-id="${c.id}" onclick="editCourse('${c.id}')">Éditer</button></div>`;
    coursesList.appendChild(el);
  });
}
window.editCourse = function(id){
  const courses = storage.get('nlm_courses', []);
  const c = courses.find(x=>x.id===id);
  if(!c) return alert('Cours introuvable');
  const title = prompt('Titre', c.title); if(title===null) return;
  const plan = prompt('Plan / notes', c.plan);
  c.title = title; c.plan = plan; storage.set('nlm_courses', courses); renderCourses(courses);
};

/* ---------------- Articles ---------------- */
function initArticles(){
  const demo = storage.get('nlm_articles', [
    {id:'a1', title:'Découvrir l\'IA', date:'2025-08-10', excerpt:'Bases et usages pour débuter.'}
  ]);
  renderArticles(demo);
  storage.set('nlm_articles', demo);
}
function renderArticles(list){
  articlesList.innerHTML = '';
  list.forEach(a=>{
    const el = document.createElement('article'); el.className='card article-card';
    el.innerHTML = `<h4>${escapeHtml(a.title)}</h4><div class="muted small">${escapeHtml(a.date)}</div><p>${escapeHtml(a.excerpt)}</p>`;
    articlesList.appendChild(el);
  });
}

/* ---------------- Chat ---------------- */
function initChat(){
  appendAi("Bonjour — je suis Nlm Lutumba AI. Pose ta question 👋");
  chatForm?.addEventListener('submit', async e=>{
    e.preventDefault();
    const text = chatInput.value.trim();
    if(!text) return;
    appendUser(text); chatInput.value='';
    await askServer(text);
  });
  verifyBtn?.addEventListener('click', async ()=>{
    const claim = prompt('Colle l\'affirmation à vérifier :');
    if(!claim) return;
    appendUser(`Vérifier : ${claim}`);
    await verifyClaim(claim);
  });
}
function appendUser(txt){
  const d=document.createElement('div'); d.className='msg user'; d.innerHTML=`<div class="chat-message user"><strong>Vous :</strong> ${escapeHtml(txt)}</div>`;
  chatBox.appendChild(d); chatBox.scrollTop=chatBox.scrollHeight;
}
function appendAi(txt){
  const d=document.createElement('div'); d.className='msg ai'; d.innerHTML=`<div class="chat-message ai"><strong>Nlm Lutumba AI :</strong> ${escapeHtml(txt)}</div>`;
  chatBox.appendChild(d); chatBox.scrollTop=chatBox.scrollHeight;
}

/* askServer: try backend -> fallback local */
async function askServer(text){
  // typing indicator
  const loader = document.createElement('div'); loader.className='msg ai typing'; loader.innerHTML=`<div class="chat-message ai"><strong>Nlm Lutumba AI :</strong> <em>...</em></div>`;
  chatBox.appendChild(loader); chatBox.scrollTop=chatBox.scrollHeight;

  // Try calling backend (expected at /api/chat). If 404 or network error -> fallback local.
  try {
    const resp = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message: text }) });
    if(!resp.ok) {
      // fallback: local simple reply (demo)
      loader.remove();
      const fallback = localFallbackReply(text);
      appendAi(fallback);
      return;
    }
    const data = await resp.json();
    loader.remove();
    appendAi(data.reply || 'Pas de réponse.');
  } catch(err){
    loader.remove();
    const fallback = localFallbackReply(text);
    appendAi(fallback);
  }
}

/* verifyClaim: calls /api/verify or fallback */
async function verifyClaim(claim){
  factResult.style.display='block'; factResult.textContent='Vérification en cours...';
  try {
    const res = await fetch('/api/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ claim }) });
    if(!res.ok){ factResult.textContent='Serveur indisponible — vérification impossible.'; return; }
    const data = await res.json();
    factResult.innerHTML = `<strong>Verdict :</strong> ${escapeHtml(data.verdict||'Indéterminé')} — <strong>Confiance :</strong> ${escapeHtml(String(data.confidence||0))}%<div style="margin-top:8px"><strong>Explication :</strong><p>${escapeHtml(data.explanation||'')}</p></div>`;
  } catch(e){
    factResult.textContent='Erreur réseau — impossible de vérifier.';
  }
}

/* Local fallback reply (very simple, for offline/demo) */
function localFallbackReply(userText){
  const t = userText.toLowerCase();
  if(t.includes('bonjour') || t.includes('salut')) return "Bonjour ! Je suis Nlm Lutumba AI (mode démo). Demande-moi un cours, ou tape 'quelle est la capitale de France' par exemple.";
  if(t.includes('capital') && t.includes('france')) return "La capitale de la France est Paris.";
  if(t.includes('ia') || t.includes('intelligence')) return "L'IA (intelligence artificielle) est un domaine de l'informatique centré sur la création de systèmes capables d'exécuter des tâches nécessitant normalement l'intelligence humaine.";
  return "Mode démo : je n'ai pas de backend connecté. Pour des réponses complètes, déploie le backend sécurisé (instructions dans le README).";
}

/* ---------------- News & comments ---------------- */
function loadNews(){
  newsFeed.textContent = 'Chargement...';
  setTimeout(()=> {
    newsFeed.innerHTML = `<ul><li>OpenAI — mise à jour (simulée)</li><li>Tutoriel: publier un cours (simulé)</li></ul>`;
  }, 700);
}

function loadRecentComments(){
  const comments = storage.get('nlm_comments', {});
  const arr = [];
  Object.values(comments).forEach(list => { if(Array.isArray(list)) arr.push(...list); });
  recentComments.textContent = arr.length ? arr.slice(-5).map(c=>`${c.author}: ${c.content}`).join(' • ') : 'Aucun commentaire';
}

/* ---------------- Utilities ---------------- */
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
