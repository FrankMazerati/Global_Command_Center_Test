import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, CloudSun, LogOut, Menu, Search, Settings, ShieldCheck, Ticket, User, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWork } from "@/lib/work-context";
import { GlobalSearch } from "./GlobalSearch";
import { HelpBuddyLauncher, HelpBuddySheet } from "./HelpBuddy";
import { NavMenu } from "./NavMenu";

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);
  return now;
}

const AI_SYSTEMS = [
  { name: "Trinity", tone: "bg-everything", group: "trinity", page: "trinity-overview", role: "Oversight" },
  { name: "Maximus", tone: "bg-maximus", group: "maximus", page: "maximus-overview", role: "Business" },
  { name: "Optimus", tone: "bg-optimus", group: "optimus", page: "optimus-overview", role: "Help desk" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const now = useNow();
  const w = useWork();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-page">
      <header className="sticky top-0 z-30 border-b bg-header shadow-card">
        <div className="mx-auto grid max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 sm:px-5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Open navigation menu" onClick={() => setMenuOpen(true)}>
              <Menu className="size-6" />
            </Button>
            <div className="hidden items-center gap-1.5 text-xs font-medium text-tenant md:flex">
              <ShieldCheck className="size-5" />
              <span className="leading-tight">Secure, Trusted,<br />and Compliant</span>
            </div>
          </div>
          <Link to="/" className="text-center leading-none">
            <div className="hidden text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground sm:block">
              IntelliStack Systems Presents
            </div>
            <div className="font-display text-lg font-black tracking-wide text-brand-gradient sm:text-3xl">
              Maximus Optimus
            </div>
            <div className="font-display text-[9px] font-medium tracking-[0.3em] text-secondary-foreground sm:text-xs">
              GLOBAL COMMAND CENTER
            </div>
          </Link>
          <div className="flex items-center justify-end gap-0.5 sm:gap-1">
            <div className="mr-2 hidden text-right text-xs lg:block">
              <div className="font-semibold">
                {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              </div>
              <div className="text-muted-foreground">
                {now ? now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : ""}
              </div>
            </div>
            <div className="mr-1 hidden items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs text-muted-foreground xl:flex" title="Live weather feed not yet connected">
              <CloudSun className="size-4 text-optimus" /> Weather pending
            </div>
            <Button variant="ghost" size="icon" aria-label="Search (Ctrl+K)" onClick={() => w.setSearchOpen(true)}>
              <Search className="size-5" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notifications" className="hidden sm:inline-flex">
                  <Bell className="size-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 text-sm">
                <div className="mb-1 font-semibold">Notifications</div>
                <p className="text-muted-foreground">No notifications yet. They will arrive here once IntelliSync is connected.</p>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="User menu">
                  <User className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  Frank Mazerati
                  <div className="text-xs font-normal text-muted-foreground">{w.availability}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: "/m/$section/$group/$page", params: { section: "new-active-directory", group: "users-and-identity", page: "user-profiles" } })}>
                  <User className="size-4" /> My profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/m/$section/$group/$page", params: { section: "governance", group: "administration", page: "system-configuration" } })}>
                  <Settings className="size-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: "/login" })}>
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" aria-label="Quick logout" className="hidden sm:inline-flex" onClick={() => navigate({ to: "/login" })}>
              <LogOut className="size-5 text-destructive" />
            </Button>
          </div>
        </div>

        {/* AI Systems Bar — always visible outside the hamburger menu */}
        <div className="border-t bg-card/70">
          <div className="mx-auto flex max-w-[1600px] items-center gap-2 overflow-x-auto px-3 py-1.5 sm:px-5">
            <span className="shrink-0 font-display text-[10px] font-bold tracking-widest text-muted-foreground">AI SYSTEMS</span>
            {AI_SYSTEMS.map((s) => (
              <Link
                key={s.name}
                to="/m/$section/$group/$page"
                params={{ section: "ai-systems", group: s.group, page: s.page }}
                className="flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-semibold hover:bg-accent"
              >
                <span className={`size-2 rounded-full ${s.tone}`} />
                {s.name}
                <span className="hidden font-normal text-muted-foreground sm:inline">· {s.role}</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={() => w.openHelpBuddy()}
              className="flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-semibold hover:bg-accent"
            >
              <span className="size-2 rounded-full bg-tenant" /> Help Buddy
            </button>
            {w.activeTicketId && (
              <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                <Ticket className="size-3.5" />
                <Link to="/m/$section/$group/$page" params={{ section: "command-center", group: "ticket-management", page: "active-ticket-workspace" }}>
                  {w.activeTicketId}
                </Link>
                <button type="button" aria-label="Clear active ticket" onClick={() => w.setActiveTicketId(null)}>
                  <X className="size-3.5" />
                </button>
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-3 pb-24 pt-4 sm:px-5">{children}</main>

      <footer className="border-t bg-card/60 py-3 text-center text-[11px] text-muted-foreground">
        Designed and Developed by IntelliStack Systems
      </footer>

      <NavMenu open={menuOpen} onOpenChange={setMenuOpen} />
      <GlobalSearch />
      <HelpBuddySheet />
      <HelpBuddyLauncher />
    </div>
  );
}
