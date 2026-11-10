import { Link } from "@tanstack/react-router";
import { BookOpen, CheckSquare, ListTodo, MessageCircle, NotebookPen, Plus, Trash2, Workflow } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ALL_DESTINATIONS } from "@/lib/nav";
import { HelpBuddyConversation } from "@/components/workspace/KnowledgeAndHelpWorkspaces";
import { useWork } from "@/lib/work-context";
import { cn } from "@/lib/utils";

const KNOWLEDGE = ALL_DESTINATIONS.filter((d) => d.section.slug === "knowledge-spaces");
const WORK_VIEWS = ["Open work", "Pending work", "Closed work", "Transferred work", "Follow-ups", "Manager sign-off"];

export function HelpBuddyPanel({ className }: { className?: string }) {
  const w = useWork();
  const [note, setNote] = useState("");
  const [noteScope, setNoteScope] = useState<"personal" | "ticket">("personal");
  const [item, setItem] = useState("");
  const [ticketInput, setTicketInput] = useState("");
  const [kq, setKq] = useState("");
  const done = w.checklist.filter((c) => c.done).length;
  const kResults = KNOWLEDGE.filter((d) => d.page.title.toLowerCase().includes(kq.toLowerCase())).slice(0, 8);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full border border-sky-300/30 bg-sky-300/10 text-sky-200"><Workflow className="size-5"/></div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-bold tracking-wide">Help Buddy</div>
          <div className="truncate text-xs text-muted-foreground">
            {w.activeTicketId ? (
              <>
                Working on <span className="font-semibold text-primary">{w.activeTicketId}</span>
              </>
            ) : (
              "No active ticket"
            )}
          </div>
        </div>
      </div>
      <Tabs defaultValue={w.helpBuddyTab} key={w.helpBuddyTab} className="flex flex-1 flex-col gap-0">
        <TabsList className="mx-3 mt-3 grid h-auto grid-cols-5">
          <TabsTrigger value="workflow" aria-label="Workflow"><Workflow className="size-4" /></TabsTrigger>
          <TabsTrigger value="notes" aria-label="Notes"><NotebookPen className="size-4" /></TabsTrigger>
          <TabsTrigger value="knowledge" aria-label="Knowledge"><BookOpen className="size-4" /></TabsTrigger>
          <TabsTrigger value="work" aria-label="My work"><ListTodo className="size-4" /></TabsTrigger>
          <TabsTrigger value="chat" aria-label="Conversation"><MessageCircle className="size-4" /></TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-4 p-4">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active ticket</h3>
            {w.activeTicketId ? (
              <div className="flex items-center justify-between rounded-lg border bg-secondary/60 px-3 py-2">
                <span className="font-semibold text-primary">{w.activeTicketId}</span>
                <Button size="sm" variant="ghost" onClick={() => w.setActiveTicketId(null)}>Clear</Button>
              </div>
            ) : (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (ticketInput.trim()) w.setActiveTicketId(ticketInput.trim().toUpperCase());
                  setTicketInput("");
                }}
              >
                <Input value={ticketInput} onChange={(e) => setTicketInput(e.target.value)} placeholder="Ticket ID, e.g. TKT-1042" aria-label="Ticket ID" />
                <Button type="submit" size="sm">Set</Button>
              </form>
            )}
            <p className="mt-1.5 text-[11px] text-muted-foreground">Stays with you as you move between sections.</p>
          </section>
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Checklist</h3>
              <span className="text-xs text-muted-foreground">{done}/{w.checklist.length} done</span>
            </div>
            <ul className="space-y-1.5">
              {w.checklist.map((c) => (
                <li key={c.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted">
                  <Checkbox checked={c.done} onCheckedChange={() => w.toggleChecklistItem(c.id)} aria-label={c.label} />
                  <span className={cn("flex-1 text-sm", c.done && "text-muted-foreground line-through")}>{c.label}</span>
                  <button type="button" onClick={() => w.removeChecklistItem(c.id)} aria-label={`Remove ${c.label}`} className="text-muted-foreground opacity-60 hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (item.trim()) w.addChecklistItem(item.trim());
                setItem("");
              }}
            >
              <Input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Add a step" aria-label="New checklist step" />
              <Button type="submit" size="icon" variant="secondary" aria-label="Add step"><Plus className="size-4" /></Button>
            </form>
          </section>
        </TabsContent>

        <TabsContent value="notes" className="space-y-3 p-4">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (note.trim()) w.addNote(note.trim(), noteScope);
              setNote("");
            }}
          >
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write a working note…" rows={3} aria-label="Note" />
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border p-0.5 text-xs">
                {(["personal", "ticket"] as const).map((s) => (
                  <button
                    type="button"
                    key={s}
                    disabled={s === "ticket" && !w.activeTicketId}
                    onClick={() => setNoteScope(s)}
                    className={cn("rounded px-2 py-1 capitalize disabled:opacity-40", noteScope === s && "bg-primary text-primary-foreground")}
                  >
                    {s === "personal" ? "Private" : "Ticket"}
                  </button>
                ))}
              </div>
              <Button type="submit" size="sm" className="ml-auto">Save note</Button>
            </div>
          </form>
          <p className="text-[11px] text-muted-foreground">Saved on this device until the backend is connected.</p>
          <ul className="space-y-2">
            {w.notes.map((n) => (
              <li key={n.id} className="rounded-lg border bg-card p-3 text-sm shadow-card">
                <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className={cn("rounded px-1.5 py-0.5 font-medium", n.scope === "ticket" ? "bg-primary/10 text-primary" : "bg-contractor/10 text-contractor")}>
                    {n.scope === "ticket" ? n.ticketId : "Private"}
                  </span>
                  <time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString()}</time>
                  <button type="button" onClick={() => w.removeNote(n.id)} className="ml-auto hover:text-destructive" aria-label="Delete note">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <p className="whitespace-pre-wrap">{n.text}</p>
              </li>
            ))}
            {w.notes.length === 0 && <li className="text-sm text-muted-foreground">No notes yet.</li>}
          </ul>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-3 p-4">
          <Input value={kq} onChange={(e) => setKq(e.target.value)} placeholder="Search guides…" aria-label="Search knowledge" />
          <ul className="space-y-1">
            {kResults.map(({ section, group, page }) => (
              <li key={page.slug + group.slug}>
                <Link
                  to="/m/$section/$group/$page"
                  params={{ section: section.slug, group: group.slug, page: page.slug }}
                  className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  {page.title}
                  <span className="block text-[11px] text-muted-foreground">{group.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">Opening a guide keeps your active ticket and notes.</p>
        </TabsContent>

        <TabsContent value="work" className="space-y-2 p-4">
          {WORK_VIEWS.map((v) => (
            <div key={v} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span className="flex items-center gap-2"><CheckSquare className="size-4 text-primary" />{v}</span>
              <span className="text-xs text-muted-foreground">Awaiting backend</span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="chat" className="p-4">
          <div className="rounded-lg border border-dashed bg-muted/50 p-4 text-sm text-muted-foreground">
            Conversation with Help Buddy turns on in the next phase, once the backend and AI service are connected.
            Notes, checklists and your active ticket already work.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function HelpBuddySheet() {
  const { helpBuddyOpen, setHelpBuddyOpen } = useWork();
  return (
    <Sheet open={helpBuddyOpen} onOpenChange={setHelpBuddyOpen}>
      <SheetContent side="right" className="w-[92vw] max-w-md overflow-y-auto p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Help Buddy</SheetTitle>
          <SheetDescription>Your conversational work assistant</SheetDescription>
        </SheetHeader>
        <HelpBuddyPanel />
      </SheetContent>
    </Sheet>
  );
}

export function HelpBuddyLauncher() {
  const { openHelpBuddy, helpBuddyOpen } = useWork();
  if (helpBuddyOpen) return null;
  return (
    <button
      type="button"
      onClick={() => openHelpBuddy()}
      aria-label="Open Help Buddy"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border bg-card py-1.5 pl-1.5 pr-4 shadow-float transition-transform hover:scale-105"
    >
      <span className="grid size-8 place-items-center rounded-full bg-sky-400/15 text-sky-200"><Workflow className="size-4"/></span>
      <span className="font-display text-xs font-bold tracking-wide">Help Buddy</span>
    </button>
  );
}
