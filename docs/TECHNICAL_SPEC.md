# TECHNICAL_SPEC.md
## VoterPath — Technical Architecture Specification
**Version:** 1.0 | **Stack:** Node.js 18+, Express, Vanilla JS, Google Gemini API, Cloud Run

---

## 1. Complete File Structure

```
prompt wars/
├── docs/
│   ├── PRD.md
│   ├── TECHNICAL_SPEC.md
│   ├── PROMPTS_SPEC.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── RULES.md
├── public/
│   ├── index.html          # Full semantic HTML with ARIA
│   ├── styles.css          # Premium design system (CSS Variables, glassmorphism)
│   └── script.js           # IntersectionObserver, chat UI, tooltips, state selector
├── tests/
│   └── unit.test.js        # 10+ unit tests (no framework, pure Node)
├── server.js               # Express app: Gemini proxy + static serving + security headers
├── package.json            # Dependencies + test/lint scripts
├── Dockerfile              # For Google Cloud Run deployment
├── .env                    # GEMINI_API_KEY (never committed)
├── .gitignore
└── README.md
```

---

## 2. Tech Stack

```
# package.json dependencies
@google/generative-ai  ^0.21.0   # Official Google Gemini SDK
express                ^4.19.2   # HTTP server + routing
dotenv                 ^16.4.5   # Load .env variables

# devDependencies
eslint                 ^9.0.0    # Zero-warning linting policy
```

**Gemini model:** `gemini-2.5-flash`
**Temperature:** `0.3` (slight creativity for natural language, still deterministic)
**Max output tokens:** `512` per chat response

---

## 3. Backend API Specification (`server.js`)

### `GET /health`
```json
Response 200: { "status": "ok", "service": "voterpath", "timestamp": "ISO string" }
```

### `POST /api/chat`
```
Request body:
{
  "message": string,        // Max 1000 chars, required
  "history": [              // Prior turns, max 10 used
    { "role": "user"|"model", "text": string }
  ]
}

Response 200: { "reply": string }
Response 400: { "error": "Invalid request: message is required." }
Response 502: { "error": "Failed to reach AI service. Please try again." }
Response 503: { "error": "AI service is not available." }
```

### Security Middleware (applied to all routes)
```
Content-Security-Policy:
  default-src 'self'
  script-src 'self' https://www.googletagmanager.com 'unsafe-inline'
  style-src 'self' https://fonts.googleapis.com 'unsafe-inline'
  font-src 'self' https://fonts.gstatic.com
  connect-src 'self' https://www.google-analytics.com
  img-src 'self' data: https:
  frame-ancestors 'none'

X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 4. Frontend Module Specification (`public/script.js`)

### Functions (all must have JSDoc)

| Function | Input | Output | Description |
|---|---|---|---|
| `initProgressBar()` | — | void | Binds scroll → width% on `#progress-bar` |
| `initScrollReveal()` | — | void | IntersectionObserver on `.reveal` elements |
| `initTooltips()` | — | void | Toggle `aria-expanded` on `.jargon` buttons |
| `initThemeToggle()` | — | void | Toggle `data-theme` on `<html>`, persist to localStorage |
| `initStateSelector()` | — | void | Populate `<select>`, render deadline on change |
| `getStateData(state)` | string | Object\|null | Pure lookup from STATE_DEADLINES constant |
| `initChat()` | — | void | Wire up FAB, panel open/close, send message |
| `sendMessage(text)` | string | Promise\<void\> | POST to `/api/chat`, render response |
| `appendMessage(text, role)` | string, string | void | Add message bubble to chat log |
| `sanitizeInput(input)` | string | string | Strip HTML tags, truncate to 500 chars |

### State Data Constant
```js
const STATE_DEADLINES = {
  'Alabama':    { deadline: '15 days before election', sameDay: false },
  'Alaska':     { deadline: '30 days before election', sameDay: false },
  // ... all 50 states
  'Wyoming':    { deadline: '14 days before election', sameDay: false },
};
```

### Chat Session Storage
```js
// Persisted in sessionStorage (clears on tab close)
sessionStorage.setItem('voterpath_chat_history', JSON.stringify(history));
```

---

## 5. Google Services Integration

| Service | How Used | File |
|---|---|---|
| **Gemini API** | AI chatbot Q&A via `@google/generative-ai` SDK | `server.js` |
| **Google Analytics 4** | Page views + chat events tracked | `public/index.html` |
| **Cloud Run** | Production deployment target | `Dockerfile` |

### GA4 Events Tracked
```js
gtag('event', 'chat_message_sent', { event_category: 'engagement' });
gtag('event', 'phase_viewed', { event_label: 'phase-1' });
gtag('event', 'state_selected', { event_label: 'California' });
```

---

## 6. Dockerfile (Cloud Run)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

---

## 7. Accessibility Specification

| WCAG Criterion | Implementation |
|---|---|
| 1.4.3 Contrast | All text ≥ 4.5:1 contrast ratio verified |
| 2.1.1 Keyboard | All interactive elements keyboard-accessible |
| 2.4.1 Bypass Blocks | Skip-to-main link as first `<body>` child |
| 2.4.7 Focus Visible | `:focus-visible` on all interactive elements |
| 4.1.3 Status Messages | `aria-live="polite"` on chat message container |
| 1.3.1 Info & Relationships | `aria-labelledby` on all `<article>` sections |

---

## 8. Error Handling

| Error | Behaviour |
|---|---|
| Gemini API unreachable | Return 502, show friendly error in chat UI |
| `GEMINI_API_KEY` not set | Return 503, log error server-side |
| Message > 1000 chars | Return 400 immediately, no API call |
| Message contains HTML | `sanitizeInput()` strips it before sending |
| State not in lookup | Show "State not found" message in `#state-info` |
