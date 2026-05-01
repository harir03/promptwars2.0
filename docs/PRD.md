# PRD.md — Product Requirements Document
## VoterPath: Interactive Election Assistant
**Version:** 1.0 | **Competition:** Google PromptWars | **Status:** Active

---

## 1. Problem Statement

68% of non-voters cite confusion about the process as a primary barrier. Election information is scattered across dense government sites with no unified, engaging guide. There is no single premium interactive resource that walks any citizen through the full journey: registration → research → voting → results.

---

## 2. Solution

VoterPath is a scroll-driven, AI-powered civic education web app featuring:
1. **Scrollytelling Timeline** — 4-phase election journey, animated on scroll
2. **Gemini AI Chatbot** — non-partisan Q&A, strictly limited to election topics
3. **Jargon Tooltips** — instant in-context definitions for confusing terms
4. **State Deadline Selector** — personalized registration deadlines for all 50 states
5. **Progress Bar** — visual reading progress indicator

---

## 3. User Personas

| Persona | Age | Need |
|---|---|---|
| First-Time Voter | 18–24 | Simple, fast, mobile-friendly answers |
| Returning Voter | 25–55 | Deadline reminders, process refreshers |
| Civic Educator | Any | Shareable reference tool for classrooms |

---

## 4. User Stories & Acceptance Criteria

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-01 | See the full election journey | Timeline shows 4 phases, all visible on scroll |
| US-02 | Ask a question in plain English | Gemini responds within 5s, non-partisan |
| US-03 | Understand election jargon | Hover/focus on underlined terms shows tooltip |
| US-04 | Know my state's registration deadline | State selector returns correct deadline info |
| US-05 | Use on mobile | Responsive at 320px–2560px |
| US-06 | Navigate by keyboard | All elements Tab-accessible, focus ring visible |
| US-07 | Use with a screen reader | aria-live regions announce chat responses |

---

## 5. Functional Requirements

### Must Have (MVP)
- FR-01: 4-phase scrollytelling timeline
- FR-02: Scroll-triggered IntersectionObserver animations
- FR-03: Fixed progress bar (scroll progress)
- FR-04: Gemini API chatbot via `/api/chat` backend proxy
- FR-05: Chat session history (sessionStorage)
- FR-06: Jargon tooltips (keyboard + mouse accessible)
- FR-07: State deadline selector (all 50 states)
- FR-08: Dark/light mode toggle
- FR-09: Google Analytics 4 event tracking
- FR-10: `/health` endpoint returning JSON status

### Should Have
- FR-11: "Skip to main content" accessibility link
- FR-12: Reduced-motion fallback for all animations
- FR-13: Mobile-optimized timeline layout

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | LCP < 2.5s, CLS < 0.1 |
| Accessibility | WCAG 2.1 AA compliant |
| Security | No API keys on client; CSP headers; sanitized inputs |
| Testing | ≥ 10 unit tests, 0 failures |
| Deployment | Runs on Google Cloud Run via Dockerfile |

---

## 7. Out of Scope (v1)
- User accounts or login
- Real-time ballot tracking
- Multi-language support
- Native mobile app

---

## 8. Success Metrics

| Metric | Target |
|---|---|
| PromptWars rank | Top 50 |
| Lighthouse Accessibility | ≥ 95 |
| Lighthouse Performance | ≥ 90 |
| Unit test pass rate | 100% |
| ESLint errors | 0 |
