interface VerificationEntry {
  code: string;
  expiresAt: Date;
  attempts: number;
}

export class VerificationStore {
  private store: Map<string, VerificationEntry> = new Map();
  private readonly MAX_ATTEMPTS = 3;
  private readonly EXPIRY_MINUTES = 10;

  setVerificationCode(email: string, code: string): void {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.EXPIRY_MINUTES);
    
    this.store.set(email, {
      code,
      expiresAt,
      attempts: 0,
    });
  }

  verifyCode(email: string, code: string): boolean {
    const entry = this.store.get(email);
    if (!entry) return false;

    // Check if code has expired
    if (new Date() > entry.expiresAt) {
      this.store.delete(email);
      return false;
    }

    // Increment attempts
    entry.attempts++;
    if (entry.attempts > this.MAX_ATTEMPTS) {
      this.store.delete(email);
      return false;
    }

    // Check if code matches
    if (entry.code !== code) {
      return false;
    }

    // Code is valid, remove it from store
    this.store.delete(email);
    return true;
  }

  // Cleanup expired codes periodically
  startCleanup(): NodeJS.Timer {
    return setInterval(() => {
      const now = new Date();
      for (const [email, entry] of this.store.entries()) {
        if (now > entry.expiresAt) {
          this.store.delete(email);
        }
      }
    }, 1000 * 60); // Run every minute
  }
}

export const verificationStore = new VerificationStore();
// Start the cleanup interval
verificationStore.startCleanup();
