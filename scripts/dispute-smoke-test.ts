// End-to-end sandbox check of the dispute loop the product depends on:
// buyer pays -> buyer opens a dispute -> seller sees allowed actions -> seller offers a
// partial refund -> buyer accepts -> PayPal refunds part of the payment.
//
// Usage: npm run smoke:dispute

import { approveOrder, acceptOffer, fileNotReceivedDispute } from "./buyer-sim";
import { captureOrder, createOrder, getCapture } from "../src/lib/paypal/orders";
import { linkDispute, trackOrder } from "../src/lib/store";
import { allowedActions, findDisputesForTransaction, getDispute, makeOffer } from "../src/lib/paypal/disputes";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (step: string, detail = "") => console.log(`✔ ${step}${detail ? `: ${detail}` : ""}`);

async function waitFor<T>(what: string, fn: () => Promise<T | undefined>, timeoutMs = 10 * 60_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await sleep(20_000);
  }
  throw new Error(`Timed out waiting for ${what}`);
}

async function main() {
  const amount = { currency_code: "USD", value: "49.00" };

  const { order, approvalUrl } = await createOrder(amount, "Smoke test: handmade leather bag");
  await trackOrder(order.id);
  log("Order created", order.id);

  await approveOrder(approvalUrl);
  log("Buyer approved payment");

  const { capture } = await captureOrder(order.id);
  log("Payment captured", capture.id);

  const caseId = await fileNotReceivedDispute("$49.00", "I paid but the item never arrived.");
  await linkDispute(order.id, caseId);
  log("Buyer filed dispute", caseId);

  // A new dispute starts in PayPal review; wait until the seller is allowed to respond.
  const dispute = await waitFor("seller-actionable dispute", async () => {
    const [found] = await findDisputesForTransaction(capture.id);
    if (!found) return undefined;
    const full = await getDispute(found.dispute_id);
    return allowedActions(full).includes("make_offer") ? full : undefined;
  });
  log("Seller can respond", allowedActions(dispute).join(", "));

  await makeOffer(dispute.dispute_id, { currency_code: "USD", value: "20.00" }, "Sorry for the delay. Here is a $20 partial refund.");
  log("Seller offered partial refund", "$20.00");

  await acceptOffer(dispute.dispute_id);
  log("Buyer accepted offer");

  const refunded = await waitFor("partial refund", async () => {
    const c = await getCapture(capture.id);
    return c.status === "PARTIALLY_REFUNDED" ? c : undefined;
  });
  log("Capture status", refunded.status);
  console.log("\nGO: the dispute loop works end to end.");
}

main().catch((err) => {
  console.error("\n✘ Smoke test failed:", err.message, err.body ? JSON.stringify(err.body) : "");
  process.exit(1);
});
