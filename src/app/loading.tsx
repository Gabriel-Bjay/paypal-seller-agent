import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Skeleton className="h-8 w-40" />
      <p className="mt-2 text-sm text-neutral-500">Loading cases from PayPal…</p>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="mt-8 h-96" />
    </main>
  );
}
