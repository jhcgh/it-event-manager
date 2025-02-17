import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertEventSchema, insertUserSchema, insertCompanySchema } from "@shared/schema";
import multer from "multer";
import { createEvent } from "ics";
import sharp from "sharp";
import { parse } from 'csv-parse';
import { Readable } from 'stream';

interface FileRequest extends Request {
  file?: Express.Multer.File;
}

interface CSVEventRow {
  title: string;
  description: string;
  date: string;
  city: string;
  country: string;
  isRemote: string;
  isHybrid: string;
  type: string;
  url?: string;
  imageUrl?: string;
}

interface CSVUploadResponse {
  message: string;
  successCount: number;
  failedCount: number;
  events: Event[];
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.post("/api/admin/init", async (req, res) => {
    try {
      const adminData = {
        username: "admin@example.com",
        password: "Admin@123!",
        firstName: "System",
        lastName: "Admin",
        companyName: "SaaS Platform",
        title: "Super Administrator",
        mobile: "+1234567890"
      };

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

      const user = await storage.createUser({
        ...parsed,
        password: hashedPassword,
        status: 'active'
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

  app.patch("/api/profile", async (req, res) => {
    console.log('PATCH /api/profile - Request received:', {
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id,
      sessionID: req.sessionID,
      updates: req.body,
      timestamp: new Date().toISOString()
    });

    if (!req.user) {
      console.log('PATCH /api/profile - Unauthorized: No user in session');
      return res.sendStatus(401);
    }

    try {
      const startTime = Date.now();
      console.log('Profile update request received:', {
        userId: req.user.id,
        updates: req.body,
        timestamp: new Date().toISOString()
      });

      const updatedUser = await storage.updateUser(req.user.id, req.body);
      if (!updatedUser) {
        console.error('User not found for update:', req.user.id);
        return res.sendStatus(404);
      }

      const endTime = Date.now();
      console.log('Profile update completed:', {
        userId: req.user.id,
        processingTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString()
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Profile update failed:', {
        userId: req.user.id,
        error,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({
        message: "Failed to update profile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/events", async (req, res) => {
    const events = await storage.getAllEvents();
    res.json(events);
  });

  app.get("/api/events/:id", async (req, res) => {
    const event = await storage.getEvent(parseInt(req.params.id));
    if (!event) return res.sendStatus(404);
    res.json(event);
  });

  app.post("/api/events", upload.single("image"), async (req: FileRequest, res) => {
    if (!req.user) return res.sendStatus(401);

    const parsed = insertEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    let imageUrl;
    if (req.file) {
      try {
        const resizedImage = await sharp(req.file.buffer, {
          limitInputPixels: 1000000000
        })
          .resize(1200, 630, {
            fit: 'cover',
            position: 'center',
            withoutEnlargement: true
          })
          .jpeg({
            quality: 80,
            progressive: true,
            force: true,
            optimizeScans: true
          })
          .toBuffer();

        const filename = `${Date.now()}-${req.file.originalname.replace(/\.[^/.]+$/, "")}.jpg`;
        imageUrl = `/uploads/${filename}`;
      } catch (error) {
        console.error('Error processing image:', error);
        return res.status(500).json({ message: 'Failed to process image' });
      }
    }

    try {
      const event = await storage.createEvent(req.user.id, {
        ...parsed.data,
        imageUrl
      });
      res.status(201).json(event);
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ message: 'Failed to create event' });
    }
  });

  app.patch("/api/events/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const event = await storage.getEvent(parseInt(req.params.id));
    if (!event) return res.sendStatus(404);
    if (event.userId !== req.user.id && !req.user.isAdmin) return res.sendStatus(403);

    const parsed = insertEventSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    try {
      console.log('Updating event:', {
        eventId: req.params.id,
        userId: req.user.id,
        isAdmin: req.user.isAdmin,
        updates: req.body,
        timestamp: new Date().toISOString()
      });

      const updatedEvent = await storage.updateEvent(
        parseInt(req.params.id),
        event.userId, // Use original event's userId for admin updates
        parsed.data
      );

      if (!updatedEvent) {
        return res.status(500).json({ message: "Failed to update event" });
      }

      console.log('Event updated successfully:', {
        eventId: updatedEvent.id,
        timestamp: new Date().toISOString()
      });

      return res.json(updatedEvent);
    } catch (error) {
      console.error('Error updating event:', error);
      return res.status(500).json({
        message: "Failed to update event",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/events/:id/calendar", async (req, res) => {
    const event = await storage.getEvent(parseInt(req.params.id));
    if (!event) return res.sendStatus(404);

    const eventDate = new Date(event.date);
    const location = event.isRemote ? "Remote Event" : `${event.city}, ${event.country}`;

    const icsEvent = {
      start: [
        eventDate.getUTCFullYear(),
        eventDate.getUTCMonth() + 1,
        eventDate.getUTCDate(),
        eventDate.getUTCHours(),
        eventDate.getUTCMinutes()
      ] as [number, number, number, number, number],
      duration: { hours: 1 },
      title: event.title,
      description: event.description,
      location: location,
      url: event.url || undefined
    };

    createEvent(icsEvent, (error, value) => {
      if (error) {
        console.error('Error creating ICS event:', error);
        return res.sendStatus(500);
      }
      res.setHeader("Content-Type", "text/calendar");
      res.setHeader("Content-Disposition", `attachment; filename=${event.title}.ics`);
      res.send(value);
    });
  });

  app.get("/api/users/:id/events", async (req, res) => {
    if (!req.user?.isAdmin) return res.sendStatus(403);
    try {
      const events = await storage.getUserEvents(parseInt(req.params.id));
      res.json(events);
    } catch (error) {
      console.error("Error fetching user events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    if (!req.user?.isAdmin) return res.sendStatus(403);
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.get("/api/admin/events", async (req, res) => {
    if (!req.user?.isAdmin) {
      console.log("Unauthorized access to admin events");
      return res.sendStatus(403);
    }
    try {
      console.log("Fetching admin events for user:", req.user.id);
      const events = await storage.getAllEvents();
      console.log("Retrieved events count:", events.length);
      res.json(events);
    } catch (error) {
      console.error("Error fetching admin events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post("/api/admin/users/super", async (req, res) => {
    if (!req.user?.isAdmin) return res.sendStatus(403);
    try {
      const parsed = insertUserSchema.parse({
        ...req.body,
        isSuperAdmin: true,
        isAdmin: true,
        status: "active"
      });

      const hashedPassword = await hashPassword(parsed.password);
      const newUser = await storage.createUser({
        ...parsed,
        password: hashedPassword,
        username: parsed.username.toLowerCase()
      });

      console.log("Created super user:", { ...newUser, password: undefined });
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating super user:", error);
      res.status(500).json({ message: "Failed to create super user" });
    }
  });

  app.patch("/api/admin/users/:id/status", async (req, res) => {
    if (!req.user?.isAdmin) return res.sendStatus(403);

    const { status } = req.body as { status: 'active' | 'inactive' };
    if (status !== "active" && status !== "inactive") {
      return res.status(400).json({ message: "Invalid status. Must be 'active' or 'inactive'" });
    }

    const updatedUser = await storage.updateUser(parseInt(req.params.id), { status });
    if (!updatedUser) return res.sendStatus(404);

    res.json(updatedUser);
  });

  app.post("/api/events/upload-csv", upload.single('file'), async (req: FileRequest, res) => {
    if (!req.user) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const results: CSVEventRow[] = [];
      const parser = parse({
        columns: true,
        skip_empty_lines: true
      });

      parser.on('readable', function() {
        let record: CSVEventRow;
        while ((record = parser.read()) !== null) {
          results.push(record);
        }
      });

      const processCSV = new Promise<CSVEventRow[]>((resolve, reject) => {
        parser.on('end', () => resolve(results));
        parser.on('error', reject);
      });

      const bufferStream = new Readable();
      bufferStream.push(req.file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(parser);

      const csvData = await processCSV;

      const successfulEvents: Event[] = [];
      const failedCount = csvData.length;

      for (const row of csvData) {
        try {
          const eventData = {
            title: row.title,
            description: row.description,
            date: new Date(row.date),
            city: row.city,
            country: row.country,
            isRemote: row.isRemote === 'true',
            isHybrid: row.isHybrid === 'true',
            type: row.type,
            url: row.url || null,
            imageUrl: row.imageUrl || null,
          };

          const parsed = insertEventSchema.parse(eventData);
          const event = await storage.createEvent(req.user.id, parsed);
          if (event) {
            successfulEvents.push(event as any);
          }
        } catch (error) {
          console.error('Error processing row:', row, error);
        }
      }

      const response: CSVUploadResponse = {
        message: `Successfully imported ${successfulEvents.length} events. Failed to import ${failedCount - successfulEvents.length} events.`,
        successCount: successfulEvents.length,
        failedCount: failedCount - successfulEvents.length,
        events: successfulEvents
      };

      res.json(response);
    } catch (error) {
      console.error('CSV processing error:', error);
      res.status(500).json({ message: "Failed to process CSV file" });
    }
  });

  app.get("/api/company-settings", async (req, res) => {
    try {
      console.log('GET /api/company-settings - Request received:', {
        isAuthenticated: req.isAuthenticated(),
        userId: req.user?.id,
        companyId: req.user?.companyId,
        sessionID: req.sessionID,
        timestamp: new Date().toISOString()
      });

      if (!req.user) {
        console.log('GET /api/company-settings - Unauthorized: No user in session');
        return res.sendStatus(401);
      }

      if (!req.user.companyId) {
        console.log('GET /api/company-settings - Not Found: User has no company');
        return res.sendStatus(404);
      }

      const company = await storage.getCompany(req.user.companyId);
      if (!company) {
        console.log('GET /api/company-settings - Company not found:', req.user.companyId);
        return res.sendStatus(404);
      }

      console.log('GET /api/company-settings - Success:', {
        userId: req.user.id,
        companyId: req.user.companyId,
        timestamp: new Date().toISOString()
      });

      res.json(company);
    } catch (error) {
      console.error('Error fetching company settings:', error);
      res.status(500).json({
        message: "Failed to fetch company settings",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/company-settings", async (req, res) => {
    try {
      console.log('PATCH /api/company-settings - Request received:', {
        isAuthenticated: req.isAuthenticated(),
        userId: req.user?.id,
        companyId: req.user?.companyId,
        updates: req.body,
        timestamp: new Date().toISOString()
      });

      if (!req.user) {
        console.log('PATCH /api/company-settings - Unauthorized: No user in session');
        return res.sendStatus(401);
      }

      if (!req.user.companyId) {
        console.log('PATCH /api/company-settings - Not Found: User has no company');
        return res.sendStatus(404);
      }

      const parsed = insertCompanySchema.partial().safeParse(req.body);
      if (!parsed.success) {
        console.log('PATCH /api/company-settings - Invalid data:', parsed.error);
        return res.status(400).json(parsed.error);
      }

      const updatedCompany = await storage.updateCompany(req.user.companyId, parsed.data);
      if (!updatedCompany) {
        console.log('PATCH /api/company-settings - Company not found:', req.user.companyId);
        return res.sendStatus(404);
      }

      console.log('PATCH /api/company-settings - Success:', {
        userId: req.user.id,
        companyId: req.user.companyId,
        timestamp: new Date().toISOString()
      });

      res.json(updatedCompany);
    } catch (error) {
      console.error('Error updating company settings:', error);
      res.status(500).json({
        message: "Failed to update company settings",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}