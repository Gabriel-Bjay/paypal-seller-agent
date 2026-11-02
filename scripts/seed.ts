// Creates a realistic set of sandbox cases for the dashboard and the demo:
// a normal sale, a payment approved but never captured, an unpaid order,
// a refunded sale and an open "item not received" dispute.
//
// Usage: npm run seed                 (all scenarios)
//        npm run seed -- --track <ID>  (start tracking an existing order)

import { approveOrder, fileNotReceivedDispute } from "./buyer-sim";
import { captureOrder, createOrder, refundCapture, type Money } from "../src/lib/paypal/orders";
import { linkDispute, trackOrder } from "../src/lib/store";

const usd = (value: string): Money => ({ currency_code: "USD", value });

type Scenario = { item: string; amount: string; run: (orderId: string, approvalUrl: string) => Promise<string> };

const scenarios: Scenario[] = [
  {
    item: "Ceramic coffee mug set",
    amount: "35.00",
    run: async (id, url) => {
      await approveOrder(url);
      await captureOrder(id);
      return "paid";
    },
  },
  {
    item: "Wireless headphones",
    amount: "80.00",
    run: async (_id, url) => {
      await approveOrder(url);
      return "approved but not captured";
    },
  },
  {
    item: "Silicone phone case",
    amount: "15.00",
    run: async () => "waiting for the buyer to pay",
  },
  {
    item: "Linen tablecloth",
    amount: "25.00",
    run: async (id, url) => {
      await approveOrder(url);
      const { capture } = await captureOrder(id);
      await refundCapture(capture.id, undefined, "Out of stock, sorry. Full refund issued.");
      return "paid, then refunded";
    },
  },
  {
    item: "Handmade leather bag",
    amount: "120.00",
    run: async (id, url) => {
      await approveOrder(url);
      await captureOrder(id);
      const caseId = await fileNotReceivedDispute("$120.00", "I paid a week ago and the bag still hasn't arrived. Tracking hasn't updated.");
      await linkDispute(id, caseId);
      return `paid, buyer opened dispute ${caseId}`;
    },
  },
];

async function main() {
  const trackIndex = process.argv.indexOf("--track");
  if (trackIndex !== -1) {
    for (const id of process.argv.slice(trackIndex + 1)) {
      await trackOrder(id);
      console.log(`✔ Tracking ${id}`);
    }
    return;
  }

  for (const s of scenarios) {
    const { order, approvalUrl } = await createOrder(usd(s.amount), s.item);
    await trackOrder(order.id);
    const outcome = await s.run(order.id, approvalUrl);
    console.log(`✔ ${s.item} ($${s.amount}): ${outcome}`);
  }
  console.log("\nDone. A new dispute spends a few minutes in PayPal review before you can respond to it.");
}

main().catch((err) => {
  console.error("✘ Seed failed:", err.message, err.body ? JSON.stringify(err.body) : "");
  process.exit(1);
});
