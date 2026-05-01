# VoterPath: Interactive Election Assistant

VoterPath is a scroll-driven, AI-powered civic education web app designed to demystify the US election process. Built for the Google PromptWars Hackathon, it guides users through the election journey—from registration to results—and features a non-partisan Gemini AI chatbot to answer civic questions.

## Features

- **Scrollytelling Timeline:** Interactive 4-phase election journey animated on scroll.
- **Gemini AI Chatbot:** Powered by Google's `gemini-2.5-flash` for non-partisan, accurate civic Q&A.
- **Jargon Tooltips:** Instant, in-context definitions for confusing election terms.
- **State Deadline Selector:** Check voter registration deadlines across all 50 US states.
- **Accessible & Responsive:** Fully WCAG 2.1 AA compliant, keyboard navigable, screen-reader friendly (ARIA), with dark mode and reduced-motion support.
- **Privacy First:** Chat session history is stored only in your browser (`sessionStorage`).

## Tech Stack

- **Frontend:** Vanilla HTML, CSS (Custom Properties, Glassmorphism), and JavaScript.
- **Backend:** Node.js + Express (Server-side Gemini proxy to protect API keys).
- **AI Integration:** Google Gemini API (`@google/generative-ai`).
- **Deployment:** Vercel (Frontend/Serverless API) and Render (Web Service).

## Local Development Setup

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your environment variables:**
   Create a `.env` file in the root directory and add your Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(You can get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey))*

3. **Run the server:**
   ```bash
   npm run dev
   ```
   The app will be available at [http://localhost:8080](http://localhost:8080).

4. **Run the tests:**
   The project includes a suite of unit tests covering state logic, input sanitization, and phase navigation.
   ```bash
   npm test
   ```

## Deployment Options

VoterPath is configured to be deployed easily to modern cloud platforms:

### 1. Deploying to Render (Recommended for full Express Server)
The repository includes a `render.yaml` blueprint.
- Connect your GitHub repository to Render.
- Render will automatically detect the blueprint and deploy the application as a Web Service.
- Ensure you set the `GEMINI_API_KEY` in the Render dashboard environment variables.

### 2. Deploying to Vercel (Serverless)
The repository includes a `vercel.json` configuration for serverless deployment.
- Connect your repository to Vercel.
- Vercel will build and deploy the app, routing API requests automatically to `server.js`.
- Add `GEMINI_API_KEY` to your Vercel project environment variables.

### 3. Deploying to Google Cloud Run (Docker)
The repository includes a `Dockerfile`.
```bash
# Build and deploy to Cloud Run
gcloud run deploy voterpath \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key_here
```

## Security & Architecture Notes
- **API Proxy:** The frontend never communicates directly with the Gemini API. All requests go through the `/api/chat` endpoint on the Express server, ensuring the `GEMINI_API_KEY` remains secure.
- **CORS & CSP:** The server implements strict Content Security Policy (CSP) headers and handles CORS for flexible deployment architectures.
- **Sanitization:** All user inputs are sanitized on the frontend and validated on the backend to prevent injection or abuse.

---
*Created for the Google PromptWars Hackathon.*
