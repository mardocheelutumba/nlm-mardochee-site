// app.js (front) — module
// - Ne contient PAS la clé API.
// - Doit appeler votre backend sécurisé : POST /api/chat { message }
// - Sauvegarde likes & comments en localStorage (pour dev)

/* =======================
   Helpers localStorage JSON
   ======================= */
const storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { /* ignore */ }
  }
};

const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* =======================
   Variables DOM
   ======================= */
const mobileMenuBtn = qs('#mobileMenuBtn');
const sidebar = qs('#sidebar');
const sidebarOverlay = qs('#sidebarOverlay');
const sidebarCloseBtn = qs('#sidebarCloseBtn');
const themeToggleBtn = qs('#themeToggleBtn');

const chatForm = qs('#chatForm');
const chatInput = qs('#chatInput');
const chatBox = qs('#chatBox');

const likeButtonsSelector = '.like-btn';
const commentButtonsSelector = '.comment-btn';
const shareButtonsSelector = '.share-btn';

/* =======================
   Init on DOMContentLoaded
   ======================= */
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initTheme();
  initArticleInteractions();
  initChat();
  initContactForm();
  initAccessibility();
});

/* =======================
   Sidebar mobile open/close
   ======================= */
function initSidebar() {
  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openSidebar);
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
  });
}
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay?.classList.add('active');
  document.body.classList.add('sidebar-open');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay?.classList.remove('active');
  document.body.classList.remove('sidebar-open');
}

/* =======================
   Theme toggle (dark / light)
   ======================= */
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  applyTheme(saved);
  if (!themeToggleBtn) return;
  themeToggleBtn.addEventListener('click', () => {
    const current = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
  });
}
function applyTheme(name) {
  if (name === 'light') {
    document.body.classList.add('light-mode');
    themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i> Clair';
    themeToggleBtn.setAttribute('aria-pressed', 'true');
  } else {
    document.body.classList.remove('light-mode');
    themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i> Sombre';
    themeToggleBtn.setAttribute('aria-pressed', 'false');
  }
}

/* =======================
   Articles: likes / comments / share
   ======================= */
function initArticleInteractions() {
  const likes = storage.get('nlm_likes', {});
  const userLikes = storage.get('nlm_userLikes', {});
  const comments = storage.get('nlm_comments', {});

  // init like counts & event
  qsa(likeButtonsSelector).forEach(btn => {
    const id = btn.dataset.id;
    if (!id) return;
    const countEl = btn.querySelector('.like-count');
    if (countEl) countEl.textContent = likes[id] || 0;
    if (userLikes[id]) {
      btn.classList.add('active');
      const icon = btn.querySelector('i');
      if (icon) icon.className = 'fas fa-thumbs-up';
    }
    btn.addEventListener('click', () => {
      toggleLike(btn, id, likes, userLikes);
    });
  });

  // comments toggle / load
  qsa(commentButtonsSelector).forEach(btn => {
    const id = btn.dataset.id;
    if (!id) return;
    btn.addEventListener('click', () => {
      const section = qs(`#commentsSection-${id}`);
      if (!section) return;
      const open = section.style.display === 'block';
      section.style.display = open ? 'none' : 'block';
      btn.setAttribute('aria-expanded', (!open).toString());
      if (!open) renderComments(id, comments);
    });
  });

  // share
  qsa(shareButtonsSelector).forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id || '';
      const url = `${location.origin}${location.pathname}#${id}`;
      if (navigator.share) {
        try { await navigator.share({ title: document.title, text: 'Découvre cet article', url }); }
        catch (e) { /* user cancelled */ }
      } else if (navigator.clipboard) {
        try { await navigator.clipboard.writeText(url); alert('Lien copié !'); }
        catch (e) { prompt('Copie ce lien', url); }
      } else prompt('Copie ce lien', url);
    });
  });

  // expose addComment
  window.addComment = function(articleId) {
    const input = qs(`#commentInput-${articleId}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const entry = { author: 'Vous', content: text, date: new Date().toISOString() };
    comments[articleId] = comments[articleId] || [];
    comments[articleId].push(entry);
    storage.set('nlm_comments', comments);
    // update UI (prepend)
    const list = qs(`#commentsList-${articleId}`);
    if (list) {
      const node = createCommentNode(entry);
      // remove default placeholder if present
      const placeholder = list.querySelector('p');
      if (placeholder && list.children.length === 1) list.innerHTML = '';
      list.prepend(node);
    }
    input.value = '';
  };
}

function toggleLike(btn, id, likes, userLikes) {
  const countEl = btn.querySelector('.like-count');
  const icon = btn.querySelector('i');
  const isLiked = !!userLikes[id];
  if (isLiked) {
    likes[id] = Math.max(0, (likes[id] || 1) - 1);
    delete userLikes[id];
    btn.classList.remove('active');
    if (icon) icon.className = 'far fa-thumbs-up';
  } else {
    likes[id] = (likes[id] || 0) + 1;
    userLikes[id] = true;
    btn.classList.add('active');
    if (icon) icon.className = 'fas fa-thumbs-up';
    // petit effet visuel
    countEl?.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 200 });
  }
  if (countEl) countEl.textContent = likes[id] || 0;
  storage.set('nlm_likes', likes);
  storage.set('nlm_userLikes', userLikes);
}

function renderComments(articleId, commentsStore) {
  const list = qs(`#commentsList-${articleId}`);
  if (!list) return;
  list.innerHTML = '';
  const arr = commentsStore[articleId] || [];
  if (!arr.length) {
    list.innerHTML = '<p class="small muted">Aucun commentaire pour l\'instant.</p>';
    return;
  }
  arr.slice().reverse().forEach(c => list.appendChild(createCommentNode(c)));
}

function createCommentNode(c) {
  const div = document.createElement('div');
  div.className = 'comment';
  div.innerHTML = `
    <div class="comment-header"><strong>${escapeHtml(c.author)}</strong><span class="muted">${new Date(c.date).toLocaleString()}</span></div>
    <div class="comment-content">${escapeHtml(c.content)}</div>
  `;
  return div;
}

/* =======================
   Chat — communication avec backend /api/chat
   ======================= */
function initChat() {
  // restore quick welcome
  appendAiMessage("Bonjour — je suis Nlm Lutumba AI. Pose ta question.");

  if (!chatForm || !chatInput || !chatBox) return;

  // submit
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    appendUserMessage(text);
    chatInput.value = '';
    await askServer(text);
  });
}

function appendUserMessage(text) {
  const div = document.createElement('div');
  div.className = 'msg user';
  div.innerHTML = `<div class="chat-message user"><strong>Vous :</strong> ${escapeHtml(text)}</div>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendAiMessage(text) {
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.innerHTML = `<div class="chat-message ai"><strong>Nlm Lutumba AI :</strong> ${escapeHtml(text)}</div>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* askServer: POST /api/chat { message } -> expects { reply } */
async function askServer(message) {
  // show typing indicator
  const typingNode = document.createElement('div');
  typingNode.className = 'msg ai typing';
  typingNode.innerHTML = `<div class="chat-message ai"><strong>Nlm Lutumba AI :</strong> <em>...</em></div>`;
  chatBox.appendChild(typingNode);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    // remove typing indicator
    typingNode.remove();

    if (!resp.ok) {
      appendAiMessage('Désolé, serveur indisponible. Réessaie plus tard.');
      console.error('Server error', resp.status);
      return;
    }

    const data = await resp.json();
    // expected { reply: "..." }
    const reply = data?.reply ?? data?.message ?? 'Aucune réponse.';
    appendAiMessage(reply);
  } catch (err) {
    typingNode.remove();
    appendAiMessage('Problème réseau — impossible de joindre le serveur.');
    console.error(err);
  }
}

/* =======================
   Contact form (simulation)
   ======================= */
function initContactForm() {
  const form = qs('#contactForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = fd.get('name') || fd.get('nom') || 'anonyme';
    alert(`Merci ${name} — message reçu. (simulation)`);
    form.reset();
  });
}

/* =======================
   Accessibility helpers
   ======================= */
function initAccessibility() {
  window.addEventListener('keydown', function onFirstTab(e) {
    if (e.key === 'Tab') {
      document.body.classList.add('user-is-tabbing');
      window.removeEventListener('keydown', onFirstTab);
    }
  });
}

/* =======================
   Small utilities
   ======================= */
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
        }
