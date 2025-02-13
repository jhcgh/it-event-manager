import { IStorage } from "./storage";
import { User, Event, InsertUser, InsertEvent, UpdateUser, users, events } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, notEq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  // User Management Methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(notEq(users.status, 'deleted'))
      .limit(100)
      .orderBy(desc(users.createdAt));
  }

  async deleteUser(id: number): Promise<void> {
    // First delete all events associated with the user
    await db.delete(events)
      .where(eq(events.userId, id));

    // Then delete the user
    await db.update(users)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Event Management Methods
  async createEvent(userId: number, insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values({ ...insertEvent, userId })
      .returning();
    return event;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getAllEvents(): Promise<Event[]> {
    return await db.select()
      .from(events)
      .orderBy(desc(events.createdAt));
  }

  async getUserEvents(userId: number): Promise<Event[]> {
    return await db.select()
      .from(events)
      .where(eq(events.userId, userId))
      .orderBy(desc(events.createdAt));
  }

  async updateEvent(id: number, userId: number, updateData: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async deleteEvent(id: number): Promise<void> {
    const result = await db.delete(events)
      .where(eq(events.id, id))
      .returning();

    if (!result.length) {
      throw new Error('Event not found or already deleted');
    }
  }

  // Admin-specific Methods
  async adminGetAllUsers(includeDeleted: boolean = false): Promise<User[]> {
    let query = db.select().from(users);
    if (!includeDeleted) {
      query = query.where(eq(users.status, 'active'));
    }
    return await query.orderBy(desc(users.createdAt));
  }

  async adminUpdateUser(id: number, updateData: UpdateUser): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async adminGetAllEvents(includeDeleted: boolean = false): Promise<Event[]> {
    let query = db.select().from(events);
    if (!includeDeleted) {
      query = query.where(eq(events.status, 'active'));
    }
    return await query.limit(100).orderBy(desc(events.createdAt));
  }

  async adminUpdateEvent(id: number, updateData: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async adminCreateAdmin(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, isAdmin: true })
      .returning();
    return user;
  }

  async adminCreateSuperAdmin(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ 
        ...insertUser, 
        isAdmin: true,
        isSuperAdmin: true,
        status: 'active'
      })
      .returning();
    return user;
  }

  async adminSuspendUser(id: number): Promise<void> {
    await db.update(users)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async adminReactivateUser(id: number): Promise<void> {
    await db.update(users)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async getEventsByUserId(userId: number): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.userId, userId));
  }
}

export const storage = new DatabaseStorage();