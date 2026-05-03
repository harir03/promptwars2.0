# RULES.md
## Persistent Rules for AI Builder
### VoterPath — Interactive Election Assistant (Google PromptWars)

**This file must be loaded at the start of every coding session.**
These rules apply to every file in this project without exception.

---

## 1. What This Project Is

A premium interactive web application that guides users through the Indian election process.
It uses the **Google Gemini API** for AI-powered Q&A and is deployed on **Google Cloud Run**.

The project structure is:
```
prompt wars/
├── docs/                   # All planning documents
├── public/                 # Static frontend (index.html, styles.css, script.js)
├── tests/                  # Unit test suite
├── server.js               # Express backend (Gemini proxy + static serving)
├── package.json
├── Dockerfile
└── .env                    # Never committed
```

---

## 2. Hard Constraints — Never Violate These

**Stack is non-negotiable:**
- Frontend: Vanilla HTML, CSS, JavaScript (no React, no Vue, no Svelte)
- Backend: Node.js + Express (for Gemini proxy)
- AI: Google Gemini API only (`@google/generative-ai`)
- Deployment: Google Cloud Run / Render / Vercel
- Automation: agent-browser CLI (for E2E testing and scraping)

**API key is never in the frontend.**
- `GEMINI_API_KEY` is always loaded from `process.env` on the server
- The frontend calls `/api/chat` — it never calls Gemini directly
- Never hardcode any key anywhere

**Gemini model is always `gemini-1.5-flash`.**

**The AI assistant is strictly non-partisan.**
- The system prompt must never allow discussion of candidates, parties, or policy opinions
- See `docs/PROMPTS_SPEC.md` for the exact system prompt

---

## 3. Code Style

**Language:** JavaScript ES2022+ (Node.js 18+)
**Style:** 2-space indentation. Single quotes.
**JSDoc:** Required on ALL functions — one-line description + `@param` + `@returns`
**Max line length:** 100 characters
**No `var`:** Always use `const` or `let`

**Error handling:** Never use bare `catch(e)`. Always log and return meaningful HTTP response.

---

## 4. File Responsibilities

| File | Responsibility | Must Never |
|---|---|---|
| `server.js` | Express server, Gemini proxy, security headers | Contain UI logic |
| `public/index.html` | Semantic HTML structure only | Contain inline JS logic |
| `public/styles.css` | All visual styles | Contain JS |
| `public/script.js` | All browser interactivity | Call Gemini directly |
| `tests/unit.test.js` | Unit tests for pure JS functions | Import server modules |
| `docs/*.md` | Planning documents | Become stale |

---

## 5. PromptWars Scoring Axes (Target: Top 50)

| Axis | What the Evaluator Checks | Our Strategy |
|---|---|---|
| **Code Quality** | Clean code, JSDoc, no lint errors | ESLint zero-warning policy, JSDoc on all functions |
| **Security** | CSP headers, no exposed keys, sanitized inputs | Server-side API proxy, CSP headers, `noopener noreferrer` |
| **Efficiency** | Fast load, no bloat, font-display swap | Preconnect hints, minimal dependencies |
| **Testing** | Test files present, coverage of core logic | `tests/unit.test.js` with 10+ tests |
| **Accessibility** | WCAG 2.1 AA, keyboard nav, ARIA, contrast | Full a11y checklist in IMPLEMENTATION_PLAN.md |
| **Google Services** | Gemini API, Google Analytics, Cloud Run | Gemini chatbot + GA4 + Cloud Run Dockerfile |

---

## 6. Accessibility Non-Negotiables (WCAG 2.1 AA)

- Skip-to-main link as first element in `<body>`
- All interactive elements have `:focus-visible` outline (never `outline: none` globally)
- Color contrast: 4.5:1 ratio minimum for all text
- All tooltips: `role="tooltip"` and `aria-describedby`
- Chat response area: `aria-live="polite"`
- `prefers-reduced-motion` disables all animations
- All images have `alt` attributes

---

## 7. Submission Checklist

- [ ] `node server.js` runs without errors
- [ ] Gemini chatbot responds correctly
- [ ] `node tests/unit.test.js` shows 0 failures
- [ ] Lighthouse Accessibility ≥ 95
- [ ] Lighthouse Performance ≥ 90
- [ ] No ESLint errors
- [ ] `Dockerfile` builds successfully
- [ ] App deployed live on Cloud Run URL
- [ ] `GEMINI_API_KEY` set in Cloud Run env vars
- [ ] `.env` NOT committed
- [ ] `README.md` has setup + live URL
- [ ] All external links have `rel="noopener noreferrer"`

---

## 8. Browser Automation & Testing

Whenever the project requires web automation, scraping, or complex E2E testing (e.g., verifying registration links, checking live election deadlines, or visual regression), the **`agent-browser`** CLI tool must be used.

**Automation Rules:**
- **Mode:** Use `--headed` for manual verification/debugging and headless (default) for CI/automation.
- **Workflow:** Always follow the `open` -> `snapshot` -> `action` pattern.
- **Selectors:** Prioritize `refs` (@e1, @e2) from the accessibility snapshot over brittle CSS selectors.
- **Screenshots:** Capture screenshots (`agent-browser screenshot`) for any automated verification failures.

---

## 9. Karpathy Guidelines (Think Before Coding)

To reduce common LLM coding mistakes, follow these principles derived from Andrej Karpathy:

1. **Think Before Coding**: State assumptions explicitly. Surface tradeoffs. Ask if confused.
2. **Simplicity First**: Minimum code that solves the problem. No speculative abstractions.
3. **Surgical Changes**: Touch only what you must. Match existing style. No "drive-by" refactoring.
4. **Goal-Driven Execution**: Define verifiable success criteria (Plan -> Step -> Verify).

---

## 10. gstack Builder Ethos

Follow these principles to move at 100x speed with AI:

- **Boil the Lake**: The marginal cost of completeness is near-zero. Do the complete implementation (100% test coverage, all edge cases) every time.
- **Search Before Building**: Know what exists (Standard patterns, Best practices) before deciding to build from scratch. The cost of checking is zero.
- **User Sovereignty**: AI recommends, you decide. Great AI products augment the user, not replace them. Always ask before making major architectural pivots.
- **Build for Yourself**: Solve your own problems. Specificity beats generality.

---

## 11. The Workflow Loop

Execute every feature following this structured loop:

1. **Think**: Refame the product. Ask the "forcing questions." Design doc first.
2. **Plan**: Separate the "CEO Review" (Scope) from the "Eng Review" (Architecture).
3. **Build**: Surgical, simple implementation based on the approved plan.
4. **Review**: Find bugs that pass CI. Auto-fix the obvious.
5. **QA**: Use **`agent-browser`** to test the live staging/production URL.
6. **Ship**: Sync, run tests, audit coverage, and update documentation.
7. **Reflect**: Periodic retrospective on shipping streaks and growth.
