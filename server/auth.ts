import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { verificationStore } from "./utils/verification-store";
import { sendVerificationCode, generateVerificationCode } from "./utils/email";

// Custom interface for verification options
interface CustomVerifyOptions {
  message: string;
  requiresVerification?: boolean;
  email?: string;
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashedPassword, salt] = stored.split(".");
    if (!hashedPassword || !salt) return false;

    const hashedBuf = Buffer.from(hashedPassword, "hex");
    const suppliedBuf = await scryptAsync(supplied, salt, 64) as Buffer;

    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

export async function setupAuth(app: Express) {
  // Generate a secure session secret if not provided
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'sid'
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Attempting login for username:", username);
        const user = await storage.getUserByUsername(username.toLowerCase());

        if (!user) {
          console.log("User not found");
          return done(null, false, { message: "Invalid username or password" } as CustomVerifyOptions);
        }

        // Check user status before validating password
        if (user.status === 'pending') {
          console.log("User account is pending verification:", user.id);

          // Only generate new code if the current one has expired
          const hasValidCode = verificationStore.hasValidCode(user.username);
          if (!hasValidCode) {
            console.log("Generating new verification code - previous code expired");
            const verificationCode = generateVerificationCode();
            verificationStore.setVerificationCode(user.username, verificationCode);
            await sendVerificationCode(user.username, verificationCode);
          }

          const verifyOptions: CustomVerifyOptions = {
            message: "Please verify your email address before logging in.",
            requiresVerification: true,
            email: user.username
          };
          return done(null, false, verifyOptions);
        }

        if (user.status !== 'active') {
          console.log("User account is not active:", user.id);
          return done(null, false, { message: "This account has been deactivated. Please contact support." } as CustomVerifyOptions);
        }

        const isValid = await comparePasswords(password, user.password);
        console.log("Password validation:", isValid);

        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" } as CustomVerifyOptions);
        }

        return done(null, user);
      } catch (err) {
        console.error("Login error:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
      const user = await storage.getUser(id);

      if (!user || user.status !== 'active') {
        console.log(`User ${id} is not active or does not exist`);
        return done(null, false);
      }

      console.log("User successfully deserialized:", user.id);
      done(null, user);
    } catch (error) {
      console.error("Deserialization error:", error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration attempt for:", req.body.username);

      // First check if user exists before doing anything else
      const existingUser = await storage.getUserByUsername(req.body.username.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Ensure complete session cleanup
      if (req.session) {
        await new Promise<void>((resolve, reject) => {
          req.session.destroy((err) => {
            if (err) {
              console.error("Error destroying session:", err);
              reject(err);
            } else {
              console.log("Session successfully destroyed");
              resolve();
            }
          });
        });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const verificationCode = generateVerificationCode();

      // Create user with pending status
      const user = await storage.createUser({
        ...req.body,
        username: req.body.username.toLowerCase(),
        password: hashedPassword,
        status: 'pending'
      });

      console.log("Created user with pending status:", {
        userId: user.id,
        username: user.username,
        status: user.status
      });

      // Store verification code
      verificationStore.setVerificationCode(user.username, verificationCode);

      // Send verification email
      const emailSent = await sendVerificationCode(user.username, verificationCode);
      if (!emailSent) {
        console.error("Failed to send verification email to:", user.username);
        return res.status(500).json({ 
          message: "Account created but failed to send verification email. Please contact support."
        });
      }

      // Clear any existing session cookie
      res.clearCookie('sid');

      console.log("Registration successful, verification required:", {
        userId: user.id,
        username: user.username,
        requiresVerification: true
      });

      // Send response with verification required status
      res.status(201).json({
        message: "Please check your email for a verification code to activate your account.",
        requiresVerification: true,
        email: user.username
      });
    } catch (err) {
      console.error("Registration error:", err);
      next(err);
    }
  });

  app.post("/api/verify-email", async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    const isValid = verificationStore.verifyCode(email, code);
    if (!isValid) {
      // If code is invalid or expired, generate and send a new one
      const newVerificationCode = generateVerificationCode();
      verificationStore.setVerificationCode(email, newVerificationCode);
      await sendVerificationCode(email, newVerificationCode);

      return res.status(400).json({ 
        message: "Verification code has expired or is invalid. A new code has been sent to your email.",
        codeExpired: true
      });
    }

    try {
      const user = await storage.getUserByUsername(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Activate the user
      const updatedUser = await storage.updateUser(user.id, { status: 'active' });
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to activate user" });
      }

      // Remove the verification code after successful verification
      verificationStore.removeCode(email);

      res.json({ message: "Email verified successfully. You can now log in." });
    } catch (error) {
      console.error("Error during email verification:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: CustomVerifyOptions) => {
      if (err) {
        console.error("Authentication error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Authentication failed:", info?.message);
        // If verification is required, include that in the response
        return res.status(401).json({
          message: info?.message || "Authentication failed",
          requiresVerification: info?.requiresVerification,
          email: info?.email
        });
      }

      if (user.status === 'pending') {
        console.log("User account is pending verification:", user.id);
        return res.status(401).json({ 
          message: "Please verify your email address before logging in.",
          requiresVerification: true,
          email: user.username
        });
      }

      if (user.status !== 'active') {
        console.log("User account is not active:", user.id);
        return res.status(401).json({ 
          message: "This account has been deactivated. Please contact support." 
        });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }
        console.log("Login successful for user:", user.username);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    if (req.session) {
      console.log("Logging out user:", req.user?.id);
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return next(err);
        }
        res.clearCookie('sid');
        console.log("Session destroyed and cookie cleared");
        res.sendStatus(200);
      });
    } else {
      res.sendStatus(200);
    }
  });

  app.get("/api/user", (req, res) => {
    console.log('GET /api/user - Session info:', {
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id,
      sessionID: req.sessionID,
      timestamp: new Date().toISOString()
    });

    if (!req.isAuthenticated()) {
      console.log('GET /api/user - Unauthorized: No valid session');
      return res.sendStatus(401);
    }
    res.json(req.user);
  });
}