import { v4 as uuid } from "uuid";

export interface Message {
  id: string;
  to: string;
  from: string;
  text: string;
  timestamp: number;
  delivered: boolean;
}

export interface Reminder {
  id: string;
  text: string;
  time: number;
  type: "official" | "health" | "casual" | "other";
  createdAt: number;
}

const offlineMessages: Map<string, Message[]> = new Map();
const reminders: Map<string, Reminder> = new Map();

export function enqueueMessage(to: string, from: string, text: string): Message {
  const msg: Message = { id: uuid(), to, from, text, timestamp: Date.now(), delivered: false };
  if (!offlineMessages.has(to)) offlineMessages.set(to, []);
  offlineMessages.get(to)!.push(msg);
  return msg;
}

export function dequeueMessages(user: string): Message[] {
  const msgs = offlineMessages.get(user) || [];
  offlineMessages.set(user, []);
  return msgs;
}

export function addReminder(text: string, time: number, type: Reminder["type"]): Reminder {
  const r: Reminder = { id: uuid(), text, time, type, createdAt: Date.now() };
  reminders.set(r.id, r);
  return r;
}

export function listReminders(): Reminder[] {
  return Array.from(reminders.values()).sort((a, b) => a.time - b.time);
}

