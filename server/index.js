// ========================================
// AI Translator — Express Server
// ========================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const { translate, detectLanguage } = require('./translation-engine');
const { languages, getLanguageName } = require('./languages');

const app = express();
const PORT = 3777;
const HOST = '127.0.0.1';

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Serve static translator files
app.use(express.static(path.join(__dirname, '..', 'translator'), {
  maxAge: '1h',
  etag: true,
}));

// ===== API Routes =====

// GET /api/languages — Returns supported languages
app.get('/api/languages', (req, res) => {
  res.json({
    success: true,
    languages: languages,
    total: languages.length,
  });
});

// POST /api/translate — Translate text
app.post('/api/translate', async (req, res) => {
  try {
    const { text, from, to } = req.body;

    // Validation
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a non-empty string.',
      });
    }

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Both "from" and "to" language codes are required.',
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Text exceeds maximum length of 5000 characters.',
      });
    }

    const fromName = getLanguageName(from);
    const toName = getLanguageName(to);

    if (!fromName || !toName) {
      return res.status(400).json({
        success: false,
        error: 'Invalid language code provided.',
      });
    }

    // Translate
    const result = await translate(text.trim(), from, to);

    res.json({
      success: true,
      originalText: text.trim(),
      translatedText: result.translatedText,
      from: { code: from, name: fromName },
      to: { code: to, name: toName },
      match: result.match,
      provider: 'MyMemory',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Translation error:', err.message);

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message || 'Translation failed. Please try again.',
      retryable: statusCode >= 500 || statusCode === 429,
    });
  }
});

// GET /api/health — Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found.',
  });
});

// Fallback: serve translator for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'translator', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error.',
  });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`🌐 AI Translator server running at http://${HOST}:${PORT}`);

  // Notify parent process (Electron) that server is ready
  if (process.send) {
    process.send('server-ready');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => process.exit(0));
});

module.exports = app;
