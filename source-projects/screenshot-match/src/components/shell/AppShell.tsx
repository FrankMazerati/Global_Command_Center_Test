import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Menu, X, Server, Clock, Shield } from "lucide-react";
import { NavMenu } from "./NavMenu";
import { HelpBuddy } from "./HelpBuddy";
import { ENVIRONMENTS, useEnvironment } from "./environment";
import { StatusDot } from "@/components/glass/glass";
import { cn } from "@/lib/utils";

function Clockface() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const t = () => setNow(new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }));
    t();
    const id = setInterval(t, 30000);
    return () => clearInterval(id);
  }, []);
  return <span>{now}</span>;
}

/** Global layout: header, hamburger nav (desktop rail + mobile drawer), status bar, Help Buddy. */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { env, setEnv } = useEnvironment();

  const toggle = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) setCollapsed((c) => !c);
    else setMobileOpen(true);
  };

  return (
    <div className="app-grid flex min-h-screen flex-col">
      <header className="glass-strong sticky top-0 z-40 grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-none border-x-0 border-t-0 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={toggle} aria-label="Open menu" className="rounded-lg p-2 hover:bg-env-soft">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <div className="glow-env grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-env-soft">
              <Shield className="h-5 w-5 text-env-glow" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-sm font-bold sm:text-base">IntelliStack</div>
              <div className="truncate text-xs text-muted-foreground">Systems</div>
            </div>
          </Link>
          <p className="ml-4 hidden truncate border-l border-glass-border pl-4 text-xs text-muted-foreground xl:block">
            One Intelligent Network. Control Everything Centrally. Connect Everything Globally.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <select
            value={env}
            onChange={(e) => setEnv(e.target.value as typeof env)}
            aria-label="Environment"
            className="glass hidden rounded-lg px-2 py-1.5 text-xs sm:block"
          >
            {ENVIRONMENTS.map((e) => (
              <option key={e.id} value={e.id} className="bg-popover">{e.label}</option>
            ))}
          </select>
          <button className="relative rounded-lg p-2 hover:bg-env-soft" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
          </button>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-env-soft text-xs font-bold">DC</div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={cn(
            "glass-strong sticky top-16 hidden h-[calc(100vh-4rem-2.5rem)] shrink-0 overflow-y-auto rounded-none border-y-0 border-l-0 p-3 transition-all lg:block",
            collapsed ? "w-16" : "w-64",
          )}
        >
          <NavMenu collapsed={collapsed} />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-background/70" onClick={() => setMobileOpen(false)} />
            <div className="glass-strong absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto rounded-none p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="font-display font-bold">Menu</span>
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
              </div>
              <select
                value={env}
                onChange={(e) => setEnv(e.target.value as typeof env)}
                className="glass mb-3 w-full rounded-lg px-2 py-2 text-sm sm:hidden"
              >
                {ENVIRONMENTS.map((e) => (
                  <option key={e.id} value={e.id} className="bg-popover">{e.label}</option>
                ))}
              </select>
              <NavMenu onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 p-3 pb-16 sm:p-5 sm:pb-16">{children}</main>
      </div>

      <footer className="glass-strong fixed inset-x-0 bottom-0 z-30 flex h-10 items-center gap-4 overflow-x-auto rounded-none border-x-0 border-b-0 px-4 text-xs text-muted-foreground">
        <span className="flex shrink-0 items-center gap-2"><StatusDot /> All Systems Online</span>
        <span className="flex shrink-0 items-center gap-2"><Server className="h-3.5 w-3.5" /> Platform v2.0.0</span>
        <span className="hidden shrink-0 items-center gap-2 sm:flex"><Clock className="h-3.5 w-3.5" /> <Clockface /></span>
      </footer>

      <HelpBuddy />
    </div>
  );
}
