// The only path from a proposed action to a PayPal call. It rebuilds the case from PayPal,
// runs the rule check, refuses anything blocked or unapproved, executes the rest and records
// every attempt in the audit log.

import { buildCase, type Case } from "./cases";
import { allowedActions, acceptClaim, makeOffer, provideEvidence, sendMessage } from "./paypal/disputes";
import { captureOrder, refundCapture } from "./paypal/orders";
import { evaluate, getRules, type ActionContext, type ProposedAction, type Verdict } from "./rules";
import { listTrackedOrders, readJson, writeJson } from "./store";

export type AuditEntry = {
  at: string;
  orderId: string;
  action: ProposedAction;
  verdict: Verdict;
  approvedBySeller: boolean;
  outcome: "executed" | "refused" | "failed";
  error?: string;
};

const AUDIT_FILE = "audit.json";

export function readAudit(orderId?: string): Promise<AuditEntry[]> {
  return readJson<AuditEntry[]>(AUDIT_FILE, []).then((all) => (orderId ? all.filter((e) => e.orderId === orderId) : all));
}

async function audit(entry: AuditEntry) {
  const all = await readAudit();
  all.push(entry);
  await writeJson(AUDIT_FILE, all);
}

export function contextFor(c: Case): ActionContext {
  const captured = Boolean(c.captureId);
  return {
    currency: c.amount?.currency_code ?? "USD",
    paid: captured ? Number(c.amount?.value ?? 0) : 0,
    refunded: c.refunded,
    disputeActions: c.dispute && c.dispute.status !== "RESOLVED" ? allowedActions(c.dispute) : undefined,
    orderStatus: c.orderStatus,
    captured,
  };
}

/** Checks an action against the current PayPal state and the seller's rules, without running it. */
export async function checkAction(orderId: string, action: ProposedAction) {
  const entry = (await listTrackedOrders()).find((t) => t.orderId === orderId);
  if (!entry) throw new Error(`Order ${orderId} is not tracked`);
  const c = await buildCase(orderId, entry.disputeId);
  return { case: c, verdict: evaluate(action, contextFor(c), await getRules()) };
}

export class ActionRefused extends Error {}

/**
 * Runs an action on PayPal if the rules allow it. `approvedBySeller` must come from the
 * seller's own click in the UI, never from the AI.
 */
export async function executeAction(orderId: string, action: ProposedAction, approvedBySeller: boolean) {
  const { case: c, verdict } = await checkAction(orderId, action);
  const base = { at: new Date().toISOString(), orderId, action, verdict, approvedBySeller };

  const refusal =
    verdict.decision === "block"
      ? `Blocked: ${verdict.reasons.join(" ")}`
      : verdict.decision === "needs_approval" && !approvedBySeller
        ? `Needs your approval: ${verdict.reasons.join(" ")}`
        : null;
  if (refusal) {
    await audit({ ...base, outcome: "refused", error: refusal });
    throw new ActionRefused(refusal);
  }

  const currency = c.amount?.currency_code ?? "USD";
  const money = (value: string) => ({ currency_code: currency, value: Number(value).toFixed(2) });
  const disputeId = c.dispute?.dispute_id ?? "";

  try {
    switch (action.type) {
      case "capture":
        await captureOrder(orderId);
        break;
      case "refund":
        await refundCapture(c.captureId!, action.amount ? money(action.amount) : undefined, action.note);
        break;
      case "make_offer":
        await makeOffer(disputeId, money(action.amount), action.note);
        break;
      case "accept_claim":
        await acceptClaim(disputeId, action.note, action.amount ? money(action.amount) : undefined);
        break;
      case "provide_evidence":
        await provideEvidence(disputeId, action.note);
        break;
      case "send_message":
        await sendMessage(disputeId, action.message);
        break;
    }
  } catch (err) {
    await audit({ ...base, outcome: "failed", error: (err as Error).message });
    throw err;
  }
  await audit({ ...base, outcome: "executed" });
  return verdict;
}
