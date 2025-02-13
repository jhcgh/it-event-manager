import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertEventSchema, insertUserSchema } from "@shared/schema";
import multer from "multer";
import { createEvent } from "ics";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Initialize super admin account
  app.post("/api/admin/init", async (req, res) => {
    try {
      // Create initial admin user
      const adminData = {
        username: "admin@example.com",
        password: "Admin@123!",
        firstName: "System",
        lastName: "Admin",
        companyName: "SaaS Platform",
        title: "Super Administrator",
        mobile: "+1234567890"
      };

      // Check if admin already exists
      const existing = await storage.getUserByUsername(adminData.username);
      if (existing) {
        return res.json({ 
          message: "Admin account already exists",
          username: adminData.username,
          password: adminData.password
        });
      }

      const parsed = insertUserSchema.parse(adminData);
      const hashedPassword = await hashPassword(parsed.password);

      await storage.adminCreateSuperAdmin({
        ...parsed,
        password: hashedPassword
      });

      res.json({ 
        message: "Super admin created successfully",
        username: adminData.username,
        password: adminData.password
      });
    } catch (error) {
      console.error('Error creating super admin:', error);
      res.status(500).json({ 
        message: "Failed to create super admin",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add profile update endpoint
  app.patch("/api/profile", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const updatedUser = await storage.updateUser(req.user.id, req.body);
    if (!updatedUser) return res.sendStatus(404);

    res.json(updatedUser);
  });

  // Public event routes
  app.get("/api/events", async (req, res) => {
    const events = await storage.getAllEvents();
    res.json(events);
  });

  app.get("/api/events/:id", async (req, res) => {
    const event = await storage.getEvent(parseInt(req.params.id));
    if (!event) return res.sendStatus(404);
    res.json(event);
  });

  // Protected event routes
  app.post("/api/events", upload.single("image"), async (req: Request, res) => {
    if (!req.user) return res.sendStatus(401);

    const parsed = insertEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const event = await storage.createEvent(req.user.id, {
      ...parsed.data,
      imageUrl
    });

    res.status(201).json(event);
  });

  app.patch("/api/events/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const event = await storage.getEvent(parseInt(req.params.id));
    if (!event) return res.sendStatus(404);
    if (event.userId !== req.user.id && !req.user.isAdmin) return res.sendStatus(403);

    const parsed = insertEventSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const updatedEvent = await storage.updateEvent(
      parseInt(req.params.id),
      req.user.id,
      parsed.data
    );

    res.json(updatedEvent);
  });

  app.delete("/api/events/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const event = await storage.getEvent(parseInt(req.params.id));
    if (!event) return res.sendStatus(404);
    if (event.userId !== req.user.id) return res.sendStatus(403);

    await storage.deleteEvent(parseInt(req.params.id));
    res.sendStatus(200);
  });

  app.get("/api/events/:id/calendar", async (req, res) => {
    const event = await storage.getEvent(parseInt(req.params.id));
    if (!event) return res.sendStatus(404);

    const eventDate = new Date(event.date);
    const location = event.isRemote ? "Remote Event" : `${event.city}, ${event.country}`;

    const icsEvent = {
      start: [
        eventDate.getFullYear(),
        eventDate.getMonth() + 1,
        eventDate.getDate(),
        eventDate.getHours(),
        eventDate.getMinutes()
      ],
      title: event.title,
      description: event.description,
      location: location,
      url: event.url,
      duration: { hours: 1 } // Default to 1-hour duration
    };

    createEvent(icsEvent, (error, value) => {
      if (error) return res.sendStatus(500);
      res.setHeader("Content-Type", "text/calendar");
      res.setHeader("Content-Disposition", `attachment; filename=${event.title}.ics`);
      res.send(value);
    });
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    if (!req.user?.isAdmin) return res.sendStatus(403);
    const users = await storage.getAllUsers();
    res.json(users);
  });

  // Add admin events route
  app.get("/api/admin/events", async (req, res) => {
    if (!req.user?.isAdmin) {
      console.log("Unauthorized access to admin events");
      return res.sendStatus(403);
    }
    try {
      console.log("Fetching admin events for user:", req.user.id);
      const events = await storage.adminGetAllEvents();
      console.log("Retrieved events count:", events.length);
      res.json(events);
    } catch (error) {
      console.error("Error fetching admin events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.sendStatus(403);
    await storage.deleteUser(parseInt(req.params.id));
    res.sendStatus(200);
  });

  const httpServer = createServer(app);
  return httpServer;
}