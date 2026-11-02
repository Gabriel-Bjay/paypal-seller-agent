"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveRules } from "@/lib/rules";
import { ActionRefused, executeAction } from "@/lib/actions";

export async function saveRulesAction(form: FormData) {
  const num = (name: string) => Number(form.get(name));
  const error = await saveRules({
    autoApproveUpTo: num("autoApproveUpTo"),
    approvalAbovePercent: num("approvalAbovePercent"),
    blockAbovePercent: num("blockAbovePercent"),
    approveBeforeFighting: form.get("approveBeforeFighting") === "on",
    approveMessages: form.get("approveMessages") === "on",
  });
  redirect(error ? `/settings?error=${encodeURIComponent(error)}` : "/settings?saved=1");
}

/** Capturing an approved payment, triggered by the seller's own click. */
export async function captureAction(form: FormData) {
  const orderId = String(form.get("orderId"));
  let error = "";
  try {
    await executeAction(orderId, { type: "capture" }, true);
  } catch (err) {
    error = err instanceof ActionRefused ? err.message : `PayPal error: ${(err as Error).message}`;
  }
  revalidatePath(`/cases/${orderId}`);
  redirect(`/cases/${orderId}${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}
