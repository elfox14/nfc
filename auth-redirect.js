'use strict';

(function exposeAuthRedirect(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.AuthRedirect = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis, function createAuthRedirect() {
    const MAX_REDIRECT_LENGTH = 2048;
    const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/;
    const EXPLICIT_SCHEME = /^[a-z][a-z\d+.-]*:/i;

    function getSafeTarget(candidate, fallback, locationLike) {
        if (typeof candidate !== 'string' || !candidate || candidate.length > MAX_REDIRECT_LENGTH) {
            return fallback;
        }

        const trimmed = candidate.trim();
        if (
            !trimmed ||
            CONTROL_OR_BACKSLASH.test(trimmed) ||
            EXPLICIT_SCHEME.test(trimmed) ||
            trimmed.startsWith('//')
        ) {
            return fallback;
        }

        try {
            const current = new URL(locationLike.href);
            const target = new URL(trimmed, current);
            if (target.origin !== current.origin || target.username || target.password) return fallback;
            return `${target.pathname}${target.search}${target.hash}`;
        } catch {
            return fallback;
        }
    }

    return { getSafeTarget };
});
