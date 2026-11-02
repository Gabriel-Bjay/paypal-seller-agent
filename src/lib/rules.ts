// The seller's rules and the deterministic check every proposed action must pass.
// The AI agent only ever *proposes* actions; this code decides whether an action may run
// on its own, needs the seller's approval, or is blocked. Nothing the AI writes (reasons,
// claims of prior approval, text copied from buyer messages) can change the verdict.

import { readJson, writeJson } from "./store";

export type Rules = {
  /** Actions moving at most this much money (USD) may run without approval. 0 = always ask. */
  autoApproveUpTo: number;
  /** Refunds and offers above this share of the order always need approval. */
  approvalAbovePercent: number;
  /** Refunds and offers above this share of the order are blocked outright. */
  blockAbovePercent: number;
  /** Fighting a dispute (submitting evidence) always needs approval. */
  approveBeforeFighting: boolean;
  /** Messages to buyers need approval. */
  approveMessages: boolean;
};

export const DEFAULT_RULES: Rules = {
  autoApproveUpTo: 15,
  approvalAbovePercent: 30,
  blockAbovePercent: 100,
  approveBeforeFighting: true,
  approveMessages: false,
};

export type ProposedAction =
  | { type: "make_offer"; amount: string; note: string }
  | { type: "accept_claim"; amount?: string; note: string }
  | { type: "provide_evidence"; note: string }
  | { type: "send_message"; message: string }
  | { type: "refund"; amount?: string; note?: string }
  | { type: "capture" };

/** What the rule check needs to know about the case. */
export type ActionContext = {
  currency: string;
  /** Amount the buyer paid (0 if not captured). */
  paid: number;
  /** Amount already refunded. */
  refunded: number;
  /** For disputes: the actions PayPal currently allows (from the dispute's links). */
  disputeActions?: string[];
  orderStatus?: string;
  captured: boolean;
};

export type Verdict = {
  decision: "allow" | "needs_approval" | "block";
  /** Money the action would send back to the buyer. */
  refundAmount: number;
  reasons: string[];
};

const DISPUTE_ACTIONS = new Set(["make_offer", "accept_claim", "provide_evidence", "send_message"]);

/** Strict money parsing: plain positive decimals with at most 2 places. Anything else is invalid. */
export function parseAmount(value: string | undefined): number | null {
  if (value === undefined) return null;
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value.trim())) return NaN;
  return Number(value);
}

export function evaluate(action: ProposedAction, ctx: ActionContext, rules: Rules): Verdict {
  const block = (reason: string, refundAmount = 0): Verdict => ({ decision: "block", refundAmount, reasons: [reason] });
  const remaining = Math.round((ctx.paid - ctx.refunded) * 100) / 100;

  // Hard safety checks: these hold whatever the seller's settings are.
  if (DISPUTE_ACTIONS.has(action.type)) {
    if (!ctx.disputeActions) return block("There is no open dispute on this order.");
    if (!ctx.disputeActions.includes(action.type)) {
      return block(`PayPal doesn't currently allow "${action.type}" on this dispute.`);
    }
  }
  if (action.type === "capture") {
    if (ctx.orderStatus !== "APPROVED" || ctx.captured) return block("Only an approved, uncaptured order can be captured.");
    return { decision: "allow", refundAmount: 0, reasons: ["Capturing a payment the buyer already approved moves money to you."] };
  }
  if (action.type === "refund" && !ctx.captured) return block("There is no captured payment to refund.");

  let refundAmount = 0;
  if (action.type === "make_offer" || action.type === "refund" || action.type === "accept_claim") {
    const parsed = parseAmount(action.amount);
    if (Number.isNaN(parsed)) return block(`"${action.amount}" is not a valid amount.`);
    if (action.type === "make_offer" && parsed === null) return block("An offer needs an amount.");
    refundAmount = parsed ?? remaining; // no amount = full refund of what's left
    if (refundAmount <= 0) return block("The refund amount must be more than zero.");
    if (refundAmount > remaining) {
      return block(`Refund of ${refundAmount.toFixed(2)} is more than the ${remaining.toFixed(2)} left to refund.`, refundAmount);
    }
  }

  // Seller rules.
  const reasons: string[] = [];
  let needsApproval = false;

  if (refundAmount > 0) {
    const percent = ctx.paid > 0 ? (refundAmount / ctx.paid) * 100 : 100;
    const share = `${refundAmount.toFixed(2)} ${ctx.currency} (${Math.round(percent)}% of the order)`;
    if (percent > rules.blockAbovePercent) {
      return block(`Your rules block refunds above ${rules.blockAbovePercent}% of an order. This one is ${share}.`, refundAmount);
    }
    if (percent > rules.approvalAbovePercent) {
      needsApproval = true;
      reasons.push(`Refunds above ${rules.approvalAbovePercent}% of an order need your approval. This one is ${share}.`);
    }
    if (refundAmount > rules.autoApproveUpTo) {
      needsApproval = true;
      reasons.push(`Only actions up to ${rules.autoApproveUpTo.toFixed(2)} ${ctx.currency} run without approval. This one is ${share}.`);
    }
  }
  if (action.type === "provide_evidence" && rules.approveBeforeFighting) {
    needsApproval = true;
    reasons.push("Your rules say fighting a dispute always needs your approval.");
  }
  if (action.type === "send_message" && rules.approveMessages) {
    needsApproval = true;
    reasons.push("Your rules say messages to buyers need your approval.");
  }

  if (needsApproval) return { decision: "needs_approval", refundAmount, reasons };
  return { decision: "allow", refundAmount, reasons: ["Within your rules."] };
}

const RULES_FILE = "rules.json";

export async function getRules(): Promise<Rules> {
  return { ...DEFAULT_RULES, ...(await readJson<Partial<Rules>>(RULES_FILE, {})) };
}

/** Validates and saves rules. Returns an error message for invalid input. */
export async function saveRules(input: Rules): Promise<string | null> {
  const { autoApproveUpTo, approvalAbovePercent, blockAbovePercent } = input;
  if (![autoApproveUpTo, approvalAbovePercent, blockAbovePercent].every((n) => Number.isFinite(n) && n >= 0)) {
    return "Amounts and percentages must be zero or more.";
  }
  if (approvalAbovePercent > 100 || blockAbovePercent > 100) return "Percentages can't be above 100.";
  if (approvalAbovePercent > blockAbovePercent) return "The approval threshold can't be higher than the block threshold.";
  await writeJson(RULES_FILE, input);
  return null;
}
