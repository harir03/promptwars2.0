/**
 * VoterPath — Express Backend Server
 *
 * Proxies Gemini API calls so the API key never touches the client.
 * Implements security hardening (CSP, rate limiting, input validation).
 * Supports deployment on: Google Cloud Run, Render, and Vercel.
 *
 * Google Cloud integrations:
 * - Google Gemini API (AI chat)
 * - Google Cloud Logging (structured JSON logs)
 * - Google Cloud Error Reporting (automatic error capture)
 * - Google Cloud Secret Manager (API key management)
 * - Google Analytics 4 (client-side, via ga.js)
 *
 * @module server
 * @requires express
 * @requires @google/generative-ai
 * @requires dotenv
 */

'use strict';

const express = require('express');
const path = require('path');
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Google Cloud Structured Logging ──────────────────────────────────────────
// Cloud Run automatically ingests JSON-formatted stdout as structured logs
// into Google Cloud Logging. See: https://cloud.google.com/run/docs/logging

/** @type {string} Google Cloud project ID (auto-detected on Cloud Run) */
const GCP_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || '';

/** @type {boolean} Whether we are running in a Google Cloud environment */
const IS_CLOUD = Boolean(GCP_PROJECT || process.env.K_SERVICE);

/**
 * Emits a structured JSON log compatible with Google Cloud Logging.
 * When running on Cloud Run, these are automatically ingested and searchable
 * in the Cloud Console Logs Explorer with severity filtering.
 *
 * @param {'INFO'|'WARNING'|'ERROR'|'DEBUG'} severity - Log severity level
 * @param {string} message - Human-readable log message
 * @param {Object} [payload={}] - Additional structured data
 * @returns {void}
 * @see https://cloud.google.com/logging/docs/structured-logging
 */
function cloudLog(severity, message, payload = {}) {
  if (IS_CLOUD) {
    // Google Cloud Logging structured format
    const entry = {
      severity,
      message,
      timestamp: new Date().toISOString(),
      'logging.googleapis.com/labels': {
        service: 'voterpath',
        version: '1.0.0',
      },
      ...payload,
    };
    console.log(JSON.stringify(entry));
  } else {
    // Local development — human-readable
    const prefix = `[VoterPath:${severity}]`;
    if (severity === 'ERROR') {
      console.error(prefix, message, payload);
    } else {
      console.log(prefix, message, Object.keys(payload).length ? payload : '');
    }
  }
}

/**
 * Reports an error to Google Cloud Error Reporting.
 * Cloud Run automatically captures errors in the correct JSON format.
 *
 * @param {Error} err - The error object
 * @param {string} context - Where the error occurred
 * @returns {void}
 * @see https://cloud.google.com/error-reporting/docs/formatting-error-messages
 */
function reportError(err, context) {
  if (IS_CLOUD) {
    // Google Cloud Error Reporting structured format
    const errorEntry = {
      severity: 'ERROR',
      message: err.stack || err.message,
      '@type': 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
      context: {
        reportLocation: {
          functionName: context,
        },
        httpRequest: {},
      },
      serviceContext: {
        service: 'voterpath',
        version: '1.0.0',
      },
    };
    console.error(JSON.stringify(errorEntry));
  } else {
    console.error(`[VoterPath:ERROR] ${context}:`, err.message);
  }
}

// ── Google Cloud Secret Manager Integration ──────────────────────────────────
// On Cloud Run, secrets are injected as environment variables via --set-secrets.
// This function validates and retrieves the API key from the environment,
// supporting both direct env vars and Secret Manager-mounted secrets.
// See: https://cloud.google.com/run/docs/configuring/secrets

/**
 * Retrieves the Gemini API key from environment (supports Secret Manager).
 * On Cloud Run, the key is mounted via `--set-secrets GEMINI_API_KEY=secret:version`.
 *
 * @returns {string|null} The API key or null if not configured
 */
function getGeminiApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    cloudLog('ERROR', 'GEMINI_API_KEY is not configured — check Secret Manager or .env');
    return null;
  }
  return key;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** @type {number} Server port — Cloud Run requires 8080 */
const PORT = process.env.PORT || 8080;

/** @type {number} Maximum allowed message length in characters */
const MAX_MESSAGE_LENGTH = 1000;

/** @type {number} Maximum conversation history turns sent to Gemini */
const MAX_HISTORY_TURNS = 10;

/** @type {number} Rate limit window in milliseconds (15 minutes) */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** @type {number} Maximum requests per IP within the rate limit window */
const RATE_LIMIT_MAX_REQUESTS = 50;

/** @type {string} Gemini model identifier */
const GEMINI_MODEL = 'gemini-2.5-flash';

/** @type {number} Gemini generation temperature (low for factual accuracy) */
const GEMINI_TEMPERATURE = 0.3;

/** @type {number} Gemini maximum output token count */
const GEMINI_MAX_TOKENS = 512;

/** @type {string} Non-partisan system instruction for the AI assistant */
const SYSTEM_INSTRUCTION = `You are VoterPath AI, a helpful, accurate, and strictly \
non-partisan civic education assistant.

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

// ── App Initialization ───────────────────────────────────────────────────────

const app = express();

// Security: remove X-Powered-By to prevent server fingerprinting (OWASP A09)
app.disable('x-powered-by');

// Trust first proxy for accurate IP detection behind Cloud Run / load balancers
app.set('trust proxy', 1);

// ── In-Memory Rate Limiter ───────────────────────────────────────────────────

/**
 * Simple in-memory rate limiter keyed by IP address.
 * Resets after RATE_LIMIT_WINDOW_MS. Suitable for single-instance deployments.
 * @type {Map<string, { count: number, resetTime: number }>}
 */
const rateLimitStore = new Map();

/**
 * Rate-limiting middleware — restricts requests per IP within a sliding window.
 * Returns 429 Too Many Requests if the limit is exceeded.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 */
function rateLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  record.count += 1;

  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
    return res.status(429).json({
      error: 'Too many requests. Please wait a few minutes before trying again.',
    });
  }

  return next();
}

// Periodic cleanup of expired rate-limit entries to prevent memory leaks (DoS)
const _rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);
_rateLimitCleanup.unref(); // Allow clean process shutdown

// ── CORS Middleware ──────────────────────────────────────────────────────────

/**
 * Configures Cross-Origin Resource Sharing for split frontend deployments.
 * Allows requests only from explicitly whitelisted origins.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 */
function corsMiddleware(req, res, next) {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:8080',
    'http://localhost:3000',
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
}

// ── Security Headers Middleware ──────────────────────────────────────────────

/**
 * Sets comprehensive HTTP security headers on every response.
 * Implements Content-Security-Policy, X-Frame-Options, and other hardening headers.
 *
 * @param {import('express').Request} _req - Express request object (unused)
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 */
function securityHeaders(_req, res, next) {
  // Strict CSP — no 'unsafe-inline' for script-src (GA moved to external ga.js)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' https://www.googletagmanager.com " +
    'https://www.google-analytics.com; ' +
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https://www.google-analytics.com " +
    'https://*.onrender.com https://*.run.app; ' +
    "img-src 'self' data: https:; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "object-src 'none';"
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  // Modern standard: disable XSS auditor, rely on CSP (OWASP recommendation)
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  // Cross-Origin isolation headers
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-Download-Options', 'noopen');
  next();
}

// ── Apply Middleware ─────────────────────────────────────────────────────────

app.use(corsMiddleware);
app.use(securityHeaders);
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Health Check Endpoint ────────────────────────────────────────────────────

/**
 * GET /health — Returns server health status for uptime monitors and
 * container orchestrators (Cloud Run, Docker, Kubernetes).
 *
 * @param {import('express').Request} _req - Express request object (unused)
 * @param {import('express').Response} res - Express response object
 * @returns {void}
 */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'voterpath',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    cloud: IS_CLOUD ? 'google-cloud-run' : 'local',
    project: GCP_PROJECT || undefined,
  });
});

// ── Gemini AI Chat Proxy ─────────────────────────────────────────────────────

/**
 * POST /api/chat — Proxies a user message to the Google Gemini API.
 * Validates input, enforces rate limits, maps chat history roles,
 * and returns the AI-generated response.
 *
 * @param {import('express').Request} req - Express request with body.message
 * @param {import('express').Response} res - Express response with { reply }
 * @returns {Promise<void>}
 *
 * @example
 * // Request
 * POST /api/chat
 * { "message": "How do I register to vote?", "history": [] }
 *
 * // Response
 * { "reply": "You can register at vote.gov..." }
 */
app.post('/api/chat', rateLimiter, async (req, res) => {
  // Prevent caching of API responses containing user data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  const { message, history = [] } = req.body;

  // ── History array validation ──────────────────────────────────────────────
  if (!Array.isArray(history)) {
    return res.status(400).json({
      error: 'Invalid request: history must be an array.',
    });
  }

  // ── Input validation ──────────────────────────────────────────────────────
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      error: 'Invalid request: message is required and must be a string.',
    });
  }

  const trimmedMessage = message.trim();

  if (trimmedMessage.length === 0) {
    return res.status(400).json({
      error: 'Invalid request: message cannot be empty.',
    });
  }

  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message too long. Please keep questions under ${MAX_MESSAGE_LENGTH} characters.`,
    });
  }

  // ── API key check (supports Secret Manager) ──────────────────────────────
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return res.status(503).json({
      error: 'AI service is not available. Please try again later.',
    });
  }

  // ── Gemini API call ───────────────────────────────────────────────────────
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Map internal 'ai' role to Gemini's expected 'model' role
    const geminiHistory = history
      .slice(-MAX_HISTORY_TURNS)
      .filter((turn) => turn && turn.text && turn.role)
      .map((turn) => ({
        role: turn.role === 'ai' ? 'model' : 'user',
        parts: [{ text: String(turn.text) }],
      }));

    const chat = model.startChat({
      history: geminiHistory,
      generationConfig: {
        temperature: GEMINI_TEMPERATURE,
        maxOutputTokens: GEMINI_MAX_TOKENS,
      },
    });

    const result = await chat.sendMessage(trimmedMessage);
    const reply = result.response.text();

    return res.status(200).json({ reply });
  } catch (err) {
    // Report to Google Cloud Error Reporting
    reportError(err, 'POST /api/chat');
    cloudLog('WARNING', 'Gemini API call failed', {
      error: err.message,
      httpRequest: { method: 'POST', url: '/api/chat' },
    });
    return res.status(502).json({
      error: 'Failed to reach AI service. Please try again.',
    });
  }
});

// ── SPA Fallback ─────────────────────────────────────────────────────────────

/**
 * GET * — Serves the SPA index.html for any unmatched route.
 * This enables client-side routing and deep linking.
 *
 * @param {import('express').Request} _req - Express request object (unused)
 * @param {import('express').Response} res - Express response object
 * @returns {void}
 */
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Server Bootstrap ─────────────────────────────────────────────────────────

if (require.main === module) {
  app.listen(PORT, () => {
    cloudLog('INFO', `Server running on port ${PORT}`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      cloud: IS_CLOUD,
      project: GCP_PROJECT || 'local',
    });
    cloudLog('INFO', `Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;
