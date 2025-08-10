/* app.js
   Version : améliorée — animations, interactions, accessibilité, stockage local
   - Écrit en JS vanille pour être facile à comprendre et à versionner sur GitHub.
   - Les commentaires en français expliquent chaque bloc.
*/

/* ---------------------- Utilitaires & préférences ---------------------- */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LS_KEYS = {
  THEME: 'nlm_theme',
  LIKES: 'nlm_likes',          // stocke objet { articleId: count }
  COMMENTS: 'nlm_comments'     // stocke tableau de commentaires
};

/* Petit helper pour lire/écrire localStorage en JSON */
function lsGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch (e) { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { /* ignore */ }
}

/* ---------------------- SIDEBAR toggle ---------------------- */
/* html: <button class="toggle-btn" onclick="toggleSidebar()">☰</button> */
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  sb.classList.toggle('closed');
}
window.toggleSidebar = toggleSidebar; // exposer pour onclick inline

/* ---------------------- THEME (insertion d'un toggle simple) ---------------------- */
/* On insère un petit toggle dans la sidebar pour basculer sombre/clair.
   Le CSS utilise .dark-mode sur le <body> (voir style.css). */
(function initThemeToggle() {
  const body = document.body;
  const saved = localStorage.getItem(LS_KEYS.THEME) || 'dark';
  if (saved === 'dark') body.classList.add('dark-mode');
  else body.classList.remove('dark-mode');

  // Créer un petit bouton dans la sidebar si la zone existe
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const wrapper = document.createElement('div');
  wrapper.style.marginTop = 'auto';
  wrapper.style.display = 'flex';
  wrapper.style.gap = '8px';
  wrapper.style.alignItems = 'center';

  const label = document.createElement('span');
  label.textContent = 'Thème';
  label.style.fontSize = '0.9rem';
  label.style.color = 'inherit';

  const btn = document.createElement('button');
  btn.className = 'btn ghost';
  btn.textContent = saved === 'dark' ? 'Sombre' : 'Clair';
  btn.onclick = () => {
    const isDark = body.classList.toggle('dark-mode');
    btn.textContent = isDark ? 'Sombre' : 'Clair';
    localStorage.setItem(LS_KEYS.THEME, isDark ? 'dark' : 'light');
  };

  wrapper.appendChild(label);
  wrapper.appendChild(btn);
  sidebar.appendChild(wrapper);
})();

/* ---------------------- RIPPLE effect sur boutons ---------------------- */
/* Ajoute un effet onde (ripple) à tous les boutons pour micro-interaction */
function initRipple() {
  if (prefersReducedMotion) return;
  document.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    // ne pas faire ripple pour boutons de type ghost si tu veux, ici on l'applique partout
    const rect = target.getBoundingClientRect();
    const circle = document.createElement('span');
    const size = Math.max(rect.width, rect.height) * 1.6;
    circle.style.width = circle.style.height = size + 'px';
    circle.style.position = 'absolute';
    circle.style.borderRadius = '50%';
    circle.style.pointerEvents = 'none';
    circle.style.left = `${e.clientX - rect.left - size/2}px`;
    circle.style.top = `${e.clientY - rect.top - size/2}px`;
    circle.style.background = 'rgba(255,255,255,0.12)';
    circle.style.transform = 'scale(0)';
    circle.style.transition = 'transform 400ms ease, opacity 600ms ease';
    circle.style.opacity = '0.9';
    circle.className = 'ripple-effect';
    target.style.position = target.style.position || 'relative';
    target.appendChild(circle);
    requestAnimationFrame(() => circle.style.transform = 'scale(1)');
    setTimeout(() => {
      circle.style.opacity = '0';
      setTimeout(() => circle.remove(), 700);
    }, 350);
  }, {passive: true});
}
initRipple();

/* ---------------------- 3D TILT sur cartes (léger) ---------------------- */
/* Applique un effet de perspective + rotation suivant la souris sur .card */
function initCardTilt() {
  if (prefersReducedMotion) return;
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    const rect = () => card.getBoundingClientRect();
    const onMove = (e) => {
      const r = rect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rotateY = (px - 0.5) * 10; // -5deg -> 5deg
      const rotateX = (0.5 - py) * 8;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      card.style.boxShadow = `0 18px 40px rgba(2,6,23,0.35)`;
    };
    const onLeave = () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    };
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    // pour mobile on ne fait rien
  });
}
initCardTilt();

/* ---------------------- Likes / Comments / Share (stockage local) ---------------------- */
const likesStore = lsGet(LS_KEYS.LIKES, {});      // { articleId: count }
const commentsStore = lsGet(LS_KEYS.COMMENTS, []); // [ { articleId, text, date } ]

function initArticleInteractions() {
  // Buttons existants dans index.html : classes .like-btn, .comment-btn, .share-btn
  document.querySelectorAll('.like-btn').forEach((btn, index) => {
    // associer un id simple si pas d'id fourni
    const id = btn.dataset.id ?? (`a_${index}`);
    btn.dataset.id = id;
    // afficher compteur si absent
    if (!btn.querySelector('.like-count')) {
      const span = document.createElement('span');
      span.className = 'like-count';
      span.style.marginLeft = '8px';
      span.textContent = likesStore[id] || 0;
      btn.appendChild(span);
    }
    btn.addEventListener('click', () => {
      likesStore[id] = (likesStore[id] || 0) + 1;
      lsSet(LS_KEYS.LIKES, likesStore);
      btn.querySelector('.like-count').textContent = likesStore[id];
      // feedback visuel
      btn.animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 160 });
    });
  });

  document.querySelectorAll('.comment-btn').forEach((btn, index) => {
    const id = btn.dataset.id ?? (`a_${index}`);
    btn.dataset.id = id;
    btn.addEventListener('click', () => {
      const text = prompt('Écrire un commentaire :');
      if (text && text.trim()) {
        const comment = { articleId: id, text: text.trim(), date: new Date().toISOString() };
        commentsStore.push(comment);
        lsSet(LS_KEYS.COMMENTS, commentsStore);
        renderCommentsPanel();
        alert('Merci — commentaire enregistré localement (dev).');
      }
    });
  });

  document.querySelectorAll('.share-btn').forEach((btn, index) => {
    const id = btn.dataset.id ?? (`a_${index}`);
    btn.addEventListener('click', async () => {
      const shareUrl = location.href.split('#')[0] + `#article-${id}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, text: 'Découvre cet article', url: shareUrl });
        } catch (e) { /* partage annulé */ }
      } else if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert('Lien copié dans le presse-papiers !');
        } catch (e) {
          prompt('Copie ce lien:', shareUrl);
        }
      } else {
        prompt('Copie ce lien:', shareUrl);
      }
    });
  });
}
initArticleInteractions();

/* ---------------------- Afficher panneaux commentaires récents ---------------------- */
function renderCommentsPanel() {
  const container = document.getElementById('comments');
  if (!container) return;
  container.innerHTML = '';
  if (!Array.isArray(commentsStore) || commentsStore.length === 0) {
    container.textContent = "Aucun commentaire pour l'instant.";
    return;
  }
  // montrer les 8 derniers
  const recent = commentsStore.slice(-8).reverse();
  recent.forEach(c => {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.style.padding = '8px';
    div.style.borderRadius = '8px';
    div.style.background = 'rgba(255,255,255,0.02)';
    div.style.marginBottom = '8px';
    div.innerHTML = `<div style="font-weight:600">${c.articleId}</div>
                     <div style="font-size:0.85rem;color:var(--muted)">${new Date(c.date).toLocaleString()}</div>
                     <div style="margin-top:6px">${escapeHtml(c.text)}</div>`;
    container.appendChild(div);
  });
}
renderCommentsPanel();

/* ---------------------- CHAT AI (simulation) ---------------------- */
function sendMessage() {
  const input = document.getElementById('user-input') || document.getElementById('user-input') || document.getElementById('user-input'); // tolerance
  const chatBox = document.getElementById('chat-box');
  if (!input || !chatBox) return;
  const text = input.value.trim();
  if (!text) return;
  appendChatMessage('user', text);
  input.value = '';
  // loader
  const loader = appendChatMessage('ai', '…'); // placeholder
  // simulation (en prod => appeler ton backend OpenAI)
  setTimeout(() => {
    // Exemple de réponse simple (demo)
    const reply = generateSimpleReply(text);
    loader.textContent = reply;
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 700);
}

function appendChatMessage(kind, text) {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return null;
  const p = document.createElement('p');
  p.className = kind === 'ai' ? 'ai-msg' : 'user-msg';
  p.style.marginBottom = '10px';
  p.innerHTML = kind === 'ai' ? `<strong>AI :</strong> ${escapeHtml(text)}` : `<strong>Vous :</strong> ${escapeHtml(text)}`;
  chatBox.appendChild(p);
  chatBox.scrollTop = chatBox.scrollHeight;
  return p;
}

function generateSimpleReply(userText) {
  // réponse naive et sûre — remplace par appel serveur pour vraie IA
  const words = userText.split(/\s+/).slice(0, 6).join(' ');
  return `Réponse démo : j'ai bien reçu "${escapeHtml(words)}" — pour une réponse détaillée, connecte un backend OpenAI.`;
}

/* ---------------------- Formulaire contact (simulé) ---------------------- */
(function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    // simple validation / feedback
    const name = data.get('name') || data.get('nom') || 'anonyme';
    alert(`Merci ${name} — message reçu (simulation).`);
    form.reset();
  });
})();

/* ---------------------- Helpers ---------------------- */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

/* ---------------------- Accessibility helpers ---------------------- */
/* Met un focus ring visible si clavier utilisé récemment */
(function focusRing() {
  function handleFirstTab(e) {
    if (e.key === 'Tab') document.body.classList.add('user-is-tabbing');
  }
  window.addEventListener('keydown', handleFirstTab, { once: true });
})();

/* ---------------------- petites améliorations d'UX ---------------------- */
/* Exemple : animation d'apparition progressive pour les articles */
function fadeInArticles() {
  if (prefersReducedMotion) return;
  const articles = document.querySelectorAll('.article, .card');
  articles.forEach((a, i) => {
    a.style.opacity = 0;
    a.style.transform = 'translateY(8px)';
    a.style.transition = 'opacity 420ms ease, transform 420ms ease';
    setTimeout(() => {
      a.style.opacity = 1;
      a.style.transform = 'translateY(0)';
    }, 80 * i);
  });
}
window.addEventListener('load', () => {
  fadeInArticles();
});

/* ---------------------- Sécurité & Préparation à l'avenir ---------------------- */
/* - Pour passer en production : remplacer prompt/localStorage par un backend (Node / Supabase / Firebase) */
/* - Pour intégrer OpenAI : créer un endpoint serveur qui reçoit le message utilisateur, appelle OpenAI avec la clé côté serveur, et renvoie la réponse. */

/* ---------------------- Init final ---------------------- */
(function bootstrap() {
  // Attache sendMessage si un bouton existe (au cas où l'inline onclick n'est pas présent)
  const sendBtn = document.querySelector('[onclick="sendMessage()"]') || document.getElementById('sendChat');
  if (sendBtn) sendBtn.addEventListener('click', sendMessage);

  // Initialiser interactions sur articles (dans le DOM)
  initArticleInteractions();

  // Accessible: activer le focus visible pour les éléments interactifs
  document.querySelectorAll('button, a, input, textarea').forEach(el => {
    el.addEventListener('focus', () => el.classList.add('focused'));
    el.addEventListener('blur', () => el.classList.remove('focused'));
  });
})();

/* Fin du fichier app.js */
