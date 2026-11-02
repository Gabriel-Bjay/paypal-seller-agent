import { paypalRequest } from "./client";
import type { Money } from "./orders";

export type OfferEvent = {
  actor: "SELLER" | "BUYER";
  event_type: string;
  offer_type?: string;
  offer_amount?: Money;
  offer_time: string;
};

export type DisputeMessage = {
  posted_by: "BUYER" | "SELLER" | string;
  time_posted: string;
  content?: string;
};

export type Dispute = {
  dispute_id: string;
  create_time?: string;
  update_time?: string;
  messages?: DisputeMessage[];
  reason: string;
  status: string;
  dispute_state?: string;
  dispute_life_cycle_stage?: string;
  dispute_amount: Money;
  seller_response_due_date?: string;
  disputed_transactions?: { buyer_transaction_id?: string; seller_transaction_id?: string }[];
  offer?: {
    buyer_requested_amount?: Money;
    seller_offered_amount?: Money;
    history?: OfferEvent[];
  };
  // Present only when the seller can act. Keys are the allowed actions.
  allowed_response_options?: {
    accept_claim?: { accept_claim_types: string[] };
    make_offer?: { offer_types: string[] };
    acknowledge_return_item?: unknown;
  };
  dispute_outcome?: { outcome_code: string; outcome_reason?: string; amount_refunded?: Money };
  links?: { href: string; rel: string; method: string }[];
};

type DisputeList = { items?: Dispute[] };

/**
 * Finds disputes for a seller transaction (capture ID).
 * Note: in our sandbox tests a plain list call returned nothing,
 * while filtering by transaction ID worked, so prefer this lookup.
 */
export async function findDisputesForTransaction(captureId: string) {
  const list = await paypalRequest<DisputeList>(
    `/v1/customer/disputes?disputed_transaction_id=${encodeURIComponent(captureId)}`,
  );
  return list.items ?? [];
}

export function getDispute(disputeId: string) {
  return paypalRequest<Dispute>(`/v1/customer/disputes/${disputeId}`);
}

/** The seller actions PayPal currently allows, read from the dispute's HATEOAS links. */
export function allowedActions(dispute: Dispute): string[] {
  return (dispute.links ?? []).filter((l) => l.method === "POST").map((l) => l.rel);
}

export function makeOffer(disputeId: string, amount: Money, note: string) {
  return paypalRequest(`/v1/customer/disputes/${disputeId}/make-offer`, {
    method: "POST",
    body: { note, offer_amount: amount, offer_type: "REFUND" },
  });
}

export function acceptClaim(disputeId: string, note: string, refundAmount?: Money) {
  return paypalRequest(`/v1/customer/disputes/${disputeId}/accept-claim`, {
    method: "POST",
    body: refundAmount
      ? { note, accept_claim_type: "PARTIAL_REFUND", refund_amount: refundAmount }
      : { note, accept_claim_type: "REFUND" },
  });
}

export function sendMessage(disputeId: string, message: string) {
  return paypalRequest(`/v1/customer/disputes/${disputeId}/send-message`, {
    method: "POST",
    body: { message },
  });
}
