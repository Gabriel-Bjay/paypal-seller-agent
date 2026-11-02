import Link from "next/link";
import { listCases, money } from "@/lib/cases";
import { StatusBadge, formatDate } from "@/components/case-ui";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const { cases, errors } = await listCases();
  const needsAction = cases.filter((c) => c.flags.some((f) => f.level !== "info")).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Cases</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {cases.length} orders tracked · {needsAction} need{needsAction === 1 ? "s" : ""} attention
        </p>
      </header>

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
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Buyer</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  <td className="px-4 py-3">
                    <Link href={`/cases/${c.id}`} className="font-medium hover:underline">
                      {c.item}
                    </Link>
                    <div className="font-mono text-xs text-neutral-500">{c.id}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{c.buyer ?? "-"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(c.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
