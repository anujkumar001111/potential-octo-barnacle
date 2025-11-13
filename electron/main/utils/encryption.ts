export function encryptString(plaintext: string): string {
  if (!plaintext) return '';

  try {
    if (!isEncryptionAvailable()) {
      // Check environment variable
      const allowUnencrypted = process.env.ALLOW_UNENCRYPTED_KEYS === 'true';
      const isDev = process.env.NODE_ENV === 'development';

      if (!allowUnencrypted && !isDev) {
        throw new Error('Encryption unavailable and ALLOW_UNENCRYPTED_KEYS not set');
      }

      log.warn('[Encryption] Storing plain text (ALLOW_UNENCRYPTED_KEYS=true)');
      return plaintext;
    }

    const buffer = safeStorage.encryptString(plaintext);
    return `ENCRYPTED:${buffer.toString('base64')}`;
  } catch (error: any) {
    log.error('[Encryption] Failed to encrypt:', error);
    throw error; // Don't fallback silently
  }
}