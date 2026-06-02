import { randomBytes } from 'node:crypto';
import { decrypt, encrypt, loadMasterKey, previewOf } from './crypto.util';

describe('crypto.util', () => {
  const key = randomBytes(32);

  describe('encrypt/decrypt round-trip', () => {
    it('decrypts back to the original plaintext', () => {
      const secret = 'sk-ant-abc123XYZ-789';
      const enc = encrypt(secret, key);
      expect(decrypt(enc, key)).toBe(secret);
    });

    it('ciphertext does not contain the plaintext', () => {
      const secret = 'super-secret-value';
      const enc = encrypt(secret, key);
      expect(enc).not.toContain(secret);
    });

    it('produces different ciphertexts for the same plaintext (IV randomness)', () => {
      const a = encrypt('identical', key);
      const b = encrypt('identical', key);
      expect(a).not.toBe(b);
    });

    it('handles non-ASCII plaintext', () => {
      const secret = 'ключ-🔑-värde';
      expect(decrypt(encrypt(secret, key), key)).toBe(secret);
    });
  });

  describe('integrity', () => {
    it('decrypt fails with the wrong master key', () => {
      const enc = encrypt('payload', key);
      const otherKey = randomBytes(32);
      expect(() => decrypt(enc, otherKey)).toThrow();
    });

    it('decrypt fails when the ciphertext is tampered with', () => {
      const enc = encrypt('payload', key);
      const tampered = Buffer.from(enc, 'base64');
      tampered[tampered.length - 1] ^= 1;
      expect(() => decrypt(tampered.toString('base64'), key)).toThrow();
    });

    it('decrypt rejects malformed (too-short) payload', () => {
      expect(() => decrypt('aGVsbG8=', key)).toThrow();
    });
  });

  describe('loadMasterKey', () => {
    it('accepts a base64-encoded 32-byte key', () => {
      const raw = randomBytes(32).toString('base64');
      expect(loadMasterKey(raw).length).toBe(32);
    });

    it('rejects a key of the wrong length', () => {
      expect(() => loadMasterKey(randomBytes(31).toString('base64'))).toThrow();
      expect(() => loadMasterKey(randomBytes(64).toString('base64'))).toThrow();
    });
  });

  describe('previewOf', () => {
    it('keeps known prefix + last 4 chars', () => {
      expect(previewOf('sk-ant-api03-AAAAAAAAAA-Wxyz')).toBe('sk-ant-...Wxyz');
      expect(previewOf('sk-proj-AAAAAAAA-1234')).toBe('sk-proj-...1234');
      expect(previewOf('AIzaSy-fake-gemini-key-LAST')).toBe('AIza...LAST');
    });

    it('falls back to last 4 chars only for unknown formats', () => {
      expect(previewOf('opaque-key-9999')).toBe('...9999');
    });
  });
});
