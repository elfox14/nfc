// service-worker.js

// اسم الكاش الحالي. عند تغيير هذا الاسم (مثلاً إلى v2)، سيعتبره المتصفح
// إصدارًا جديدًا من الـ Service Worker ويقوم بتشغيل عملية التحديث.
const CACHE_NAME = 'digital-card-editor-cache-v2';

// قائمة بالملفات الأساسية بعد تصحيح المسارات
const urlsToCache = [
  './', // <-- يشير إلى المجلد الحالي للتطبيق
  'index.html',
  'style.css',
  'script.js',
  'manifest.json', // <-- إضافة ملف المانيفست مهم أيضًا
  // استخدام الرابط الكامل والمؤكد للصورة
  'https://www.elfoxdm.com/elfox/mcprime-logo-transparent.png'
];

// --- مرحلة التثبيت (Install) ---
// يتم تشغيل هذا الحدث عند تثبيت الـ Service Worker لأول مرة أو عند تحديثه.
self.addEventListener('install', event => {
  // انتظر حتى تكتمل عملية التخزين المؤقت للملفات الأساسية.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        // قم بتخزين جميع الملفات المحددة فيurlsToCache.
        return cache.addAll(urlsToCache);
      })
  );
});

// --- مرحلة التفعيل (Activate) ---
// يتم تشغيل هذا الحدث بعد تثبيت الـ Service Worker بنجاح وتفعيله.
// هذا هو المكان المثالي لتنظيف الكاشات القديمة.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      // انتظر حتى تكتمل جميع عمليات الحذف.
      return Promise.all(
        // قم بالمرور على جميع أسماء الكاشات الموجودة.
        cacheNames.map(cacheName => {
          // إذا كان اسم الكاش لا يطابق اسم الكاش الحالي (CACHE_NAME)،
          // فهذا يعني أنه إصدار قديم ويجب حذفه.
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// --- مرحلة جلب البيانات (Fetch) ---
// يعترض هذا الحدث جميع طلبات الشبكة (مثل الصور، الصفحات، إلخ).
self.addEventListener('fetch', event => {
  event.respondWith(
    // ابحث عن الطلب في الكاش أولاً (استراتيجية Cache First).
    caches.match(event.request)
      .then(response => {
        // إذا كان الرد موجودًا في الكاش، قم بإرجاعه مباشرة.
        if (response) {
          return response;
        }
        // إذا لم يكن موجودًا، اطلبه من الشبكة كالمعتاد.
        return fetch(event.request);
      })
  );
});