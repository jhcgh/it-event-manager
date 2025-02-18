import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, customers } from "@shared/schema";
import type { InsertUser, User, Customer } from "@shared/schema";

export class Storage {
  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const startTime = Date.now();
      console.log('Storage updateUser started:', {
        userId: id,
        updates: { ...updateData, password: updateData.password ? '[REDACTED]' : undefined },
        timestamp: new Date().toISOString()
      });

      // First verify the user exists
      const existingUser = await this.getUser(id);
      if (!existingUser) {
        console.error('User not found:', id);
        throw new Error('User not found');
      }

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

      // Perform the update with specific fields
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

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return user;
    } catch (error) {
      console.error('Error in storage.getUser:', { id, error });
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username.toLowerCase()))
        .limit(1);
      return user;
    } catch (error) {
      console.error('Error in storage.getUserByUsername:', { username, error });
      throw error;
    }
  }

  async createUser(userData: InsertUser & { customerId?: number }): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values({
          ...userData,
          username: userData.username.toLowerCase(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return user;
    } catch (error) {
      console.error('Error in storage.createUser:', { userData: { ...userData, password: '[REDACTED]' }, error });
      throw error;
    }
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    try {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, id))
        .limit(1);
      return customer;
    } catch (error) {
      console.error('Error in storage.getCustomerById:', { id, error });
      throw error;
    }
  }

  async getCustomerUsers(customerId: number): Promise<User[]> {
    try {
      return await db
        .select()
        .from(users)
        .where(eq(users.customerId, customerId));
    } catch (error) {
      console.error('Error in storage.getCustomerUsers:', { customerId, error });
      throw error;
    }
  }

  async updateCustomerById(id: number, updateData: Partial<Customer>): Promise<Customer | undefined> {
    try {
      const [customer] = await db
        .update(customers)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(customers.id, id))
        .returning();
      return customer;
    } catch (error) {
      console.error('Error in storage.updateCustomerById:', { id, updateData, error });
      throw error;
    }
  }
}

export const storage = new Storage();