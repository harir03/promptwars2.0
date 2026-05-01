/**
 * VoterPath — Main frontend script
 * Handles: scroll animations, progress bar, tooltips, theme toggle,
 *          state deadline selector, and Gemini AI chat.
 */

'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

/** @type {string[]} Ordered election phase IDs */
const PHASES = ['registration', 'research', 'voting', 'results'];

/**
 * Voter registration deadline data for all 50 US states.
 * @type {Object.<string, {deadline: string, sameDay: boolean}>}
 */
const STATE_DEADLINES = {
  'Alabama': { deadline: '15 days before election', sameDay: false },
  'Alaska': { deadline: '30 days before election', sameDay: false },
  'Arizona': { deadline: '29 days before election', sameDay: false },
  'Arkansas': { deadline: '30 days before election', sameDay: false },
  'California': { deadline: '15 days before election', sameDay: true },
  'Colorado': { deadline: 'Election Day registration available', sameDay: true },
  'Connecticut': { deadline: '7 days before election', sameDay: true },
  'Delaware': { deadline: '24 days before election', sameDay: false },
  'Florida': { deadline: '29 days before election', sameDay: false },
  'Georgia': { deadline: '29 days before election', sameDay: false },
  'Hawaii': { deadline: '10 days before election', sameDay: true },
  'Idaho': { deadline: 'Election Day registration available', sameDay: true },
  'Illinois': { deadline: '28 days before election', sameDay: true },
  'Indiana': { deadline: '29 days before election', sameDay: false },
  'Iowa': { deadline: '15 days before election', sameDay: true },
  'Kansas': { deadline: '21 days before election', sameDay: false },
  'Kentucky': { deadline: '29 days before election', sameDay: false },
  'Louisiana': { deadline: '30 days before election', sameDay: false },
  'Maine': { deadline: 'Election Day registration available', sameDay: true },
  'Maryland': { deadline: '21 days before election', sameDay: true },
  'Massachusetts': { deadline: '10 days before election', sameDay: true },
  'Michigan': { deadline: '15 days before election', sameDay: true },
  'Minnesota': { deadline: 'Election Day registration available', sameDay: true },
  'Mississippi': { deadline: '30 days before election', sameDay: false },
  'Missouri': { deadline: '27 days before election', sameDay: false },
  'Montana': { deadline: 'Election Day registration available', sameDay: true },
  'Nebraska': { deadline: '18 days before election', sameDay: false },
  'Nevada': { deadline: '5 days before election', sameDay: true },
  'New Hampshire': { deadline: 'Election Day registration available', sameDay: true },
  'New Jersey': { deadline: '21 days before election', sameDay: false },
  'New Mexico': { deadline: '28 days before election', sameDay: false },
  'New York': { deadline: '25 days before election', sameDay: false },
  'North Carolina': { deadline: '25 days before election', sameDay: true },
  'North Dakota': { deadline: 'No registration required!', sameDay: false },
  'Ohio': { deadline: '30 days before election', sameDay: false },
  'Oklahoma': { deadline: '25 days before election', sameDay: false },
  'Oregon': { deadline: '21 days before election', sameDay: true },
  'Pennsylvania': { deadline: '15 days before election', sameDay: false },
  'Rhode Island': { deadline: '30 days before election', sameDay: false },
  'South Carolina': { deadline: '30 days before election', sameDay: false },
  'South Dakota': { deadline: '15 days before election', sameDay: false },
  'Tennessee': { deadline: '30 days before election', sameDay: false },
  'Texas': { deadline: '30 days before election', sameDay: false },
  'Utah': { deadline: '11 days before election', sameDay: true },
  'Vermont': { deadline: 'Election Day registration available', sameDay: true },
  'Virginia': { deadline: '22 days before election', sameDay: false },
  'Washington': { deadline: '8 days before election', sameDay: true },
  'West Virginia': { deadline: '21 days before election', sameDay: false },
  'Wisconsin': { deadline: 'Election Day registration available', sameDay: true },
  'Wyoming': { deadline: '14 days before election', sameDay: false },
};

// ── Pure Utility Functions (also exported for testing) ───────────────────────

/**
 * Returns the registration deadline data for a given US state.
 * @param {string} state - Full state name (e.g. 'California')
 * @returns {{ deadline: string, sameDay: boolean } | null}
 */
function getStateData(state) {
  if (!state || typeof state !== 'string') return null;
  return STATE_DEADLINES[state] || null;
}

/**
 * Sanitizes user input by stripping HTML tags and truncating to maxLength.
 * @param {string} input - Raw user input
 * @param {number} [maxLength=500] - Maximum character length
 * @returns {string} Sanitized string
 */
function sanitizeInput(input, maxLength = 500) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .slice(0, maxLength)
    .trim();
}

/**
 * Returns the 0-based index of a phase name in the PHASES array.
 * @param {string} phase - Phase name (case-insensitive)
 * @returns {number} Index, or -1 if not found
 */
function getPhaseIndex(phase) {
  return PHASES.indexOf(phase.toLowerCase());
}

/**
 * Returns the name of the next phase after currentPhase, or null if last.
 * @param {string} currentPhase - Current phase name
 * @returns {string | null} Next phase name or null
 */
function getNextPhase(currentPhase) {
  const idx = getPhaseIndex(currentPhase);
  if (idx === -1 || idx === PHASES.length - 1) return null;
  return PHASES[idx + 1];
}

// ── Scroll Progress Bar ──────────────────────────────────────────────────────

/**
 * Initializes the fixed reading-progress bar at the top of the page.
 * @returns {void}
 */
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

// ── Scroll Reveal (IntersectionObserver) ─────────────────────────────────────

/**
 * Observes `.reveal` elements and adds `.visible` when they enter the viewport.
 * Respects `prefers-reduced-motion` by skipping the observer and showing all immediately.
 * @returns {void}
 */
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

          // Track phase views in GA4
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

// ── Tooltip Accessibility ────────────────────────────────────────────────────

/**
 * Wires up all `.jargon` buttons to toggle `aria-expanded` for keyboard-accessible tooltips.
 * @returns {void}
 */
function initTooltips() {
  const jargonBtns = document.querySelectorAll('.jargon');

  jargonBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      // Close all others first
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

// ── Dark / Light Theme Toggle ────────────────────────────────────────────────

/**
 * Initializes the dark/light mode toggle, persisting preference to localStorage.
 * @returns {void}
 */
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

// ── State Deadline Selector ──────────────────────────────────────────────────

/**
 * Populates the state <select> and wires up the change event to display deadline info.
 * @returns {void}
 */
function initStateSelector() {
  const select = document.getElementById('state-select');
  const infoBox = document.getElementById('state-info');
  if (!select || !infoBox) return;

  // Populate options
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

    const sameDayNote = data.sameDay ? ' ✓ Same-day registration available!' : '';
    infoBox.textContent = `📋 ${state}: ${data.deadline}.${sameDayNote}`;

    // Track in GA4
    if (typeof gtag !== 'undefined') {
      gtag('event', 'state_selected', { event_label: state });
    }
  });
}

// ── Gemini AI Chat ───────────────────────────────────────────────────────────

/** @type {Array<{role: string, text: string}>} In-memory chat history */
let chatHistory = [];

/**
 * Appends a message bubble to the chat log.
 * @param {string} text - Message text
 * @param {'user'|'ai'|'loading'} role - Message sender role
 * @returns {HTMLElement} The created message element
 */
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

/**
 * Sends a user message to the /api/chat endpoint and renders the response.
 * @param {string} text - Sanitized user message
 * @returns {Promise<void>}
 */
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

    // Persist to sessionStorage
    try {
      sessionStorage.setItem('voterpath_chat_history', JSON.stringify(chatHistory));
    } catch (_) { /* storage full — silent fail */ }

    // Track in GA4
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

/**
 * Initializes the full chat interface: FAB, panel open/close, send button, Enter key.
 * @returns {void}
 */
function initChat() {
  const fab = document.getElementById('chat-fab');
  const panel = document.getElementById('chat-panel');
  const closeBtn = document.getElementById('close-chat');
  const sendBtn = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');
  const openHero = document.getElementById('open-chat-hero');
  const openCta = document.getElementById('open-chat-cta');

  if (!fab || !panel) return;

  /** @returns {void} */
  function openChat() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    input && input.focus();
    if (typeof gtag !== 'undefined') gtag('event', 'chat_opened');

    // Restore session history
    try {
      const saved = sessionStorage.getItem('voterpath_chat_history');
      if (saved) chatHistory = JSON.parse(saved);
    } catch (_) { /* corrupt storage — silent fail */ }
  }

  /** @returns {void} */
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

  // Close on Escape key
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeChat();
  });
}

// ── Smooth Scroll — Hero CTA ─────────────────────────────────────────────────

/**
 * Wires the "Begin the Journey" hero button to scroll to Phase 1.
 * @returns {void}
 */
function initHeroScroll() {
  const btn = document.getElementById('start-journey');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const target = document.getElementById('phase-1');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
}

// ── Initialise All ───────────────────────────────────────────────────────────

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

// ── Expose utilities for unit tests (Node.js context) ───────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStateData, sanitizeInput, getPhaseIndex, getNextPhase };
}
