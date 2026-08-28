// Service Worker registration — extracted from inline <script> in every HTML page.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/nfc/sw.js', { scope: '/nfc/' }).catch(function (e) {
    console.warn('SW reg failed:', e);
  });
}
