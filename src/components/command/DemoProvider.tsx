import { createContext, useContext, useState, type ReactNode } from "react";
import { dashboardPages, type DemoRecord } from "@/lib/dashboard-pages";
type DemoState = {
  rows: Record<string, DemoRecord[]>;
  setRows: (slug: string, rows: DemoRecord[]) => void;
  activity: Record<string, string[]>;
  log: (slug: string, message: string) => void;
};
const Context = createContext<DemoState | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [rows, setState] = useState<Record<string, DemoRecord[]>>(() =>
    Object.fromEntries(dashboardPages.map((p) => [p.slug, p.records])),
  );
  const [activity, setActivity] = useState<Record<string, string[]>>({});
  return (
    <Context.Provider
      value={{
        rows,
        setRows: (slug, value) => setState((prev) => ({ ...prev, [slug]: value })),
        activity,
        log: (slug, message) =>
          setActivity((prev) => ({
            ...prev,
            [slug]: [message, ...(prev[slug] ?? [])].slice(0, 20),
          })),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error("Demo provider missing");
  return value;
}
