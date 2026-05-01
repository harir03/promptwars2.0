/**
 * VoterPath — Express backend server
 * Proxies Gemini API calls so the API key never touches the client.
 * Supports deployment on: Render, Vercel, and Google Cloud Run.
 */

'use strict';

const express = require('express');
const path = require('path');
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 8080;

// ── CORS Middleware (for split Vercel frontend + Render API deploys) ─────────
/**
 * Allows cross-origin requests from allowed frontend origins.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
app.use((req, res, next) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:8080',
    'http://localhost:3000',
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Security Middleware ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com 'unsafe-inline'; " +
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https://www.google-analytics.com https://*.onrender.com; " +
    "img-src 'self' data: https:; " +
    "frame-ancestors 'none';"
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Health Check ────────────────────────────────────────────────────────────
/**
 * GET /health — Returns server status for uptime monitors.
 * @returns {{ status: string, service: string, timestamp: string }}
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'voterpath', timestamp: new Date().toISOString() });
});

// ── Gemini API Proxy ────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `You are VoterPath AI, a helpful, accurate, and strictly non-partisan civic education assistant.

YOUR ONLY PURPOSE is to help users understand the US election process, including:
- Voter registration: steps, eligibility, deadlines, same-day registration
- Types of elections: primaries, general elections, local elections, special elections
- How to research candidates and ballot measures from non-partisan sources
- How to cast a ballot: mail-in, absentee, early voting, and Election Day voting
- What to bring to the polls: valid ID requirements, provisional ballots
- How to find your polling place
- How ballots are counted and certified after election day
- The Electoral College: how it works, the timeline, the role of electors
- Inauguration Day and the transfer of power

STRICT RULES — never violate these:
1. Do NOT express opinions on political parties, candidates, campaigns, or ideologies.
2. Do NOT answer questions unrelated to elections or voting. Politely redirect.
3. If asked about specific candidates, redirect to ballotpedia.org or vote411.org.
4. Keep answers concise: 2-4 sentences for simple questions, up to 6 for complex ones.
5. Use plain, simple language. Avoid jargon unless explaining it.
6. If you do not know something, say so and direct the user to vote.gov.

TONE: Warm, encouraging, trustworthy, clear — like a helpful librarian, not a politician.`;

/**
 * POST /api/chat — Proxies a user message to the Gemini API.
 * @param {string} req.body.message - The user's question (max 1000 chars)
 * @param {Array}  req.body.history - Prior chat turns for context (max 10)
 * @returns {{ reply: string }} JSON with AI response
 */
app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid request: message is required.' });
  }

  if (message.length > 1000) {
    return res.status(400).json({
      error: 'Message too long. Please keep questions under 1000 characters.',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return res.status(503).json({ error: 'AI service is not available.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Map our internal 'ai' role to Gemini's expected 'model' role
    const geminiHistory = history
      .slice(-10)
      .filter((turn) => turn.text && turn.role)
      .map((turn) => ({
        role: turn.role === 'ai' ? 'model' : 'user',
        parts: [{ text: turn.text }],
      }));

    const chat = model.startChat({
      history: geminiHistory,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 512,
      },
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Gemini API error:', err.message);
    return res.status(502).json({
      error: 'Failed to reach AI service. Please try again.',
    });
  }
});

// ── Serve SPA ────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server (skipped when imported by Vercel) ───────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`VoterPath server running on port ${PORT}`);
  });
}

module.exports = app;
