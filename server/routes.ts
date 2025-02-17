import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertEventSchema, insertUserSchema } from "@shared/schema";
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

    const updatedEvent = await storage.updateEvent(
      parseInt(req.params.id),
      req.user.id,
      parsed.data
    );

    res.json(updatedEvent);
  });

  app.delete("/api/events/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEvent(eventId);

      if (!event) return res.sendStatus(404);
      if (event.userId !== req.user.id && !req.user.isAdmin) return res.sendStatus(403);

      await storage.deleteEvent(eventId);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).json({ message: 'Failed to delete event' });
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

  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.sendStatus(403);

    try {
      const userId = parseInt(req.params.id);
      console.log(`Admin ${req.user.id} requested deletion of user ${userId}`);

      // First validate if the user can be deleted
      const validation = await storage.validateUserDeletion(userId);
      if (!validation.canDelete) {
        console.log(`User deletion validation failed:`, {
          userId,
          reason: validation.reason,
          timestamp: new Date().toISOString()
        });
        return res.status(400).json({
          message: validation.reason
        });
      }

      const user = validation.user!;
      console.log(`Initiating deletion process for user:`, {
        userId,
        username: user.username,
        companyId: user.companyId,
        companyName: user.companyName,
        requestedBy: req.user.id,
        timestamp: new Date().toISOString()
      });

      // First, delete all events created by this user
      await storage.deleteUserEvents(userId);

      // Then soft delete the user
      await storage.deleteUser(userId);

      console.log(`Successfully deleted user ${userId} and their associated data`);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        message: "Failed to delete user",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add a new endpoint to validate deletion before it happens
  app.get("/api/admin/users/:id/validate-deletion", async (req, res) => {
    if (!req.user?.isAdmin) return res.sendStatus(403);

    try {
      const userId = parseInt(req.params.id);
      const validation = await storage.validateUserDeletion(userId);

      if (!validation.canDelete) {
        return res.status(400).json({
          canDelete: false,
          message: validation.reason
        });
      }

      // Include additional information about what will be affected
      const events = await storage.getUserEvents(userId);

      res.json({
        canDelete: true,
        user: validation.user,
        impactedData: {
          eventsCount: events.length
        }
      });
    } catch (error) {
      console.error("Error validating user deletion:", error);
      res.status(500).json({
        message: "Failed to validate user deletion",
        error: error instanceof Error ? error.message : String(error)
      });
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
      const newUser = await storage.createUser({ // Changed to createUser
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

    const { status } = req.body as { status: 'active' | 'deleted' };
    if (status !== "active" && status !== "deleted") {
      return res.status(400).json({ message: "Invalid status. Must be 'active' or 'deleted'" });
    }

    const updatedUser = await storage.updateUser(parseInt(req.params.id), { status });
    if (!updatedUser) return res.sendStatus(404);

    res.json(updatedUser);
  });

  app.get("/api/companies/:id", async (req, res) => {
    if (!req.user) {
      console.log("GET /api/companies/:id - Unauthorized: No user in session");
      return res.sendStatus(401);
    }

    try {
      const companyId = parseInt(req.params.id);
      console.log(`GET /api/companies/${companyId} - User:`, req.user.id);

      const company = await storage.getCompany(companyId);

      if (!company) {
        console.log(`GET /api/companies/${companyId} - Company not found`);
        return res.status(404).json({ message: "Company not found" });
      }

      // Only allow users to access their own company's data
      if (company.id !== req.user.companyId && !req.user.isAdmin) {
        console.log(`GET /api/companies/${companyId} - Forbidden: User doesn't belong to company`);
        return res.sendStatus(403);
      }

      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.patch("/api/companies/:id", async (req, res) => {
    if (!req.user) {
      console.log("PATCH /api/companies/:id - Unauthorized: No user in session");
      return res.sendStatus(401);
    }

    try {
      const companyId = parseInt(req.params.id);
      console.log(`PATCH /api/companies/${companyId} - User:`, req.user.id);

      const company = await storage.getCompany(companyId);

      if (!company) {
        console.log(`PATCH /api/companies/${companyId} - Company not found`);
        return res.status(404).json({ message: "Company not found" });
      }

      // Only allow company updates from company members or admins
      if (company.id !== req.user.companyId && !req.user.isAdmin) {
        console.log(`PATCH /api/companies/${companyId} - Forbidden: User doesn't belong to company`);
        return res.sendStatus(403);
      }

      const updatedCompany = await storage.updateCompanySettings(companyId, req.body.settings || {});
      if (!updatedCompany) {
        return res.status(404).json({ message: "Failed to update company" });
      }

      res.json(updatedCompany);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  app.get("/api/companies", async (req, res) => {
    if (!req.user?.isAdmin) {
      console.log("GET /api/companies - Forbidden: User is not an admin");
      return res.sendStatus(403);
    }

    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get("/api/companies/:id/roles", async (req, res) => {
    if (!req.user?.isAdmin) return res.sendStatus(403);

    try {
      const roles = await storage.getCompanyRoles(parseInt(req.params.id));
      res.json(roles);
    } catch (error) {
      console.error("Error fetching company roles:", error);
      res.status(500).json({ message: "Failed to fetch company roles" });
    }
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
            // Type assertion to handle the mismatch between DB Event type and DOM Event
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

  app.get("/api/companies/:id/users", async (req, res) => {
    if (!req.user) {
      console.log("GET /api/companies/:id/users - Unauthorized: No user in session");
      return res.sendStatus(401);
    }

    try {
      const companyId = parseInt(req.params.id);
      console.log(`GET /api/companies/${companyId}/users - User:`, req.user.id);

      // Only allow users to access their own company's data
      if (companyId !== req.user.companyId && !req.user.isAdmin) {
        console.log(`GET /api/companies/${companyId}/users - Forbidden: User doesn't belong to company`);
        return res.sendStatus(403);
      }

      const users = await storage.getUsersByCompany(companyId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching company users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/companies/:id/users", async (req, res) => {
    if (!req.user) {
      console.log("POST /api/companies/:id/users - Unauthorized: No user in session");
      return res.sendStatus(401);
    }

    try {
      const companyId = parseInt(req.params.id);
      console.log(`POST /api/companies/${companyId}/users - User:`, req.user.id);

      if (companyId !== req.user.companyId && !req.user.isAdmin) {
        console.log(`POST /api/companies/${companyId}/users - Forbidden: User doesn't belong to company`);
        return res.sendStatus(402);
      }

      const parsed = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(parsed.password);

      const newUser = await storage.createUser({
        ...parsed,
        password: hashedPassword,
        companyId,
        companyRoleId: req.body.companyRoleId
      });

      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({
        message: "Failed to create user",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/companies/:id/users/:userId", async (req, res) => {
    if (!req.user) {
      console.log("PATCH /api/companies/:id/users/:userId - Unauthorized: No user in session");
      return res.sendStatus(401);
    }

    try {
      const companyId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      console.log(`PATCH /api/companies/${companyId}/users/${userId} - User:`, req.user.id);

      if (companyId !== req.user.companyId && !req.user.isAdmin) {
        console.log(`PATCH /api/companies/${companyId}/users/${userId} - Forbidden: User doesn't belong to company`);
        return res.sendStatus(403);
      }

      const user = await storage.getUser(userId);
      if (!user || user.companyId !== companyId) {
        return res.status(404).json({ message: "User not found" });
      }

      const updateData = { ...req.body };
      if (updateData.password) {
        updateData.password = await hashPassword(updateData.password);
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({
        message: "Failed to update user",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/companies/:id/users/:userId", async (req, res) => {
    if (!req.user) {
      console.log("DELETE /api/companies/:id/users/:userId - Unauthorized: No user in session");
      return res.sendStatus(401);
    }

    try {
      const companyId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      console.log(`DELETE /api/companies/${companyId}/users/${userId} - User:`, req.user.id);

      if (companyId !== req.user.companyId && !req.user.isAdmin) {
        console.log(`DELETE /api/companies/${companyId}/users/${userId} - Forbidden: User doesn't belong to company`);
        return res.sendStatus(403);
      }

      const user = await storage.getUser(userId);
      if (!user || user.companyId !== companyId) {
        return res.status(404).json({ message: "User not found" });
      }

      // First validate if the user can be deleted
      const validation = await storage.validateUserDeletion(userId);
      if (!validation.canDelete) {
        console.log(`User deletion validation failed:`, {
          userId,
          reason: validation.reason,
          companyId,
          timestamp: new Date().toISOString()
        });
        return res.status(400).json({ message: validation.reason });
      }

      // First delete all events created by this user
      await storage.deleteUserEvents(userId);

      // Then delete the user
      await storage.deleteUser(userId);

      console.log(`Successfully deleted user ${userId} and their associated data`);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}