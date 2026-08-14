const express = require('express');
const compression = require('compression');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { nanoid } = require('nanoid');
const cookieParser = require('cookie-parser');

const app = express();
require('dotenv').config()
const PORT = process.env.PORT;

// Constants
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const METADATA_FILE = path.join(__dirname, 'metadata.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DOMAIN = process.env.DOMAIN;
const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Pre-compute static file paths (avoids path.join on every request)
const STATIC_FILES = {
  '404.html': path.join(PUBLIC_DIR, '404.html'),
  'admin.html': path.join(PUBLIC_DIR, 'admin.html'),
  'view.html': path.join(PUBLIC_DIR, 'view.html'),
  'login.html': path.join(PUBLIC_DIR, 'login.html'),
  'index.html': path.join(PUBLIC_DIR, 'index.html'),
};

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Store file metadata in JSON file
function loadMetadata() {
  if (fs.existsSync(METADATA_FILE)) {
    try {
      const data = fs.readFileSync(METADATA_FILE, 'utf-8');
      return new Map(JSON.parse(data));
    } catch (error) {
      console.error('Error loading metadata:', error);
      return new Map();
    }
  }
  return new Map();
}

// Debounced metadata save — accumulates writes and saves once after 100ms
let saveTimer = null;
function saveMetadata() {
  if (saveTimer) return; // Already scheduled
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const data = JSON.stringify(Array.from(files.entries()));
    fs.writeFile(METADATA_FILE, data, (err) => {
      if (err) console.error('Error saving metadata:', err);
    });
  }, 100);
}

// Synchronous save for shutdown/critical paths only
function saveMetadataSync() {
  try {
    const data = JSON.stringify(Array.from(files.entries()));
    fs.writeFileSync(METADATA_FILE, data, 'utf-8');
  } catch (error) {
    console.error('Error saving metadata:', error);
  }
}

const files = loadMetadata();

// Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!PORT || !DOMAIN || !ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_SECRET) {
  console.error('Missing required env vars. Check .env file.');
  process.exit(1);
}

// Simple session storage (in production, use proper session store)
const sessions = new Map();

// ── Middleware ──────────────────────────────────────────

// Compression for all responses (gzip)
app.use(compression({ level: 6, threshold: 1024 }));

// CORS only for API routes (not static files)
app.use('/api', cors());
app.use('/upload', cors());
app.use('/delete', cors());

app.use(express.json());
app.use(cookieParser());

// ── Access gate (site-wide) ─────────────────────────────
// Protects the entire service behind a secret access code.
const ACCESS_CODE = process.env.ACCESS_CODE || '2135';
const GATE_COOKIE = 'rab_gate';
const GATE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const gateToken = crypto.createHash('sha256').update(`${ACCESS_CODE}|${ADMIN_SECRET}`).digest('hex');
const GATE_HTML = path.join(PUBLIC_DIR, 'gate.html');
const GATE_EXEMPT = new Set(['/gate', '/api/access', '/health']);

// Rate limit: 10 failed attempts per IP per 10 minutes
const gateFails = new Map();
function isRateLimited(ip) {
  const entry = gateFails.get(ip);
  return entry && entry.count >= 10 && Date.now() - entry.last < 10 * 60 * 1000;
}
function recordFail(ip) {
  const entry = gateFails.get(ip) || { count: 0, last: 0 };
  entry.count += 1;
  entry.last = Date.now();
  gateFails.set(ip, entry);
  if (gateFails.size > 1000) gateFails.clear(); // bound memory
}

function requireGate(req, res, next) {
  if (GATE_EXEMPT.has(req.path)) return next();
  if (req.cookies[GATE_COOKIE] === gateToken) return next();
  if (req.method !== 'GET') return res.status(401).json({ success: false, message: 'Access code required' });
  if (req.path.startsWith('/api/')) return res.status(401).json({ success: false, message: 'Access code required' });
  return res.sendFile(GATE_HTML);
}
app.use(requireGate);

app.get('/gate', (req, res) => res.sendFile(GATE_HTML));

app.post('/api/access', (req, res) => {
  const ip = req.ip || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ success: false, message: 'Too many attempts' });
  const submitted = String(req.body?.code || '');
  const expected = Buffer.from(ACCESS_CODE);
  const given = Buffer.from(submitted);
  const match = given.length === expected.length && crypto.timingSafeEqual(given, expected);
  if (!match) {
    recordFail(ip);
    return res.status(401).json({ success: false, message: 'Wrong code' });
  }
  gateFails.delete(ip);
  res.cookie(GATE_COOKIE, gateToken, {
    httpOnly: true,
    maxAge: GATE_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({ success: true });
});
// ── End access gate ──────────────────────────────────────

// Static files with caching headers
app.use(express.static(PUBLIC_DIR, {
  etag: true,
  maxAge: '1h',
  lastModified: true,
  immutable: false,
}));

// Auth middleware
function requireAuth(req, res, next) {
  const sessionId = req.cookies.sessionId;
  if (!sessionId || !sessions.has(sessionId)) {
    if (req.path.startsWith('/api/') || req.xhr) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return res.redirect('/login');
  }
  const session = sessions.get(sessionId);
  if (session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    if (req.path.startsWith('/api/') || req.xhr) {
      return res.status(401).json({ success: false, message: 'Session expired' });
    }
    return res.redirect('/login');
  }
  next();
}

// Generate simple session ID
function generateSessionId() {
  return nanoid(32);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const id = nanoid(4);
    const ext = path.extname(file.originalname);
    cb(null, id + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Clean up expired files
function cleanupExpiredFiles() {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, metadata] of files.entries()) {
    if (now > metadata.expiresAt) {
      try {
        const filePath = path.join(UPLOAD_DIR, metadata.filename);
        fs.unlink(filePath, () => {}); // async, fire-and-forget
        files.delete(id);
        cleaned++;
      } catch (error) {
        console.error('Error deleting expired file:', error);
      }
    }
  }
  if (cleaned > 0) {
    saveMetadata();
    console.log(`Cleaned up ${cleaned} expired files`);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredFiles, 5 * 60 * 1000);

// ── Routes (ORDER MATTERS - specific routes before dynamic ones) ──

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeFiles: files.size });
});

// Login page
app.get('/login', (req, res) => {
  res.sendFile(STATIC_FILES['login.html']);
});

// Login API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const sessionId = generateSessionId();
    sessions.set(sessionId, {
      username: username,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    });
    
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production'
    });
    
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
});

// Logout API
app.post('/api/logout', (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    sessions.delete(sessionId);
    res.clearCookie('sessionId');
  }
  res.json({ success: true });
});

// Admin page (protected)
app.get('/admin', requireAuth, (req, res) => {
  res.sendFile(STATIC_FILES['admin.html']);
});

// Get file info
app.get('/api/info/:id', (req, res) => {
  const id = req.params.id;
  const metadata = files.get(id);

  if (!metadata) {
    return res.status(404).json({ error: 'File not found or expired' });
  }

  if (Date.now() > metadata.expiresAt) {
    files.delete(id);
    saveMetadata();
    return res.status(404).json({ error: 'File expired' });
  }

  res.json({
    id: id,
    originalName: metadata.originalName,
    mimetype: metadata.mimetype,
    size: metadata.size,
    url: `${DOMAIN}/${id}`,
    expiresAt: new Date(metadata.expiresAt).toISOString(),
    isImage: metadata.mimetype.startsWith('image/')
  });
});

// Admin API: list all uploads (protected)
app.get('/api/admin/uploads', requireAuth, (req, res) => {
  const uploads = [];
  for (const [id, metadata] of files.entries()) {
    uploads.push({
      id: id,
      originalName: metadata.originalName,
      mimetype: metadata.mimetype,
      size: metadata.size,
      uploadedAt: new Date(metadata.uploadedAt).toISOString(),
      expiresAt: new Date(metadata.expiresAt).toISOString(),
      timeLeft: Math.max(0, metadata.expiresAt - Date.now()),
      isImage: metadata.mimetype.startsWith('image/'),
      url: `${DOMAIN}/${id}`
    });
  }
  res.json(uploads);
});

// Admin API: delete upload (protected)
app.delete('/api/admin/delete/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const metadata = files.get(id);
  
  if (!metadata) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }
  
  try {
    const filePath = path.join(UPLOAD_DIR, metadata.filename);
    fs.unlink(filePath, () => {}); // async fire-and-forget
    files.delete(id);
    saveMetadata();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete endpoint (public)
app.delete('/delete/:id', (req, res) => {
  const id = req.params.id;
  const metadata = files.get(id);
  
  if (!metadata) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }
  
  try {
    const filePath = path.join(UPLOAD_DIR, metadata.filename);
    fs.unlink(filePath, () => {}); // async fire-and-forget
    files.delete(id);
    saveMetadata();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    const id = nanoid(4);
    const ext = path.extname(req.file.originalname);
    const filename = id + ext;

    // Rename the file to use nanoid (async)
    const oldPath = req.file.path;
    const newPath = path.join(UPLOAD_DIR, filename);
    
    fs.rename(oldPath, newPath, (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }

      const expiresAt = Date.now() + EXPIRY_MS;

      // Store metadata
      files.set(id, {
        id: id,
        filename: filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedAt: Date.now(),
        expiresAt: expiresAt
      });

      saveMetadata();

      res.json({
        success: true,
        id: id,
        url: `${DOMAIN}/${id}`,
        expiresAt: new Date(expiresAt).toISOString()
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Handle text uploads
app.post('/upload/text', express.text({ limit: '1MB' }), (req, res) => {
  try {
    const id = nanoid(4);
    const filename = id + '.txt';
    const filePath = path.join(UPLOAD_DIR, filename);

    fs.writeFile(filePath, req.body, 'utf-8', (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }

      const expiresAt = Date.now() + EXPIRY_MS;

      // Store metadata
      files.set(id, {
        id: id,
        filename: filename,
        originalName: 'text.txt',
        mimetype: 'text/plain',
        size: req.body.length,
        uploadedAt: Date.now(),
        expiresAt: expiresAt,
        isText: true
      });

      saveMetadata();

      res.json({
        success: true,
        id: id,
        url: `${DOMAIN}/${id}`,
        expiresAt: new Date(expiresAt).toISOString()
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get file text content (for text files)
app.get('/api/text/:id', (req, res) => {
  const id = req.params.id;
  const metadata = files.get(id);

  if (!metadata || !metadata.isText) {
    return res.status(404).json({ error: 'Text file not found' });
  }

  if (Date.now() > metadata.expiresAt) {
    files.delete(id);
    saveMetadata();
    return res.status(404).json({ error: 'File expired' });
  }

  const filePath = path.join(UPLOAD_DIR, metadata.filename);
  res.type('text/plain').sendFile(filePath);
});

// View page - serves view.html with file info
app.get('/:id', (req, res) => {
  const id = req.params.id;
  const metadata = files.get(id);

  // Clean up expired files
  if (metadata && Date.now() > metadata.expiresAt) {
    files.delete(id);
    saveMetadata();
    fs.unlink(path.join(UPLOAD_DIR, metadata.filename), () => {});
    return res.sendFile(STATIC_FILES['404.html']);
  }

  // Check if file exists in metadata
  if (!metadata) {
    return res.sendFile(STATIC_FILES['404.html']);
  }

  // Serve view.html (skip fs.existsSync — metadata is source of truth; 
  // if file is missing, /api/file/:id will 404 gracefully)
  res.sendFile(STATIC_FILES['view.html']);
});

// Direct file download endpoint
app.get('/download/:id', (req, res) => {
  const id = req.params.id;
  const metadata = files.get(id);

  if (!metadata) {
    return res.status(404).json({ error: 'File not found' });
  }

  if (Date.now() > metadata.expiresAt) {
    files.delete(id);
    saveMetadata();
    fs.unlink(path.join(UPLOAD_DIR, metadata.filename), () => {});
    return res.status(404).json({ error: 'File expired' });
  }

  const filePath = path.join(UPLOAD_DIR, metadata.filename);
  res.download(filePath, metadata.originalName, (err) => {
    if (err) {
      if (!res.headersSent) {
        res.status(404).json({ error: 'File not found' });
      }
    }
  });
});

// File content endpoint for view page
app.get('/api/file/:id', (req, res) => {
  const id = req.params.id;
  const metadata = files.get(id);

  if (!metadata) {
    return res.status(404).json({ error: 'File not found' });
  }

  if (Date.now() > metadata.expiresAt) {
    files.delete(id);
    saveMetadata();
    fs.unlink(path.join(UPLOAD_DIR, metadata.filename), () => {});
    return res.status(404).json({ error: 'File expired' });
  }

  const filePath = path.join(UPLOAD_DIR, metadata.filename);
  res.sendFile(filePath, {
    headers: {
      'Content-Type': metadata.mimetype,
      'Content-Disposition': `inline; filename="${metadata.originalName}"`
    }
  }, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: 'File not found' });
    }
  });
});

// ── Start server ────────────────────────────────────────

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 Read & Burn server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  console.log(`🌐 Domain: ${DOMAIN}`);
  cleanupExpiredFiles();
});

// Tune HTTP keep-alive for faster repeated requests
server.keepAliveTimeout = 30_000;     // 30s keep-alive
server.headersTimeout = 35_000;       // 5s grace after keepAlive
server.requestTimeout = 60_000;       // max request time

// Graceful shutdown
function shutdown() {
  console.log('Shutting down gracefully...');
  saveMetadataSync(); // save synchronously on shutdown
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
