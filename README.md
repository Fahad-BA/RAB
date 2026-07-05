# 🔥 Read & Burn

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Self-Hosted](https://img.shields.io/badge/Self--Hosted-✓-orange)
![PWA](https://img.shields.io/badge/PWA-✓-5A0FC8?logo=pwa&logoColor=white)

A self-hosted, self-destructing file and text sharing service. Every uploaded file **expires after 1 hour** — deleted from disk and purged from metadata. No retention, no backups, no traces.

Live at **[rab.fhidan.com](https://rab.fhidan.com)**

## ✨ Features

- ⏱️ **Auto-expiring uploads** — Files self-destruct after 60 minutes
- 📁 **File & text uploads** — Share any file (up to 10 MB) or plain text snippets
- 🖼️ **Image preview** — Inline rendering for image files
- 🔐 **Admin dashboard** — Protected panel to monitor and manage active uploads
- 🔥 **Instant burn** — Users can destroy their own uploads at any time
- ⚡ **Performance-tuned** — Gzip compression, debounced metadata writes, HTTP keep-alive
- 📱 **PWA-ready** — Includes manifest, service worker, and responsive UI
- 🏠 **Self-hosted** — Runs on your own server with Nginx + systemd

## 🛠 Tech Stack

| Layer        | Technology                |
|--------------|---------------------------|
| Runtime      | Node.js 18+               |
| Framework    | Express 4.18              |
| Upload       | Multer (disk storage)     |
| IDs          | Nanoid (4-char short IDs) |
| Auth         | Cookie-based sessions     |
| Compression  | compression (gzip)        |
| Frontend     | Vanilla HTML/CSS/JS (PWA) |
| Deployment   | Nginx + systemd           |

## 📦 Installation

```bash
git clone https://github.com/Fahad-BA/RAB.git
cd RAB
npm install
npm start
```

The server runs on `http://localhost:4002`.

## ⚙️ Configuration

### Required

The server validates these at startup and exits if any are missing:

```env
PORT=4002
DOMAIN=https://rab.fhidan.com
ADMIN_USERNAME=Fahad
ADMIN_PASSWORD=your_password_here
ADMIN_SECRET=your_session_secret
```

### Optional

```env
NODE_ENV=production        # enables secure cookies (defaults to development when unset)
```

## 🚀 Production Deployment

### systemd

Copy `rab-service.service` to `/etc/systemd/system/` and edit the environment variables. Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rab-service
sudo systemctl start rab-service
```

### Nginx Reverse Proxy

Use the included `rab.fhidan.com.nginx` as a template:

```bash
sudo cp rab.fhidan.com.nginx /etc/nginx/sites-available/rab.fhidan.com
sudo ln -s /etc/nginx/sites-available/rab.fhidan.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 📡 API Endpoints

| Method | Endpoint                | Description                        |
|--------|-------------------------|------------------------------------|
| POST   | `/upload`               | Upload a file (multipart/form)     |
| POST   | `/upload/text`          | Upload a text snippet              |
| GET    | `/:id`                  | View page for a file               |
| GET    | `/download/:id`         | Download the original file         |
| GET    | `/api/info/:id`         | File metadata as JSON              |
| GET    | `/api/file/:id`         | Raw file content                   |
| GET    | `/api/text/:id`         | Plain text content                 |
| DELETE | `/delete/:id`           | Burn (delete) a file               |
| POST   | `/api/login`            | Admin login                        |
| POST   | `/api/logout`           | Admin logout                       |
| GET    | `/admin`                | Admin dashboard (protected)        |
| GET    | `/api/admin/uploads`    | List all active uploads (protected)|
| DELETE | `/api/admin/delete/:id` | Admin delete a file (protected)    |
| GET    | `/health`               | Health check                       |

## 📄 License

This project is licensed under the MIT License.
