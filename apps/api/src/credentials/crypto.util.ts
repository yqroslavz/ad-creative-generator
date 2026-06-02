import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export function loadMasterKey(raw: string): Buffer {
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes, got ${buf.length}`,
    );
  }
  return buf;
}

export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decrypt(payload: string, key: Buffer): string {
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Encrypted payload is malformed');
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

export function previewOf(rawKey: string): string {
  const trimmed = rawKey.trim();
  const last4 = trimmed.slice(-4);
  const knownPrefixes = ['sk-ant-', 'sk-proj-', 'sk-or-', 'sk-', 'AIza'];
  const prefix = knownPrefixes.find((p) => trimmed.startsWith(p)) ?? '';
  return `${prefix}...${last4}`;
}
