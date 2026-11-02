import type { CaseStatus, Flag } from "@/lib/cases";

const STATUS_STYLES: Record<CaseStatus, string> = {
  "Action needed": "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  "Not captured": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  "Waiting for buyer": "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  "In PayPal review": "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  "Awaiting payment": "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  Refunded: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  "Partially refunded": "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  "Dispute resolved": "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  Paid: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

const FLAG_STYLES: Record<Flag["level"], string> = {
  critical: "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100",
  warning: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100",
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-100",
};

export function FlagBanner({ flag }: { flag: Flag }) {
  return <div className={`rounded-lg border px-4 py-3 text-sm ${FLAG_STYLES[flag.level]}`}>{flag.message}</div>;
}

export function formatDate(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
