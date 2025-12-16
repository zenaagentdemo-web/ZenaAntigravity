import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }
  // Use first 32 bytes of key
  return Buffer.from(key.slice(0, 32), 'utf-8');
}

/**
 * Encrypt a token or sensitive string
 * Returns base64 encoded string with format: iv:authTag:encrypted
 */
export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine iv, authTag, and encrypted data
  const combined = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  
  return Buffer.from(combined).toString('base64');
}

/**
 * Decrypt a token or sensitive string
 */
export function decryptToken(encryptedToken: string): string {
  const key = getEncryptionKey();
  
  // Decode from base64
  const combined = Buffer.from(encryptedToken, 'base64').toString('utf8');
  const parts = combined.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash a password with salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const parts = hashedPassword.split(':');
  if (parts.length !== 2) {
    return false;
  }
  
  const salt = parts[0];
  const originalHash = parts[1];
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  
  return hash === originalHash;
}

/**
 * Generate a random token
 */
export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Aliases for backward compatibility
export const encrypt = encryptToken;
export const decrypt = decryptToken;
