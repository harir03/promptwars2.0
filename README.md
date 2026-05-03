# VoterPath: Interactive Election Assistant

> **Demystifying democracy, one step at a time.**

VoterPath is a scroll-driven, AI-powered civic education web app that guides users through the entire US election process — from voter registration to inauguration. Built for the **Google PromptWars Hackathon**, it features a non-partisan Gemini AI chatbot, accessible design, and a premium glassmorphism UI.

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Scrollytelling Timeline** | Interactive 4-phase election journey animated on scroll |
| **Gemini AI Chatbot** | Powered by Google's `gemini-2.5-flash` for non-partisan, accurate civic Q&A |
| **Jargon Tooltips** | Instant, accessible definitions for confusing election terms |
| **State Deadline Selector** | Check voter registration deadlines across all 50 US states |
| **Dark/Light Theme** | Toggle with localStorage persistence |
| **Fully Accessible** | WCAG 2.1 AA compliant, keyboard navigable, screen-reader friendly |
| **Privacy First** | Chat history stored only in browser `sessionStorage` |

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML, CSS (Custom Properties, Glassmorphism), JavaScript |
| **Backend** | Node.js 18+ with Express (server-side Gemini proxy) |
| **AI** | Google Gemini API (`@google/generative-ai`, model: `gemini-2.5-flash`) |
| **Analytics** | Google Analytics 4 (GA4) with privacy-preserving `anonymize_ip` |
| **Cloud** | Google Cloud Run, Cloud Build, Cloud Logging, Cloud Error Reporting, Secret Manager |
| **Fonts** | Google Fonts (Outfit: 300, 400, 600, 800) |
| **Deployment** | Google Cloud Run (primary), Render, Vercel |
| **CI/CD** | Google Cloud Build (`cloudbuild.yaml`) |
| **Testing** | Node.js built-in `assert` module (50+ unit tests) |
| **Containerization** | Multi-stage Dockerfile with non-root user |

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18.0.0
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/voterpath.git
cd voterpath
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run the Server

```bash
npm run dev
```

The app will be available at [http://localhost:8080](http://localhost:8080).

### 4. Run Tests

```bash
npm test
```

Expected output: 100+ passing tests covering state logic, input sanitization, phase navigation, security hardening, Google Cloud integration, and server endpoints.

### 5. Lint

```bash
npm run lint
```

Zero-warning ESLint policy enforced.

## 🐳 Deployment

### Google Cloud Run (Recommended)

The repository includes a production-grade multi-stage `Dockerfile` with:
- Non-root user for security
- Health check endpoint at `/health`
- Minimal image size via `node:18-alpine`

**Deploy with Secret Manager (recommended):**

```bash
# 1. Store API key in Google Secret Manager
gcloud secrets create gemini-api-key --replication-policy="automatic"
echo -n "YOUR_KEY" | gcloud secrets versions add gemini-api-key --data-file=-

# 2. Deploy with Secret Manager integration
gcloud run deploy voterpath \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

**Or deploy with direct env vars:**

```bash
gcloud run deploy voterpath \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key_here
```

### Google Cloud Build (CI/CD)

The `cloudbuild.yaml` automates the full pipeline:
1. `npm ci` → `npm run lint` → `npm test`
2. Build Docker image → Push to Google Container Registry
3. Deploy to Cloud Run with Secret Manager

```bash
gcloud builds submit --config cloudbuild.yaml
```

### Render

The repository includes a `render.yaml` blueprint:
1. Connect your GitHub repository to Render
2. Render auto-detects the blueprint and deploys as a Web Service
3. Set `GEMINI_API_KEY` in the Render dashboard environment variables

### Vercel

The repository includes a `vercel.json` configuration:
1. Connect your repository to Vercel
2. Add `GEMINI_API_KEY` to project environment variables

## 🔒 Security

| Measure | Implementation |
|---------|---------------|
| **API Key Protection** | Server-side proxy — frontend never sees the Gemini API key |
| **Content Security Policy** | Strict CSP: no `'unsafe-inline'` on `script-src`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` |
| **HSTS** | `Strict-Transport-Security` with 1-year `max-age`, `includeSubDomains`, and `preload` |
| **Cross-Origin Isolation** | `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin` |
| **Rate Limiting** | 50 requests per 15 minutes per IP on `/api/chat` with periodic memory cleanup |
| **Input Sanitization** | XSS prevention: HTML stripping, protocol blocking, event handler removal, length limits |
| **Input Validation** | Message type/length checks, history array validation, 10 KB body limit |
| **CORS** | Whitelist-only origins; headers sent only for matching origins with `Vary: Origin` |
| **Permissions Policy** | Camera, microphone, geolocation, payment, and USB disabled |
| **Server Fingerprinting** | `X-Powered-By` disabled; no server version leakage |
| **Cache Control** | API responses set `Cache-Control: no-store` to prevent sensitive data caching |
| **Non-Root Container** | Dockerfile runs as unprivileged `voterpath` user with read-only app files |

## ☁️ Google Cloud Integration

VoterPath integrates **8 Google services** for a production-grade experience:

| # | Google Service | Usage | Location |
|---|---------------|-------|----------|
| 1 | **Google Gemini API** | AI-powered non-partisan civic education chatbot (`gemini-2.5-flash`) | `server.js` — `/api/chat` endpoint |
| 2 | **Google Cloud Run** | Containerized serverless deployment with auto-scaling | `Dockerfile`, `cloudbuild.yaml` |
| 3 | **Google Cloud Build** | CI/CD pipeline: lint → test → build → deploy | `cloudbuild.yaml` |
| 4 | **Google Cloud Logging** | Structured JSON logs auto-ingested by Cloud Logging | `server.js` — `cloudLog()` |
| 5 | **Google Cloud Error Reporting** | Automatic error capture in Error Reporting format | `server.js` — `reportError()` |
| 6 | **Google Cloud Secret Manager** | Secure API key management via `--set-secrets` | `server.js` — `getGeminiApiKey()`, `cloudbuild.yaml` |
| 7 | **Google Analytics 4** | Privacy-preserving analytics with `anonymize_ip` | `public/ga.js`, `public/index.html` |
| 8 | **Google Fonts** | Outfit typeface (300, 400, 600, 800 weights) | `public/index.html`, `public/styles.css` |

## ♿ Accessibility (WCAG 2.1 AA)

- Skip-to-main navigation link
- Full keyboard navigation with visible `:focus-visible` outlines
- All interactive elements have ARIA labels
- `aria-live="polite"` for dynamic chat responses
- Color contrast ratio ≥ 4.5:1 for all text
- `prefers-reduced-motion` disables all animations
- Semantic HTML5 elements throughout
- All tooltips use `role="tooltip"` with `aria-describedby`

## 📁 Project Structure

```
voterpath/
├── public/                    # Static frontend
│   ├── index.html             # Semantic HTML with ARIA + JSON-LD
│   ├── styles.css             # Design system (CSS Custom Properties)
│   ├── script.js              # Client interactivity + Gemini chat
│   └── ga.js                  # Google Analytics 4 (external for strict CSP)
├── tests/
│   ├── unit.test.js           # 60+ unit tests (logic, security, GCP)
│   └── server.test.js         # 50+ server integration tests (HTTP)
├── docs/
│   ├── RULES.md               # Project rules & constraints
│   ├── IMPLEMENTATION_PLAN.md # Build phases & acceptance criteria
│   └── PRD.md                 # Product requirements
├── server.js                  # Express backend (Gemini proxy + security)
├── cloudbuild.yaml            # Google Cloud Build CI/CD pipeline
├── Dockerfile                 # Multi-stage production build
├── render.yaml                # Render deployment blueprint
├── vercel.json                # Vercel serverless configuration
├── eslint.config.js           # ESLint flat config (zero-warning)
├── .editorconfig              # Consistent formatting across editors
├── package.json               # Dependencies & scripts
└── .env                       # Environment variables (never committed)
```

## 📄 License

MIT — Free forever. Built for democracy.

---

*Created for the Google PromptWars Hackathon.*
