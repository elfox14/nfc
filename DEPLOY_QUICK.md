# الخطوات السريعة للرفع على mcprim.com/nfc1

## ملخص تنفيذي (Quick Start)

### على السيرفر:

```bash
# 1. تثبيت المتطلبات
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm install -g pm2

# 2. نسخ المشروع
cd /var/www/
sudo git clone https://github.com/elfox14/nfc.git nfc1
cd nfc1

# 3. تثبيت dependencies
sudo npm install --production

# 4. إنشاء .env
sudo nano .env
# الصق المحتوى من ملف .env.production (انظر أدناه)

# 5. تشغيل بـ PM2
pm2 start server.js --name nfc-app
pm2 save
pm2 startup

# 6. إعداد Nginx
sudo nano /etc/nginx/sites-available/nfc1
# الصق nginx config (انظر أدناه)
sudo ln -s /etc/nginx/sites-available/nfc1 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 7. SSL
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d mcprim.com -d www.mcprim.com

# 8. Firewall
sudo ufw allow 22/80/443
sudo ufw enable

# 9. اختبر
curl https://mcprim.com/healthz
```

---

## ملف .env للإنتاج

```env
PORT=3000
NODE_ENV=production

MONGO_URI=mongodb+srv://nfc_db_user:mahMAH123MAH@cluster0.tscffw5.mongodb.net/nfc_db?retryWrites=true&w=majority
MONGO_DB=nfc_db
MONGO_DESIGNS_COLL=designs
MONGO_BACKGROUNDS_COLL=backgrounds

SITE_BASE_URL=https://mcprim.com/nfc1

JWT_SECRET=8f4c9e7a2d1b6f5e3c8a9d7b4e6f2a1c5d8e9f3a7b2c4d6e8f1a3b5c7d9e2f4a6b8c1d3e5f7a9b2c4d6e8f1a3b5c7d9e
ADMIN_TOKEN=nfc-admin-2025-secure-token
JWT_EXPIRE=7d
```

---

## Nginx Config

```nginx
server {
    listen 80;
    server_name mcprim.com www.mcprim.com;

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
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /var/www/nfc1/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /healthz {
        proxy_pass http://localhost:3000/healthz;
    }
}
```

---

## أوامر PM2 المفيدة

```bash
pm2 status              # حالة التطبيق
pm2 logs nfc-app        # عرض logs
pm2 restart nfc-app     # إعادة تشغيل
pm2 stop nfc-app        # إيقاف
pm2 delete nfc-app      # حذف
pm2 monit               # مراقبة
```

---

## التحديثات المستقبلية

```bash
cd /var/www/nfc1
git pull origin main
npm install --production
pm2 restart nfc-app
```

---

راجع `DEPLOY_TO_MCPRIM.md` للتفاصيل الكاملة!
