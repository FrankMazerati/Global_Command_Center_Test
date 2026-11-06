import * as D from "@radix-ui/react-dialog";
import { useState } from "react";
import { Btn } from "./bits";

export function ActionDialog({
  open, onOpenChange, title, description, options, optionLabel, confirm, onConfirm, requireReason = true,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string;
  options?: string[]; optionLabel?: string; confirm: string; requireReason?: boolean;
  onConfirm: (v: { option?: string | undefined; reason: string }) => void;
}) {
  const [option, setOption] = useState(options?.[0]);
  const [reason, setReason] = useState("");
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
        <D.Content className="glass fixed left-1/2 top-1/2 z-50 w-[min(94vw,440px)] -translate-x-1/2 -translate-y-1/2 bg-popover p-5">
          <D.Title className="font-display text-lg font-bold">{title}</D.Title>
          {description && <D.Description className="mt-1 text-sm text-muted-foreground">{description}</D.Description>}
          {options && (
            <label className="mt-4 block text-xs text-muted-foreground">{optionLabel}
              <select value={option} onChange={(e) => setOption(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-secondary px-3 text-sm text-foreground">
                {options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
          )}
          <label className="mt-4 block text-xs text-muted-foreground">Reason / details
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border bg-secondary p-3 text-sm text-foreground" />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
            <Btn disabled={requireReason && reason.trim().length < 3} onClick={() => { onConfirm({ option, reason }); setReason(""); onOpenChange(false); }}>{confirm}</Btn>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
