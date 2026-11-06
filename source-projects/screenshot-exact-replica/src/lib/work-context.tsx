import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Shared working context that survives internal navigation (active ticket, Help Buddy, notes).
// Until the backend is connected, notes/checklists are kept on this device only and labeled as such.

export type Availability =
  | "Available"
  | "Away"
  | "Busy"
  | "Out to Lunch"
  | "In a Meeting"
  | "On Break"
  | "On a Call"
  | "Helping a User"
  | "Out of Office";

export const AVAILABILITY: Availability[] = [
  "Available",
  "Away",
  "Busy",
  "Out to Lunch",
  "In a Meeting",
  "On Break",
  "On a Call",
  "Helping a User",
  "Out of Office",
];

export interface WorkNote {
  id: string;
  text: string;
  scope: "personal" | "ticket";
  ticketId: string | null;
  createdAt: string;
}
export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

interface WorkState {
  activeTicketId: string | null;
  availability: Availability;
  notes: WorkNote[];
  checklist: ChecklistItem[];
}

interface WorkContextValue extends WorkState {
  helpBuddyOpen: boolean;
  setHelpBuddyOpen: (v: boolean) => void;
  helpBuddyTab: string;
  openHelpBuddy: (tab?: string) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  setActiveTicketId: (id: string | null) => void;
  setAvailability: (a: Availability) => void;
  addNote: (text: string, scope: WorkNote["scope"]) => void;
  removeNote: (id: string) => void;
  addChecklistItem: (label: string) => void;
  toggleChecklistItem: (id: string) => void;
  removeChecklistItem: (id: string) => void;
}

const STORAGE_KEY = "mo-work-context-v1";
const initial: WorkState = { activeTicketId: null, availability: "Available", notes: [], checklist: [] };
const Ctx = createContext<WorkContextValue | null>(null);
const uid = () => Math.random().toString(36).slice(2, 10);

export function WorkContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkState>(initial);
  const [loaded, setLoaded] = useState(false);
  const [helpBuddyOpen, setHelpBuddyOpen] = useState(false);
  const [helpBuddyTab, setHelpBuddyTab] = useState("workflow");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initial, ...JSON.parse(raw) });
    } catch {
      /* ignore corrupt local state */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, loaded]);

  const value = useMemo<WorkContextValue>(
    () => ({
      ...state,
      helpBuddyOpen,
      setHelpBuddyOpen,
      helpBuddyTab,
      openHelpBuddy: (tab) => {
        if (tab) setHelpBuddyTab(tab);
        setHelpBuddyOpen(true);
      },
      searchOpen,
      setSearchOpen,
      setActiveTicketId: (id) => setState((s) => ({ ...s, activeTicketId: id })),
      setAvailability: (availability) => setState((s) => ({ ...s, availability })),
      addNote: (text, scope) =>
        setState((s) => ({
          ...s,
          notes: [
            { id: uid(), text, scope, ticketId: scope === "ticket" ? s.activeTicketId : null, createdAt: new Date().toISOString() },
            ...s.notes,
          ],
        })),
      removeNote: (id) => setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) })),
      addChecklistItem: (label) =>
        setState((s) => ({ ...s, checklist: [...s.checklist, { id: uid(), label, done: false }] })),
      toggleChecklistItem: (id) =>
        setState((s) => ({
          ...s,
          checklist: s.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
        })),
      removeChecklistItem: (id) =>
        setState((s) => ({ ...s, checklist: s.checklist.filter((c) => c.id !== id) })),
    }),
    [state, helpBuddyOpen, helpBuddyTab, searchOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWork() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWork must be used inside WorkContextProvider");
  return v;
}
