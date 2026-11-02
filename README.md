# PayPal Seller Agent

An AI operations agent for PayPal sellers. Every PayPal transaction becomes a **case** with a live timeline. When a refund request or dispute arrives, the agent gathers the evidence, recommends whether to **fight** (provide evidence) or **settle** (offer a partial or full refund), explains why, and carries out the decision through PayPal, within rules the seller sets and only after approval where the rules require it.

> Built for the PayPal AI Hackathon (Devpost). Work in progress.

## Why

Disputes cost small online sellers money and time: a lost "item not received" claim refunds the full amount, and gathering evidence before the deadline is tedious. A well-timed partial refund or a strong evidence response often costs far less than losing the case. This project lets an AI agent do the investigation and paperwork while the seller stays in control.

## How it works (planned layers)

1. **Timeline:** rebuilds each transaction from PayPal orders, captures, refunds and webhooks, and flags stuck or mismatched states.
2. **Rules:** seller-defined limits enforced in code, never by the AI (for example "partial refunds over 30% need my approval").
3. **Resolution agent:** reads a dispute, checks which actions PayPal allows, recommends fight or settle with reasoning and money impact, and executes the approved action via the Disputes API.
4. **Track record (stretch):** a shareable page of resolved cases.

## PayPal APIs used

| API | Use |
|---|---|
| Orders v2 | Create and capture payments |
| Payments v2 (captures) | Payment and refund state |
| Customer Disputes v1 | Find disputes, read allowed actions, make offers, accept claims, send messages |

## Project structure

```
src/lib/paypal/        PayPal REST client, orders and disputes helpers
scripts/buyer-sim.ts   Simulates the buyer in the sandbox website (approve, file dispute, accept offer)
scripts/dispute-smoke-test.ts   End-to-end check of the dispute loop
docs/sandbox-findings.md        What we learned about the PayPal sandbox
```

## Setup

Requirements: Node.js 20+, a free [PayPal Developer](https://developer.paypal.com) account.

1. **Create a sandbox app:** developer.paypal.com → Apps & Credentials → Sandbox → Create App (Merchant). Copy the Client ID and Secret.
2. **Find the sandbox buyer:** Testing Tools → Sandbox Accounts → the **Personal** account → View/edit account. Copy its email and password.
3. **Install and configure:**

   ```bash
   npm install
   cp .env.example .env.local   # then fill in the values from steps 1 and 2
   ```

4. **Run the app:**

   ```bash
   npm run dev   # http://localhost:3000
   ```

### Dispute smoke test

Runs the full loop in the sandbox: buyer pays, buyer opens an "item not received" dispute, the seller offers a $20 partial refund through the API, the buyer accepts, and PayPal partially refunds the payment.

```bash
npx playwright install chromium   # first time only, or set CHROMIUM_PATH
npm run smoke:dispute
```

It takes a few minutes, because a new dispute spends some time in PayPal review before the seller can respond.

## License

[MIT](LICENSE)
