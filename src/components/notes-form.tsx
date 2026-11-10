"use client";

import { useActionState, useState } from "react";
import { saveNotesAction } from "@/app/server-actions";
import { SubmitButton } from "./submit-button";

/** Saves the seller's notes in place, without reloading the whole case from PayPal. */
export function NotesForm({ orderId, notes, buttonClass }: { orderId: string; notes: string; buttonClass: string }) {
  const [state, action] = useActionState(saveNotesAction, { savedAt: 0 });
  // Controlled, because React resets uncontrolled fields after a form action, which made the
  // saved note vanish from the box.
  const [text, setText] = useState(notes);

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="text-sm text-neutral-500" htmlFor="notes">
        Your notes for the agent: shipping, tracking, anything you know about this order
      </label>
      <textarea
        id="notes"
        name="notes"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="e.g. Shipped 28 Oct with Posta Kenya, tracking KE123456. Last scan: arrived in destination country 31 Oct."
        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <div className="mt-2 flex items-center gap-3">
        <SubmitButton busy="Saving…" className={buttonClass}>
          Save notes
        </SubmitButton>
        {state.savedAt > 0 && <span className="text-sm font-medium text-green-700">Saved ✓</span>}
      </div>
    </form>
  );
}
