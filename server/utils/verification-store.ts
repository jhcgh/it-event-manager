interface VerificationEntry {
  code: string;
  expiresAt: Date;
  attempts: number;
}

export class VerificationStore {
  private store: Map<string, VerificationEntry> = new Map();
  private readonly MAX_ATTEMPTS = 3;
  private readonly EXPIRY_MINUTES = 10;

  hasValidCode(email: string): boolean {
    const entry = this.store.get(email);
    if (!entry) {
      console.log(`[VerificationStore] No verification code found for ${email}`);
      return false;
    }

    const now = new Date();
    const isExpired = now > entry.expiresAt;
    const timeLeft = Math.floor((entry.expiresAt.getTime() - now.getTime()) / 1000);

    console.log(`[VerificationStore] Code status for ${email}:`, {
      isExpired,
      timeLeft: `${timeLeft} seconds`,
      attempts: entry.attempts,
      timestamp: new Date().toISOString()
    });

    if (isExpired) {
      console.log(`[VerificationStore] Code expired for ${email}`);
      this.store.delete(email); // Clean up expired code
      return false;
    }

    return true;
  }

  setVerificationCode(email: string, code: string): void {
    // Only set new code if there isn't a valid one
    if (!this.hasValidCode(email)) {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.EXPIRY_MINUTES);

      this.store.set(email, {
        code,
        expiresAt,
        attempts: 0,
      });

      console.log(`[VerificationStore] New code set for ${email}:`, {
        expiresAt: expiresAt.toISOString(),
        expiresIn: `${this.EXPIRY_MINUTES} minutes`,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`[VerificationStore] Skipping code generation - valid code exists for ${email}`);
    }
  }

  verifyCode(email: string, code: string): boolean {
    const entry = this.store.get(email);
    if (!entry) {
      console.log(`[VerificationStore] No verification code found for ${email}`);
      return false;
    }

    // Check if code has expired
    const now = new Date();
    if (now > entry.expiresAt) {
      console.log(`[VerificationStore] Code expired for ${email}:`, {
        expiresAt: entry.expiresAt.toISOString(),
        currentTime: now.toISOString()
      });
      this.store.delete(email);
      return false;
    }

    // Increment attempts
    entry.attempts++;
    console.log(`[VerificationStore] Verification attempt for ${email}:`, {
      attemptNumber: entry.attempts,
      maxAttempts: this.MAX_ATTEMPTS,
      timestamp: new Date().toISOString()
    });

    if (entry.attempts > this.MAX_ATTEMPTS) {
      console.log(`[VerificationStore] Max attempts exceeded for ${email}`);
      this.store.delete(email);
      return false;
    }

    // Check if code matches
    const matches = entry.code === code;
    console.log(`[VerificationStore] Code validation for ${email}:`, {
      matches,
      attemptNumber: entry.attempts,
      timestamp: new Date().toISOString()
    });

    if (!matches) {
      return false;
    }

    // Code is valid, remove it from store
    console.log(`[VerificationStore] Verification successful for ${email}`);
    this.store.delete(email);
    return true;
  }

  removeCode(email: string): void {
    if (this.store.has(email)) {
      this.store.delete(email);
      console.log(`[VerificationStore] Code removed for ${email}`);
    }
  }

  // Cleanup expired codes periodically
  startCleanup(): NodeJS.Timer {
    return setInterval(() => {
      const now = new Date();
      const initialSize = this.store.size;

      Array.from(this.store.entries()).forEach(([email, entry]) => {
        if (now > entry.expiresAt) {
          this.store.delete(email);
          console.log(`[VerificationStore] Cleaned up expired code for ${email}`);
        }
      });

      const removedCount = initialSize - this.store.size;
      if (removedCount > 0) {
        console.log(`[VerificationStore] Cleanup completed: removed ${removedCount} expired entries`);
      }
    }, 1000 * 60); // Run every minute
  }
}

export const verificationStore = new VerificationStore();
// Start the cleanup interval
verificationStore.startCleanup();