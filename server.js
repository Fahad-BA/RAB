const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 4002;

// Constants
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const METADATA_FILE = path.join(__dirname, 'metadata.json');
const DOMAIN = process.env.DOMAIN || 'https://rab.fhidan.com';
const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

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

function saveMetadata(files) {
  try {
    const data = JSON.stringify(Array.from(files.entries()));
    fs.writeFileSync(METADATA_FILE, data, 'utf-8');
  } catch (error) {
    console.error('Error saving metadata:', error);
  }
}

const files = loadMetadata();

// Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Fahad';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'PASSWORD_REMOVED';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'SECRET_REMOVED';

// Simple session storage (in production, use proper session store)
const sessions = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
function requireAuth(req, res, next) {
  const sessionId = req.cookies.sessionId;
  if (!sessionId || !sessions.has(sessionId)) {
    // For API requests, return JSON error instead of redirect
    if (req.path.startsWith('/api/') || req.xhr) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return res.redirect('/login');
  }
  const session = sessions.get(sessionId);
  if (session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    // For API requests, return JSON error instead of redirect
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
    const id = nanoid(7);
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
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        files.delete(id);
        cleaned++;
      } catch (error) {
        console.error('Error deleting expired file:', error);
      }
    }
  }
  if (cleaned > 0) {
    saveMetadata(files);
    console.log(`Cleaned up ${cleaned} expired files`);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredFiles, 5 * 60 * 1000);

// Routes (ORDER MATTERS - specific routes before dynamic ones)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeFiles: files.size });
});

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
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
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
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
    saveMetadata(files);
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
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    files.delete(id);
    saveMetadata(files);
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
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    files.delete(id);
    saveMetadata(files);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    const id = nanoid(7);
    const ext = path.extname(req.file.originalname);
    const filename = id + ext;

    // Rename the file to use nanoid
    const oldPath = req.file.path;
    const newPath = path.join(UPLOAD_DIR, filename);
    fs.renameSync(oldPath, newPath);

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

    saveMetadata(files);

    res.json({
      success: true,
      id: id,
      url: `${DOMAIN}/${id}`,
      expiresAt: new Date(expiresAt).toISOString()
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
    const id = nanoid(7);
    const filename = id + '.txt';
    const filePath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filePath, req.body, 'utf-8');

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

    saveMetadata(files);

    res.json({
      success: true,
      id: id,
      url: `${DOMAIN}/${id}`,
      expiresAt: new Date(expiresAt).toISOString()
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
    saveMetadata(files);
    return res.status(404).json({ error: 'File expired' });
  }

  const filePath = path.join(UPLOAD_DIR, metadata.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Read and send text content
  res.type('text/plain').sendFile(filePath);
});

// View page - serves view.html with file info
app.get('/:id', (req, res) => {
  const id = req.params.id;
  const metadata = files.get(id);

  // Clean up expired files
  if (metadata && Date.now() > metadata.expiresAt) {
    files.delete(id);
    saveMetadata(files);
    try {
      const filePath = path.join(UPLOAD_DIR, metadata.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error deleting expired file:', error);
    }
    return res.sendFile(path.join(__dirname, 'public', '404.html'));
  }

  // Check if file exists
  if (!metadata || !fs.existsSync(path.join(UPLOAD_DIR, metadata.filename))) {
    return res.sendFile(path.join(__dirname, 'public', '404.html'));
  }

  // Serve view.html instead of file
  res.sendFile(path.join(__dirname, 'public', 'view.html'));
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
    saveMetadata(files);
    try {
      const filePath = path.join(UPLOAD_DIR, metadata.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error deleting expired file:', error);
    }
    return res.status(404).json({ error: 'File expired' });
  }

  const filePath = path.join(UPLOAD_DIR, metadata.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Serve the file as download
  res.download(filePath, metadata.originalName);
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
    saveMetadata(files);
    try {
      const filePath = path.join(UPLOAD_DIR, metadata.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error deleting expired file:', error);
    }
    return res.status(404).json({ error: 'File expired' });
  }

  const filePath = path.join(UPLOAD_DIR, metadata.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Serve the file inline (for images in view.html)
  res.sendFile(filePath, {
    headers: {
      'Content-Type': metadata.mimetype,
      'Content-Disposition': `inline; filename="${metadata.originalName}"`
    }
  });
});



// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 Read & Burn server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  console.log(`🌐 Domain: ${DOMAIN}`);
  cleanupExpiredFiles();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});