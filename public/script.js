/**
 * @file VoterPath — Frontend Client
 * @description Interactive civic education UI: scroll-driven timeline, state deadline
 *   lookup, input sanitization, theme toggle, and Gemini AI chat integration.
 * @version 1.0.0
 * @author VoterPath Team
 * @license MIT
 */

'use strict';

/** @type {string[]} Ordered election phases for timeline navigation */
const PHASES = ['registration', 'research', 'voting', 'results'];

/** @type {Object.<string, {registration: string, onlineEnroll: boolean}>} Indian states/UTs voter info */
const STATE_DEADLINES = {
  'Andhra Pradesh': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Arunachal Pradesh': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Assam': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Bihar': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Chhattisgarh': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Goa': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Gujarat': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Haryana': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Himachal Pradesh': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Jharkhand': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Karnataka': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Kerala': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Madhya Pradesh': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Maharashtra': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Manipur': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Meghalaya': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Mizoram': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Nagaland': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Odisha': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Punjab': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Rajasthan': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Sikkim': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Tamil Nadu': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Telangana': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Tripura': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Uttar Pradesh': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Uttarakhand': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'West Bengal': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Andaman and Nicobar Islands': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Chandigarh': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Dadra and Nagar Haveli and Daman and Diu': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Delhi': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Jammu and Kashmir': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Ladakh': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Lakshadweep': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
  'Puducherry': { registration: 'Year-round via NVSP portal or Form 6', onlineEnroll: true },
};

/**
 * Looks up voter registration info for an Indian state or Union Territory.
 * @param {string} state - State/UT name (case-sensitive, e.g. "Maharashtra")
 * @returns {{registration: string, onlineEnroll: boolean}|null} State data or null
 */
function getStateData(state) {
  if (!state || typeof state !== 'string') return null;
  return STATE_DEADLINES[state] || null;
}

/**
 * Strips HTML tags, dangerous protocols, and event handlers from user input.
 * @param {string} input - Raw user input
 * @param {number} [maxLength=500] - Maximum output length
 * @returns {string} Sanitized string
 */
function sanitizeInput(input, maxLength = 500) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .slice(0, maxLength)
    .trim();
}

/**
 * Returns the zero-based index of an election phase.
 * @param {string} phase - Phase name (case-insensitive)
 * @returns {number} Index in PHASES array, or -1 if not found
 */
function getPhaseIndex(phase) {
  return PHASES.indexOf(phase.toLowerCase());
}

/**
 * Returns the next phase in the election timeline.
 * @param {string} currentPhase - Current phase name
 * @returns {string|null} Next phase name or null if at the end
 */
function getNextPhase(currentPhase) {
  const idx = getPhaseIndex(currentPhase);
  if (idx === -1 || idx === PHASES.length - 1) return null;
  return PHASES[idx + 1];
}

function initProgressBar() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = `${Math.min(progress, 100)}%`;
    bar.setAttribute('aria-valuenow', Math.round(progress));
  }, { passive: true });
}

function initScrollReveal() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const elements = document.querySelectorAll('.reveal');

  if (prefersReduced) {
    elements.forEach((el) => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);

          const id = entry.target.id;
          if (id && id.startsWith('phase-') && typeof gtag !== 'undefined') {
            gtag('event', 'phase_viewed', { event_label: id });
          }
        }
      });
    },
    { threshold: 0.15 }
  );

  elements.forEach((el) => observer.observe(el));
}

function initTooltips() {
  const jargonBtns = document.querySelectorAll('.jargon');

  jargonBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      jargonBtns.forEach((b) => b.setAttribute('aria-expanded', 'false'));
      btn.setAttribute('aria-expanded', String(!expanded));
    });

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') btn.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', () => {
    jargonBtns.forEach((b) => b.setAttribute('aria-expanded', 'false'));
  });
}

function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-icon');
  if (!btn || !icon) return;

  const saved = localStorage.getItem('voterpath_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  icon.textContent = saved === 'dark' ? '☀️' : '🌙';
  btn.setAttribute('aria-pressed', String(saved === 'dark'));

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    icon.textContent = next === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-pressed', String(next === 'dark'));
    localStorage.setItem('voterpath_theme', next);
  });
}

function initStateSelector() {
  const select = document.getElementById('state-select');
  const infoBox = document.getElementById('state-info');
  if (!select || !infoBox) return;

  Object.keys(STATE_DEADLINES).sort().forEach((state) => {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    const state = select.value;
    const data = getStateData(state);

    if (!data) {
      infoBox.textContent = '';
      return;
    }

    const onlineNote = data.onlineEnroll ? ' ✓ Online enrollment available via NVSP!' : '';
    infoBox.textContent = `📋 ${state}: ${data.registration}.${onlineNote}`;

    if (typeof gtag !== 'undefined') {
      gtag('event', 'state_selected', { event_label: state });
    }
  });
}

let chatHistory = [];

function appendMessage(text, role) {
  const messages = document.getElementById('chat-messages');
  if (!messages) return null;

  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  const p = document.createElement('p');
  p.textContent = text;
  div.appendChild(p);
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

async function sendMessage(text) {
  const cleaned = sanitizeInput(text);
  if (!cleaned) return;

  appendMessage(cleaned, 'user');
  chatHistory.push({ role: 'user', text: cleaned });

  const loadingEl = appendMessage('Thinking…', 'loading');
  const sendBtn = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');
  if (sendBtn) sendBtn.disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: cleaned, history: chatHistory.slice(-10) }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Unknown error');
    }

    loadingEl && loadingEl.remove();
    const reply = data.reply || 'Sorry, I could not generate a response.';
    appendMessage(reply, 'ai');
    chatHistory.push({ role: 'model', text: reply });

    try {
      sessionStorage.setItem('voterpath_chat_history', JSON.stringify(chatHistory));
    } catch (_e) { /* storage full */ }

    if (typeof gtag !== 'undefined') {
      gtag('event', 'chat_message_sent', { message_length: cleaned.length });
    }
  } catch (err) {
    loadingEl && loadingEl.remove();
    appendMessage('⚠️ Unable to connect. Please check your connection and try again.', 'ai');
    console.error('Chat error:', err.message);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    if (input) { input.value = ''; input.focus(); }
  }
}

function initChat() {
  const fab = document.getElementById('chat-fab');
  const panel = document.getElementById('chat-panel');
  const closeBtn = document.getElementById('close-chat');
  const sendBtn = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');
  const openHero = document.getElementById('open-chat-hero');
  const openCta = document.getElementById('open-chat-cta');

  if (!fab || !panel) return;

  function openChat() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    input && input.focus();
    if (typeof gtag !== 'undefined') gtag('event', 'chat_opened');

    try {
      const saved = sessionStorage.getItem('voterpath_chat_history');
      if (saved) chatHistory = JSON.parse(saved);
    } catch (_e) { /* corrupt storage */ }
  }

  function closeChat() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    fab.focus();
  }

  fab.addEventListener('click', openChat);
  openHero && openHero.addEventListener('click', openChat);
  openCta && openCta.addEventListener('click', openChat);
  closeBtn && closeBtn.addEventListener('click', closeChat);

  sendBtn && sendBtn.addEventListener('click', () => {
    const text = input ? input.value.trim() : '';
    if (text) sendMessage(text);
  });

  input && input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = input.value.trim();
      if (text) sendMessage(text);
    }
  });

  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeChat();
  });
}

function initHeroScroll() {
  const btn = document.getElementById('start-journey');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const target = document.getElementById('phase-1');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initProgressBar();
    initScrollReveal();
    initTooltips();
    initThemeToggle();
    initStateSelector();
    initChat();
    initHeroScroll();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStateData, sanitizeInput, getPhaseIndex, getNextPhase };
}
