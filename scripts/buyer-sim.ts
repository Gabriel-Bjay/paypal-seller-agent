// Simulates the buyer side in the PayPal sandbox website with a headless browser:
// approving a payment, filing an "item not received" dispute and accepting a seller offer.
// The buyer side has no REST API for these steps, so the demo and judges use this instead.

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import fs from "node:fs";

const SANDBOX = "https://www.sandbox.paypal.com";
const STATE_FILE = ".sandbox/buyer-state.json";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buyer() {
  const email = process.env.SANDBOX_BUYER_EMAIL;
  const password = process.env.SANDBOX_BUYER_PASSWORD;
  if (!email || !password) throw new Error("SANDBOX_BUYER_EMAIL and SANDBOX_BUYER_PASSWORD must be set");
  return { email, password };
}

async function open(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 1000 },
    storageState: fs.existsSync(STATE_FILE) ? STATE_FILE : undefined,
  });
  return { browser, context, page: await context.newPage() };
}

async function close(browser: Browser, context: BrowserContext) {
  fs.mkdirSync(".sandbox", { recursive: true });
  await context.storageState({ path: STATE_FILE });
  await browser.close();
}

async function dismissCookies(page: Page) {
  await page.click("text=Yes, I accept", { timeout: 3000 }).catch(() => {});
}

/**
 * Fills the PayPal login form if it is showing. Handles both the full form and the
 * "welcome back" variant that only asks for the password when a saved session expires.
 */
async function logIn(page: Page) {
  const visible = (sel: string) => page.isVisible(sel).catch(() => false);
  if (!(await visible("#email")) && !(await visible("#password"))) return;
  const { email, password } = buyer();
  if (await visible("#email")) {
    await page.fill("#email", email);
    if (await visible("#btnNext")) {
      await page.click("#btnNext");
      await sleep(4000);
    }
  }
  await page.fill("#password", password);
  await page.click("#btnLogin");
  await sleep(10000);
}

/** Logs in and pays at an order's approval URL. */
export async function approveOrder(approvalUrl: string) {
  const { browser, context, page } = await open();
  try {
    await page.goto(approvalUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(6000);
    await logIn(page);
    await page.click("button[data-id='payment-submit-btn']", { timeout: 30000 });
    await page.waitForURL(/example\.com\/approved/, { timeout: 60000 });
  } finally {
    await close(browser, context);
  }
}

/** Files an "item not received" case for the most recent payment of the given amount. */
export async function fileNotReceivedDispute(amountText: string, message: string) {
  const { browser, context, page } = await open();
  try {
    await page.goto(`${SANDBOX}/signin`, { timeout: 60000 });
    await sleep(5000);
    await logIn(page);
    // The page also lists open cases and saved drafts; pick the newest payment in the transaction list.
    // A fresh payment can take a few minutes to appear there, so reload until it does.
    const payment = page.locator(
      `xpath=//*[contains(text(),'Choose a transaction')]/following::*[contains(text(),'${amountText}')][1]`,
    );
    for (let attempt = 0; attempt < 10; attempt++) {
      await page.goto(`${SANDBOX}/resolutioncenter`, { timeout: 60000 });
      await sleep(8000);
      await logIn(page);
      await dismissCookies(page);
      if (await payment.isVisible().catch(() => false)) break;
      await sleep(20000);
    }
    await payment.click();
    await sleep(5000);
    await page.locator("button:has-text('Report a Problem'), a:has-text('Report a Problem')").first().click();
    await sleep(6000);

    if (await page.getByText("Continue Reporting this Issue").count()) {
      await page.getByText("Continue Reporting this Issue").first().click();
    } else {
      await page.getByText("haven’t received the item").first().click();
      await sleep(2000);
      await page.click("button[type=submit]:has-text('Continue')");
      await sleep(6000);
      await page.fill("[name='items.0.name']", "Test item");
      await page.selectOption("[name='items.0.type']", { index: 1 });
      await page.selectOption("[name='items.0.category']", { index: 1 });
      await page.fill("[name='items.0.quantity']", "1");
      await page.click("button[type=submit]:has-text('Continue')");
    }
    await sleep(8000);

    // The remaining steps vary; answer each page generically until the case is filed.
    for (let step = 0; step < 12 && !page.url().includes("/complete"); step++) {
      const notDelivered = page.locator("[id$='subIssue_NOT_DELIVERED']");
      const radio = (await notDelivered.count()) ? notDelivered.first() : page.locator("input[type=radio]").first();
      if (await radio.count()) {
        const id = await radio.getAttribute("id");
        const label = page.locator(`label[for="${id}"]`);
        await ((await label.count()) ? label.first() : radio).click({ force: true });
      }
      for (const t of await page.locator("textarea").all()) if (await t.isVisible()) await t.fill(message);
      for (const input of await page.locator("input").all()) {
        if (!(await input.isVisible()) || (await input.inputValue())) continue;
        const meta = [await input.getAttribute("name"), await input.getAttribute("id")].join(" ").toLowerCase();
        if (meta.includes("refund") || meta.includes("amount")) await input.fill(amountText.replace(/[^0-9.]/g, ""));
      }
      const submit = page.locator("button[type=submit]:visible").first();
      if (!(await submit.count())) break;
      await submit.click();
      await sleep(9000);
    }

    const caseId = (await page.innerText("body")).match(/Case ID:\s*(\S+)/)?.[1];
    if (!caseId) throw new Error("Dispute filing did not reach the confirmation page");
    return caseId;
  } finally {
    await close(browser, context);
  }
}

/** Accepts the seller's offer on a case. */
export async function acceptOffer(caseId: string) {
  const { browser, context, page } = await open();
  try {
    const accept = page.getByRole("button", { name: "Accept", exact: true }).first();
    // A fresh offer can take a few minutes to reach the buyer's case page, so reload until it does.
    for (let attempt = 0; attempt < 10; attempt++) {
      await page.goto(`${SANDBOX}/resolutioncenter/${caseId}`, { timeout: 60000 });
      await sleep(8000);
      if (await page.isVisible("#email").catch(() => false)) {
        await logIn(page);
        continue;
      }
      await dismissCookies(page);
      if (await accept.isVisible().catch(() => false)) break;
      await sleep(20000);
    }
    await accept.click();
    await sleep(4000);
    await page.getByRole("button", { name: "Confirm", exact: true }).first().click();
    await sleep(10000);
  } finally {
    await close(browser, context);
  }
}
