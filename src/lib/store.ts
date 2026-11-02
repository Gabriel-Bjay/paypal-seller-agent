// File-backed list of the PayPal orders this app tracks.
// The sandbox app has no Transaction Search access, so the app records each order it
// creates or imports. A JSON file keeps setup to zero for judges; swap for a database later.

import fs from "node:fs/promises";
import path from "node:path";

export type TrackedOrder = {
  orderId: string;
  addedAt: string;
  /** Known dispute ID. PayPal's dispute search can lag by minutes, so we remember it once seen. */
  disputeId?: string;
};

const DATA_FILE = process.env.CASES_FILE ?? path.join(process.cwd(), ".data", "orders.json");

export async function listTrackedOrders(): Promise<TrackedOrder[]> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function save(orders: TrackedOrder[]) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(orders, null, 2));
}

export async function trackOrder(orderId: string): Promise<void> {
  const orders = await listTrackedOrders();
  if (orders.some((o) => o.orderId === orderId)) return;
  orders.push({ orderId, addedAt: new Date().toISOString() });
  await save(orders);
}

export async function linkDispute(orderId: string, disputeId: string): Promise<void> {
  const orders = await listTrackedOrders();
  const order = orders.find((o) => o.orderId === orderId);
  if (!order || order.disputeId === disputeId) return;
  order.disputeId = disputeId;
  await save(orders);
}
