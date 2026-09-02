'use strict';

/**
 * Converts a string (Arabic, English, or mixed) into a clean, safe, URL-friendly slug.
 * Supports Unicode letters including Arabic, removes punctuation/special characters,
 * and collapses multiple hyphens.
 * 
 * @param {string} text - The input name or title
 * @returns {string} Clean URL slug
 */
function slugifyName(text) {
  if (!text || typeof text !== 'string') return '';
  
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized;
}

/**
 * Validates if a string is a safe slug for URLs and routing.
 * @param {string} slug
 * @returns {boolean}
 */
function isValidSlug(slug) {
  if (!slug || typeof slug !== 'string') return false;
  return slug.length >= 2 && slug.length <= 80 && !/[/\\?#%&<>"']/.test(slug);
}

module.exports = { slugifyName, isValidSlug };
