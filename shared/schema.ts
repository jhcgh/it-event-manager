import { pgTable, text, serial, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
  isRemote: boolean("is_remote").notNull(),
  type: text("type").notNull(), // 'seminar', 'conference', 'workshop'
  contactInfo: text("contact_info").notNull(),
  url: text("url"),
  imageUrl: text("image_url"),
});

export const insertUserSchema = createInsertSchema(users)
  .extend({
    password: z.string().min(8).regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[!@#$%^&*]/, "Password must contain at least one special character"),
    username: z.string().email("Must be a valid email address")
  })
  .omit({ id: true, isAdmin: true });

export const insertEventSchema = createInsertSchema(events).omit({ 
  id: true,
  userId: true
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;