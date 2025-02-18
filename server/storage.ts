import { users, events, customers, type User, type Event, type InsertUser, type InsertEvent, type Customer, type InsertCustomer } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;

  // Customer Methods
  createCustomer(insertCustomer: InsertCustomer): Promise<Customer>;
  getCustomerById(id: number): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  updateCustomerById(id: number, updateData: Partial<InsertCustomer>): Promise<Customer | undefined>;

  // User Management Methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser & { customerId?: number }): Promise<User>;
  updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByCustomer(customerId: number): Promise<User[]>;
  getCustomerUsers(customerId: number): Promise<User[]>;

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

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    try {
      console.log('Creating customer:', {
        name: insertCustomer.name,
        timestamp: new Date().toISOString()
      });

      const [customer] = await db.insert(customers)
        .values({
          name: insertCustomer.name,
          address: insertCustomer.address,
          phoneNumber: insertCustomer.phoneNumber,
          adminName: insertCustomer.adminName,
          adminEmail: insertCustomer.adminEmail,
          status: insertCustomer.status || 'active',
          updatedAt: new Date(),
          createdAt: new Date()
        })
        .returning();

      console.log('Customer created successfully:', {
        customerId: customer.id,
        customerName: customer.name,
        timestamp: new Date().toISOString()
      });

      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id));
    return result[0];
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select()
      .from(customers)
      .where(eq(customers.status, sql`'active'`))
      .orderBy(desc(customers.createdAt));
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser & { customerId?: number }): Promise<User> {
    try {
      console.log('Starting user creation process:', {
        username: insertUser.username,
        customerId: insertUser.customerId,
        timestamp: new Date().toISOString()
      });

      let customerName = insertUser.customerName;
      let customerId = insertUser.customerId;

      // If customerId is provided, get the customer's name
      if (customerId) {
        const customer = await this.getCustomerById(customerId);
        if (!customer) {
          throw new Error('Customer not found');
        }
        customerName = customer.name;
      }
      // Only create a new customer if no customerId is provided and customerName exists
      else if (insertUser.customerName) {
        const customer = await this.createCustomer({
          name: insertUser.customerName,
          address: "Please update address",
          phoneNumber: "Please update phone number",
          adminName: "Please update admin name",
          adminEmail: insertUser.username,
          status: 'active'
        });
        customerId = customer.id;
        customerName = customer.name;
        console.log('Created new customer:', {
          customerId,
          customerName: insertUser.customerName,
          timestamp: new Date().toISOString()
        });
      }

      const [user] = await db.insert(users)
        .values({
          username: insertUser.username,
          password: insertUser.password,
          firstName: insertUser.firstName,
          lastName: insertUser.lastName,
          title: insertUser.title,
          mobile: insertUser.mobile,
          customerId,
          customerName,
          status: 'active',
          isAdmin: false,
          isSuperAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log('User creation completed:', {
        userId: user.id,
        username: user.username,
        customerId: user.customerId,
        timestamp: new Date().toISOString()
      });

      return user;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const startTime = Date.now();
      console.log('Storage updateUser started:', {
        userId: id,
        updates: { ...updateData, password: updateData.password ? '[REDACTED]' : undefined },
        timestamp: new Date().toISOString()
      });

      const validUpdateFields = {
        ...(updateData.username && { username: updateData.username }),
        ...(updateData.firstName && { firstName: updateData.firstName }),
        ...(updateData.lastName && { lastName: updateData.lastName }),
        ...(updateData.title && { title: updateData.title }),
        ...(updateData.mobile && { mobile: updateData.mobile }),
        ...(updateData.status && { status: updateData.status }),
        updatedAt: new Date()
      };

      console.log('Executing update query with fields:', {
        userId: id,
        updateFields: Object.keys(validUpdateFields),
        timestamp: new Date().toISOString()
      });

      const [result] = await db
        .update(users)
        .set(validUpdateFields)
        .where(eq(users.id, id))
        .returning();

      const endTime = Date.now();
      console.log('Storage updateUser completed:', {
        userId: id,
        success: !!result,
        processingTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('Error in storage.updateUser:', {
        userId: id,
        error,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(sql`${users.status} != 'deleted'`)
      .orderBy(desc(users.createdAt));
  }

  async getUsersByCustomer(customerId: number): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(
        and(
          eq(users.customerId, customerId),
          sql`${users.status} != 'deleted'`
        )
      )
      .orderBy(desc(users.createdAt));
  }

  async getCustomerUsers(customerId: number): Promise<User[]> {
    return this.getUsersByCustomer(customerId);
  }

  async updateCustomerById(id: number, updateData: Partial<InsertCustomer>): Promise<Customer | undefined> {
    try {
      console.log('Storage updateCustomer started:', {
        customerId: id,
        updates: updateData,
        timestamp: new Date().toISOString()
      });

      const [updatedCustomer] = await db
        .update(customers)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(customers.id, id))
        .returning();

      console.log('Customer settings updated successfully:', {
        customerId: id,
        timestamp: new Date().toISOString()
      });

      return updatedCustomer;
    } catch (error) {
      console.error('Error updating customer settings:', error);
      throw error;
    }
  }

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
    try {
      console.log('Fetching all active events');
      return await db.select()
        .from(events)
        .where(eq(events.status, 'active'))
        .orderBy(desc(events.createdAt));
    } catch (error) {
      console.error('Error fetching all events:', error);
      throw error;
    }
  }

  async getUserEvents(userId: number): Promise<Event[]> {
    try {
      console.log('Fetching user events:', {
        userId,
        timestamp: new Date().toISOString()
      });

      return await db.select()
        .from(events)
        .where(
          and(
            eq(events.userId, userId),
            eq(events.status, 'active')
          )
        )
        .orderBy(desc(events.createdAt));
    } catch (error) {
      console.error('Error fetching user events:', {
        error,
        userId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async updateEvent(id: number, userId: number, updateData: Partial<InsertEvent>): Promise<Event | undefined> {
    try {
      console.log('Updating event:', {
        eventId: id,
        userId,
        updateData,
        timestamp: new Date().toISOString()
      });

      const [result] = await db
        .update(events)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(and(eq(events.id, id), eq(events.userId, userId)))
        .returning();

      console.log('Event update result:', {
        success: !!result,
        eventId: id,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('Error updating event:', {
        error,
        eventId: id,
        userId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();