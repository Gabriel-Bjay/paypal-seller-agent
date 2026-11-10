import type { Recommendation } from "@/lib/agent";
import { decideAction, runAgentAction, saveNotesAction } from "@/app/server-actions";
import { SubmitButton } from "./submit-button";
import { formatDate } from "./case-ui";

const primary =
  "rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900";
const secondary =
  "rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900";

const STATUS_TEXT: Record<Recommendation["status"], string> = {
  pending_approval: "Waiting for your approval",
  executed_by_agent: "Done by the agent, within your rules",
  approved_and_executed: "Approved by you and sent to PayPal",
  dismissed: "Dismissed",
  failed: "Could not be carried out",
  no_action: "No action needed right now",
};

function describeAction(a: NonNullable<Recommendation["action"]>) {
  switch (a.type) {
    case "make_offer":
      return { title: `Offer a $${Number(a.amount).toFixed(2)} refund`, text: a.note };
    case "accept_claim":
      return { title: a.amount ? `Accept the claim with a $${Number(a.amount).toFixed(2)} refund` : "Accept the claim and refund in full", text: a.note };
    case "provide_evidence":
      return { title: "Fight the dispute with evidence", text: a.note };
    case "send_message":
      return { title: "Message the buyer", text: a.message };
    default:
      return { title: a.type, text: "" };
  }
}

export function AgentPanel({ orderId, notes, rec, canAct }: { orderId: string; notes: string; rec?: Recommendation; canAct: boolean }) {
  return (
    <section className="mt-8 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
      <h2 className="font-medium">Resolution agent</h2>

      <form action={saveNotesAction} className="mt-3">
        <input type="hidden" name="orderId" value={orderId} />
        <label className="text-sm text-neutral-500" htmlFor="notes">
          Your notes for the agent: shipping, tracking, anything you know about this order
        </label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={notes}
          rows={3}
          placeholder="e.g. Shipped 28 Oct with Posta Kenya, tracking KE123456. Last scan: arrived in destination country 31 Oct."
          className="mt-1 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        />
        <SubmitButton busy="Saving…" className={`${secondary} mt-2`}>
          Save notes
        </SubmitButton>
      </form>

      {rec && (
        <div className="mt-5 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900">
          <div className="text-xs text-neutral-500">
            {formatDate(rec.createdAt)} · {STATUS_TEXT[rec.status]}
            {rec.model && ` · ${rec.model}`}
          </div>
          <h3 className="mt-1 text-lg font-semibold">{rec.headline}</h3>
          <p className="mt-2 text-sm">{rec.reasoning}</p>
          <p className="mt-2 text-sm font-medium">{rec.moneyImpact}</p>

          {rec.evidence.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-600 dark:text-neutral-300">
              {rec.evidence.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          {rec.action && (
            <div className="mt-4 rounded-md border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-950">
              <div className="font-medium">{describeAction(rec.action).title}</div>
              {describeAction(rec.action).text && <p className="mt-1 whitespace-pre-line text-neutral-600 dark:text-neutral-300">“{describeAction(rec.action).text}”</p>}
              {rec.verdict && rec.verdict.decision !== "allow" && (
                <p className="mt-2 text-xs text-neutral-500">Why it needs you: {rec.verdict.reasons.join(" ")}</p>
              )}
            </div>
          )}

          {rec.error && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{rec.error}</p>}

          {rec.status === "pending_approval" && (
            <form action={decideAction} className="mt-4 flex gap-2">
              <input type="hidden" name="orderId" value={orderId} />
              <SubmitButton name="decision" value="approve" busy="Working…" className={primary}>
                Approve and send
              </SubmitButton>
              <SubmitButton name="decision" value="dismiss" busy="Working…" className={secondary}>
                Dismiss
              </SubmitButton>
            </form>
          )}
        </div>
      )}

      {canAct && (
        <form action={runAgentAction} className="mt-4">
          <input type="hidden" name="orderId" value={orderId} />
          <SubmitButton busy="The agent is reviewing the case…" className={primary}>
            {rec ? "Ask the agent again" : "Ask the agent what to do"}
          </SubmitButton>
        </form>
      )}
    </section>
  );
}
