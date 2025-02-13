import { IStorage } from "./storage";
import { Event, InsertEvent, User, InsertUser } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private events: Map<number, Event>;
  private currentUserId: number;
  private currentEventId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.events = new Map();
    this.currentUserId = 1;
    this.currentEventId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, isAdmin: false };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(id: number): Promise<void> {
    this.users.delete(id);
  }

  async createEvent(userId: number, insertEvent: InsertEvent): Promise<Event> {
    const id = this.currentEventId++;
    const event: Event = { ...insertEvent, id, userId };
    this.events.set(id, event);
    return event;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getAllEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getUserEvents(userId: number): Promise<Event[]> {
    return Array.from(this.events.values()).filter(
      (event) => event.userId === userId
    );
  }

  async deleteEvent(id: number): Promise<void> {
    this.events.delete(id);
  }
}

export const storage = new MemStorage();
