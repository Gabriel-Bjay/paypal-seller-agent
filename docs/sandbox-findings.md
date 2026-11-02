# PayPal sandbox findings

Notes from testing the dispute loop in the PayPal sandbox (2 Nov 2026).

## What works

- **Disputes API scopes:** a default sandbox app's token includes `disputes/read-seller`, `disputes/update-seller` and `disputes/create`.
- **Full loop verified:** buyer pays $49 → buyer files "item not received" → seller sends a $20 `make-offer` via the API → buyer sees the offer in their Resolution Center and accepts → the capture becomes `PARTIALLY_REFUNDED`.
- **Allowed actions are discoverable:** once the seller can respond, `GET /v1/customer/disputes/{id}` returns `allowed_response_options` and POST links for `make_offer`, `accept_claim` (full or partial refund), `provide_evidence`, `send_message` and `escalate`. The agent should only ever propose actions in this list.

## Gotchas

- **Card payments are disabled** for the default sandbox business account (`PAYEE_NOT_ENABLED_FOR_CARD_PROCESSING`), so every test payment needs a buyer to approve it in the browser. `scripts/buyer-sim.ts` automates this.
- **Listing disputes without filters returned nothing**, but `?disputed_transaction_id=<capture id>` found the dispute. Look disputes up by transaction.
- **New disputes start in PayPal review** (`UNDER_REVIEW` / `UNDER_PAYPAL_REVIEW`, stage `INQUIRY`) with no allowed actions. After a few minutes they moved to `WAITING_FOR_SELLER_RESPONSE`. Poll before acting.
- **After an offer**, the dispute shows `WAITING_FOR_BUYER_RESPONSE`, then returns to PayPal review once the buyer accepts; the refund appears on the capture first.
- **There is no buyer-side REST API** for approving payments, filing disputes or accepting offers, so these run through the sandbox website.
