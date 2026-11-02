// Turns raw PayPal data (order, capture, refunds, dispute) into a "case":
// a status, a money summary, a timeline of what happened and flags for anything that needs attention.

import { getOrder, type Money, type Order } from "./paypal/orders";
import { findDisputesForTransaction, getDispute, type Dispute } from "./paypal/disputes";
import { linkDispute, listTrackedOrders } from "./store";

export type Actor = "buyer" | "seller" | "paypal";

export type TimelineEvent = {
  at: string;
  actor: Actor;
  title: string;
  detail?: string;
  tone?: "neutral" | "good" | "bad";
};

export type Flag = {
  level: "critical" | "warning" | "info";
  message: string;
};

export type CaseStatus =
  | "Action needed"
  | "Waiting for buyer"
  | "In PayPal review"
  | "Not captured"
  | "Awaiting payment"
  | "Refunded"
  | "Partially refunded"
  | "Dispute resolved"
  | "Paid";

export type Case = {
  id: string;
  item: string;
  buyer?: string;
  status: CaseStatus;
  orderStatus: string;
  createdAt?: string;
  updatedAt?: string;
  amount?: Money;
  fee?: Money;
  net?: Money;
  refunded: number;
  captureId?: string;
  dispute?: Dispute;
  timeline: TimelineEvent[];
  flags: Flag[];
};

export const DISPUTE_REASONS: Record<string, string> = {
  MERCHANDISE_OR_SERVICE_NOT_RECEIVED: "Item not received",
  MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED: "Item not as described",
  UNAUTHORISED: "Unauthorised payment",
  CREDIT_NOT_PROCESSED: "Refund not processed",
  DUPLICATE_TRANSACTION: "Duplicate payment",
  INCORRECT_AMOUNT: "Incorrect amount",
  PAYMENT_BY_OTHER_MEANS: "Paid by other means",
  CANCELED_RECURRING_BILLING: "Cancelled subscription",
  PROBLEM_WITH_REMITTANCE: "Problem with payment",
  OTHER: "Other",
};

const OUTCOMES: Record<string, string> = {
  RESOLVED_BUYER_FAVOUR: "resolved in the buyer's favour",
  RESOLVED_SELLER_FAVOUR: "resolved in your favour",
  RESOLVED_WITH_PAYOUT: "resolved with a payout",
  CANCELED_BY_BUYER: "cancelled by the buyer",
  ACCEPTED: "closed after you accepted the claim",
  DENIED: "denied",
};

export const money = (m?: Money) =>
  m ? `${m.currency_code === "USD" ? "$" : `${m.currency_code} `}${Number(m.value).toFixed(2)}` : "-";

const humanize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

/**
 * Uses the remembered dispute ID when we have one, otherwise searches by capture and
 * remembers what it finds. A missing or failing search just means "no dispute yet".
 */
async function disputeFor(orderId: string, captureId: string, knownId?: string): Promise<Dispute | undefined> {
  if (knownId) return getDispute(knownId);
  const [summary] = await findDisputesForTransaction(captureId).catch(() => []);
  if (!summary) return undefined;
  await linkDispute(orderId, summary.dispute_id);
  return getDispute(summary.dispute_id);
}

export async function buildCase(orderId: string, knownDisputeId?: string): Promise<Case> {
  const order: Order = await getOrder(orderId);
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  const refunds = unit?.payments?.refunds ?? [];
  const dispute = capture ? await disputeFor(orderId, capture.id, knownDisputeId) : undefined;

  const timeline: TimelineEvent[] = [];
  const flags: Flag[] = [];
  const buyerName = [order.payer?.name?.given_name, order.payer?.name?.surname].filter(Boolean).join(" ");

  if (order.create_time) timeline.push({ at: order.create_time, actor: "seller", title: "Order created", detail: money(unit?.amount) });

  if (order.status === "APPROVED" && !capture && order.update_time) {
    timeline.push({ at: order.update_time, actor: "buyer", title: "Buyer approved the payment", detail: "Waiting for you to capture it" });
  }

  if (capture?.create_time) {
    const b = capture.seller_receivable_breakdown;
    timeline.push({
      at: capture.create_time,
      actor: "buyer",
      title: `Payment ${capture.status === "PENDING" ? "pending" : "received"}`,
      detail: b ? `${money(b.gross_amount)} paid, ${money(b.paypal_fee)} PayPal fee, ${money(b.net_amount)} net` : money(capture.amount),
      tone: "good",
    });
  }

  const refunded = refunds.filter((r) => r.status === "COMPLETED").reduce((sum, r) => sum + Number(r.amount.value), 0);
  // Failed refunds moved no money and can be PayPal-internal during disputes, so they are left out.
  // A refund made while a dispute is open is issued by PayPal as part of the resolution.
  const disputeStart = dispute?.create_time ? Date.parse(dispute.create_time) : Infinity;
  for (const r of refunds) {
    if (!r.create_time || r.status === "FAILED" || r.status === "CANCELLED") continue;
    const ok = r.status === "COMPLETED";
    const duringDispute = Date.parse(r.create_time) >= disputeStart;
    // A pending "refund" created during a dispute is PayPal holding the money until it is resolved.
    if (!ok && duringDispute && dispute?.status !== "RESOLVED") {
      timeline.push({ at: r.create_time, actor: "paypal", title: `PayPal is holding ${money(r.amount)} while the dispute is open` });
      continue;
    }
    timeline.push({
      at: r.create_time,
      actor: duringDispute ? "paypal" : "seller",
      title: ok ? `Refunded ${money(r.amount)} to the buyer` : `Refund of ${money(r.amount)} ${r.status.toLowerCase()}`,
      tone: ok ? "bad" : "neutral",
    });
  }

  if (dispute) {
    const reason = DISPUTE_REASONS[dispute.reason] ?? humanize(dispute.reason);
    if (dispute.create_time) {
      timeline.push({ at: dispute.create_time, actor: "buyer", title: `Dispute opened: ${reason}`, detail: `Claim for ${money(dispute.dispute_amount)}`, tone: "bad" });
    }
    for (const m of dispute.messages ?? []) {
      timeline.push({ at: m.time_posted, actor: m.posted_by === "SELLER" ? "seller" : "buyer", title: "Message", detail: m.content });
    }
    for (const o of dispute.offer?.history ?? []) {
      const who = o.actor === "SELLER" ? "seller" : "buyer";
      const what = o.event_type === "PROPOSED" ? `Offered ${money(o.offer_amount)} refund` : `${humanize(o.event_type)} the offer`;
      timeline.push({ at: o.offer_time, actor: who, title: what });
    }
    if (dispute.status === "RESOLVED" && dispute.update_time) {
      const out = dispute.dispute_outcome;
      timeline.push({
        at: dispute.update_time,
        actor: "paypal",
        title: `Dispute ${OUTCOMES[out?.outcome_code ?? ""] ?? "resolved"}`,
        detail: out?.amount_refunded ? `${money(out.amount_refunded)} refunded to the buyer` : undefined,
      });
    }
  }

  timeline.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  // Status and flags, most urgent first.
  let status: CaseStatus;
  const disputeOpen = dispute && dispute.status !== "RESOLVED";
  if (disputeOpen && dispute.status === "WAITING_FOR_SELLER_RESPONSE") {
    status = "Action needed";
    const due = dispute.seller_response_due_date;
    flags.push({ level: "critical", message: `Dispute needs your response${due ? ` by ${new Date(due).toDateString()}` : ""}. If you don't respond, PayPal may refund the buyer in full.` });
  } else if (disputeOpen && dispute.status === "WAITING_FOR_BUYER_RESPONSE") {
    status = "Waiting for buyer";
    flags.push({ level: "info", message: "Your offer was sent. Waiting for the buyer to respond." });
  } else if (disputeOpen) {
    status = "In PayPal review";
    flags.push({ level: "info", message: "PayPal is reviewing this dispute. No action is possible yet." });
  } else if (order.status === "APPROVED" && !capture) {
    status = "Not captured";
    flags.push({ level: "warning", message: "The buyer approved this payment but it was never captured, so you haven't been paid. Capture it before the approval expires." });
  } else if (!capture) {
    status = "Awaiting payment";
    flags.push({ level: "info", message: "The buyer hasn't completed payment yet." });
  } else if (capture.status === "REFUNDED") {
    status = "Refunded";
  } else if (capture.status === "PARTIALLY_REFUNDED") {
    status = dispute ? "Dispute resolved" : "Partially refunded";
  } else {
    status = dispute ? "Dispute resolved" : "Paid";
  }
  if (capture?.status === "PENDING") flags.push({ level: "warning", message: "PayPal is holding this payment as pending." });

  const b = capture?.seller_receivable_breakdown;
  return {
    id: order.id,
    item: unit?.description ?? "Untitled order",
    buyer: buyerName || order.payer?.email_address,
    status,
    orderStatus: order.status,
    createdAt: order.create_time,
    updatedAt: timeline.at(-1)?.at ?? order.update_time,
    amount: unit?.amount ?? capture?.amount,
    fee: b?.paypal_fee,
    net: b?.net_amount,
    refunded,
    captureId: capture?.id,
    dispute,
    timeline,
    flags,
  };
}

const PRIORITY: CaseStatus[] = ["Action needed", "Not captured", "Waiting for buyer", "In PayPal review", "Awaiting payment"];

/** All tracked cases, the ones needing attention first, then newest first. */
export async function listCases(): Promise<{ cases: Case[]; errors: string[] }> {
  const tracked = await listTrackedOrders();
  const results = await Promise.allSettled(tracked.map((t) => buildCase(t.orderId, t.disputeId)));
  const cases = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const errors = results.flatMap((r, i) => (r.status === "rejected" ? [`${tracked[i].orderId}: ${(r.reason as Error).message}`] : []));

  const rank = (c: Case) => (PRIORITY.includes(c.status) ? PRIORITY.indexOf(c.status) : PRIORITY.length);
  cases.sort((a, b) => rank(a) - rank(b) || Date.parse(b.updatedAt ?? "") - Date.parse(a.updatedAt ?? ""));
  return { cases, errors };
}
