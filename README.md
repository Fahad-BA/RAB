# 🔥 Read & Burn

[![Node.js](https://img.shields.io/badge/Node.js-14+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-brightgreen.svg)](https://expressjs.com/)
[![Self-hosted](https://img.shields.io/badge/Self--hosted-orange.svg)](https://github.com)
[![Privacy](https://img.shields.io/badge/Privacy--First-critical.svg)](https://github.com)

> **Revolutionary temporary file sharing that self-destructs.**
> 
> Secure by design. Privacy first. Zero footprint.

---

## 🚀 The Vision

In a world where every share leaves a permanent digital footprint, **Read & Burn** introduces a paradigm shift in how we think about information sharing. 

This isn't just another file upload service—it's a **privacy-first architecture** that ensures your shared content exists only when it needs to exist, then vanishes without a trace.

### What Makes It Revolutionary?

**Traditional file sharing:** Files live forever on cloud servers. Privacy policies change. Data gets breached. You lose control.

**Read & Burn:** Files have a one-hour life cycle. After 60 minutes, they don't just become inaccessible—they're *gone*. Complete self-destruction. No backups. No retention. No traces.

This is **ephemeral storage as a service (EaaS)**—a concept that reimagines data security through temporary existence rather than permanent storage.

---

## 💡 Core Innovation

### The "Burn" Concept

Every upload automatically enters a one-hour countdown. When time expires:

✅ Files are deleted from disk  
✅ Metadata is purged from database  
✅ All traces are eliminated  
✅ Zero recovery possible  

### User-Controlled Deletion

Users don't need to wait. The "Burn Page" button provides instant self-destruction, giving users absolute control over their shared content.

### Live Transparency

Every file view includes:
- Real-time countdown timer with progress bar
- Exact time remaining to destruction
- Visual representation of content life cycle
- Instant "Burn" capability

No hidden expiration. Complete visibility.

---

## 🌟 Modern Architecture

### Built for Performance

- **Express.js** backend - Lightning-fast response times
- **Nanoid** - Short, URL-friendly 7-character IDs
- **Cookie-based sessions** - Secure, stateless authentication
- **Atomic file operations** - Prevents partial deletions
- **Background cleanup** - Efficient resource management

### Security First

- **Protected Admin Panel** - Role-based access control
- **Environment-based configuration** - No hardcoded credentials
- **HTTP-only cookies** - Protection against XSS
- **CSRF-ready architecture** - Prepared for additional security layers
- **File validation** - Type and size limits enforced

### Developer Experience

- **Minimal dependencies** - Only what's needed
- **Clean codebase** - Easy to audit and extend
- **Zero-config deployment** - Works out of the box
- **Systemd integration** - Production-grade service management

---

## 🔮 Use Cases

### Temporary Document Sharing
Share confidential documents with a timed window. Once read (or expired), the content vanishes.

### Secure Team Collaboration
Collaborate on sensitive projects without permanent storage. Files exist only during the active collaboration window.

### One-Time Passwords & Secrets
Share temporary credentials, API keys, or sensitive information that should self-destruct after use.

### Privacy-Focused Communication
Share screenshots, error logs, or debug information that doesn't need to persist.

### Ephemeral Content Testing
Test content rendering, UI designs, or technical implementations without creating permanent artifacts.

---

## 🏗️ Technical Superiority

### Compared to Traditional File Sharing

| Feature | Traditional Services | Read & Burn |
|---------|---------------------|-------------|
| File Persistence | Forever | 1 hour max |
| User Control | Limited | Complete (burn anytime) |
| Privacy | Data retention policies | Zero retention |
| Transparancy | Hidden expiration | Live countdown |
| Cost | Subscriptions | Free & open source |
| Deployment | Cloud-only | Self-hosted |

### Why This Matters

- **GDPR Compliance** - No data retention beyond user intent
- **Security Audit** - Reduced attack surface (no permanent storage)
- **Cost Efficiency** - No storage costs for temporary data
- **User Trust** - Complete transparency about data lifecycle

---

## 📊 Key Metrics

- **File Lifetime:** 60 minutes (configurable)
- **Max File Size:** 10 MB
- **ID Format:** 7 alphanumeric characters
- **Cleanup Interval:** Every 5 minutes
- **Supported Types:** All files + plain text
- **Deployment:** Linux/Unix (systemd)

---

## 🔒 Enterprise-Ready Features

### Admin Dashboard

- Real-time file monitoring
- Manual file management
- Upload statistics and analytics
- Multi-file deletion
- User activity tracking

### API Integration

- RESTful endpoints for automation
- Programmatic file creation
- Metadata querying
- Status monitoring
- Webhook-ready architecture

### Production Deployment

- Systemd service integration
- Nginx reverse proxy ready
- Environment-based configuration
- Graceful shutdown handling

---

## 🎯 The Philosophy

**Privacy through Ephemeral Existence**

In an era of permanent digital storage, we believe in the right to forget. Files don't need to live forever. Information doesn't need to accumulate. Sharing doesn't need to leave traces.

**Read & Burn** isn't just a file upload service—it's a statement about digital privacy. A declaration that your data deserves to exist only as long as it's useful.

When you upload, you control. When you share, you decide. When time is up, it's gone.

No retention. No regret. No traces.

---

## 🛠️ Getting Started

### Quick Start

```bash
git clone <repository-url>
cd rab-service
npm install
npm start
```

That's it. The service runs on `http://localhost:4002`.

### Production Deployment

The project includes `rab-service.service` (systemd) and `rab.fhidan.com.nginx` (Nginx config) for production deployment.

Key environment variables:
- `PORT` - Server port (default: 4002)
- `DOMAIN` - Public domain URL
- `ADMIN_USERNAME` - Admin panel username
- `ADMIN_PASSWORD` - Admin panel password
- `ADMIN_SECRET` - Admin session secret
- `NODE_ENV` - Set to `production` for secure cookies

Set up with systemd and Nginx reverse proxy for production use.

---

## 🤝 Contributing

We believe in open innovation. Join us in building the future of ephemeral file sharing:

- Fork the repository
- Create feature branches
- Submit pull requests
- Share your use cases

---

---

## 🌐 Links

- **Live Demo:** [🔥 Read and Burn](https://rab.fhidan.com)
- **Repository:** [GitHub](https://github.com/Fahad-BA/RAB)

---

> *"The only files worth keeping are the ones you choose to keep. Everything else should burn."*

> — Read & Burn Philosophy