// File-backed storage in .data/: tracked orders, seller rules and the action audit log.
// The sandbox app has no Transaction Search access, so the app records each order it
// creates or imports. JSON files keep setup to zero for judges; swap for a database later.

import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), ".data");

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, file), "utf8"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err;
  }
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(value, null, 2));
}

export type TrackedOrder = {
  orderId: string;
  addedAt: string;
  /** Known dispute ID. PayPal's dispute search can lag by minutes, so we remember it once seen. */
  disputeId?: string;
};

const ORDERS_FILE = "orders.json";

export function listTrackedOrders(): Promise<TrackedOrder[]> {
  return readJson<TrackedOrder[]>(ORDERS_FILE, []);
}

export async function trackOrder(orderId: string): Promise<void> {
  const orders = await listTrackedOrders();
  if (orders.some((o) => o.orderId === orderId)) return;
  orders.push({ orderId, addedAt: new Date().toISOString() });
  await writeJson(ORDERS_FILE, orders);
}

export async function linkDispute(orderId: string, disputeId: string): Promise<void> {
  const orders = await listTrackedOrders();
  const order = orders.find((o) => o.orderId === orderId);
  if (!order || order.disputeId === disputeId) return;
  order.disputeId = disputeId;
  await writeJson(ORDERS_FILE, orders);
}
