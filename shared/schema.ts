import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  companyName: text("company_name").notNull(),
  title: text("title").notNull(),
  mobile: text("mobile").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  status: text("status").default("active").notNull(), // active, deleted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  events: many(events),
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
  type: text("type").notNull(), // 'seminar', 'conference', 'workshop'
  url: text("url"),
  imageUrl: text("image_url"),
  status: text("status").default("active").notNull(), // active, cancelled, deleted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventRelations = relations(events, ({ one }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users)
  .extend({
    password: z.string().min(8).regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[!@#$%^&*]/, "Password must contain at least one special character"),
    username: z.string().email("Must be a valid email address")
  })
  .omit({ 
    id: true, 
    isAdmin: true,
    isSuperAdmin: true,
    status: true,
    createdAt: true,
    updatedAt: true 
  });

export const insertEventSchema = createInsertSchema(events)
  .extend({
    date: z.coerce.date(),
    description: z.string()
      .refine(
        (val) => val.trim().split(/\s+/).length <= 50,
        "Description must not exceed 50 words"
      )
  })
  .omit({ 
    id: true,
    userId: true,
    status: true,
    createdAt: true,
    updatedAt: true
  });

// Admin schemas
export const updateUserSchema = createInsertSchema(users)
  .partial()
  .extend({
    status: z.enum(["active", "deleted"]).optional(),
    isAdmin: z.boolean().optional(),
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