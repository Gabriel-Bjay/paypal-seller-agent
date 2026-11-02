import { getRules } from "@/lib/rules";
import { saveRulesAction } from "../server-actions";

export const dynamic = "force-dynamic";

const input =
  "w-28 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-right tabular-nums dark:border-neutral-700";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { saved, error } = await searchParams;
  const rules = await getRules();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Agent rules</h1>
      <p className="mt-1 text-sm text-neutral-500">
        The agent can only suggest actions. These rules decide what it may do on its own, what needs your approval and
        what is never allowed. They are enforced in code, so nothing the agent writes can override them.
      </p>

      {saved && <p className="mt-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">Rules saved.</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}

      <form action={saveRulesAction} className="mt-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        <label className="flex items-center justify-between gap-4 p-4">
          <span>
            <span className="font-medium">Act without asking up to</span>
            <span className="block text-sm text-neutral-500">Refunds and offers up to this amount (USD) run on their own. Set 0 to always ask.</span>
          </span>
          <input name="autoApproveUpTo" type="number" min="0" step="0.01" defaultValue={rules.autoApproveUpTo} className={input} />
        </label>
        <label className="flex items-center justify-between gap-4 p-4">
          <span>
            <span className="font-medium">Ask me above (% of order)</span>
            <span className="block text-sm text-neutral-500">Refunds and offers above this share of the order always need your approval.</span>
          </span>
          <input name="approvalAbovePercent" type="number" min="0" max="100" defaultValue={rules.approvalAbovePercent} className={input} />
        </label>
        <label className="flex items-center justify-between gap-4 p-4">
          <span>
            <span className="font-medium">Never allow above (% of order)</span>
            <span className="block text-sm text-neutral-500">Refunds and offers above this share are blocked. 100 allows full refunds with approval.</span>
          </span>
          <input name="blockAbovePercent" type="number" min="0" max="100" defaultValue={rules.blockAbovePercent} className={input} />
        </label>
        <label className="flex items-center justify-between gap-4 p-4">
          <span>
            <span className="font-medium">Ask me before fighting a dispute</span>
            <span className="block text-sm text-neutral-500">Submitting evidence to PayPal needs your approval.</span>
          </span>
          <input name="approveBeforeFighting" type="checkbox" defaultChecked={rules.approveBeforeFighting} className="h-5 w-5" />
        </label>
        <label className="flex items-center justify-between gap-4 p-4">
          <span>
            <span className="font-medium">Ask me before messaging buyers</span>
            <span className="block text-sm text-neutral-500">Messages sent on your behalf need your approval.</span>
          </span>
          <input name="approveMessages" type="checkbox" defaultChecked={rules.approveMessages} className="h-5 w-5" />
        </label>
        <div className="flex justify-end p-4">
          <button type="submit" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900">
            Save rules
          </button>
        </div>
      </form>

      <p className="mt-6 text-sm text-neutral-500">
        Always enforced, whatever the settings: no refund larger than what is left on the payment, only actions PayPal
        currently allows on a dispute, and only valid positive amounts.
      </p>
    </main>
  );
}
