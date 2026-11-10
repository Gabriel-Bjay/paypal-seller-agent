import Link from "next/link";
import { notFound } from "next/navigation";
import { buildCase, DISPUTE_REASONS, money, type Actor } from "@/lib/cases";
import { listTrackedOrders } from "@/lib/store";
import { FlagBanner, StatusBadge, formatDate } from "@/components/case-ui";
import { readAudit } from "@/lib/actions";
import { captureAction } from "../../server-actions";
import { getNotes, getRecommendation } from "@/lib/agent";
import { AgentPanel } from "@/components/agent-panel";

export const dynamic = "force-dynamic";

const ACTOR_LABEL: Record<Actor, string> = { buyer: "Buyer", seller: "You", paypal: "PayPal" };
const DOT: Record<string, string> = {
  good: "bg-green-500",
  bad: "bg-red-500",
  neutral: "bg-neutral-400",
};

export default async function CasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const tracked = await listTrackedOrders();
  const entry = tracked.find((t) => t.orderId === id);
  if (!entry) notFound();
  const c = await buildCase(id, entry.disputeId);
  const [audit, notes, rec] = await Promise.all([readAudit(id), getNotes(id), getRecommendation(id)]);
  const disputeOpen = Boolean(c.dispute && c.dispute.status !== "RESOLVED");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← All cases
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{c.item}</h1>
          <p className="mt-1 font-mono text-xs text-neutral-500">Order {c.id}</p>
        </div>
        <StatusBadge status={c.status} />
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Buyer", c.buyer ?? "-"],
          ["Amount", money(c.amount)],
          ["PayPal fee", money(c.fee)],
          ["Refunded", c.refunded ? money({ currency_code: c.amount?.currency_code ?? "USD", value: String(c.refunded) }) : "-"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
            <div className="text-xs text-neutral-500">{label}</div>
            <div className="mt-1 truncate font-medium tabular-nums">{value}</div>
          </div>
        ))}
      </section>

      {error && (
        <div className="mt-6">
          <FlagBanner flag={{ level: "critical", message: error }} />
        </div>
      )}

      {c.flags.length > 0 && (
        <section className="mt-6 space-y-2">
          {c.flags.map((f) => (
            <FlagBanner key={f.message} flag={f} />
          ))}
        </section>
      )}

      {c.status === "Not captured" && (
        <form action={captureAction} className="mt-4">
          <input type="hidden" name="orderId" value={c.id} />
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            Capture {money(c.amount)} now
          </button>
        </form>
      )}

      {c.dispute && (
        <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm shadow-sm">
          <h2 className="font-medium">Dispute {c.dispute.dispute_id}</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-neutral-600 dark:text-neutral-300">
            <dt>Reason</dt>
            <dd>{DISPUTE_REASONS[c.dispute.reason] ?? c.dispute.reason}</dd>
            <dt>Disputed amount</dt>
            <dd>{money(c.dispute.dispute_amount)}</dd>
            <dt>PayPal status</dt>
            <dd className="font-mono text-xs leading-5">{c.dispute.status}</dd>
            {c.dispute.seller_response_due_date && (
              <>
                <dt>Respond by</dt>
                <dd>{formatDate(c.dispute.seller_response_due_date)}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {(disputeOpen || rec) && <AgentPanel orderId={c.id} notes={notes} rec={rec} canAct={disputeOpen} />}

      <section className="mt-8">
        <h2 className="mb-4 font-medium">Timeline</h2>
        <ol className="relative border-l border-neutral-200 dark:border-neutral-800">
          {c.timeline.map((e, i) => (
            <li key={i} className="mb-6 ml-5">
              <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full ${DOT[e.tone ?? "neutral"]}`} />
              <div className="text-xs text-neutral-500">
                {formatDate(e.at)} · {ACTOR_LABEL[e.actor]}
              </div>
              <div className="font-medium">{e.title}</div>
              {e.detail && <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-300">{e.detail}</p>}
            </li>
          ))}
        </ol>
      </section>
      {audit.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-medium">Action log</h2>
          <ul className="space-y-2 text-sm">
            {audit.map((a, i) => (
              <li key={i} className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800">
                <span className="text-neutral-500">{formatDate(a.at)}</span> · <span className="font-medium">{a.action.type.replace("_", " ")}</span> ·{" "}
                {a.outcome === "executed" ? "done" : a.outcome}
                {a.approvedBySeller && " (approved by you)"}
                {a.error && <div className="mt-1 text-neutral-500">{a.error}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
