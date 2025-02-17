import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull().default('Please update address'),
  phoneNumber: text("phone_number").notNull().default('Please update phone number'),
  adminName: text("admin_name").notNull().default('Please update admin name'),
  adminEmail: text("admin_email").notNull().default('please.update@example.com'),
  status: text("status", { enum: ['active', 'inactive'] }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customerRelations = relations(customers, ({ many }) => ({
  users: many(users),
}));

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  title: text("title").notNull(),
  mobile: text("mobile").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  status: text("status", { enum: ['active', 'inactive'] }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRelations = relations(users, ({ many, one }) => ({
  events: many(events),
  customer: one(customers, {
    fields: [users.customerId],
    references: [customers.id],
  }),
}));

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  isRemote: boolean("is_remote").notNull(),
  isHybrid: boolean("is_hybrid").default(false).notNull(),
  type: text("type").notNull(),
  url: text("url"),
  imageUrl: text("image_url"),
  status: text("status", { enum: ['active', 'inactive'] }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventRelations = relations(events, ({ one }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.id],
  }),
}));

export const insertCustomerSchema = createInsertSchema(customers)
  .extend({
    status: z.enum(['active', 'inactive']).default('active'),
    phoneNumber: z.string().regex(/^\+?[\d\s-()]+$/, "Invalid phone number format"),
    adminEmail: z.string().email("Invalid email address"),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  });

export const insertUserSchema = createInsertSchema(users)
  .extend({
    password: z.string().min(8).regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[!@#$%^&*]/, "Password must contain at least one special character"),
    username: z.string().email("Must be a valid email address"),
    customerName: z.string().min(1, "Customer name is required"),
    status: z.enum(['active', 'inactive']).default('active'),
  })
  .omit({
    id: true,
    isAdmin: true,
    isSuperAdmin: true,
    createdAt: true,
    updatedAt: true,
    customerId: true,
  });

export const insertEventSchema = createInsertSchema(events)
  .extend({
    date: z.coerce.date(),
    description: z.string()
      .refine(
        (val) => val.trim().split(/\s+/).length <= 50,
        "Description must not exceed 50 words"
      ),
    status: z.enum(['active', 'inactive']).default('active'),
  })
  .omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true
  });

export const updateUserSchema = createInsertSchema(users)
  .partial()
  .extend({
    status: z.enum(["active", "inactive"]).optional(),
    isAdmin: z.boolean().optional(),
    customerName: z.string().optional()
  })
  .omit({
    id: true,
    password: true,
    createdAt: true,
    updatedAt: true,
    isSuperAdmin: true
  });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;