import { paypalRequest } from "./client";

export type Money = { currency_code: string; value: string };

export type Capture = {
  id: string;
  status: string;
  amount: Money;
};

export type Order = {
  id: string;
  status: string;
  links?: { href: string; rel: string; method: string }[];
  purchase_units?: { payments?: { captures?: Capture[] } }[];
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
