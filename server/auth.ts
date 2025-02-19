import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";

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
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax'
    },
    name: 'sid',
    rolling: true
  };

  console.log('Setting up session middleware with store:', {
    hasStore: !!storage.sessionStore,
    timestamp: new Date().toISOString()
  });

  // Ensure session middleware is set up before passport
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Add registration endpoint
  app.post("/api/register", async (req, res) => {
    try {
      console.log('Registration attempt:', {
        username: req.body.username,
        timestamp: new Date().toISOString()
      });

      // Validate the input data using the schema
      const validationResult = insertUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log('Registration validation failed:', validationResult.error);
        return res.status(400).json({
          message: "Invalid registration data",
          errors: validationResult.error.errors
        });
      }

      const existingUser = await storage.getUserByUsername(req.body.username?.toLowerCase());
      if (existingUser) {
        console.log('Registration failed - username exists:', req.body.username);
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...validationResult.data,
        username: validationResult.data.username.toLowerCase(),
        password: hashedPassword
      });

      console.log('User created successfully:', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });

      req.login(user, (err) => {
        if (err) {
          console.error('Login after registration failed:', err);
          return res.status(500).json({ message: "Registration successful but login failed" });
        }

        // Save session explicitly
        req.session.save((err) => {
          if (err) {
            console.error('Session save after registration failed:', err);
            return res.status(500).json({ message: "Registration successful but session save failed" });
          }
          res.status(201).json(user);
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        message: "Registration failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Attempting login for username:", username);
        const user = await storage.getUserByUsername(username.toLowerCase());

        if (!user) {
          console.log("User not found");
          return done(null, false, { message: "Invalid username or password" });
        }

        if (user.status !== 'active') {
          console.log("User account is not active:", user.id);
          return done(null, false, { message: "This account has been deactivated" });
        }

        const isValid = await comparePasswords(password, user.password);
        console.log("Password validation result:", isValid);

        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // Ensure user has complete data before proceeding
        if (user.customerId) {
          const customer = await storage.getCustomerById(user.customerId);
          if (!customer) {
            console.log("Customer not found for user:", user.id);
            return done(null, false, { message: "Account configuration error" });
          }
        }

        console.log("Login successful for user:", {
          userId: user.id,
          timestamp: new Date().toISOString()
        });

        return done(null, user);
      } catch (err) {
        console.error("Login error:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", {
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", {
        userId: id,
        timestamp: new Date().toISOString()
      });

      const user = await storage.getUser(id);

      if (!user || user.status !== 'active') {
        console.log(`User ${id} is not active or does not exist`);
        return done(null, false);
      }

      // Ensure customer data is loaded
      if (user.customerId) {
        const customer = await storage.getCustomerById(user.customerId);
        if (!customer) {
          console.log("Customer not found during deserialization:", user.customerId);
          return done(null, false);
        }
      }

      console.log("User successfully deserialized:", {
        userId: user.id,
        hasCustomer: !!user.customerId,
        timestamp: new Date().toISOString()
      });

      done(null, user);
    } catch (error) {
      console.error("Deserialization error:", error);
      done(error);
    }
  });

  app.post("/api/login", (req, res) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      if (!user) {
        console.log("Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return res.status(500).json({ message: "Login failed" });
        }

        try {
          // Save session explicitly
          await new Promise<void>((resolve, reject) => {
            req.session.save((err) => {
              if (err) {
                console.error("Session save error:", err);
                reject(err);
              } else {
                resolve();
              }
            });
          });

          console.log("Login and session save successful:", {
            userId: user.id,
            sessionID: req.sessionID,
            timestamp: new Date().toISOString()
          });

          // Return user data only after session is saved
          return res.json(user);
        } catch (error) {
          console.error("Session save error:", error);
          return res.status(500).json({ message: "Failed to save session" });
        }
      });
    })(req, res);
  });

  app.post("/api/logout", (req, res) => {
    if (!req.user) {
      return res.sendStatus(200);
    }

    const userId = req.user.id;
    console.log("Logout attempt for user:", {
      userId,
      timestamp: new Date().toISOString()
    });

    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }

      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return res.status(500).json({ message: "Failed to destroy session" });
        }

        console.log("Logout successful:", {
          userId,
          timestamp: new Date().toISOString()
        });

        res.clearCookie('sid');
        res.sendStatus(200);
      });
    });
  });
}