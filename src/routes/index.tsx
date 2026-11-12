import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Clock3,
  CloudSun,
  FileText,
  Globe2,
  Link2,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trash2,
  TrendingUp,
  UserRound,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AVAILABILITY, useWork } from "@/lib/work-context";
import { NAV } from "@/lib/nav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Maximus Optimus · Global Command Center" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "IntelliStack Systems Global Command Center." },
    ],
  }),
  component: CommandCenterHome,
});

type WorkItem = {
  id: string;
  title: string;
  detail: string;
  tone: "urgent" | "high" | "medium" | "low";
  action: string;
};

type QuickPick = { label: string; detail: string; icon: LucideIcon; href: string };
type SummaryCategory =
  "Assigned" | "Needs Your Attention" | "High Priority" | "Medium Priority" | "Low Priority";

const quickPicks: QuickPick[] = [
  {
    label: "Tickets",
    detail: "Create & track",
    icon: Ticket,
    href: "/m/intellidesk-command-center/service-desk-dashboard/open-tickets",
  },
  {
    label: "Directory",
    detail: "Find people",
    icon: Users,
    href: "/m/new-active-directory/people-and-accounts/employees",
  },
  {
    label: "Calendar",
    detail: "Schedule work",
    icon: CalendarDays,
    href: "/m/calendar-and-scheduling-center/personal-calendar/meetings",
  },
  {
    label: "Knowledge",
    detail: "Find answers",
    icon: BookOpen,
    href: "/m/intellibase/training-and-certification/learning-paths",
  },
  {
    label: "Security",
    detail: "Monitor & respond",
    icon: ShieldCheck,
    href: "/m/soc-security-operations-center/soc-dashboard/security-posture",
  },
];

const clocks = [
  ["New York", "America/New_York"],
  ["Chicago", "America/Chicago"],
  ["London", "Europe/London"],
  ["Dubai", "Asia/Dubai"],
  ["Tokyo", "Asia/Tokyo"],
] as const;

const clockChoices = [
  ["New York", "America/New_York"],
  ["Chicago", "America/Chicago"],
  ["London", "Europe/London"],
  ["Dubai", "Asia/Dubai"],
  ["Tokyo", "Asia/Tokyo"],
  ["Los Angeles", "America/Los_Angeles"],
  ["Sydney", "Australia/Sydney"],
  ["Singapore", "Asia/Singapore"],
  ["Anchorage", "America/Anchorage"],
  ["Honolulu", "Pacific/Honolulu"],
  ["Vancouver", "America/Vancouver"],
  ["Denver", "America/Denver"],
  ["Mexico City", "America/Mexico_City"],
  ["Sao Paulo", "America/Sao_Paulo"],
  ["Buenos Aires", "America/Argentina/Buenos_Aires"],
  ["Reykjavik", "Atlantic/Reykjavik"],
  ["Paris", "Europe/Paris"],
  ["Berlin", "Europe/Berlin"],
  ["Moscow", "Europe/Moscow"],
  ["Johannesburg", "Africa/Johannesburg"],
  ["Cairo", "Africa/Cairo"],
  ["Mumbai", "Asia/Kolkata"],
  ["Bangkok", "Asia/Bangkok"],
  ["Seoul", "Asia/Seoul"],
  ["Auckland", "Pacific/Auckland"],
] as const;

const availableQuickPicks: QuickPick[] = [
  {
    label: "Missions",
    detail: "Run the queue",
    icon: Activity,
    href: "/m/my-workspace/my-work/work-queue",
  },
  {
    label: "Email",
    detail: "Open inbox",
    icon: Mail,
    href: "/m/collaboration-and-productivity/communication/internal-messaging",
  },
  {
    label: "Help Buddy",
    detail: "Ask for help",
    icon: Bot,
    href: "/m/help-buddy/conversations/new-conversation",
  },
  {
    label: "NOC",
    detail: "View operations",
    icon: Globe2,
    href: "/m/noc-network-operations-center/noc-dashboard/network-health",
  },
  {
    label: "Payments",
    detail: "Manage billing",
    icon: CreditCard,
    href: "/m/my-business-center/finance-and-accounting/financial-statements",
  },
  {
    label: "Integrations",
    detail: "Connected apps",
    icon: LayoutGrid,
    href: "/m/intellistack-configuration-center/platform-configuration/global-settings",
  },
];

const menuQuickPickOptions: QuickPick[] = NAV.flatMap((section) =>
  section.groups.flatMap((group) =>
    group.pages.map((page) => ({
      label: page.title,
      detail: group.title,
      icon: LayoutGrid,
      href: `/m/${section.slug}/${group.slug}/${page.slug}`,
    })),
  ),
);

const connectorChoices = [
  "Microsoft 365",
  "Microsoft Entra ID",
  "AWS",
  "GitHub",
  "Google Workspace",
  "Slack",
  "Zoom",
  "Salesforce",
  "GitLab",
  "ServiceNow",
];
type ProfileEditor = "photo" | "background" | "bio" | "linkedin" | "payment" | "status" | null;

const defaultNewsFeeds = [
  ["AI Brief", "Maximus and Optimus systems are operating normally."],
  ["Security", "No critical threat activity is open for review."],
  ["Network", "Global infrastructure health remains within target."],
  ["Product", "IntelliStack connector review is scheduled today."],
  ["Company", "Quarterly planning materials are ready in Knowledge Vault."],
  ["People", "Two access requests are waiting for approval."],
  ["Learning", "New Command Center training content is available."],
  ["Operations", "Service desk workload is tracking to plan."],
  ["Governance", "Compliance checklist review is due this week."],
  ["Build", "Project completion review remains the active focus."],
] as const;

const defaultTickers = [
  ["NASDAQ", "+0.87%"],
  ["S&P 500", "+0.42%"],
  ["DOW", "+0.19%"],
  ["BTC", "-0.18%"],
  ["ETH", "+1.12%"],
] as const;

const availableNewsFeeds = [
  "Reuters World",
  "Associated Press",
  "BBC World News",
  "MSNBC",
  "CNN World",
  "Al Jazeera",
  "Dark Reading",
  "The Hacker News",
  "Krebs on Security",
  "Network World",
  "The Register",
  "Ars Technica",
  "Wired",
  "TechCrunch",
  "Infrastructure & Cloud",
];

const availableTickers = [
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "GOOGL",
  "META",
  "TSLA",
  "BRK.B",
  "JPM",
  "AMD",
  "ORCL",
  "CRM",
  "NFLX",
  "INTC",
  "AVGO",
  "SPY",
  "QQQ",
  "DIA",
  "VTI",
  "IWM",
];

const workItems: WorkItem[] = [
  {
    id: "PROJ-0001",
    title: "Finish the complete Global Command Center project",
    detail:
      "Complete every destination page, workflow, connector, and review item in the test repository.",
    tone: "urgent",
    action: "Open",
  },
  {
    id: "BUILD-0024",
    title: "Complete all hamburger navigation pages",
    detail:
      "Replace placeholder destination surfaces with finished page content and validated actions.",
    tone: "high",
    action: "Open",
  },
  {
    id: "BUILD-0025",
    title: "Verify page-to-page navigation and access rules",
    detail: "Check every route, breadcrumb, permission boundary, and back-navigation path.",
    tone: "high",
    action: "Open",
  },
  {
    id: "BUILD-0026",
    title: "Finish Help Buddy workflow integration",
    detail:
      "Connect assistant context, missions, knowledge, activity, and handoff behavior to real work.",
    tone: "high",
    action: "Open",
  },
  {
    id: "BUILD-0027",
    title: "Complete tablet and phone QA",
    detail:
      "Validate the closed and open hamburger states, independently scrolling work areas, and touch controls.",
    tone: "medium",
    action: "Open",
  },
  {
    id: "SEC-4860",
    title: "Suspicious login attempt",
    detail: "Multiple failed sign-ins detected on finance-portal",
    tone: "urgent",
    action: "View",
  },
  {
    id: "INC-4582",
    title: "Client Support Ticket #45872",
    detail: "User experiencing VPN connection issues",
    tone: "high",
    action: "Resolve",
  },
  {
    id: "REQ-1047",
    title: "Review new user access request",
    detail: "Pending approval for Sarah Johnson (Marketing)",
    tone: "high",
    action: "Approve",
  },
  {
    id: "OPS-2204",
    title: "System update available",
    detail: "Windows security patch for 3 servers",
    tone: "medium",
    action: "Review",
  },
  {
    id: "KB-1098",
    title: "Knowledge Vault update",
    detail: "New documentation available: Network Troubleshooting",
    tone: "medium",
    action: "Open",
  },
  {
    id: "GOV-0902",
    title: "Compliance checklist",
    detail: "Quarterly audit items are due this week",
    tone: "low",
    action: "Open",
  },
];

const toneStyles = {
  urgent: "border-rose-400/40 bg-rose-500/10 text-rose-200",
  high: "border-amber-300/40 bg-amber-400/10 text-amber-100",
  medium: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
  low: "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
};

function timeFor(zone: string, now: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
}

function dateFor(zone: string, now: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(now);
}

function shortClockName(city: string) {
  return (
    (
      {
        "New York": "NYC",
        Chicago: "CHI",
        London: "LON",
        Dubai: "DXB",
        Tokyo: "TOK",
        "Los Angeles": "LAX",
        Sydney: "SYD",
        Singapore: "SIN",
      } as Record<string, string>
    )[city] ?? city.slice(0, 3).toUpperCase()
  );
}

function statusSlug(status: string) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function CommandCenterHome() {
  const navigate = useNavigate();
  const work = useWork();
  const [now, setNow] = useState(() => new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickChatOpen, setQuickChatOpen] = useState(false);
  const [profileEditor, setProfileEditor] = useState<ProfileEditor>(null);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Main Workflow");
  const [activeBuddyTab, setActiveBuddyTab] = useState("Checklist");
  const [assistantCollapsed, setAssistantCollapsed] = useState(false);
  const [checklistDraft, setChecklistDraft] = useState("");
  const [clockEntries, setClockEntries] = useState<ReadonlyArray<readonly [string, string]>>([
    ...clocks,
  ]);
  const [clockToAdd, setClockToAdd] = useState("");
  const [clockMoreOpen, setClockMoreOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [quickPickEditorOpen, setQuickPickEditorOpen] = useState(false);
  const [quickPickItems, setQuickPickItems] = useState([...quickPicks]);
  const [draggedQuickPick, setDraggedQuickPick] = useState<string | null>(null);
  const [connectedConnectors, setConnectedConnectors] = useState([
    "Microsoft 365",
    "Microsoft Entra ID",
    "AWS",
    "GitHub",
    "Google Workspace",
  ]);
  const [profilePhoto, setProfilePhoto] = useState("/assets/frank-mazerati.png");
  const [backgroundPhoto, setBackgroundPhoto] = useState<string | null>(null);
  const [bio, setBio] = useState("Founder and Global Administrator");
  const [linkedin, setLinkedin] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [statusNote, setStatusNote] = useState("Available for focused work");
  const [newsItems, setNewsItems] = useState<Array<readonly [string, string]>>([
    ...defaultNewsFeeds,
  ]);
  const [tickers, setTickers] = useState<Array<readonly [string, string]>>([...defaultTickers]);
  const [newsManagerOpen, setNewsManagerOpen] = useState(false);
  const [tickerManagerOpen, setTickerManagerOpen] = useState(false);
  const [expandedFeed, setExpandedFeed] = useState<string | null>(null);
  const [newsFeedToAdd, setNewsFeedToAdd] = useState("");
  const [tickerToAdd, setTickerToAdd] = useState("");
  const [draggedClock, setDraggedClock] = useState<string | null>(null);
  const [liveItems, setLiveItems] = useState<WorkItem[]>([]);
  const [ticketSource, setTicketSource] = useState<"supabase" | "project">("project");
  const [managerRecord, setManagerRecord] = useState<Record<string, unknown> | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [summaryCategory, setSummaryCategory] = useState<SummaryCategory | null>(null);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    if (!supabase)
      return () => {
        active = false;
      };
    supabase
      .from("tickets")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (!active || error || !data?.length) return;
        const mapped = data.map((raw) => {
          const row = raw as Record<string, unknown>;
          const priority = String(row["priority"] ?? row["severity"] ?? "medium").toLowerCase();
          const tone: WorkItem["tone"] =
            priority.includes("urgent") || priority.includes("critical")
              ? "urgent"
              : priority.includes("high")
                ? "high"
                : priority.includes("low")
                  ? "low"
                  : "medium";
          const id = String(row["ticket_id"] ?? row["id"] ?? "TICKET");
          return {
            id,
            title: String(row["title"] ?? row["subject"] ?? `Ticket ${id}`),
            detail: String(row["description"] ?? row["summary"] ?? row["status"] ?? "Open ticket"),
            tone,
            action: String(row["action"] ?? "Open"),
          } satisfies WorkItem;
        });
        setLiveItems(mapped);
        setTicketSource("supabase");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    if (!supabase)
      return () => {
        active = false;
      };
    Promise.all([supabase.auth.getUser(), supabase.from("users").select("*").limit(100)]).then(
      ([authResult, usersResult]) => {
        if (!active || usersResult.error || !usersResult.data?.length) return;
        const email = authResult.data.user?.email?.toLowerCase();
        const rows = usersResult.data as Array<Record<string, unknown>>;
        const match =
          rows.find((row) => email && String(row["email"] ?? "").toLowerCase() === email) ??
          rows.find((row) =>
            /manager|admin|owner/i.test(String(row["role"] ?? row["title"] ?? "")),
          ) ??
          rows[0] ??
          null;
        setManagerRecord(match);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const items = liveItems.length ? liveItems : workItems;
  const availability = work.availability;
  const managerName = String(
    managerRecord?.["full_name"] ?? managerRecord?.["name"] ?? "Frank Mazerati",
  );
  const managerEmail = String(managerRecord?.["email"] ?? "Work email");
  const managerUserId = String(managerRecord?.["user_id"] ?? managerRecord?.["id"] ?? "001");
  const managerCompany = String(
    managerRecord?.["company_id"] ?? managerRecord?.["company"] ?? "INTELLISTACK",
  );
  const managerWorkplace = String(
    managerRecord?.["workplace"] ?? managerRecord?.["location"] ?? "Downtown Chicago",
  );
  const quickPickLibrary = [...availableQuickPicks, ...menuQuickPickOptions].filter(
    (pick, index, all) => all.findIndex((candidate) => candidate.label === pick.label) === index,
  );

  const visibleItems = useMemo(
    () =>
      items.filter((item) =>
        `${item.id} ${item.title} ${item.detail}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, query],
  );

  const signOut = async () => {
    await getSupabaseClient()?.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const openItem = (item: WorkItem) => {
    setSummaryCategory(null);
    setSelectedWorkItem(item);
  };

  const summaryItems: Record<SummaryCategory, WorkItem[]> = {
    Assigned: items,
    "Needs Your Attention": items.filter((item) => item.tone === "urgent"),
    "High Priority": items.filter((item) => item.tone === "high"),
    "Medium Priority": items.filter((item) => item.tone === "medium"),
    "Low Priority": items.filter((item) => item.tone === "low"),
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setConversation((current) => [
      ...current,
      trimmed,
      "I’m on it. I’ll keep this in your working context.",
    ]);
    setMessage("");
  };

  const readImage = (file: File | undefined, setter: (value: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") setter(reader.result);
    });
    reader.readAsDataURL(file);
  };

  const addClock = () => {
    const choice = clockChoices.find(([city]) => city === clockToAdd);
    if (!choice || clockEntries.some(([city]) => city === choice[0])) return;
    if (clockEntries.length >= 10) {
      toast.info("Global Clocks can show up to ten cities.");
      return;
    }
    setClockEntries((current) => [...current, choice]);
    setClockToAdd("");
  };

  const reorderClock = (targetCity: string) => {
    if (!draggedClock || draggedClock === targetCity) return;
    setClockEntries((current) => {
      const sourceIndex = current.findIndex(([city]) => city === draggedClock);
      const targetIndex = current.findIndex(([city]) => city === targetCity);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const reordered = [...current];
      const source = reordered[sourceIndex];
      if (!source) return current;
      reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, source);
      return reordered;
    });
    setDraggedClock(null);
  };

  const moveClock = (city: string, direction: -1 | 1) => {
    setClockEntries((current) => {
      const index = current.findIndex(([entryCity]) => entryCity === city);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      return reordered;
    });
  };

  const removeClock = (city: string) => {
    if (clockEntries.length <= 1) return;
    setClockEntries((current) => current.filter(([entryCity]) => entryCity !== city));
  };

  const updateClock = (previousCity: string, nextCity: string) => {
    const choice = clockChoices.find(([city]) => city === nextCity);
    if (!choice) return;
    setClockEntries((current) =>
      current.map((entry) => (entry[0] === previousCity ? choice : entry)),
    );
  };

  const toggleConnector = (connector: string) => {
    setConnectedConnectors((current) =>
      current.includes(connector)
        ? current.filter((entry) => entry !== connector)
        : [...current, connector],
    );
    toast.success(
      connectedConnectors.includes(connector)
        ? `${connector} disconnected.`
        : `${connector} connected for this workspace.`,
    );
  };

  const addConnector = () => {
    const next = connectorChoices.find((connector) => !connectedConnectors.includes(connector));
    if (!next) {
      toast.info("All available connectors are already listed.");
      return;
    }
    setConnectedConnectors((current) => [...current, next]);
    toast.success(`${next} added to connectors.`);
  };

  const addQuickPick = (pick: QuickPick) => {
    if (quickPickItems.some((item) => item.label === pick.label)) return;
    if (quickPickItems.length >= 10) {
      toast.info("Quick Picks are limited to five rows of five: remove one before adding another.");
      return;
    }
    setQuickPickItems((current) => [...current, pick]);
  };

  const removeQuickPick = (label: string) => {
    setQuickPickItems((current) => current.filter((pick) => pick.label !== label));
  };

  const reorderQuickPick = (targetLabel: string) => {
    if (!draggedQuickPick || draggedQuickPick === targetLabel) return;
    setQuickPickItems((current) => {
      const source = current.find((pick) => pick.label === draggedQuickPick);
      if (!source) return current;
      const withoutSource = current.filter((pick) => pick.label !== draggedQuickPick);
      const targetIndex = withoutSource.findIndex((pick) => pick.label === targetLabel);
      withoutSource.splice(targetIndex < 0 ? withoutSource.length : targetIndex, 0, source);
      return withoutSource;
    });
    setDraggedQuickPick(null);
  };

  const addNewsFeed = () => {
    if (!newsFeedToAdd || newsItems.some(([label]) => label === newsFeedToAdd)) return;
    if (newsItems.length >= 10) {
      toast.info("Global News is limited to five additional feeds.");
      return;
    }
    setNewsItems((current) => [
      ...current,
      [newsFeedToAdd, "Live headlines require a connected feed."],
    ]);
    setNewsFeedToAdd("");
  };

  const addTicker = () => {
    if (!tickerToAdd || tickers.some(([symbol]) => symbol === tickerToAdd)) return;
    if (tickers.length >= 10) {
      toast.info("Stock Picker is limited to five additional symbols.");
      return;
    }
    setTickers((current) => [...current, [tickerToAdd, "—"]]);
    setTickerToAdd("");
  };

  return (
    <div
      className="command-center-home"
      style={
        backgroundPhoto
          ? {
              backgroundImage: `linear-gradient(135deg, rgba(2,10,24,.86), rgba(3,15,34,.72)), url(${backgroundPhoto})`,
            }
          : undefined
      }
    >
      <div
        className={`cc-drawer-backdrop ${drawerOpen ? "is-open" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        className={`cc-sidebar ${drawerOpen ? "is-open" : ""}`}
        aria-label="Command navigation"
      >
        <div className="cc-sidebar-brand">
          <img src="/assets/intellistack-shield.jpg" alt="IntelliStack Systems" />
          <span>
            INTELLISTACK
            <br />
            <b>SYSTEMS</b>
          </span>
        </div>
        <nav aria-label="Command navigation" className="cc-nav">
          {NAV.map((section) => {
            const sectionOpen = expandedSections[section.slug] ?? section.number === "01";
            const sectionLabel = section.title;
            return (
              <div className="cc-nav-section" key={section.slug}>
                <button
                  type="button"
                  className={`cc-nav-section-toggle ${sectionOpen ? "is-open" : ""}`}
                  onClick={() =>
                    setExpandedSections((current) => ({ ...current, [section.slug]: !sectionOpen }))
                  }
                  aria-expanded={sectionOpen}
                >
                  <span className="cc-nav-number">{section.number}</span>
                  <span>{sectionLabel}</span>
                  <ChevronDown size={12} />
                </button>
                {sectionOpen && (
                  <div className="cc-nav-groups">
                    {section.groups.map((group) => {
                      const groupKey = `${section.slug}:${group.slug}`;
                      const groupOpen = expandedGroups[groupKey] ?? group.pages.length <= 6;
                      return (
                        <div className="cc-nav-group" key={groupKey}>
                          <button
                            type="button"
                            className="cc-nav-group-toggle"
                            onClick={() =>
                              setExpandedGroups((current) => ({
                                ...current,
                                [groupKey]: !groupOpen,
                              }))
                            }
                            aria-expanded={groupOpen}
                          >
                            <span>{group.title}</span>
                            <ChevronRight size={11} className={groupOpen ? "rotate-90" : ""} />
                          </button>
                          {groupOpen && (
                            <div className="cc-nav-pages">
                              {group.pages.map((page) => (
                                <a
                                  key={page.slug}
                                  className="cc-nav-page"
                                  href={`/m/${section.slug}/${group.slug}/${page.slug}`}
                                  onClick={() => setDrawerOpen(false)}
                                >
                                  {page.title}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="cc-sidebar-status">
          <span className="cc-online-dot" />
          All systems online
        </div>
      </aside>

      <div className="cc-main">
        <header className="cc-topbar">
          <div className="cc-topbar-left">
            <button
              type="button"
              className="cc-icon-button"
              aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((value) => !value)}
            >
              {drawerOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
            <div className="cc-secured">
              <ShieldCheck size={16} />
              <span>
                SECURE
                <br />
                TRUSTED
                <br />
                COMPLIANT
              </span>
            </div>
          </div>
          <div className="cc-wordmark">
            <strong>MAXIMUS OPTIMUS</strong>
            <small>GLOBAL COMMAND CENTER</small>
          </div>
          <div className="cc-topbar-actions">
            <button
              className="cc-icon-button"
              aria-label="Email"
              onClick={() => toast.info("Email workspace opened.")}
            >
              <Mail size={17} />
            </button>
            <button className="cc-icon-button" aria-label="Notifications">
              <Bell size={17} />
              <i />
            </button>
            <button
              className="cc-icon-button"
              aria-label="Quick chat"
              onClick={() => setQuickChatOpen((value) => !value)}
            >
              <MessageCircle size={17} />
            </button>
            <button
              type="button"
              className={`cc-status-pill cc-status-${statusSlug(availability)}`}
              aria-label="Open status manager"
              onClick={() => {
                setProfileOpen(true);
                setProfileEditor("status");
              }}
            >
              <i /> {availability} <ChevronDown size={10} />
            </button>
            <div className="cc-profile-wrap">
              <button
                className="cc-avatar-button"
                onClick={() => setProfileOpen((value) => !value)}
                aria-expanded={profileOpen}
              >
                <img src={profilePhoto} alt={managerName} />
                <span>
                  {managerName.split(" ")[0]}
                  <br />
                  <b>{managerName.split(" ").slice(1).join(" ")}</b>
                </span>
                <ChevronDown size={13} />
              </button>
              {profileOpen && (
                <div className="cc-popover">
                  <strong>{managerName}</strong>
                  <span>{bio}</span>
                  <button className="cc-profile-option" onClick={() => setProfileEditor("status")}>
                    <Activity size={14} /> Status: {availability}
                  </button>
                  <label className="cc-profile-option">
                    <Upload size={14} /> Upload profile photo
                    <input
                      className="cc-hidden-file"
                      type="file"
                      accept="image/*"
                      onChange={(event) => readImage(event.target.files?.[0], setProfilePhoto)}
                    />
                  </label>
                  <label className="cc-profile-option">
                    <Upload size={14} /> Upload background photo
                    <input
                      className="cc-hidden-file"
                      type="file"
                      accept="image/*"
                      onChange={(event) => readImage(event.target.files?.[0], setBackgroundPhoto)}
                    />
                  </label>
                  <button className="cc-profile-option" onClick={() => setProfileEditor("payment")}>
                    <CreditCard size={14} /> Add payment method
                  </button>
                  <button className="cc-profile-option" onClick={() => setProfileEditor("bio")}>
                    <FileText size={14} /> Edit bio
                  </button>
                  <button
                    className="cc-profile-option"
                    onClick={() => setProfileEditor("linkedin")}
                  >
                    <Link2 size={14} /> Add LinkedIn
                  </button>
                  {profileEditor && profileEditor !== "photo" && profileEditor !== "background" && (
                    <div className="cc-profile-editor">
                      {profileEditor === "bio" && (
                        <label>
                          Bio
                          <textarea value={bio} onChange={(event) => setBio(event.target.value)} />
                        </label>
                      )}
                      {profileEditor === "linkedin" && (
                        <label>
                          LinkedIn URL
                          <input
                            value={linkedin}
                            onChange={(event) => setLinkedin(event.target.value)}
                            placeholder="https://linkedin.com/in/…"
                          />
                        </label>
                      )}
                      {profileEditor === "payment" && (
                        <label>
                          Payment method
                          <input
                            value={paymentMethod}
                            onChange={(event) => setPaymentMethod(event.target.value)}
                            placeholder="Card ending in 4242"
                          />
                        </label>
                      )}
                      {profileEditor === "status" && (
                        <label>
                          Status note
                          <input
                            value={statusNote}
                            onChange={(event) => setStatusNote(event.target.value)}
                          />
                        </label>
                      )}
                      <button
                        className="cc-profile-save"
                        onClick={() => {
                          setProfileEditor(null);
                          toast.success("Profile settings saved for this workspace.");
                        }}
                      >
                        <Pencil size={13} /> Save changes
                      </button>
                    </div>
                  )}
                  <button onClick={() => void signOut()}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {quickChatOpen && (
          <section className="cc-quick-chat-popover" aria-label="Quick chat">
            <div className="cc-panel-heading">
              <div>
                <MessageCircle size={15} />
                <h2>QUICK CHAT</h2>
                <p>Fast internal conversation</p>
              </div>
              <button
                type="button"
                className="cc-mini-button"
                onClick={() => setQuickChatOpen(false)}
              >
                <X size={13} />
              </button>
            </div>
            <p className="cc-quick-chat-copy">
              Send a note to Help Buddy or open IntelliChat when you need a full conversation
              workspace.
            </p>
            <button
              type="button"
              className="cc-quick-chat-action"
              onClick={() => {
                setMessage("Open IntelliChat");
                setQuickChatOpen(false);
              }}
            >
              Open IntelliChat <ChevronRight size={13} />
            </button>
          </section>
        )}

        <main className="cc-content">
          <section className="cc-identity-panel">
            <div className="cc-identity-main">
              <div className="cc-identity-photo">
                <img src={profilePhoto} alt={managerName} />
                <span />
              </div>
              <div>
                <small>WELCOME TO YOUR COMMAND CENTER</small>
                <h1>Good evening, {managerName}!</h1>
                <p>
                  Today is another opportunity to learn, grow and accomplish more. Your command
                  center is ready.
                </p>
                <strong>
                  Chief Principal Architect <i /> Founder
                </strong>
              </div>
            </div>
            <div className="cc-identity-details">
              <div>
                <small>USER ID</small>
                <b>{managerUserId}</b>
              </div>
              <div>
                <small>COMPANY ID</small>
                <b>{managerCompany}</b>
              </div>
              <div>
                <small>EMAIL</small>
                <b>{managerEmail}</b>
              </div>
              <div>
                <small>WORKPLACE</small>
                <b>{managerWorkplace}</b>
              </div>
            </div>
            <div className="cc-identity-control">
              <label>
                STATUS
                <select
                  value={availability}
                  onChange={(event) =>
                    work.setAvailability(event.target.value as typeof availability)
                  }
                >
                  {AVAILABILITY.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <div className="cc-local-time">
                <Clock3 size={13} />
                <b>{timeFor("America/Chicago", now)}</b>
                <span>{dateFor("America/Chicago", now)}</span>
              </div>
              <div className="cc-local-weather">
                <CloudSun size={14} />
                <b>72°F</b>
                <span>Mostly sunny</span>
              </div>
            </div>
          </section>

          <section className="cc-micro-toolbar cc-global-clocks">
            <div className="cc-micro-label">GLOBAL CLOCKS</div>
            <div className="cc-micro-items">
              {clockEntries.slice(0, 5).map(([city, zone]) => (
                <button
                  type="button"
                  className="cc-clock-micro"
                  key={city}
                  onClick={() => setClockMoreOpen(true)}
                >
                  <b>{shortClockName(city)}</b>
                  <span>{timeFor(zone, now)}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="cc-micro-more"
              onClick={() => setClockMoreOpen((value) => !value)}
            >
              + More <ChevronDown size={10} />
            </button>
            {clockMoreOpen && (
              <div className="cc-micro-more-panel">
                {clockEntries.map(([city, zone]) => (
                  <div
                    className="cc-micro-edit-row"
                    key={city}
                    draggable
                    onDragStart={() => setDraggedClock(city)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => reorderClock(city)}
                    onDragEnd={() => setDraggedClock(null)}
                    title="Drag to reorder"
                  >
                    <select
                      value={city}
                      onChange={(event) => updateClock(city, event.target.value)}
                      aria-label={`Change ${city} clock`}
                    >
                      {clockChoices.map(([choiceCity]) => (
                        <option key={choiceCity}>{choiceCity}</option>
                      ))}
                    </select>
                    <span>{timeFor(zone, now)}</span>
                    <button
                      type="button"
                      className="cc-clock-reorder"
                      onClick={() => moveClock(city, -1)}
                      aria-label={`Move ${city} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="cc-clock-reorder"
                      onClick={() => moveClock(city, 1)}
                      aria-label={`Move ${city} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeClock(city)}
                      aria-label={`Remove ${city} clock`}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <div className="cc-micro-add-row">
                  <select
                    value={clockToAdd}
                    onChange={(event) => setClockToAdd(event.target.value)}
                    aria-label="Add global clock"
                  >
                    <option value="">Add clock…</option>
                    {clockChoices
                      .filter(([city]) => !clockEntries.some(([entryCity]) => entryCity === city))
                      .map(([city]) => (
                        <option key={city}>{city}</option>
                      ))}
                  </select>
                  <button type="button" onClick={addClock}>
                    <Plus size={10} /> Add
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="cc-micro-toolbar cc-news-strip">
            <div className="cc-micro-label">GLOBAL NEWS</div>
            <div className="cc-micro-items">
              {newsItems.slice(0, 5).map(([label, text], index) => (
                <div
                  className={`cc-feed-item cc-news-micro ${expandedFeed === label ? "is-open" : ""}`}
                  key={`${label}-${index}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFeed(expandedFeed === label ? null : label)}
                  >
                    <b>{label}</b>
                    <span>{text}</span>
                  </button>
                  {newsItems.length > 1 && (
                    <button
                      type="button"
                      className="cc-feed-remove"
                      aria-label={`Remove ${label} news feed`}
                      onClick={() =>
                        setNewsItems((current) => current.filter((item) => item[0] !== label))
                      }
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="cc-micro-more"
              onClick={() => setNewsOpen((value) => !value)}
            >
              + More <ChevronDown size={10} />
            </button>
            {newsOpen && (
              <div className="cc-micro-more-panel">
                {expandedFeed && (
                  <div className="cc-feed-detail">
                    {newsItems.find(([label]) => label === expandedFeed)?.[1]}
                  </div>
                )}
                <div className="cc-micro-overflow-list">
                  {newsItems.slice(5).map(([label, text], index) => (
                    <div className="cc-micro-edit-row" key={`${label}-${index}`}>
                      <button type="button" onClick={() => setExpandedFeed(label)}>
                        <b>{label}</b>
                        <span>{text}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNewsItems((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index + 5),
                          )
                        }
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="cc-micro-manage"
                  onClick={() => setNewsManagerOpen((value) => !value)}
                >
                  <Plus size={10} /> Add / Remove feeds
                </button>
                {newsManagerOpen && (
                  <form
                    className="cc-feed-manager"
                    onSubmit={(event) => {
                      event.preventDefault();
                      addNewsFeed();
                    }}
                  >
                    <select
                      value={newsFeedToAdd}
                      onChange={(event) => setNewsFeedToAdd(event.target.value)}
                      aria-label="Choose a news feed"
                    >
                      <option value="">Choose a news source…</option>
                      {availableNewsFeeds
                        .filter((feed) => !newsItems.some(([label]) => label === feed))
                        .map((feed) => (
                          <option key={feed}>{feed}</option>
                        ))}
                    </select>
                    <button type="submit" disabled={!newsFeedToAdd || newsItems.length >= 10}>
                      <Plus size={12} /> Add feed
                    </button>
                    <small>Source choices need a feed connection for live headlines.</small>
                  </form>
                )}
              </div>
            )}
          </section>
          <section className="cc-micro-toolbar cc-market-strip">
            <div className="cc-micro-label">STOCK PICKER</div>
            <div className="cc-micro-items">
              {tickers.slice(0, 5).map(([symbol, change], index) => (
                <div className="cc-ticker-item cc-stock-micro" key={`${symbol}-${index}`}>
                  <button type="button" onClick={() => setExpandedFeed(symbol)}>
                    <b>{symbol}</b>
                    <span className={change.startsWith("-") ? "cc-negative" : "cc-positive"}>
                      {change}
                    </span>
                  </button>
                  {tickers.length > 1 && (
                    <button
                      type="button"
                      className="cc-feed-remove"
                      aria-label={`Remove ${symbol} ticker`}
                      onClick={() =>
                        setTickers((current) => current.filter((item) => item[0] !== symbol))
                      }
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="cc-micro-more"
              onClick={() => setMarketOpen((value) => !value)}
            >
              + More <ChevronDown size={10} />
            </button>
            {marketOpen && (
              <div className="cc-micro-more-panel">
                {expandedFeed && (
                  <div className="cc-feed-detail">
                    {expandedFeed} is open in Market Watch. Select a finance page from the hamburger
                    menu for the connected market workspace.
                  </div>
                )}
                <div className="cc-micro-overflow-list">
                  {tickers.slice(5).map(([symbol, change], index) => (
                    <div className="cc-micro-edit-row" key={`${symbol}-${index}`}>
                      <button type="button" onClick={() => setExpandedFeed(symbol)}>
                        <b>{symbol}</b>
                        <span className={change.startsWith("-") ? "cc-negative" : "cc-positive"}>
                          {change}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTickers((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index + 5),
                          )
                        }
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="cc-micro-manage"
                  onClick={() => setTickerManagerOpen((value) => !value)}
                >
                  <Plus size={10} /> Add / Remove stocks
                </button>
                {tickerManagerOpen && (
                  <form
                    className="cc-feed-manager"
                    onSubmit={(event) => {
                      event.preventDefault();
                      addTicker();
                    }}
                  >
                    <select
                      value={tickerToAdd}
                      onChange={(event) => setTickerToAdd(event.target.value)}
                      aria-label="Choose a stock ticker"
                    >
                      <option value="">Choose a stock or index…</option>
                      {availableTickers
                        .filter((symbol) => !tickers.some(([existing]) => existing === symbol))
                        .map((symbol) => (
                          <option key={symbol}>{symbol}</option>
                        ))}
                    </select>
                    <button type="submit" disabled={!tickerToAdd || tickers.length >= 10}>
                      <Plus size={12} /> Add ticker
                    </button>
                    <small>Live quotes require a connected market-data source.</small>
                  </form>
                )}
              </div>
            )}
          </section>
          <section className="cc-micro-toolbar cc-announcement-toolbar">
            <div className="cc-strip-heading">
              <Bell size={14} /> COMPANY ANNOUNCEMENTS
            </div>
            <span>
              Quarterly planning · New knowledge vault update · Platform build review today
            </span>
            <button type="button" onClick={() => setAnnouncementsOpen((value) => !value)}>
              {announcementsOpen ? "Hide updates" : "View updates"} <ChevronDown size={12} />
            </button>
            {announcementsOpen && (
              <div className="cc-feed-detail">
                Your current focus is completing the full Global Command Center project and
                verifying every page-to-page workflow.
              </div>
            )}
          </section>
          <section className="cc-utility-strip cc-search-strip">
            <div className="cc-utility-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people, work, systems and knowledge…"
                aria-label="Search command center"
              />
            </div>
            <span className="cc-search-caption">Search people, work, systems and knowledge</span>
          </section>

          <section className="cc-micro-toolbar cc-quick-picks">
            <div className="cc-micro-label">QUICK PICKS</div>
            <div className="cc-micro-items cc-quick-micro-items">
              {quickPickItems.slice(0, 5).map(({ label, icon: Icon, href }) => (
                <a href={href} className="cc-quick-micro" key={label}>
                  <Icon size={13} />
                  <span>{label}</span>
                </a>
              ))}
            </div>
            <button
              type="button"
              className="cc-micro-more"
              onClick={() => setQuickPickEditorOpen((value) => !value)}
            >
              + More <ChevronDown size={10} />
            </button>
            {quickPickEditorOpen && (
              <div className="cc-micro-more-panel">
                <div className="cc-micro-overflow-list">
                  {quickPickItems.slice(5).map(({ label, icon: Icon, href }) => (
                    <div className="cc-micro-edit-row" key={label}>
                      <a href={href}>
                        <Icon size={12} />
                        <b>{label}</b>
                      </a>
                      <button type="button" onClick={() => removeQuickPick(label)}>
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <strong className="cc-micro-library-title">ADD FROM HAMBURGER MENU</strong>
                <div className="cc-micro-library">
                  {quickPickLibrary
                    .filter((pick) => !quickPickItems.some((item) => item.label === pick.label))
                    .map((pick) => (
                      <button type="button" key={pick.label} onClick={() => addQuickPick(pick)}>
                        <Plus size={10} /> {pick.label}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </section>

          <div className="cc-work-layout">
            <section className="cc-work-panel">
              <div className="cc-panel-heading">
                <div>
                  <Activity size={16} />
                  <h2>BRING THE WORK TO YOU</h2>
                  <p>Your work. Your priorities. Your operational view.</p>
                </div>
                <div className="cc-panel-tools">
                  <div className="cc-tabs">
                    {["Main Workflow", "Tickets", "Approvals", "Activity"].map((tab) => (
                      <button
                        key={tab}
                        className={activeTab === tab ? "active" : ""}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div className="cc-search-small">
                    <Search size={12} />
                    <input
                      placeholder="Search your tasks…"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="cc-metrics cc-work-statuses" aria-label="Work summary">
                {(
                  [
                    ["Assigned", "All assigned work"],
                    ["Needs Your Attention", "Urgent priority"],
                    ["High Priority", "High priority"],
                    ["Medium Priority", "Medium priority"],
                    ["Low Priority", "Lower priority"],
                  ] as const
                ).map(([category, caption]) => (
                  <button
                    key={category}
                    type="button"
                    className="cc-summary-card"
                    aria-label={`${category}: ${summaryItems[category].length} items. Open list`}
                    onClick={() => {
                      setSelectedWorkItem(null);
                      setSummaryCategory(category);
                    }}
                  >
                    <span>{category}</span>
                    <b>{summaryItems[category].length}</b>
                    <small>{caption}</small>
                  </button>
                ))}
              </div>
              <div className="cc-queue-heading">
                <span>TO-DO LIST · ORDERED BY PRIORITY</span>
                <button>
                  View all <ChevronRight size={12} />
                </button>
              </div>
              <div className="cc-work-list">
                {visibleItems.map((item) => (
                  <div className="cc-work-item" key={item.id}>
                    <span className={`cc-work-icon ${item.tone}`}>
                      <CheckCircle2 size={14} />
                    </span>
                    <div className="cc-work-copy">
                      <div>
                        <span className={`cc-priority ${toneStyles[item.tone]}`}>
                          {item.tone.toUpperCase()}
                        </span>
                        <b>{item.title}</b>
                      </div>
                      <p>{item.detail}</p>
                      <small>{item.id} · 2 hours ago</small>
                    </div>
                    <button className="cc-row-action" onClick={() => openItem(item)}>
                      {item.action}
                    </button>
                  </div>
                ))}
                {visibleItems.length === 0 && (
                  <div className="cc-empty">No matching work in this view.</div>
                )}
              </div>
              <div className="cc-module-row">
                <a href="/m/ai-systems-and-intelligence/maximus/business-analysis">
                  <Bot size={16} />
                  <b>Maximus AI</b>
                  <span>Launch assistant →</span>
                </a>
                <a href="/m/soc-security-operations-center/soc-dashboard/security-posture">
                  <ShieldCheck size={16} />
                  <b>Threat Matrix</b>
                  <span>Open →</span>
                </a>
                <a href="/m/intellibase/training-and-certification/learning-paths">
                  <BookOpen size={16} />
                  <b>Knowledge Vault</b>
                  <span>Search →</span>
                </a>
              </div>
            </section>

            <aside className="cc-assistant-column">
              <section className="cc-assistant-panel">
                <div className="cc-panel-heading">
                  <div>
                    <Bot size={17} />
                    <h2>HELP BUDDY</h2>
                    <p>Your AI Help Desk Assistant</p>
                  </div>
                  <button
                    type="button"
                    className="cc-mini-button"
                    aria-label={assistantCollapsed ? "Open Chat Buddy" : "Minimize Chat Buddy"}
                    aria-expanded={!assistantCollapsed}
                    title={assistantCollapsed ? "Open Chat Buddy" : "Minimize Chat Buddy"}
                    onClick={() => setAssistantCollapsed((value) => !value)}
                  >
                    <ChevronDown size={14} className={assistantCollapsed ? "rotate-180" : ""} />
                  </button>
                </div>
                {!assistantCollapsed && (
                  <>
                <div className="cc-buddy-card">
                  <img src="/assets/help-buddy.png" alt="Help Buddy" />
                  <div>
                    <b>Help Buddy</b>
                    <span>Ask. Find. Connect. Get it done.</span>
                  </div>
                </div>
                <div className="cc-buddy-tabs" role="tablist" aria-label="Chat Buddy scenarios">
                  {(
                    [
                      ["Assist", Bot],
                      ["Checklist", Activity],
                      ["Prepare", CalendarDays],
                      ["Alerts", Bell],
                    ] as Array<[string, LucideIcon]>
                  ).map(([label, Icon]) => (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeBuddyTab === label}
                      className={activeBuddyTab === label ? "active" : ""}
                      key={label}
                      onClick={() => setActiveBuddyTab(label)}
                    >
                      <Icon size={13} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                {activeBuddyTab === "Checklist" ? (
                  <div className="cc-buddy-checklist">
                    <div className="cc-buddy-checklist-heading">
                      <strong>MY CHECKLIST</strong>
                      <span>{work.checklist.filter((entry) => entry.done).length}/{work.checklist.length} complete</span>
                    </div>
                    {work.checklist.length ? (
                      <ul>
                        {work.checklist.map((entry) => (
                          <li key={entry.id}>
                            <label>
                              <input
                                type="checkbox"
                                checked={entry.done}
                                onChange={() => work.toggleChecklistItem(entry.id)}
                              />
                              <span className={entry.done ? "is-done" : ""}>{entry.label}</span>
                            </label>
                            <button type="button" aria-label={`Remove ${entry.label}`} onClick={() => work.removeChecklistItem(entry.id)}>×</button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="cc-buddy-checklist-empty">No checklist steps yet. Add the first step below.</p>
                    )}
                    <form onSubmit={(event) => {
                      event.preventDefault();
                      if (checklistDraft.trim()) work.addChecklistItem(checklistDraft.trim());
                      setChecklistDraft("");
                    }}>
                      <input value={checklistDraft} onChange={(event) => setChecklistDraft(event.target.value)} placeholder="Add a checklist step…" aria-label="New checklist step" />
                      <button type="submit" disabled={!checklistDraft.trim()}><Plus size={13} /> Add</button>
                    </form>
                    <small>Personal checklist · Saved in this browser until persistent workflow storage is connected.</small>
                  </div>
                ) : activeBuddyTab === "Prepare" ? (
                  <div className="cc-buddy-actions">
                    <button onClick={() => setMessage("Help me prepare a meeting: identify the purpose, draft an agenda, suggest attendees from information I am authorized to access, and check my connected calendar. Do not send invitations without my confirmation.")}>Schedule a Meeting</button>
                    <button onClick={() => setMessage("Help me prepare a trip: organize dates, destination, approved travel requirements, itinerary, and documents. Do not book or purchase anything without explicit authorization.")}>Prepare a Trip</button>
                    <button onClick={() => setMessage("Gather the business documents relevant to my current work. Search only repositories and records I am authorized to access, and include source links.")}>Gather Business Documents</button>
                  </div>
                ) : activeBuddyTab === "Alerts" ? (
                  <div className="cc-buddy-alerts">
                    {liveItems.length ? liveItems.filter((entry) => entry.tone === "urgent" || entry.tone === "high").slice(0, 5).map((entry) => (
                      <button type="button" key={entry.id} onClick={() => openItem(entry)}>
                        <strong>{entry.title}</strong><span>{entry.id} · {entry.tone.toUpperCase()}</span>
                      </button>
                    )) : <p>No live alert records are connected to this view yet. Sample dashboard records are not shown as live alerts.</p>}
                  </div>
                ) : (
                  <div className="cc-buddy-actions">
                    <button onClick={() => setMessage("Create a ticket for me. First check whether I am authorized to create it and ask for any missing required details.")}>Create a Ticket</button>
                    <button onClick={() => setMessage("Find documentation I am authorized to access for my current task.")}>Find Documentation</button>
                    <button onClick={() => setMessage("Check the live system status sources available to my role. Clearly identify unavailable integrations.")}>Check System Status</button>
                    <button onClick={() => setMessage("Help me contact the appropriate human support team for my authorized scope.")}>Talk to a Human</button>
                  </div>
                )}
                {conversation.length > 0 && (
                  <div className="cc-conversation">
                    {conversation.slice(-4).map((entry, index) => (
                      <p className={index % 2 === 0 ? "user" : "buddy"} key={`${entry}-${index}`}>
                        {entry}
                      </p>
                    ))}
                  </div>
                )}
                <form className="cc-chat-form" onSubmit={sendMessage}>
                  <input
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Type your question…"
                    aria-label="Ask Help Buddy"
                  />
                  <button type="submit" aria-label="Send message">
                    <ChevronRight size={15} />
                  </button>
                </form>
                  </>
                )}
              </section>
              <section className="cc-connector-panel">
                <div className="cc-panel-heading">
                  <div>
                    <Link2 size={15} />
                    <h2>CONNECTORS</h2>
                    <p>Connected applications and identity services</p>
                  </div>
                  <span className="cc-connector-count">
                    {connectedConnectors.length}/{connectorChoices.length}
                  </span>
                  <button type="button" className="cc-connector-add" onClick={addConnector}>
                    <Plus size={12} />
                  </button>
                </div>
                <div className="cc-connector-list">
                  {connectorChoices.map((connector) => {
                    const connected = connectedConnectors.includes(connector);
                    return (
                      <div className="cc-connector-row" key={connector}>
                        <span>
                          <i className={connected ? "connected" : ""} />
                          {connector}
                        </span>
                        <button type="button" onClick={() => toggleConnector(connector)}>
                          {connected ? "Remove" : "Add"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
              <section className="cc-side-panel">
                <div className="cc-panel-heading">
                  <div>
                    <Activity size={15} />
                    <h2>RECENT ACTIVITY</h2>
                  </div>
                  <button className="cc-text-link">View all</button>
                </div>
                <ul>
                  <li>
                    <span className="activity-dot green" />
                    System backup completed <small>2 hrs ago</small>
                  </li>
                  <li>
                    <span className="activity-dot blue" />
                    Access request approved <small>3 hrs ago</small>
                  </li>
                  <li>
                    <span className="activity-dot violet" />
                    Policy update published <small>5 hrs ago</small>
                  </li>
                </ul>
              </section>
            </aside>
          </div>
        </main>
        <footer className="cc-footer">
          <span>
            <ShieldCheck size={13} /> Secure, Trusted &amp; Compliant.
          </span>
          <span>© 2026 IntelliStack Systems · One world. One system. One intelligent network.</span>
          <span>
            <i className="cc-online-dot" /> Global Command Center v2.0.0
          </span>
        </footer>
      </div>
      <Dialog
        open={summaryCategory !== null || selectedWorkItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSummaryCategory(null);
            setSelectedWorkItem(null);
          }
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          {selectedWorkItem ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedWorkItem.title}</DialogTitle>
                <DialogDescription>
                  {selectedWorkItem.id} · {selectedWorkItem.tone.toUpperCase()} priority
                </DialogDescription>
              </DialogHeader>
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {selectedWorkItem.detail}
              </p>
              {summaryCategory && (
                <button
                  type="button"
                  className="w-fit rounded-md border px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setSelectedWorkItem(null)}
                >
                  Back to {summaryCategory}
                </button>
              )}
            </>
          ) : summaryCategory ? (
            <>
              <DialogHeader>
                <DialogTitle>{summaryCategory}</DialogTitle>
                <DialogDescription>
                  {summaryItems[summaryCategory].length} matching work item(s). Select an item to
                  view its details.
                </DialogDescription>
              </DialogHeader>
              <div className="grid max-h-[55dvh] gap-2 overflow-y-auto pr-1">
                {summaryItems[summaryCategory].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-accent/40"
                    onClick={() => setSelectedWorkItem(item)}
                  >
                    <span className="text-xs font-semibold text-primary">
                      {item.id} · {item.tone.toUpperCase()}
                    </span>
                    <strong className="mt-1 block text-sm">{item.title}</strong>
                    <span className="mt-1 block text-xs text-muted-foreground">{item.detail}</span>
                  </button>
                ))}
                {summaryItems[summaryCategory].length === 0 && (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    There are no items in this category.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BriefcaseIcon(props: { size?: number }) {
  return <LayoutGrid {...props} />;
}
