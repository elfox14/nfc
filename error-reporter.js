/**
 * MC PRIME NFC — Client-side Error Reporter
 * Catches unhandled JS errors and sends them to the server for monitoring.
 * Lightweight (<1KB), no dependencies.
 */
(function () {
  'use strict';

  const REPORT_URL = '/api/client-error';
  const MAX_ERRORS_PER_SESSION = 10; // Don't flood the server
  let errorCount = 0;

  function reportError(data) {
    if (errorCount >= MAX_ERRORS_PER_SESSION) return;
    errorCount++;

    try {
      const payload = {
        message: data.message || 'Unknown error',
        source: data.source || '',
        line: data.line || 0,
        col: data.col || 0,
        stack: data.stack || '',
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 120),
        timestamp: new Date().toISOString(),
      };

      // Use sendBeacon for reliability (works even during page unload)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(REPORT_URL, JSON.stringify(payload));
      } else {
        fetch(REPORT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {}); // Silently fail
      }
    } catch (e) {
      // Don't let the error reporter itself throw
    }
  }

  // Global error handler
  window.addEventListener('error', function (event) {
    reportError({
      message: event.message,
      source: event.filename,
      line: event.lineno,
      col: event.colno,
      stack: event.error?.stack?.split('\n').slice(0, 5).join('\n') || '',
    });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', function (event) {
    const reason = event.reason;
    reportError({
      message: reason?.message || String(reason) || 'Unhandled Promise Rejection',
      source: 'promise',
      stack: reason?.stack?.split('\n').slice(0, 5).join('\n') || '',
    });
  });
})();
