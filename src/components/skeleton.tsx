/** Placeholder blocks shown while pages load data from PayPal. */
export function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800 ${className}`} />;
}
