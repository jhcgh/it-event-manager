import { pgTable, text, serial, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  settings: jsonb("settings").$type<{
    maxUsers?: number;
    maxEvents?: number;
    allowedEventTypes?: string[];
    requireEventApproval?: boolean;
  }>().notNull().default({}),
  status: text("status", { enum: ['active', 'inactive'] }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const companyRelations = relations(companies, ({ many }) => ({
  users: many(users),
}));

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  companyId: integer("company_id").references(() => companies.id),
  companyName: text("company_name"),
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
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
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

export const insertCompanySchema = createInsertSchema(companies)
  .extend({
    status: z.enum(['active', 'inactive']).default('active'),
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
    companyName: z.string().min(1, "Company name is required"),
    status: z.enum(['active', 'inactive']).default('active'),
  })
  .omit({
    id: true,
    isAdmin: true,
    isSuperAdmin: true,
    createdAt: true,
    updatedAt: true,
    companyId: true,
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
    companyName: z.string().optional()
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
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;