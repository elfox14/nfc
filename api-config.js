/**
 * MC PRIME NFC — API Configuration (Client-Side)
 * 
 * This is the SINGLE source of truth for the backend API URL.
 * All client-side files should reference window.__API_BASE_URL
 * instead of hardcoding the backend address.
 */
(function () {
    'use strict';

    var hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        window.__API_BASE_URL = 'http://localhost:3000';
    } else {
        // Production backend — change this if your backend URL changes
        window.__API_BASE_URL = 'https://nfc-vjy6.onrender.com';
    }
})();
