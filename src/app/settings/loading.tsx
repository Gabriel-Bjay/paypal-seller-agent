import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Skeleton className="h-8 w-48" />
      <p className="mt-2 text-sm text-neutral-500">Loading your rules…</p>
      <Skeleton className="mt-6 h-80" />
    </main>
  );
}
