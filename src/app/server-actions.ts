"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveRules } from "@/lib/rules";
import { ActionRefused, executeAction } from "@/lib/actions";
import { decideRecommendation, runResolutionAgent, saveNotes } from "@/lib/agent";

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

/** Saves notes without re-rendering the case page, which would reload everything from PayPal. */
export async function saveNotesAction(_prev: { savedAt: number }, form: FormData) {
  await saveNotes(String(form.get("orderId")), String(form.get("notes") ?? ""));
  return { savedAt: Date.now() };
}

export async function runAgentAction(form: FormData) {
  const orderId = String(form.get("orderId"));
  let error = "";
  try {
    await runResolutionAgent(orderId);
  } catch (err) {
    error = `The agent couldn't finish: ${(err as Error).message}`;
  }
  revalidatePath(`/cases/${orderId}`);
  redirect(`/cases/${orderId}${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}

export async function decideAction(form: FormData) {
  const orderId = String(form.get("orderId"));
  let error = "";
  try {
    const rec = await decideRecommendation(orderId, form.get("decision") === "approve");
    if (rec.status === "failed") error = rec.error ?? "The action failed.";
  } catch (err) {
    error = (err as Error).message;
  }
  revalidatePath(`/cases/${orderId}`);
  redirect(`/cases/${orderId}${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}
