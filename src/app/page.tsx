import { listCases, DISPUTE_REASONS, type Case } from "@/lib/cases";
import { listRecommendations, type Recommendation } from "@/lib/agent";
import { CasesGrid, type CaseRow } from "@/components/cases-grid";

export const dynamic = "force-dynamic";

const AGENT_LABEL: Record<Recommendation["status"], string> = {
  pending_approval: "Waiting for your approval",
  executed_by_agent: "Handled by the agent",
  approved_and_executed: "Approved and sent",
  dismissed: "You dismissed it",
  failed: "Couldn't be carried out",
  no_action: "Nothing to do yet",
};

const usd = (n: number) => `$${n.toFixed(2)}`;
const isOpenDispute = (c: Case) => Boolean(c.dispute && c.dispute.status !== "RESOLVED");

/** Money the seller could still lose (open disputes) or hasn't collected (approved, uncaptured payments). */
function atRisk(c: Case) {
  if (isOpenDispute(c)) return Number(c.dispute!.dispute_amount.value);
  if (c.status === "Not captured") return Number(c.amount?.value ?? 0);
  return 0;
}

/** For disputes settled with a partial refund: what the seller kept compared with refunding in full. */
function keptBySettling(c: Case) {
  if (!c.dispute || c.dispute.status !== "RESOLVED" || !c.captureId) return 0;
  const paid = Number(c.amount?.value ?? 0);
  return c.refunded > 0 && c.refunded < paid ? paid - c.refunded : 0;
}

export default async function Dashboard() {
  const [{ cases, errors }, recs] = await Promise.all([listCases(), listRecommendations()]);

  const rows: CaseRow[] = cases.map((c) => {
    const rec = recs[c.id];
    return {
      id: c.id,
      item: c.item,
      buyer: c.buyer ?? "-",
      amount: Number(c.amount?.value ?? 0),
      status: c.status,
      atRisk: atRisk(c),
      dispute: c.dispute ? DISPUTE_REASONS[c.dispute.reason] ?? c.dispute.reason : "-",
      respondBy: isOpenDispute(c) ? c.dispute!.seller_response_due_date ?? null : null,
      agent: rec ? AGENT_LABEL[rec.status] : isOpenDispute(c) ? "Not reviewed yet" : "-",
      lastActivity: c.updatedAt ?? null,
      urgent: c.flags.some((f) => f.level !== "info") || rec?.status === "pending_approval",
    };
  });

  const openDisputes = cases.filter(isOpenDispute);
  const waitingForYou = rows.filter((r) => r.urgent).length;
  const tiles = [
    { label: "Open disputes", value: String(openDisputes.length), hint: `${usd(openDisputes.reduce((s, c) => s + atRisk(c), 0))} claimed` },
    { label: "Need your attention", value: String(waitingForYou), hint: "Responses due, approvals, uncollected payments" },
    { label: "Money at risk", value: usd(rows.reduce((s, r) => s + r.atRisk, 0)), hint: "Open disputes + payments not captured" },
    { label: "Kept by settling", value: usd(cases.reduce((s, c) => s + keptBySettling(c), 0)), hint: "Partial refunds instead of full ones" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Cases</h1>
        <p className="mt-1 text-sm text-neutral-500">Every PayPal order the agent watches. Click a row to open the case.</p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="text-sm text-neutral-500">{t.label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{t.value}</div>
            <div className="mt-1 text-xs text-neutral-500">{t.hint}</div>
          </div>
        ))}
      </section>

      {errors.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
          Some orders could not be loaded from PayPal: {errors.join("; ")}
        </div>
      )}

      {cases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          No orders yet. Run <code className="font-mono">npm run seed</code> to create sandbox orders and disputes.
        </div>
      ) : (
        <CasesGrid rows={rows} />
      )}
    </main>
  );
}
