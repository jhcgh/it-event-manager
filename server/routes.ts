import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertEventSchema, insertUserSchema, insertCustomerSchema } from "@shared/schema";
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
        customerName: "SaaS Platform",
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
        event.userId,
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

  app.get("/api/customer-settings", async (req, res) => {
    try {
      console.log('GET /api/customer-settings - Request received:', {
        isAuthenticated: req.isAuthenticated(),
        userId: req.user?.id,
        customerId: req.user?.customerId,
        sessionID: req.sessionID,
        timestamp: new Date().toISOString()
      });

      if (!req.user) {
        console.log('GET /api/customer-settings - Unauthorized: No user in session');
        return res.sendStatus(401);
      }

      if (!req.user.customerId) {
        console.log('GET /api/customer-settings - Not Found: User has no customer');
        return res.sendStatus(404);
      }

      const customer = await storage.getCustomerById(req.user.customerId);
      if (!customer) {
        console.log('GET /api/customer-settings - Customer not found:', req.user.customerId);
        return res.sendStatus(404);
      }

      console.log('GET /api/customer-settings - Success:', {
        userId: req.user.id,
        customerId: req.user.customerId,
        timestamp: new Date().toISOString()
      });

      res.json(customer);
    } catch (error) {
      console.error('Error fetching customer settings:', error);
      res.status(500).json({
        message: "Failed to fetch customer settings",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/customer-settings", async (req, res) => {
    try {
      console.log('PATCH /api/customer-settings - Request received:', {
        isAuthenticated: req.isAuthenticated(),
        userId: req.user?.id,
        customerId: req.user?.customerId,
        updates: req.body,
        timestamp: new Date().toISOString()
      });

      if (!req.user) {
        console.log('PATCH /api/customer-settings - Unauthorized: No user in session');
        return res.sendStatus(401);
      }

      if (!req.user.customerId) {
        console.log('PATCH /api/customer-settings - Not Found: User has no customer');
        return res.sendStatus(404);
      }

      const parsed = insertCustomerSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        console.log('PATCH /api/customer-settings - Invalid data:', parsed.error);
        return res.status(400).json(parsed.error);
      }

      const updatedCustomer = await storage.updateCustomerById(req.user.customerId, parsed.data);
      if (!updatedCustomer) {
        console.log('PATCH /api/customer-settings - Customer not found:', req.user.customerId);
        return res.sendStatus(404);
      }

      console.log('PATCH /api/customer-settings - Success:', {
        userId: req.user.id,
        customerId: req.user.customerId,
        timestamp: new Date().toISOString()
      });

      res.json(updatedCustomer);
    } catch (error) {
      console.error('Error updating customer settings:', error);
      res.status(500).json({
        message: "Failed to update customer settings",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/admin/customers", async (req, res) => {
    if (!req.user?.isAdmin) return res.sendStatus(403);
    try {
      console.log('Fetching all customers');
      const customers = await storage.getAllCustomers();
      console.log(`Retrieved ${customers.length} customers`);
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.delete("/api/admin/customers/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.sendStatus(403);
    try {
      const customerId = parseInt(req.params.id);
      console.log(`Attempting to delete customer: ${customerId}`);

      // Check if customer exists
      const customer = await storage.getCustomerById(customerId);
      if (!customer) {
        console.log(`Customer not found: ${customerId}`);
        return res.sendStatus(404);
      }

      // Update customer status to inactive instead of deleting
      const updatedCustomer = await storage.updateCustomerById(customerId, { status: 'inactive' });
      if (!updatedCustomer) {
        throw new Error('Failed to update customer status');
      }

      console.log(`Successfully deactivated customer: ${customerId}`);
      res.json({ message: "Customer successfully deactivated" });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({
        message: "Failed to delete customer",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Customer user management endpoints
  app.get("/api/customers/:customerId/users", async (req, res) => {
    try {
      console.log('GET /api/customers/:customerId/users - Request received:', {
        isAuthenticated: req.isAuthenticated(),
        userId: req.user?.id,
        customerId: req.params.customerId,
        timestamp: new Date().toISOString()
      });

      if (!req.user) {
        console.log('Unauthorized: No user in session');
        return res.sendStatus(401);
      }

      const customerId = parseInt(req.params.customerId);
      if (req.user.customerId !== customerId && !req.user.isAdmin) {
        console.log('Forbidden: User does not belong to this customer');
        return res.sendStatus(403);
      }

      const users = await storage.getCustomerUsers(customerId);
      console.log(`Retrieved ${users.length} users for customer ${customerId}`);
      res.json(users);
    } catch (error) {
      console.error('Error fetching customer users:', error);
      res.status(500).json({
        message: "Failed to fetch users",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/customers/:customerId/users", async (req, res) => {
    try {
      console.log('POST /api/customers/:customerId/users - Request received:', {
        isAuthenticated: req.isAuthenticated(),
        userId: req.user?.id,
        customerId: req.params.customerId,
        timestamp: new Date().toISOString()
      });

      if (!req.user) {
        console.log('Unauthorized: No user in session');
        return res.sendStatus(401);
      }

      const customerId = parseInt(req.params.customerId);
      if (req.user.customerId !== customerId && !req.user.isAdmin) {
        console.log('Forbidden: User does not belong to this customer');
        return res.sendStatus(403);
      }

      // Get customer information first
      const customer = await storage.getCustomerById(customerId);
      if (!customer) {
        console.log('Customer not found:', customerId);
        return res.status(404).json({ message: "Customer not found" });
      }

      console.log('Found customer:', {
        customerId: customer.id,
        customerName: customer.name,
        timestamp: new Date().toISOString()
      });

      // Prepare user data with customer information
      const userData = {
        ...req.body,
        customerName: customer.name, // Add customer name from the existing customer
        status: 'active'
      };

      console.log('Prepared user data:', {
        ...userData,
        password: '[REDACTED]',
        timestamp: new Date().toISOString()
      });

      // Validate the prepared data
      const parsed = insertUserSchema.parse(userData);

      console.log('Validation passed, creating user');

      // Hash password and create user
      const hashedPassword = await hashPassword(parsed.password);
      const newUser = await storage.createUser({
        ...parsed,
        password: hashedPassword,
        username: parsed.username.toLowerCase(),
        customerId
      });

      console.log('Created user:', { id: newUser.id, customerId });
      res.status(201).json(newUser);
    } catch (error) {
      console.error('Error creating user:', {
        error,
        requestBody: { ...req.body, password: '[REDACTED]' },
        timestamp: new Date().toISOString()
      });
      res.status(500).json({
        message: "Failed to create user",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/customers/:customerId/users/:id", async (req, res) => {
    try {
      console.log('PATCH /api/customers/:customerId/users/:id - Request received:', {
        isAuthenticated: req.isAuthenticated(),
        userId: req.user?.id,
        customerId: req.params.customerId,
        targetUserId: req.params.id,
        timestamp: new Date().toISOString()
      });

      if (!req.user) {
        console.log('Unauthorized: No user in session');
        return res.sendStatus(401);
      }

      const customerId = parseInt(req.params.customerId);
      if (req.user.customerId !== customerId && !req.user.isAdmin) {
        console.log('Forbidden: User does not belong to this customer');
        return res.sendStatus(403);
      }

      const userId = parseInt(req.params.id);
      const targetUser = await storage.getUser(userId);

      if (!targetUser || targetUser.customerId !== customerId) {
        console.log('User not found or does not belong to customer:', { userId, customerId });
        return res.status(404).json({ message: "User not found" });
      }

      // Don't allow password updates through this endpoint
      const parsed = insertUserSchema.omit({ password: true }).partial().parse(req.body);

      const updatedUser = await storage.updateUser(userId, {
        ...parsed,
        username: parsed.username?.toLowerCase()
      });

      if (!updatedUser) {
        console.log('Failed to update user:', userId);
        return res.status(500).json({ message: "Failed to update user" });
      }

      console.log('Updated user:', { id: updatedUser.id, customerId });
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        message: "Failed to update user",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}