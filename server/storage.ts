import { users, events, type User, type Event, type InsertUser, type InsertEvent, type UpdateUser } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ne } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  // User Management Methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;

  // Event Management Methods
  createEvent(userId: number, insertEvent: InsertEvent): Promise<Event>;
  getEvent(id: number): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  getUserEvents(userId: number): Promise<Event[]>;
  updateEvent(id: number, userId: number, updateData: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<void>;

  // Admin Methods
  adminGetAllUsers(includeDeleted?: boolean): Promise<User[]>;
  adminUpdateUser(id: number, updateData: UpdateUser): Promise<User | undefined>;
  adminGetAllEvents(includeDeleted?: boolean): Promise<Event[]>;
  adminCreateAdmin(insertUser: InsertUser): Promise<User>;
  adminCreateSuperAdmin(insertUser: InsertUser): Promise<User>;
  adminUpdateEvent(id: number, updateData: Partial<InsertEvent>): Promise<Event | undefined>;
  adminSuspendUser(id: number): Promise<void>;
  adminReactivateUser(id: number): Promise<void>;
  getEventsByUserId(userId: number): Promise<Event[]>;
}

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
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(ne(users.status, 'deleted')).orderBy(desc(users.createdAt));
  }

  async deleteUser(id: number): Promise<void> {
    await db.update(users)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Event Management Methods
  async createEvent(userId: number, insertEvent: InsertEvent): Promise<Event> {
    const result = await db
      .insert(events)
      .values({ ...insertEvent, userId })
      .returning();
    return result[0];
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const result = await db.select().from(events).where(eq(events.id, id));
    return result[0];
  }

  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(desc(events.createdAt));
  }

  async getUserEvents(userId: number): Promise<Event[]> {
    return await db.select()
      .from(events)
      .where(eq(events.userId, userId))
      .orderBy(desc(events.createdAt));
  }

  async updateEvent(id: number, userId: number, updateData: Partial<InsertEvent>): Promise<Event | undefined> {
    const result = await db
      .update(events)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(events.id, id), eq(events.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  // Admin Methods
  async adminGetAllUsers(includeDeleted: boolean = false): Promise<User[]> {
    const query = includeDeleted 
      ? db.select().from(users)
      : db.select().from(users).where(ne(users.status, 'deleted'));
    return await query.orderBy(desc(users.createdAt));
  }

  async adminUpdateUser(id: number, updateData: UpdateUser): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async adminGetAllEvents(includeDeleted: boolean = false): Promise<Event[]> {
    const query = includeDeleted
      ? db.select().from(events)
      : db.select().from(events).where(ne(events.status, 'deleted'));
    return await query.orderBy(desc(events.createdAt));
  }

  async adminCreateAdmin(insertUser: InsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values({ ...insertUser, isAdmin: true })
      .returning();
    return result[0];
  }

  async adminCreateSuperAdmin(insertUser: InsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values({ ...insertUser, isAdmin: true, isSuperAdmin: true })
      .returning();
    return result[0];
  }

  async adminUpdateEvent(id: number, updateData: Partial<InsertEvent>): Promise<Event | undefined> {
    const result = await db
      .update(events)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return result[0];
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
    return await db.select()
      .from(events)
      .where(eq(events.userId, userId))
      .orderBy(desc(events.createdAt));
  }
}

export const storage = new DatabaseStorage();