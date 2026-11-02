import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Skeleton className="h-8 w-64" />
      <p className="mt-2 text-sm text-neutral-500">Loading the case from PayPal…</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="mt-6 h-40" />
      <Skeleton className="mt-6 h-64" />
    </main>
  );
}
