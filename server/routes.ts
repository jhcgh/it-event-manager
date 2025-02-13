import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertEventSchema } from "@shared/schema";
import multer from "multer";
import { createEvent } from "ics";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

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

  app.get("/api/events/:id/calendar", async (req, res) => {
    const event = await storage.getEvent(parseInt(req.params.id));
    if (!event) return res.sendStatus(404);

    const eventDate = new Date(event.date);
    const icsEvent = {
      start: [eventDate.getFullYear(), eventDate.getMonth() + 1, eventDate.getDate()],
      title: event.title,
      description: event.description,
      location: event.location,
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

  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.sendStatus(403);
    await storage.deleteUser(parseInt(req.params.id));
    res.sendStatus(200);
  });

  const httpServer = createServer(app);
  return httpServer;
}