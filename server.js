/**
 * @file VoterPath — Express Backend Server
 * @description AI-powered, non-partisan civic education platform using Google Gemini.
 *   Proxies chat requests through a server-side API to protect the API key,
 *   enforces OWASP-aligned security headers, rate limiting, input validation,
 *   and structured logging for Google Cloud Logging / Error Reporting.
 *   Designed for deployment on Google Cloud Run with Secret Manager integration.
 * @version 1.0.0
 * @author VoterPath Team
 * @license MIT
 * @module server
 * @requires express
 * @requires @google/generative-ai
 * @requires dotenv
 * @see https://cloud.google.com/run/docs
 */

'use strict';

const express = require('express');
const path = require('path');
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Google Cloud Environment Detection ──────────────────────────────────────

/** @type {string} Google Cloud project ID (auto-detected on Cloud Run) */
const GCP_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || '';

/** @type {string} Cloud Run service name (auto-set by the platform) */
const K_SERVICE = process.env.K_SERVICE || '';

/** @type {string} Cloud Run revision name (auto-set by the platform) */
const K_REVISION = process.env.K_REVISION || '';

/** @type {boolean} Whether we are running in a Google Cloud environment */
const IS_CLOUD = Boolean(GCP_PROJECT || K_SERVICE);

// ── Google Cloud Structured Logging ──────────────────────────────────────────
// Cloud Run automatically ingests JSON-formatted stdout as structured logs
// into Google Cloud Logging. See: https://cloud.google.com/run/docs/logging

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
    const entry = {
      severity,
      message,
      timestamp: new Date().toISOString(),
      'logging.googleapis.com/labels': { service: 'voterpath', version: '1.0.0' },
      ...payload,
    };
    console.log(JSON.stringify(entry));
  } else {
    const prefix = `[VoterPath:${severity}]`;
    if (severity === 'ERROR') {
      console.error(prefix, message, payload);
    } else {
      console.log(prefix, message, Object.keys(payload).length ? payload : '');
    }
  }
}

// ── Google Cloud Error Reporting ─────────────────────────────────────────────

/**
 * Reports an error to Google Cloud Error Reporting.
 * Cloud Run automatically captures errors emitted in the structured JSON format
 * with the correct `@type` annotation.
 *
 * @param {Error} err - The error object
 * @param {string} context - Function or route where the error occurred
 * @returns {void}
 * @see https://cloud.google.com/error-reporting/docs/formatting-error-messages
 */
function reportError(err, context) {
  if (IS_CLOUD) {
    console.error(JSON.stringify({
      severity: 'ERROR',
      message: err.stack || err.message,
      '@type': 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
      context: { reportLocation: { functionName: context }, httpRequest: {} },
      serviceContext: { service: 'voterpath', version: '1.0.0' },
    }));
  } else {
    console.error(`[VoterPath:ERROR] ${context}:`, err.message);
  }
}

// ── Google Cloud Secret Manager Integration ─────────────────────────────────
// On Cloud Run, secrets are injected as environment variables via --set-secrets.
// See: https://cloud.google.com/run/docs/configuring/secrets

/**
 * Retrieves the Gemini API key from the environment.
 * On Cloud Run, the key is mounted via `--set-secrets GEMINI_API_KEY=secret:version`.
 * Locally, it is loaded from the `.env` file via dotenv.
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

/** @type {number} Maximum allowed length for a single chat message */
const MAX_MESSAGE_LENGTH = 1000;

/** @type {number} Maximum conversation history turns sent to Gemini */
const MAX_HISTORY_TURNS = 10;

/** @type {number} Rate limit window in milliseconds (15 minutes) */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** @type {number} Maximum requests per IP within the rate limit window */
const RATE_LIMIT_MAX_REQUESTS = 50;

/** @type {string} Gemini model identifier */
const GEMINI_MODEL = 'gemini-2.5-flash';

/** @type {number} Gemini generation temperature (low for factual answers) */
const GEMINI_TEMPERATURE = 0.3;

/** @type {number} Maximum output tokens per Gemini response */
const GEMINI_MAX_TOKENS = 512;

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

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// ── Rate Limiter ─────────────────────────────────────────────────────────────

/** @type {Map<string, {count: number, resetTime: number}>} In-memory store keyed by IP */
const rateLimitStore = new Map();

/**
 * Rate-limits incoming requests using an in-memory sliding window.
 * Keyed by client IP address. Prevents API abuse on `/api/chat`.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware
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

// Periodic cleanup prevents memory leaks from expired entries
const _rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore) {
    if (now > record.resetTime) rateLimitStore.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS);
_rateLimitCleanup.unref();

// ── CORS Middleware ──────────────────────────────────────────────────────────

/**
 * Whitelist-based CORS middleware for split frontend/backend deployments.
 * Only sets `Access-Control-Allow-Origin` for explicitly allowed origins.
 * Includes `Vary: Origin` to prevent cache poisoning.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware
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

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
}

// ── Security Headers ─────────────────────────────────────────────────────────

/**
 * Sets OWASP-aligned defense-in-depth security headers on every response.
 * Includes CSP, HSTS, X-Frame-Options, Permissions-Policy, and cross-origin
 * isolation headers (COOP/CORP).
 *
 * @param {import('express').Request} _req - Express request (unused)
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware
 * @returns {void}
 */
function securityHeaders(_req, res, next) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' https://www.googletagmanager.com " +
    'https://www.google-analytics.com; ' +
    "style-src 'self' https://fonts.googleapis.com; " +
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
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-Download-Options', 'noopen');
  next();
}

app.use(corsMiddleware);
app.use(securityHeaders);
app.use(express.json({ limit: '10kb' }));

// Logs every HTTP request in Cloud Logging's httpRequest format
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const severity = res.statusCode >= 400 ? 'WARNING' : 'INFO';
    const summary = `${req.method} ${req.path} ${res.statusCode}`;
    cloudLog(severity, summary, {
      httpRequest: {
        requestMethod: req.method,
        requestUrl: req.originalUrl,
        status: res.statusCode,
        latency: `${(Date.now() - start) / 1000}s`,
        remoteIp: req.ip,
        userAgent: req.get('user-agent') || '',
      },
    });
  });
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// ── Health Check (Cloud Run) ─────────────────────────────────────────────────

/**
 * Health check endpoint for Cloud Run startup/liveness probes.
 * Returns service metadata including Cloud Run environment variables.
 */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: K_SERVICE || 'voterpath',
    version: '1.0.0',
    revision: K_REVISION || 'local',
    timestamp: new Date().toISOString(),
    cloud: IS_CLOUD ? 'google-cloud-run' : 'local',
    project: GCP_PROJECT || undefined,
  });
});

app.post('/api/chat', rateLimiter, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  const { message, history = [] } = req.body;

  if (!Array.isArray(history)) {
    return res.status(400).json({ error: 'Invalid request: history must be an array.' });
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid request: message is required and must be a string.' });
  }

  const trimmedMessage = message.trim();

  if (trimmedMessage.length === 0) {
    return res.status(400).json({ error: 'Invalid request: message cannot be empty.' });
  }

  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message too long. Please keep questions under ${MAX_MESSAGE_LENGTH} characters.`,
    });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return res.status(503).json({ error: 'AI service is not available. Please try again later.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Map frontend 'ai' role to Gemini's expected 'model' role
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
    reportError(err, 'POST /api/chat');
    cloudLog('WARNING', 'Gemini API call failed', {
      error: err.message,
      httpRequest: { method: 'POST', url: '/api/chat' },
    });
    return res.status(502).json({ error: 'Failed to reach AI service. Please try again.' });
  }
});

// SPA fallback — serves index.html for client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
