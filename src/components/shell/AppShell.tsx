import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell, CalendarDays, CloudSun, LogOut, Mail, Menu, MessageSquare,
  Search, Settings, ShieldCheck, UserRound,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
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
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

const FOOTER_COLUMNS = [
  { title: "COMMAND", links: ["Global Command Center", "Bring the Work to You", "IntelliDesk", "IntelliChat", "IntelliCalendar"] },
  { title: "CONNECT", links: ["Partner With Us", "Become a Client", "Looking for Work Marketplace", "Become a Vendor", "Technology & Integration Partners"] },
  { title: "WORKFORCE", links: ["IntelliStaff", "IntelliHire", "IntelliWork", "Employees", "Contractors"] },
  { title: "GOVERNANCE", links: ["Security Center", "Compliance", "Audit & Approvals", "Policies", "Service Status"] },
  { title: "INTELLISTACK", links: ["About IntelliStack", "Our Ecosystem", "Knowledge Center", "Help & Support", "Contact"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const now = useNow();
  const w = useWork();
  const navigate = useNavigate();

  const go = (section: string, group: string, page: string) =>
    navigate({ to: "/m/$section/$group/$page", params: { section, group, page } });

  return (
    <div className="min-h-dvh bg-page text-foreground">
      <header className="sticky top-0 z-30 border-b border-sky-400/20 bg-[#050d1c]/95 shadow-[0_8px_30px_rgba(0,0,0,.35)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-[1800px] grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2.5 sm:px-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Open command navigation" onClick={() => setMenuOpen(true)} className="text-sky-200 hover:bg-sky-400/10 hover:text-white">
              <Menu className="size-6" />
            </Button>
            <div className="hidden items-center gap-2 lg:flex">
              <div className="grid size-9 place-items-center rounded-lg border border-sky-400/40 bg-sky-400/10 text-sky-300"><ShieldCheck className="size-5" /></div>
              <div className="text-[10px] font-bold uppercase leading-[1.45] tracking-[.14em] text-slate-300">SECURED<br/>TRUSTED<br/>COMPLIANT</div>
            </div>
          </div>

          <Link to="/" className="text-center leading-none">
            <div className="hidden text-[9px] font-semibold uppercase tracking-[.32em] text-slate-400 sm:block">IntelliStack Systems Presents</div>
            <div className="mt-1 font-display text-lg font-black tracking-[.07em] text-white sm:text-[27px]">
              MAXIMUS <span className="text-sky-400">OPTIMUS</span>
            </div>
            <div className="mt-1 font-display text-[9px] font-semibold tracking-[.34em] text-sky-200 sm:text-[11px]">GLOBAL COMMAND CENTER</div>
          </Link>

          <div className="flex items-center justify-end gap-0.5 sm:gap-1">
            <div className="mr-2 hidden text-right xl:block">
              <div className="font-mono text-sm font-bold tabular-nums text-white">{now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}</div>
              <div className="text-[10px] text-slate-400">{now ? now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : "Local time"}</div>
            </div>
            <Button variant="ghost" size="icon" aria-label="Search" onClick={() => w.setSearchOpen(true)} className="text-slate-300 hover:bg-sky-400/10 hover:text-sky-200"><Search className="size-[18px]"/></Button>
            <Popover>
              <PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="Notifications" className="text-slate-300 hover:bg-sky-400/10 hover:text-sky-200"><Bell className="size-[18px]"/></Button></PopoverTrigger>
              <PopoverContent align="end" className="w-64 border-sky-400/20 bg-[#0b1830] text-sm text-slate-100"><div className="font-semibold">Notifications</div><p className="mt-1 text-xs text-slate-400">Your notification stream will appear here.</p></PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" aria-label="Email" onClick={() => go("collaboration","intellistack-collaboration-tools","mail")} className="hidden text-slate-300 hover:bg-sky-400/10 hover:text-sky-200 sm:inline-flex"><Mail className="size-[18px]"/></Button>
            <Button variant="ghost" size="icon" aria-label="Messages" onClick={() => go("collaboration","intellistack-collaboration-tools","intellichat")} className="text-slate-300 hover:bg-sky-400/10 hover:text-sky-200"><MessageSquare className="size-[18px]"/></Button>
            <Button variant="ghost" size="icon" aria-label="Calendar" onClick={() => go("collaboration","intellistack-collaboration-tools","intellicalendar")} className="hidden text-slate-300 hover:bg-sky-400/10 hover:text-sky-200 sm:inline-flex"><CalendarDays className="size-[18px]"/></Button>
            <Button variant="ghost" size="icon" aria-label="Settings" onClick={() => go("governance","administration","system-configuration")} className="hidden text-slate-300 hover:bg-sky-400/10 hover:text-sky-200 sm:inline-flex"><Settings className="size-[18px]"/></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Profile menu" className="text-slate-300 hover:bg-sky-400/10 hover:text-sky-200"><UserRound className="size-[18px]"/></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-sky-400/20 bg-[#0b1830] text-slate-100">
                <DropdownMenuLabel>Frank Mazerati<div className="text-xs font-normal text-slate-400">{w.availability}</div></DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700"/>
                <DropdownMenuItem onSelect={() => go("new-active-directory","users-and-identity","user-profiles")}><UserRound className="mr-2 size-4"/>My profile</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => go("governance","administration","system-configuration")}><Settings className="mr-2 size-4"/>Settings</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700"/>
                <DropdownMenuItem onSelect={() => navigate({ to: "/login" })}><LogOut className="mr-2 size-4"/>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" aria-label="Sign out" className="hidden text-slate-300 hover:bg-red-500/10 hover:text-red-300 sm:inline-flex" onClick={() => navigate({ to: "/login" })}><LogOut className="size-[18px]"/></Button>
          </div>
        </div>
        <div className="border-t border-sky-400/10 bg-[#071326]">
          <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 px-4 py-1.5 sm:px-6">
            <div className="font-display text-[9px] font-semibold uppercase tracking-[.17em] text-slate-400">ONE WORLD <span className="text-sky-400">•</span> ONE SYSTEM <span className="text-sky-400">•</span> ONE INTELLIGENT NETWORK</div>
            <div className="hidden items-center gap-2 text-[9px] font-semibold tracking-[.12em] text-slate-400 sm:flex"><CloudSun className="size-3.5 text-sky-300"/> GLOBAL OPERATIONS</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-3 pb-10 pt-4 sm:px-5">{children}</main>

      <footer className="border-t border-sky-400/20 bg-[#030a16] text-slate-300">
        <div className="mx-auto grid max-w-[1800px] gap-7 px-5 py-8 sm:grid-cols-2 lg:grid-cols-5">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="mb-3 font-display text-[10px] font-bold tracking-[.2em] text-sky-300">{column.title}</h2>
              <ul className="space-y-2">{column.links.map((label) => <li key={label}><button type="button" onClick={() => label === "Global Command Center" ? navigate({to:"/"}) : label === "Help & Support" ? w.openHelpBuddy() : undefined} className="text-left text-xs text-slate-400 transition hover:text-white">{label}</button></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="border-t border-sky-400/10 px-4 py-3 text-center text-[10px] tracking-wide text-slate-500">© 2026 IntelliStack Systems <span className="mx-2 text-sky-500">•</span> ONE WORLD. ONE SYSTEM. ONE INTELLIGENT NETWORK.</div>
      </footer>

      <NavMenu open={menuOpen} onOpenChange={setMenuOpen}/>
      <GlobalSearch/>
      <HelpBuddySheet/>
      <HelpBuddyLauncher/>
    </div>
  );
}
