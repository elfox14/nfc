# 🚀 دليل الرفع على https://mcprim.com/nfc1

## المتطلبات الأساسية

قبل البدء، تأكد من توفر:
- ✅ VPS/Server يعمل بـ Ubuntu/Linux
- ✅ Root/SSH access
- ✅ Domain: mcprim.com يشير للسيرفر
- ✅ MongoDB Atlas متصل (موجود بالفعل)

---

## الخطوة 1: إعداد السيرفر

### 1.1 تحديث النظام
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 تثبيت Node.js 18+
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # تحقق من التثبيت
```

### 1.3 تثبيت PM2 (لإدارة Node.js)
```bash
sudo npm install -g pm2
```

### 1.4 تثبيت Nginx (Reverse Proxy)
```bash
sudo apt install nginx -y
```

---

## الخطوة 2: رفع المشروع

### 2.1 رفع الملفات

**الطريقة 1: باستخدام Git** (موصى به)
```bash
# على السيرفر
cd /var/www/
sudo git clone https://github.com/elfox14/nfc.git nfc1
cd nfc1
```

**الطريقة 2: باستخدام FTP/SFTP**
- استخدم FileZilla أو WinSCP
- ارفع المجلد `c:\Users\TheFo\Downloads\nfc\nfc-1`
- إلى: `/var/www/nfc1/`

### 2.2 تثبيت Dependencies
```bash
cd /var/www/nfc1
sudo npm install --production
```

### 2.3 إنشاء ملف .env للإنتاج
```bash
sudo nano .env
```

الصق المحتوى التالي:
```env
# Production Configuration
PORT=3000
NODE_ENV=production

# MongoDB Atlas (نفس الموجود)
MONGO_URI=mongodb+srv://nfc_db_user:mahMAH123MAH@cluster0.tscffw5.mongodb.net/nfc_db?retryWrites=true&w=majority
MONGO_DB=nfc_db
MONGO_DESIGNS_COLL=designs
MONGO_BACKGROUNDS_COLL=backgrounds

# Site URL (مهم!)
SITE_BASE_URL=https://mcprim.com/nfc1

# Security (غيّرها!)
JWT_SECRET=8f4c9e7a2d1b6f5e3c8a9d7b4e6f2a1c5d8e9f3a7b2c4d6e8f1a3b5c7d9e2f4a6b8c1d3e5f7a9b2c4d6e8f1a3b5c7d9e
ADMIN_TOKEN=nfc-admin-2025-secure-token
JWT_EXPIRE=7d
```

احفظ: `Ctrl+X` ثم `Y` ثم `Enter`

---

## الخطوة 3: إعداد PM2

### 3.1 تشغيل التطبيق
```bash
cd /var/www/nfc1
pm2 start server.js --name nfc-app
```

### 3.2 حفظ القائمة للتشغيل التلقائي
```bash
pm2 save
pm2 startup
# اتبع التعليمات المطبوعة
```

### 3.3 مراقبة التطبيق
```bash
pm2 status        # حالة التطبيق
pm2 logs nfc-app  # عرض logs
pm2 monit         # مراقبة مباشرة
```

---

## الخطوة 4: إعداد Nginx

### 4.1 إنشاء ملف Configuration
```bash
sudo nano /etc/nginx/sites-available/nfc
```

الصق المحتوى التالي:
```nginx
server {
    listen 80;
    server_name mcprim.com www.mcprim.com;

    # NFC Application
    location /nfc1/ {
        proxy_pass http://localhost:3000/nfc1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (uploads)
    location /uploads/ {
        alias /var/www/nfc1/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /healthz {
        proxy_pass http://localhost:3000/healthz;
    }
}
```

احفظ: `Ctrl+X` ثم `Y` ثم `Enter`

### 4.2 تفعيل الموقع
```bash
sudo ln -s /etc/nginx/sites-available/nfc /etc/nginx/sites-enabled/
sudo nginx -t  # اختبار الإعدادات
sudo systemctl reload nginx
```

---

## الخطوة 5: SSL (HTTPS) باستخدام Let's Encrypt

### 5.1 تثبيت Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 5.2 الحصول على SSL Certificate
```bash
sudo certbot --nginx -d mcprim.com -d www.mcprim.com
```

اتبع التعليمات:
1. أدخل بريدك الإلكتروني
2. وافق على الشروط
3. اختر `2` لإعادة التوجيه HTTPS تلقائياً

### 5.3 تجديد تلقائي
```bash
sudo certbot renew --dry-run  # اختبار
```

---

## الخطوة 6: الصلاحيات والأمان

### 6.1 ضبط الصلاحيات
```bash
sudo chown -R www-data:www-data /var/www/nfc
sudo chmod -R 755 /var/www/nfc
```

### 6.2 إعداد Firewall
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

## الخطوة 7: التحقق من النشر

### 7.1 اختبر الموقع
افتح المتصفح:
```
https://mcprim.com/nfc1/
https://mcprim.com/nfc1/editor.html
https://mcprim.com/api/auth/register
```

### 7.2 اختبر Health Check
```bash
curl https://mcprim.com/healthz
```

النتيجة المتوقعة:
```json
{"ok":true,"db_status":"connected"}
```

---

## الصيانة

### تحديث التطبيق
```bash
cd /var/www/nfc1
git pull origin main  # إذا استخدمت Git
npm install --production
pm2 restart nfc-app
```

### مشاهدة Logs
```bash
pm2 logs nfc-app
pm2 logs nfc-app --lines 100
```

### إعادة التشغيل
```bash
pm2 restart nfc-app
```

### إيقاف التطبيق
```bash
pm2 stop nfc-app
```

---

## استكشاف الأخطاء

### المشروع لا يعمل
```bash
pm2 logs nfc-app  # شاهد الأخطاء
pm2 restart nfc-app
```

### 502 Bad Gateway
```bash
sudo systemctl status nginx
pm2 status
# تأكد أن التطبيق يعمل على port 3000
```

### SSL لا يعمل
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## ✅ Checklist النشر

- [ ] Node.js مثبت (v18+)
- [ ] PM2 مثبت
- [ ] Nginx مثبت
- [ ] المشروع في `/var/www/nfc1/`
- [ ] `.env` محدّث بـ production settings
- [ ] PM2 يعمل: `pm2 status`
- [ ] Nginx config جاهز
- [ ] SSL مثبت (Let's Encrypt)
- [ ] Firewall مُعد
- [ ] الموقع يعمل: https://mcprim.com/nfc1/

---

## 📞 الدعم

إذا واجهت مشاكل:
1. راجع logs: `pm2 logs nfc-app`
2. تحقق من Nginx: `sudo nginx -t`
3. تحقق من MongoDB Atlas: Network Access

---

**🎉 بالتوفيق في النشر!**
