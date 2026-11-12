import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Award,
  Bell,
  CalendarDays,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
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
import { getSupabaseClient } from "@/lib/supabase";
import { ALL_DESTINATIONS, NAV, slugify } from "@/lib/nav";
import { GlobalSearch } from "./GlobalSearch";
import { HelpBuddyLauncher, HelpBuddySheet } from "./HelpBuddy";
import { NavMenu } from "./NavMenu";
import { OfficialSocialLinks } from "@/components/public-site/OfficialSocialLinks";

const FOOTER_COLUMNS = [
  {
    title: "COMMAND",
    links: [
      "Global Command Center",
      "Bring the Work to You",
      "IntelliDesk",
      "IntelliChat",
      "IntelliCalendar",
    ],
  },
  {
    title: "CONNECT",
    links: [
      "Partner With Us",
      "Become a Client",
      "Looking for Work Marketplace",
      "Become a Vendor",
      "Technology & Integration Partners",
    ],
  },
  {
    title: "WORKFORCE",
    links: ["IntelliStaff", "IntelliHire", "IntelliWork", "Employees", "Contractors"],
  },
  {
    title: "GOVERNANCE",
    links: ["Security Center", "Compliance", "Audit & Approvals", "Policies", "Service Status"],
  },
  {
    title: "INTELLISTACK",
    links: [
      "About IntelliStack",
      "Our Ecosystem",
      "Knowledge Center",
      "Help & Support",
      "Contact",
      "Privacy Policy",
      "Terms of Service",
      "Accessibility",
      "Security Center",
      "Responsible Disclosure",
    ],
  },
];

const FOOTER_DESTINATIONS: Record<string, [string, string, string]> = {
  "Partner With Us": ["intellistack-marketplace", "applications", "business-applications"],
  "Become a Client": ["my-business-center", "business-overview", "company-profile"],
  "Looking for Work Marketplace": ["intellistaff", "intellihire", "job-requisitions"],
  "Become a Vendor": ["intellistack-marketplace", "applications", "business-applications"],
  "Technology & Integration Partners": ["connector-hub", "connector-marketplace", "connector-catalog"],
  "About IntelliStack": ["my-business-center", "business-overview", "company-profile"],
  "Our Ecosystem": ["intellistack-marketplace", "marketplace-dashboard", "featured-applications"],
  Contact: ["help-buddy", "conversations", "new-conversation"],
  "Bring the Work to You": ["my-workspace", "my-work", "work-queue"],
  IntelliDesk: ["intellidesk-command-center", "service-desk-dashboard", "open-tickets"],
  IntelliChat: ["collaboration-and-productivity", "intellichat", "direct-messages"],
  IntelliCalendar: ["calendar-and-scheduling-center", "personal-calendar", "meetings"],
  IntelliStaff: ["intellistaff", "workforce-dashboard", "workforce-overview"],
  IntelliHire: ["intellistaff", "intellihire", "job-requisitions"],
  IntelliWork: ["intellistaff", "intelliwork", "employee-workspace"],
  Employees: ["new-active-directory", "people-and-accounts", "employees"],
  Contractors: ["new-active-directory", "people-and-accounts", "contractors"],
  "Security Center": ["soc-security-operations-center", "soc-dashboard", "security-posture"],
  Compliance: ["reports-governance-audit-and-administration", "compliance", "compliance-frameworks"],
  "Audit & Approvals": ["reports-governance-audit-and-administration", "audit-management", "audit-plans"],
  Policies: ["reports-governance-audit-and-administration", "policies-and-standards", "corporate-policies"],
  "Service Status": ["intellistack-configuration-center", "system-monitoring", "platform-health"],
  "Knowledge Center": ["intellibase", "getting-started", "welcome"],
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
    const publicPageSlugs: Record<string, string> = {
      "About IntelliStack": "about",
      Contact: "contact",
      "Privacy Policy": "privacy",
      "Terms of Service": "terms",
      Accessibility: "accessibility",
      "Security Center": "security",
      "Responsible Disclosure": "responsible-disclosure",
    };
    if (publicPageSlugs[label]) {
      navigate({ to: "/p/$slug", params: { slug: publicPageSlugs[label] } });
      return;
    }
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
      const match = ALL_DESTINATIONS.find(({ page: item }) => item.slug === page);
      if (match) go(match.section.slug, match.group.slug, match.page.slug);
    }
  };

  const utilityClass =
    "holo-control relative grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-slate-950/25 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-md transition hover:border-sky-300/45 hover:bg-sky-400/10 hover:text-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70";

  return (
    <div className="min-h-dvh bg-transparent text-foreground">
      <header className="command-header sticky top-0 z-30 border-b border-sky-300/25 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
        <div className="mx-auto flex min-h-[68px] max-w-[1800px] items-center justify-between gap-2 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open command navigation"
              onClick={() => setMenuOpen(true)}
              className="holo-control size-10 rounded-xl border border-sky-300/25 bg-slate-950/30 text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-md hover:bg-sky-400/15 hover:text-white"
            >
              <Menu className="size-5" strokeWidth={1.8} />
            </Button>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="grid size-8 place-items-center rounded-lg border border-sky-300/35 bg-sky-400/10 text-sky-200">
                <ShieldCheck className="size-[18px]" strokeWidth={1.7} />
              </span>
              <span className="hidden font-display text-[8px] font-bold uppercase leading-relaxed tracking-[.15em] text-slate-300 md:block">
                SECURED
                <br />
                TRUSTED
                <br />
                COMPLIANT
              </span>
            </div>
          </div>

          <Link
            to="/"
            aria-label="Return to command center"
            className="min-w-0 flex-1 px-1 text-center"
          >
            <span className="block truncate font-display text-[13px] font-black uppercase tracking-[.12em] text-white drop-shadow-[0_2px_12px_rgba(56,189,248,.32)] sm:text-lg sm:tracking-[.18em]">
              INTELLISTACK SYSTEMS
            </span>
            <span className="mt-1 block truncate font-display text-[9px] font-bold uppercase tracking-[.16em] text-sky-300 sm:text-[11px]">
              MAXIMUS OPTIMUS COMMAND CENTER
            </span>
            <span className="mt-1 hidden font-display text-[8px] font-semibold uppercase tracking-[.24em] text-slate-300/80 sm:block">
              SEE EVERYTHING · CONNECT EVERYTHING · WORK SMARTER
            </span>
          </Link>

          <nav aria-label="Quick actions" className="flex shrink-0 items-center justify-end gap-1">
            <button
              type="button"
              aria-label="Search"
              title="Search"
              onClick={() => w.setSearchOpen(true)}
              className={utilityClass}
            >
              <Search className="size-[17px]" strokeWidth={1.7} />
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Notifications"
                  title="Notifications"
                  className={utilityClass}
                >
                  <Bell className="size-[17px]" strokeWidth={1.7} />
                  <span className="absolute right-2 top-2 size-1.5 rounded-full bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,.9)]" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-64 border-sky-300/25 bg-[#0a172b]/95 text-sm text-slate-100 backdrop-blur-xl"
              >
                <div className="font-semibold">Notifications</div>
                <p className="mt-1 text-xs text-slate-400">
                  Your notification stream will appear here when connected.
                </p>
              </PopoverContent>
            </Popover>
            <button
              type="button"
              aria-label="Email"
              title="Email"
              onClick={() =>
                go("collaboration-and-productivity", "communication", "internal-messaging")
              }
              className={utilityClass + " hidden sm:grid"}
            >
              <Mail className="size-[17px]" strokeWidth={1.7} />
            </button>
            <button
              type="button"
              aria-label="Messages"
              title="Messages"
              onClick={() =>
                go(
                  "collaboration-and-productivity",
                  "intellichat",
                  "direct-messages",
                )
              }
              className={utilityClass}
            >
              <MessageSquare className="size-[17px]" strokeWidth={1.7} />
            </button>
            <button
              type="button"
              aria-label="Calendar"
              title="Calendar"
              onClick={() =>
                go(
                  "calendar-and-scheduling-center",
                  "personal-calendar",
                  "meetings",
                )
              }
              className={utilityClass + " hidden sm:grid"}
            >
              <CalendarDays className="size-[17px]" strokeWidth={1.7} />
            </button>
            <button
              type="button"
              aria-label="Settings"
              title="Settings"
              onClick={() =>
                go(
                  "intellistack-configuration-center",
                  "platform-configuration",
                  "global-settings",
                )
              }
              className={utilityClass + " hidden md:grid"}
            >
              <Settings2 className="size-[17px]" strokeWidth={1.7} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Profile menu"
                  title="Profile"
                  className={utilityClass}
                >
                  <UserRound className="size-[17px]" strokeWidth={1.7} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border-sky-300/25 bg-[#0a172b]/95 text-slate-100 backdrop-blur-xl"
              >
                <DropdownMenuLabel>
                  My Command Profile
                  <div className="text-xs font-normal text-slate-400">{w.availability}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  onSelect={() =>
                    go("my-workspace", "my-profile", "personal-information")
                  }
                >
                  <UserRound className="mr-2 size-4" />
                  My full profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    go(
                      "identity-and-access-management",
                      "user-access",
                      "group-based-access",
                    )
                  }
                >
                  <Users className="mr-2 size-4" />
                  My group memberships
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    go(
                      "my-workspace",
                      "my-learning",
                      "achievements",
                    )
                  }
                >
                  <Award className="mr-2 size-4" />
                  Badges and achievements
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    go(
                      "my-workspace",
                      "my-learning",
                      "achievements",
                    )
                  }
                >
                  <Star className="mr-2 size-4" />
                  Stars and recognition
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    go(
                      "identity-and-access-management",
                      "authentication",
                      "mfa",
                    )
                  }
                >
                  <ShieldCheck className="mr-2 size-4" />
                  Security settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    go(
                      "notification-center",
                      "preferences",
                      "user-preferences",
                    )
                  }
                >
                  <Bell className="mr-2 size-4" />
                  Notification settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    go(
                      "my-workspace",
                      "my-profile",
                      "personal-information",
                    )
                  }
                >
                  <Settings2 className="mr-2 size-4" />
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    go(
                      "intellistack-configuration-center",
                      "platform-configuration",
                      "global-settings",
                    )
                  }
                >
                  <Settings2 className="mr-2 size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  onSelect={() => {
                    void signOut();
                  }}
                >
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => {
                void signOut();
              }}
              className={utilityClass + " hidden lg:grid"}
            >
              <LogOut className="size-[17px]" strokeWidth={1.7} />
            </button>
          </nav>
        </div>
      </header>

      <main className="w-full px-2 pb-8 pt-2 sm:px-3">{children}</main>

      <footer className="border-t border-sky-300/20 bg-[#030a16]/95 text-slate-300">
        <div className="mx-auto grid max-w-[1800px] gap-7 px-5 py-8 sm:grid-cols-2 lg:grid-cols-5">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="mb-3 font-display text-[10px] font-bold tracking-[.2em] text-sky-300">
                {column.title}
              </h2>
              <ul className="space-y-2">
                {column.links.map((label) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => footerGo(label)}
                      className="text-left text-xs text-slate-400 transition hover:text-sky-200"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 border-t border-sky-300/10 px-4 py-3">
          <OfficialSocialLinks />
          <span className="text-[10px] tracking-wide text-slate-500">
            © 2026 IntelliStack Systems <span className="mx-2 text-sky-500">•</span> ONE WORLD. ONE
            SYSTEM. ONE INTELLIGENT NETWORK.
          </span>
        </div>
      </footer>

      <NavMenu open={menuOpen} onOpenChange={setMenuOpen} onLogout={() => void signOut()} />
      <GlobalSearch />
      <HelpBuddySheet />
      {location.pathname !== "/" && <HelpBuddyLauncher />}
    </div>
  );
}
