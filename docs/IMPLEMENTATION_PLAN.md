# IMPLEMENTATION_PLAN.md
## VoterPath — Phased Implementation Plan
**Target:** Google PromptWars Top 50 | **Axes:** Code Quality, Security, Efficiency, Testing, Accessibility, Google Services

---

## Overview

Each phase has clear acceptance criteria. **Do not proceed to the next phase until all criteria pass.**

```
Phase 1 → Foundation (docs + scaffold)       ✅ COMPLETE
Phase 2 → Core Frontend                      ✅ COMPLETE
Phase 3 → Gemini Chatbot (Google Services)   ✅ COMPLETE
Phase 4 → Testing + Accessibility Audit      ✅ COMPLETE
Phase 5 → Performance + Security Hardening   ✅ COMPLETE
Phase 6 → Deployment (Vercel/Render/Cloud Run) ✅ COMPLETE
```

---

## Phase 1: Foundation ✅

**Goal:** Project scaffold, all docs, package.json, server skeleton.

**Deliverables:**
- [x] `docs/PRD.md`
- [x] `docs/TECHNICAL_SPEC.md`
- [x] `docs/PROMPTS_SPEC.md`
- [x] `docs/IMPLEMENTATION_PLAN.md`
- [x] `docs/RULES.md`
- [x] `package.json` with test + lint scripts
- [x] `server.js` skeleton with security headers
- [x] `.gitignore` (includes `.env`, `node_modules/`)

**Acceptance Criteria:**
- [x] `node server.js` starts without errors on port 8080
- [x] `GET /health` returns `{ status: "ok" }`
- [x] All 5 docs exist and are scoped to VoterPath (not template/example)

---

## Phase 2: Core Frontend ✅

**Goal:** Premium scrollytelling timeline, tooltips, state selector, dark mode.

**Deliverables:**
- [x] `public/index.html` — semantic HTML, ARIA, skip link, GA4
- [x] `public/styles.css` — design system, CSS variables, glassmorphism, responsive
- [x] `public/script.js` — IntersectionObserver, progress bar, tooltips, state selector, dark mode

**Acceptance Criteria:**
- [x] 4 timeline phases animate in on scroll
- [x] Progress bar fills as user scrolls
- [x] Hovering/focusing `.jargon` buttons shows tooltip
- [x] State selector populates and shows deadline info
- [x] Dark/light toggle works and persists to localStorage
- [x] Layout works at 320px, 768px, and 1440px
- [x] `prefers-reduced-motion` disables all animations

---

## Phase 3: Gemini Chatbot 🔄

**Goal:** Working AI assistant via Gemini API backend proxy.

**Deliverables:**
- [ ] `server.js` — complete `/api/chat` endpoint with Gemini SDK
- [ ] `public/script.js` — `sendMessage()`, `appendMessage()`, FAB toggle
- [ ] `.env` — `GEMINI_API_KEY` set locally

**Acceptance Criteria:**
- [ ] Clicking chat FAB opens panel smoothly
- [ ] Typing a question and pressing Enter/Send calls `/api/chat`
- [ ] Response appears in the chat panel within 5 seconds
- [ ] Off-topic questions get the redirect message (not an error)
- [ ] Chat history persists within the session (sessionStorage)
- [ ] `aria-live="polite"` causes screen readers to announce new messages
- [ ] Error state shown if network fails ("Unable to connect…")

**GA4 Events to track:**
```js
gtag('event', 'chat_opened');
gtag('event', 'chat_message_sent', { message_length: text.length });
```

---

## Phase 4: Testing + Accessibility Audit ⏳

**Goal:** 10+ passing unit tests. Zero WCAG 2.1 AA violations.

**Deliverables:**
- [ ] `tests/unit.test.js` — expanded to 10+ tests
- [ ] Accessibility audit checklist (manual + automated)

**Unit Tests Required:**

| Test | Function | Expected |
|---|---|---|
| State lookup — valid state | `getStateData('Texas')` | Returns object with `deadline` |
| State lookup — unknown state | `getStateData('Narnia')` | Returns null |
| State lookup — empty string | `getStateData('')` | Returns null |
| State lookup — North Dakota | `getStateData('North Dakota')` | Includes 'No registration' |
| Sanitize — strips HTML | `sanitizeInput('<b>Hi</b>')` | Returns 'Hi' |
| Sanitize — blocks JS protocol | `sanitizeInput('javascript:')` | Removes 'javascript:' |
| Sanitize — truncates | `sanitizeInput('a'.repeat(600), 500)` | Length === 500 |
| Sanitize — null input | `sanitizeInput(null)` | Returns '' |
| Phase index — valid | `getPhaseIndex('registration')` | Returns 0 |
| Phase index — unknown | `getPhaseIndex('xyz')` | Returns -1 |
| Next phase — middle | `getNextPhase('research')` | Returns 'voting' |
| Next phase — last | `getNextPhase('results')` | Returns null |

**Acceptance Criteria:**
- [ ] `node tests/unit.test.js` shows 0 failures
- [ ] All 12 tests above exist and pass

**Accessibility Checklist (Manual):**
- [ ] Tab through entire page — every interactive element is reachable
- [ ] Focus ring visible on every element (not hidden by CSS)
- [ ] Skip link appears on first Tab press
- [ ] Tooltip content readable with keyboard (focus shows tooltip)
- [ ] Screen reader announces chat messages (test with NVDA or VoiceOver)
- [ ] Color contrast passes 4.5:1 for all text (check with WebAIM Contrast Checker)
- [ ] `aria-current="step"` updates as user scrolls through phases

---

## Phase 5: Performance + Security Hardening ⏳

**Goal:** Lighthouse Performance ≥ 90. All security headers verified.

**Performance Checklist:**
- [ ] Google Fonts uses `font-display: swap`
- [ ] HTML has `<link rel="preconnect">` for fonts.googleapis.com and fonts.gstatic.com
- [ ] All `<img>` tags have `width`, `height`, and `loading="lazy"`
- [ ] No render-blocking resources
- [ ] Run Lighthouse and fix any score below 90

**Security Checklist:**
- [ ] CSP header set in `server.js` middleware (not meta tag)
- [ ] All external `<a>` tags have `rel="noopener noreferrer"`
- [ ] `GEMINI_API_KEY` never appears in any committed file
- [ ] Input sanitization applied in `sanitizeInput()` before any API call
- [ ] `/api/chat` rejects messages over 1000 characters with 400 status
- [ ] `X-Frame-Options: DENY` header set
- [ ] `X-Content-Type-Options: nosniff` header set

---

## Phase 6: Deployment to Google Cloud Run ⏳

**Goal:** Live public URL on Cloud Run. Final submission ready.

**Deliverables:**
- [ ] `Dockerfile`
- [ ] `README.md` with setup + deployment instructions + live URL
- [ ] `.gitignore` verified (no `.env`, no `node_modules`)

**Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

**Deployment Commands:**
```bash
# Build and deploy to Cloud Run
gcloud run deploy voterpath \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_KEY
```

**Acceptance Criteria:**
- [ ] `docker build -t voterpath .` succeeds
- [ ] Cloud Run URL is live and accessible publicly
- [ ] Chatbot works on live URL (Gemini key set in Cloud Run env)
- [ ] `README.md` has live URL and setup instructions
- [ ] Final Lighthouse scores: Accessibility ≥ 95, Performance ≥ 90

---

## Scoring Projection

| Axis | Before Improvements | After All Phases |
|---|---|---|
| Code Quality | 5/10 | 9/10 (JSDoc, ESLint, clean structure) |
| Security | 3/10 | 9/10 (CSP, proxy, sanitization) |
| Efficiency | 6/10 | 8/10 (preconnect, font-display) |
| Testing | 0/10 | 9/10 (12+ tests, 0 failures) |
| Accessibility | 4/10 | 9/10 (full WCAG 2.1 AA) |
| Google Services | 0/10 | 10/10 (Gemini + GA4 + Cloud Run) |
| **Total** | **18/60** | **~54/60** |
