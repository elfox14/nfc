# 🚀 دليل النشر على Production

## المحتويات
- [التحضير للنشر](#التحضير-للنشر)
- [النشر باستخدام Docker](#النشر-باستخدام-docker)
- [النشر على VPS](#النشر-على-vps)
- [النشر على منصات سحابية](#النشر-على-منصات-سحابية)
- [التحقق من النشر](#التحقق-من-النشر)

---

## التحضير للنشر

### 1. تحديث المتغيرات البيئية
```bash
# انسخ .env.example وعدّله
cp .env.example .env

# تأكد من تعديل:
NODE_ENV=production
SITE_BASE_URL=https://yourdomain.com
JWT_SECRET=<secret قوي>
ADMIN_TOKEN=<token قوي>
```

### 2. تثبيت Dependencies
```bash
npm install --production
```

### 3. إنشاء Indexes
```bash
npm run create-indexes
```

---

## النشر باستخدام Docker

### الطريقة 1: Docker Compose (موصى به)

#### 1. إعداد Environment
```bash
cp .env.docker .env
# عدّل القيم في .env
```

#### 2. Build & Run
```bash
docker-compose up -d
```

#### 3. مشاهدة Logs
```bash
docker-compose logs -f app
```

#### 4. إنشاء Indexes
```bash
docker-compose exec app npm run create-indexes
```

#### 5. الإيقاف
```bash
docker-compose down
```

### الطريقة 2: Docker فقط

```bash
# Build image
docker build -t nfc-app .

# Run container
docker run -d \
  -p 3000:3000 \
  -e MONGO_URI=mongodb://your-mongo:27017 \
  -e REDIS_URL=redis://your-redis:6379 \
  -e JWT_SECRET=your-secret \
  -e SITE_BASE_URL=https://yourdomain.com \
  --name nfc-app \
  nfc-app
```

---

## النشر على VPS

### 1. تثبيت المتطلبات

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# تثبيت MongoDB
# راجع: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/

# تثبيت Redis
sudo apt install redis-server -y

# تثبيت PM2
sudo npm install -g pm2
```

### 2. نسخ المشروع

```bash
# Clone repository
git clone https://github.com/elfox14/nfc.git
cd nfc

# تثبيت dependencies
npm install --production

# إعداد .env
cp .env.example .env
nano .env  # عدّل القيم
```

### 3. إنشاء Indexes

```bash
npm run create-indexes
```

### 4. تشغيل بواسطة PM2

```bash
# Start application
pm2 start server.js --name nfc-app

# Save PM2 process list
pm2 save

# Setup auto-start on boot
pm2 startup

# مشاهدة logs
pm2 logs nfc-app

# مراقبة الأداء
pm2 monit
```

### 5. إعداد Nginx (Reverse Proxy)

```nginx
# /etc/nginx/sites-available/nfc

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location /uploads {
        alias /path/to/nfc/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/nfc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL باستخدام Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## النشر على Render.com

### 1. إعداد Repository
- تأكد من push على GitHub

### 2. إنشاء خدمة جديدة
- اذهب إلى Render Dashboard
- New > Web Service
- اربط GitHub repository

### 3. ضبط الإعدادات
```
Build Command: npm install
Start Command: npm start
```

### 4. Environment Variables
أضف جميع المتغيرات من `.env.example`

### 5. إضافة MongoDB Atlas
- أنشئ cluster على MongoDB Atlas
- احصل على connection string
- أضفه كـ `MONGO_URI`

### 6. إضافة Redis (اختياري)
- استخدم Redis addon من Render
- أو استخدم Upstash Redis

---

## النشر على Heroku

### 1. تثبيت Heroku CLI
```bash
npm install -g heroku
heroku login
```

### 2. إنشاء App
```bash
heroku create your-app-name
```

### 3. إضافة Add-ons
```bash
# MongoDB
heroku addons:create mongolab:sandbox

# Redis
heroku addons:create heroku-redis:hobby-dev
```

### 4. ضبط Environment Variables
```bash
heroku config:set JWT_SECRET=your-secret
heroku config:set ADMIN_TOKEN=your-token
heroku config:set SITE_BASE_URL=https://your-app-name.herokuapp.com
```

### 5. Deploy
```bash
git push heroku main
```

### 6. إنشاء Indexes
```bash
heroku run npm run create-indexes
```

---

## التحقق من النشر

### 1. Health Check
```bash
curl https://yourdomain.com/healthz
```

الرد المتوقع:
```json
{
  "ok": true,
  "db_status": "connected"
}
```

### 2. اختبار التسجيل
```bash
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

### 3. اختبار الأداء
```bash
# تثبيت Apache Bench
sudo apt install apache2-utils

# اختبار التحمل
ab -n 1000 -c 10 https://yourdomain.com/
```

---

## الصيانة والمراقبة

### Backup قاعدة البيانات

```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/nfc_db" --out=/backup/$(date +%Y%m%d)

# Redis backup
redis-cli BGSAVE
```

### تحديث التطبيق

```bash
# VPS + PM2
git pull origin main
npm install --production
pm2 restart nfc-app

# Docker
docker-compose down
git pull origin main
docker-compose up -d --build
```

### مراقبة Logs

```bash
# PM2
pm2 logs nfc-app --lines 100

# Docker
docker-compose logs -f app --tail=100
```

---

## استكشاف الأخطاء الشائعة

### خطأ: "Cannot connect to MongoDB"
**الحل:** تحقق من `MONGO_URI` وأن MongoDB يعمل

### خطأ: "JWT_SECRET is not defined"
**الحل:** أضف `JWT_SECRET` في `.env`

### خطأ: Redis connection failed
**الحل:** التطبيق سيعمل بدون Redis، لكن بأداء أقل

---

## الأمان في Production

- ✅ استخدم HTTPS دائماً
- ✅ غيّر جميع القيم الافتراضية (JWT_SECRET, ADMIN_TOKEN)
- ✅ فعّل Firewall
  ```bash
  sudo ufw allow 22
  sudo ufw allow 80
  sudo ufw allow 443
  sudo ufw enable
  ```
- ✅ حدّث النظام بشكل دوري
- ✅ فعّل MongoDB authentication
- ✅ راقب الـ logs بانتظام

---

## Performance Optimization

### 1. تفعيل Gzip (Nginx)
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### 2. CDN للملفات الثابتة
- استخدم Cloudinary للصور
- استخدم CloudFlare للـ static assets

### 3. Database Indexes
- تأكد من تشغيل `npm run create-indexes`
- راجع query performance

---

**🎉 تهانينا! تطبيقك الآن على Production**

لأي مساعدة: https://github.com/elfox14/nfc/issues
