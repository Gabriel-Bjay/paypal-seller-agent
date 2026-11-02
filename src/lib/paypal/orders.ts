import { paypalRequest } from "./client";

export type Money = { currency_code: string; value: string };

export type Capture = {
  id: string;
  status: string;
  amount: Money;
  create_time?: string;
  update_time?: string;
  seller_receivable_breakdown?: { gross_amount: Money; paypal_fee?: Money; net_amount?: Money };
};

export type Refund = {
  id: string;
  status: string;
  amount: Money;
  create_time?: string;
};

export type Order = {
  id: string;
  status: string;
  create_time?: string;
  update_time?: string;
  payer?: { email_address?: string; name?: { given_name?: string; surname?: string } };
  links?: { href: string; rel: string; method: string }[];
  purchase_units?: {
    description?: string;
    amount?: Money;
    payments?: { captures?: Capture[]; refunds?: Refund[] };
  }[];
};

/** Creates a PayPal-wallet order. The buyer must approve it at the returned approval URL. */
export async function createOrder(amount: Money, description: string) {
  const order = await paypalRequest<Order>("/v2/checkout/orders", {
    method: "POST",
    body: {
      intent: "CAPTURE",
      purchase_units: [{ amount, description }],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: "https://example.com/approved",
            cancel_url: "https://example.com/cancelled",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
          },
        },
      },
    },
  });
  const approvalUrl = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
  if (!approvalUrl) throw new Error(`Order ${order.id} has no approval link`);
  return { order, approvalUrl };
}

export function getOrder(orderId: string) {
  return paypalRequest<Order>(`/v2/checkout/orders/${orderId}`);
}

export async function captureOrder(orderId: string) {
  const order = await paypalRequest<Order>(`/v2/checkout/orders/${orderId}/capture`, { method: "POST" });
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture) throw new Error(`Order ${orderId} captured without a capture record`);
  return { order, capture };
}

export function getCapture(captureId: string) {
  return paypalRequest<Capture>(`/v2/payments/captures/${captureId}`);
}

/** Refunds a capture in full, or partially when an amount is given. */
export function refundCapture(captureId: string, amount?: Money, note?: string) {
  return paypalRequest<Refund>(`/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    body: { ...(amount ? { amount } : {}), ...(note ? { note_to_payer: note } : {}) },
  });
}
