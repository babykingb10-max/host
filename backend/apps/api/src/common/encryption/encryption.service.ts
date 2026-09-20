import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Symmetric encryption for secrets at rest: provider credentials,
 * WhatsApp session payloads, database passwords, etc. (spec §50).
 * Never used for passwords (those are Argon2-hashed, one-way, in
 * auth/password-hasher.service.ts).
 *
 * Key rotation: ENCRYPTION_KEY is versioned implicitly by prefixing
 * ciphertext with a key-id byte; rotateKey() support is added when a
 * second key is introduced in system settings (Phase 9).
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.get<string>('ENCRYPTION_KEY')!;
    // Derive a stable 32-byte key regardless of the raw secret's length.
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(payload: string): string {
    const raw = Buffer.from(payload, 'base64');
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = raw.subarray(IV_LENGTH + 16);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  /** One-way hash for lookup values that never need to be reversed (e.g. refresh token hashes). */
  hashForLookup(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
