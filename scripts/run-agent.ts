// Runs the resolution agent on one tracked order from the command line and prints its recommendation.
// Usage: npm run agent -- <ORDER_ID>

import { runResolutionAgent } from "../src/lib/agent";

const orderId = process.argv[2];
if (!orderId) {
  console.error("Usage: npm run agent -- <ORDER_ID>");
  process.exit(1);
}

runResolutionAgent(orderId)
  .then((rec) => console.log(JSON.stringify(rec, null, 2)))
  .catch((err) => {
    console.error("✘", err.message);
    process.exit(1);
  });
