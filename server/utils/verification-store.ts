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

    // Log when verification code is set (without exposing the code)
    console.log(`Verification code set for ${email}, expires in ${this.EXPIRY_MINUTES} minutes`);
  }

  verifyCode(email: string, code: string): boolean {
    const entry = this.store.get(email);
    if (!entry) {
      console.log(`No verification code found for ${email}`);
      return false;
    }

    // Check if code has expired
    if (new Date() > entry.expiresAt) {
      console.log(`Verification code expired for ${email}`);
      this.store.delete(email);
      return false;
    }

    // Increment attempts
    entry.attempts++;
    if (entry.attempts > this.MAX_ATTEMPTS) {
      console.log(`Max attempts exceeded for ${email}`);
      this.store.delete(email);
      return false;
    }

    // Check if code matches
    if (entry.code !== code) {
      console.log(`Invalid code attempt ${entry.attempts} for ${email}`);
      return false;
    }

    // Code is valid, remove it from store
    console.log(`Verification successful for ${email}`);
    this.store.delete(email);
    return true;
  }

  // Cleanup expired codes periodically
  startCleanup(): NodeJS.Timer {
    return setInterval(() => {
      const now = new Date();
      const initialSize = this.store.size;

      // Use Array.from() to avoid TypeScript iterator issues
      Array.from(this.store.entries()).forEach(([email, entry]) => {
        if (now > entry.expiresAt) {
          this.store.delete(email);
          console.log(`Cleaned up expired verification code for ${email}`);
        }
      });

      const removedCount = initialSize - this.store.size;
      if (removedCount > 0) {
        console.log(`Cleanup completed: removed ${removedCount} expired entries`);
      }
    }, 1000 * 60); // Run every minute
  }
}

export const verificationStore = new VerificationStore();
// Start the cleanup interval
verificationStore.startCleanup();