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
  createUser(insertUser: InsertUser & { companyId?: number, companyRoleId?: number }): Promise<User>;
  updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  getUsersByCompany(companyId: number): Promise<User[]>;
  deleteUserEvents(userId: number): Promise<void>;

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
      ...updateData,
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
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser & { companyId?: number, companyRoleId?: number }): Promise<User> {
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
          settings: {}
        });
        companyId = company.id;
        console.log('Created new company:', {
          companyId,
          companyName: insertUser.companyName,
          timestamp: new Date().toISOString()
        });
      }

      // Create user with company association
      const values = {
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
      } as const;

      const [user] = await db.insert(users).values(values).returning();

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
              settings: {}
            });
            updateData = { ...updateData, companyId: company.id };
          }
        }
      }

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
    try {
      console.log(`Starting deletion process for user ${id}`);

      // First delete all events
      await this.deleteUserEvents(id);

      // Then update the user status to deleted and remove company associations
      await db.update(users)
        .set({ 
          status: 'deleted', 
          updatedAt: new Date(),
          companyId: null,
          companyRoleId: null,
          companyName: null
        })
        .where(eq(users.id, id));

      console.log(`Successfully completed deletion process for user ${id}`);
    } catch (error) {
      console.error(`Error during user deletion process:`, error);
      throw error;
    }
  }

  async deleteUserEvents(userId: number): Promise<void> {
    console.log(`Deleting all events for user ${userId}`);
    await db.delete(events).where(eq(events.userId, userId));
    console.log(`Successfully deleted all events for user ${userId}`);
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