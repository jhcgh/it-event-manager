import { users, events, companies, companyRoles, type User, type Event, type InsertUser, type InsertEvent, type UpdateUser, type Company, type InsertCompany, type CompanyRole, type InsertCompanyRole } from "@shared/schema";
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

  // Company Role Management Methods
  createCompanyRole(insertRole: InsertCompanyRole): Promise<CompanyRole>;
  getCompanyRole(id: number): Promise<CompanyRole | undefined>;
  updateCompanyRole(id: number, updateData: Partial<InsertCompanyRole>): Promise<CompanyRole | undefined>;
  getCompanyRoles(companyId: number): Promise<CompanyRole[]>;

  // User Management Methods with Company Context
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser & { companyId: number, companyRoleId?: number }): Promise<User>;
  updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  getUsersByCompany(companyId: number): Promise<User[]>;

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

  // Company Management Methods
  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const values = {
      ...insertCompany,
      settings: {
        maxUsers: insertCompany.settings?.maxUsers ?? 10,
        maxEvents: insertCompany.settings?.maxEvents ?? 20,
        allowedEventTypes: insertCompany.settings?.allowedEventTypes ?? ["conference", "workshop", "seminar"],
        requireEventApproval: insertCompany.settings?.requireEventApproval ?? false
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as const;
    const result = await db.insert(companies).values([values]).returning();
    return result[0];
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.id, id));
    return result[0];
  }

  async updateCompanySettings(id: number, settings: Partial<Company['settings']>): Promise<Company | undefined> {
    const company = await this.getCompany(id);
    if (!company) return undefined;

    const updatedSettings = { ...company.settings, ...settings };
    const result = await db
      .update(companies)
      .set({ settings: updatedSettings, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return result[0];
  }

  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies).where(eq(companies.status, 'active')).orderBy(desc(companies.createdAt));
  }

  // Company Role Management Methods
  async createCompanyRole(insertRole: InsertCompanyRole): Promise<CompanyRole> {
    const values = {
      ...insertRole,
      permissions: {
        canManageUsers: insertRole.permissions?.canManageUsers ?? false,
        canCreateEvents: insertRole.permissions?.canCreateEvents ?? false,
        canDeleteEvents: insertRole.permissions?.canDeleteEvents ?? false,
        canManageSettings: insertRole.permissions?.canManageSettings ?? false
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as const;
    const result = await db.insert(companyRoles).values([values]).returning();
    return result[0];
  }

  async getCompanyRole(id: number): Promise<CompanyRole | undefined> {
    const result = await db.select().from(companyRoles).where(eq(companyRoles.id, id));
    return result[0];
  }

  async updateCompanyRole(id: number, updateData: Partial<InsertCompanyRole>): Promise<CompanyRole | undefined> {
    const values = {
      name: updateData.name,
      permissions: updateData.permissions ? {
        canManageUsers: updateData.permissions.canManageUsers ?? false,
        canCreateEvents: updateData.permissions.canCreateEvents ?? false,
        canDeleteEvents: updateData.permissions.canDeleteEvents ?? false,
        canManageSettings: updateData.permissions.canManageSettings ?? false
      } : undefined,
      updatedAt: new Date(),
    } as const;
    const result = await db
      .update(companyRoles)
      .set(values)
      .where(eq(companyRoles.id, id))
      .returning();
    return result[0];
  }

  async getCompanyRoles(companyId: number): Promise<CompanyRole[]> {
    return await db
      .select()
      .from(companyRoles)
      .where(eq(companyRoles.companyId, companyId))
      .orderBy(desc(companyRoles.createdAt));
  }

  // User Management Methods with Company Context
  async createUser(insertUser: InsertUser & { companyId: number, companyRoleId?: number }): Promise<User> {
    const result = await db.insert(users).values([insertUser]).returning();
    return result[0];
  }

  async getUsersByCompany(companyId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.companyId, companyId), ne(users.status, 'deleted')))
      .orderBy(desc(users.createdAt));
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const startTime = Date.now();
      console.log('Storage updateUser started:', {
        userId: id,
        updates: updateData,
        timestamp: new Date().toISOString()
      });

      const values = {
        ...updateData,
        updatedAt: new Date(),
      };

      const [result] = await db
        .update(users)
        .set(values)
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

  async deleteUser(id: number): Promise<void> {
    await db.update(users)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Event Management Methods
  async createEvent(userId: number, insertEvent: InsertEvent): Promise<Event> {
    const result = await db
      .insert(events)
      .values([{ ...insertEvent, userId }])
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
      .values([{ ...insertUser, isAdmin: true }])
      .returning();
    return result[0];
  }

  async adminCreateSuperAdmin(insertUser: InsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values([{ ...insertUser, isAdmin: true, isSuperAdmin: true }])
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

  async getEventsByUserId(userId: number): Promise<Event[]> {
    return await db.select()
      .from(events)
      .where(eq(events.userId, userId))
      .orderBy(desc(events.createdAt));
  }
}

export const storage = new DatabaseStorage();