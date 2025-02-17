import { users, events, companies, type User, type Event, type InsertUser, type InsertEvent, type Company, type InsertCompany } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ne } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;

  // Company Management Methods
  createCompany(insertCompany: InsertCompany): Promise<Company>;
  getCompany(id: number): Promise<Company | undefined>;
  updateCompanySettings(id: number, settings: Partial<Company['settings']>): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;

  // User Management Methods with Company Context
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser & { companyId?: number }): Promise<User>;
  updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByCompany(companyId: number): Promise<User[]>;

  // Event Management Methods
  createEvent(userId: number, insertEvent: InsertEvent): Promise<Event>;
  getEvent(id: number): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  getUserEvents(userId: number): Promise<Event[]>;
  updateEvent(id: number, userId: number, updateData: Partial<InsertEvent>): Promise<Event | undefined>;
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

  // Company Management Methods
  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies)
      .values(insertCompany)
      .returning();
    return company;
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.id, id));
    return result[0];
  }

  async updateCompanySettings(id: number, settings: Partial<Company['settings']>): Promise<Company | undefined> {
    const company = await this.getCompany(id);
    if (!company) return undefined;

    const updatedSettings = { ...company.settings, ...settings };
    const [result] = await db
      .update(companies)
      .set({ settings: updatedSettings, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return result;
  }

  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies).where(eq(companies.status, 'active')).orderBy(desc(companies.createdAt));
  }

  // User Management Methods with Company Context
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser & { companyId?: number }): Promise<User> {
    try {
      console.log('Starting user creation process:', {
        username: insertUser.username,
        timestamp: new Date().toISOString()
      });

      // If companyName is provided, create company first
      let companyId = insertUser.companyId;
      if (insertUser.companyName && !companyId) {
        const company = await this.createCompany({
          name: insertUser.companyName,
          settings: {},
          status: 'active'
        });
        companyId = company.id;
        console.log('Created new company:', {
          companyId,
          companyName: insertUser.companyName,
          timestamp: new Date().toISOString()
        });
      }

      // Create user with company association
      const [user] = await db.insert(users).values({
        username: insertUser.username,
        password: insertUser.password,
        firstName: insertUser.firstName,
        lastName: insertUser.lastName,
        title: insertUser.title,
        mobile: insertUser.mobile,
        companyId,
        companyName: insertUser.companyName,
        status: 'active',
        isAdmin: false,
        isSuperAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      console.log('User creation completed:', {
        userId: user.id,
        username: user.username,
        companyId: user.companyId,
        timestamp: new Date().toISOString()
      });

      return user;
    } catch (error) {
      console.error('Error in createUser:', {
        error,
        username: insertUser.username,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const startTime = Date.now();
      console.log('Storage updateUser started:', { 
        userId: id, 
        updates: updateData,
        timestamp: new Date().toISOString()
      });

      // Extract only valid update fields
      const validUpdateFields = {
        ...(updateData.username && { username: updateData.username }),
        ...(updateData.firstName && { firstName: updateData.firstName }),
        ...(updateData.lastName && { lastName: updateData.lastName }),
        ...(updateData.title && { title: updateData.title }),
        ...(updateData.mobile && { mobile: updateData.mobile }),
        ...(updateData.status && { status: updateData.status }),
        updatedAt: new Date()
      };

      // If company name is being updated, handle company creation/update
      if (updateData.companyName) {
        const user = await this.getUser(id);
        if (user) {
          if (user.companyId) {
            // Update existing company name
            await db.update(companies)
              .set({ name: updateData.companyName, updatedAt: new Date() })
              .where(eq(companies.id, user.companyId));
          } else {
            // Create new company and associate with user
            const company = await this.createCompany({
              name: updateData.companyName,
              settings: {},
              status: 'active'
            });
            // Add companyId to valid update fields
            Object.assign(validUpdateFields, { companyId: company.id });
          }
        }
      }

      const [result] = await db
        .update(users)
        .set(validUpdateFields)
        .where(eq(users.id, id))
        .returning();

      const endTime = Date.now();
      console.log('Storage updateUser completed:', { 
        userId: id, 
        processingTime: `${endTime - startTime}ms`,
        success: !!result,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(ne(users.status, 'deleted')).orderBy(desc(users.createdAt));
  }

  async getUsersByCompany(companyId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.companyId, companyId), ne(users.status, 'deleted')))
      .orderBy(desc(users.createdAt));
  }

  // Event Management Methods
  async createEvent(userId: number, insertEvent: InsertEvent): Promise<Event> {
    const [result] = await db
      .insert(events)
      .values({ ...insertEvent, userId, status: 'active' })
      .returning();
    return result;
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
    const [result] = await db
      .update(events)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(events.id, id), eq(events.userId, userId)))
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();