export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">PayPal Seller Agent</h1>
      <p className="text-lg text-neutral-600 dark:text-neutral-300">
        An AI operations agent for PayPal sellers. It turns every transaction into a case, spots
        refund requests and disputes, recommends whether to fight or settle, and carries out the
        decision through PayPal within rules the seller sets.
      </p>
      <p className="text-sm text-neutral-500">Work in progress for the PayPal AI Hackathon.</p>
    </main>
  );
}
