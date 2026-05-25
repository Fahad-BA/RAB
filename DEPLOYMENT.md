# 📦 حزمة نشر المشروع

## الملفات المجهزة ✅

### الجاهز للرفع
- ✅ `.gitignore` - استثناء الملفات غير المطلوبة
- ✅ `README.md` - وثائق كاملة بالعربية والإنجليزية
- ✅ `LICENSE` - رخصة MIT
- ✅ `package.json` - الاعتماديات
- ✅ `server.js` - الكود المصدري
- ✅ `public/` - صفحات الويب
  - `index.html` - الرئيسية
  - `view.html` - عرض الملفات
  - `admin.html` - لوحة التحكم
  - `login.html` - تسجيل الدخول
  - `404.html` - صفحة الخطأ

### الإضافات
- ✅ `Dockerfile` - للنشر في Docker
- ✅ `.dockerignore` - استثناءات Docker
- ✅ `rab-service.service` - ملف Systemd
- ✅ `install.sh` - سكريبت التثبيت التلقائي
- ✅ `.npmrc` - إعدادات npm
- ✅ `CONTRIBUTING.md` - دليل المساهمة
- ✅ `.prettierrc` - تنسيق الكود
- ✅ `uploads/.gitkeep` - مجلد الرفع

## خطوات الرفع إلى GitHub

### 1. تهيئة Git
```bash
cd /home/fahad/rab-service
git init
```

### 2. إضافة الملفات
```bash
git add .
```

### 3. أول Commit
```bash
git commit -m "🔥 Initial release - Read & Burn v1.0.0

Features:
- Upload files and texts
- Auto-burn after 1 hour
- Admin dashboard
- Preview files instantly
- Live countdown timer
- Burn page button
- Protected with authentication

Tech Stack:
- Node.js + Express
- Multer for uploads
- nanoid for short IDs
- Cookie-based sessions"
```

### 4. إنشاء Repository في GitHub
1. اذهب إلى https://github.com/new
2. اسم: `read-and-burn` أو `rab-service`
3. وصف: 🔥 Temporary file sharing service with auto-burn
4. Public
5. لا تضيف README (لدينا واحد)
6. انشئ Repository

### 5. ربط المحلي بالسحابة
```bash
git remote add origin https://github.com/YOUR_USERNAME/rab-service.git
git branch -M main
git push -u origin main
```

## بعد الرفع

### إضافة Tags (اختياري)
```bash
git tag v1.0.0
git push origin v1.0.0
```

### إضافة Releases
1. اذهب إلى Repository في GitHub
2. انقر على "Releases"
3. "Draft a new release"
4. Tag: `v1.0.0`
5. Title: `🔥 Read & Burn v1.0.0`
6. Description: انسخ من CHANGELOG.md
7. "Publish release"

## البيانات الحساسة

### ⚠️ تغيير قبل الإنتاج

في `server.js`، غير:
```javascript
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Fahad';
const ADMIN_PASSWORD = proces…WORD || 'PASSWORD_REMOVED';
```

واستخدم Environment Variables:
```bash
export ADMIN_USERNAME="your-username"
export ADMIN_PASSWORD="strong-password"
```

## الإنتاج

### باستخدام Docker
```bash
docker build -t rab-service .
docker run -p 4002:4002 -v $(pwd)/uploads:/app/uploads rab-service
```

### باستخدام Systemd
```bash
./install.sh
systemctl --user start rab-service
```

### يدوي
```bash
npm start
```

## ✅ كل شيء جاهز!

استبدل `YOUR_USERNAME` في الأمر `git remote` باسم حسابك، ثم نفذ الأوامر.