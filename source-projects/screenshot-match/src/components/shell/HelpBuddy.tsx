import { useState } from "react";
import { LifeBuoy, X } from "lucide-react";

/** Persistent Help Buddy launcher, always available outside the menu. */
export function HelpBuddy() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-14 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="glass-strong w-72 rounded-xl p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <LifeBuoy className="h-4 w-4 text-env" /> Help Buddy
            </h3>
            <button onClick={() => setOpen(false)} aria-label="Close Help Buddy"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-sm text-muted-foreground">
            Hi! I'll guide you around IntelliStack. AI answers will be connected in a later step.
          </p>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="glass-strong glow-env flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
      >
        <LifeBuoy className="h-4 w-4 text-env-glow" /> Help Buddy
      </button>
    </div>
  );
}
