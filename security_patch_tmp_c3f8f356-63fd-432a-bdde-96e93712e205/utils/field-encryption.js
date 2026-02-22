const crypto = require('crypto');
const ALGO = 'aes-256-gcm';
const KEY_HEX = process.env.FIELD_ENCRYPTION_KEY;
if (!KEY_HEX) throw new Error('Missing FIELD_ENCRYPTION_KEY env var');
const KEY = Buffer.from(KEY_HEX, 'hex'); // 32 bytes

function encrypt(text) {
  if (text == null) return text;
  const iv = crypto.randomBytes(12); // 96-bit iv for GCM
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv:encrypted:tag, ?? ??? ?? hex
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

function decrypt(payload) {
  if (!payload) return payload;
  const [ivHex, encryptedHex, tagHex] = payload.split(':');
  if (!ivHex || !encryptedHex || !tagHex) return null;
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
