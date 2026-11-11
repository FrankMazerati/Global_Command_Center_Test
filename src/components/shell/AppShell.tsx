import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Award, Bell, CalendarDays, LogOut, Mail, Menu, MessageSquare,
  Search, Settings2, ShieldCheck, Star, UserRound, Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWork } from "@/lib/work-context";
import { getSupabaseClient } from "@/lib/supabase";
import { NAV, slugify } from "@/lib/nav";
import { GlobalSearch } from "./GlobalSearch";
import { HelpBuddyLauncher, HelpBuddySheet } from "./HelpBuddy";
import { NavMenu } from "./NavMenu";

const FOOTER_COLUMNS = [
  { title: "COMMAND", links: ["Global Command Center", "Bring the Work to You", "IntelliDesk", "IntelliChat", "IntelliCalendar"] },
  { title: "CONNECT", links: ["Partner With Us", "Become a Client", "Looking for Work Marketplace", "Become a Vendor", "Technology & Integration Partners"] },
  { title: "WORKFORCE", links: ["IntelliStaff", "IntelliHire", "IntelliWork", "Employees", "Contractors"] },
  { title: "GOVERNANCE", links: ["Security Center", "Compliance", "Audit & Approvals", "Policies", "Service Status"] },
  { title: "INTELLISTACK", links: ["About IntelliStack", "Our Ecosystem", "Knowledge Center", "Help & Support", "Contact"] },
];

const FOOTER_DESTINATIONS: Record<string, [string, string, string]> = {
  "Partner With Us": ["business-products", "intellisphere-marketplace", "products-and-services"],
  "Become a Client": ["business-products", "business-overview", "business-overview-dashboard"],
  "Looking for Work Marketplace": ["employee-and-manager-workspace", "workforce-experiences", "intellihire-overview"],
  "Become a Vendor": ["business-products", "intellisphere-marketplace", "products-and-services"],
  "Technology & Integration Partners": ["business-products", "business-overview", "business-integrations"],
  "About IntelliStack": ["business-products", "company-and-organization-management", "intellistack-systems"],
  "Our Ecosystem": ["business-products", "company-and-organization-management", "intellistack-systems"],
  "Contact": ["help-buddy", "help-buddy-workspace", "conversation-workspace"],
  "Bring the Work to You": ["home-and-command-center", "command-center", "bring-the-work-to-you"],
  "IntelliDesk": ["service-desk-and-enterprise-operations", "intellidesk-overview", "intellidesk-dashboard"],
  "IntelliChat": ["productivity-and-collaboration", "intellistack-collaboration-tools", "intellichat"],
  "IntelliCalendar": ["productivity-and-collaboration", "intellistack-collaboration-tools", "intellicalendar"],
  "IntelliStaff": ["employee-and-manager-workspace", "workforce-experiences", "intellistaff-overview"],
  "IntelliHire": ["employee-and-manager-workspace", "workforce-experiences", "intellihire-overview"],
  "IntelliWork": ["employee-and-manager-workspace", "workforce-experiences", "intelliwork-overview"],
  "Employees": ["employee-and-manager-workspace", "people-and-organization", "employees"],
  "Contractors": ["employee-and-manager-workspace", "people-and-organization", "contractors"],
  "Security Center": ["security-risk-and-governance", "security-overview", "security-operations-dashboard"],
  "Compliance": ["security-risk-and-governance", "compliance-management", "compliance-overview"],
  "Audit & Approvals": ["security-risk-and-governance", "audit-management", "audit-overview"],
  "Policies": ["security-risk-and-governance", "policies-and-procedures", "policies"],
  "Service Status": ["account-and-administration", "account-and-system-administration", "service-status"],
  "Knowledge Center": ["knowledge-spaces", "knowledge-space-overview", "all-knowledge-spaces"],
};

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const w = useWork();
  const navigate = useNavigate();

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const go = (section: string, group: string, page: string) =>
    navigate({ to: "/m/$section/$group/$page", params: { section, group, page } });

  const footerGo = (label: string) => {
    if (label === "Global Command Center") {
      navigate({ to: "/" });
      return;
    }
    if (label === "Help & Support" || label === "Contact") {
      w.openHelpBuddy();
      return;
    }
    const destination = FOOTER_DESTINATIONS[label];
    if (destination) go(...destination);
    else {
      const page = slugify(label);
      const match = NAV.flatMap(section => section.groups.flatMap(group =>
        group.pages.filter(item => item.slug === page).map(item => [section.slug, group.slug, item.slug] as [string, string, string])
      ))[0];
      if (match) go(...match);
    }
  };

  const utilityClass = "holo-control relative grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-slate-950/25 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-md transition hover:border-sky-300/45 hover:bg-sky-400/10 hover:text-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70";

  return (
    <div className="min-h-dvh bg-transparent text-foreground">
      <header className="command-header sticky top-0 z-30 border-b border-sky-300/25 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
        <div className="mx-auto flex min-h-[68px] max-w-[1800px] items-center justify-between gap-2 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Open command navigation" onClick={() => setMenuOpen(true)} className="holo-control size-10 rounded-xl border border-sky-300/25 bg-slate-950/30 text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-md hover:bg-sky-400/15 hover:text-white">
              <Menu className="size-5" strokeWidth={1.8} />
            </Button>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="grid size-8 place-items-center rounded-lg border border-sky-300/35 bg-sky-400/10 text-sky-200"><ShieldCheck className="size-[18px]" strokeWidth={1.7}/></span>
              <span className="hidden font-display text-[8px] font-bold uppercase leading-relaxed tracking-[.15em] text-slate-300 md:block">SECURED<br/>TRUSTED<br/>COMPLIANT</span>
            </div>
          </div>

          <Link to="/" aria-label="Return to command center" className="min-w-0 flex-1 px-1 text-center">
            <span className="block truncate font-display text-[13px] font-black uppercase tracking-[.12em] text-white drop-shadow-[0_2px_12px_rgba(56,189,248,.32)] sm:text-lg sm:tracking-[.18em]">
              Welcome to Your <span className="text-sky-300">Command Center</span>
            </span>
            <span className="mt-1 hidden font-display text-[8px] font-semibold uppercase tracking-[.24em] text-slate-300/80 sm:block">ONE WORLD · ONE SYSTEM · ONE INTELLIGENT NETWORK</span>
          </Link>

          <nav aria-label="Quick actions" className="flex shrink-0 items-center justify-end gap-1">
            <button type="button" aria-label="Search" title="Search" onClick={() => w.setSearchOpen(true)} className={utilityClass}><Search className="size-[17px]" strokeWidth={1.7}/></button>
            <Popover>
              <PopoverTrigger asChild><button type="button" aria-label="Notifications" title="Notifications" className={utilityClass}><Bell className="size-[17px]" strokeWidth={1.7}/><span className="absolute right-2 top-2 size-1.5 rounded-full bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,.9)]"/></button></PopoverTrigger>
              <PopoverContent align="end" className="w-64 border-sky-300/25 bg-[#0a172b]/95 text-sm text-slate-100 backdrop-blur-xl"><div className="font-semibold">Notifications</div><p className="mt-1 text-xs text-slate-400">Your notification stream will appear here when connected.</p></PopoverContent>
            </Popover>
            <button type="button" aria-label="Email" title="Email" onClick={() => go("productivity-and-collaboration","intellistack-collaboration-tools","email")} className={utilityClass + " hidden sm:grid"}><Mail className="size-[17px]" strokeWidth={1.7}/></button>
            <button type="button" aria-label="Messages" title="Messages" onClick={() => go("productivity-and-collaboration","intellistack-collaboration-tools","intellichat")} className={utilityClass}><MessageSquare className="size-[17px]" strokeWidth={1.7}/></button>
            <button type="button" aria-label="Calendar" title="Calendar" onClick={() => go("productivity-and-collaboration","intellistack-collaboration-tools","intellicalendar")} className={utilityClass + " hidden sm:grid"}><CalendarDays className="size-[17px]" strokeWidth={1.7}/></button>
            <button type="button" aria-label="Settings" title="Settings" onClick={() => go("account-and-administration","account-and-system-administration","system-settings")} className={utilityClass + " hidden md:grid"}><Settings2 className="size-[17px]" strokeWidth={1.7}/></button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button type="button" aria-label="Profile menu" title="Profile" className={utilityClass}><UserRound className="size-[17px]" strokeWidth={1.7}/></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-sky-300/25 bg-[#0a172b]/95 text-slate-100 backdrop-blur-xl">
                <DropdownMenuLabel>My Command Profile<div className="text-xs font-normal text-slate-400">{w.availability}</div></DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700"/>
                <DropdownMenuItem onSelect={() => go("identity-and-access-management","users-and-identity","user-profiles")}><UserRound className="mr-2 size-4"/>My full profile</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => go("identity-and-access-management","groups-and-organization","group-membership")}><Users className="mr-2 size-4"/>My group memberships</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => go("command-center","workforce-performance-and-recognition","badges-and-achievements")}><Award className="mr-2 size-4"/>Badges and achievements</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => go("command-center","workforce-performance-and-recognition","stars-and-recognition")}><Star className="mr-2 size-4"/>Stars and recognition</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => go("account-and-administration","account-and-system-administration","security-settings")}><ShieldCheck className="mr-2 size-4"/>Security settings</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => go("account-and-administration","account-and-system-administration","notification-settings")}><Bell className="mr-2 size-4"/>Notification settings</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => go("account-and-administration","account-and-system-administration","preferences")}><Settings2 className="mr-2 size-4"/>Preferences</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700"/>
                <DropdownMenuItem onSelect={() => { void signOut(); }}><LogOut className="mr-2 size-4"/>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button type="button" aria-label="Sign out" title="Sign out" onClick={() => { void signOut(); }} className={utilityClass + " hidden lg:grid"}><LogOut className="size-[17px]" strokeWidth={1.7}/></button>
          </nav>
        </div>
      </header>

      <main className="w-full px-2 pb-8 pt-2 sm:px-3">{children}</main>

      <footer className="border-t border-sky-300/20 bg-[#030a16]/95 text-slate-300">
        <div className="mx-auto grid max-w-[1800px] gap-7 px-5 py-8 sm:grid-cols-2 lg:grid-cols-5">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="mb-3 font-display text-[10px] font-bold tracking-[.2em] text-sky-300">{column.title}</h2>
              <ul className="space-y-2">{column.links.map((label) => <li key={label}><button type="button" onClick={() => footerGo(label)} className="text-left text-xs text-slate-400 transition hover:text-sky-200">{label}</button></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="border-t border-sky-300/10 px-4 py-3 text-center text-[10px] tracking-wide text-slate-500">© 2026 IntelliStack Systems <span className="mx-2 text-sky-500">•</span> ONE WORLD. ONE SYSTEM. ONE INTELLIGENT NETWORK.</div>
      </footer>

      <NavMenu open={menuOpen} onOpenChange={setMenuOpen}/>
      <GlobalSearch/>
      <HelpBuddySheet/>
      {location.pathname !== "/" && <HelpBuddyLauncher/>}
    </div>
  );
}
