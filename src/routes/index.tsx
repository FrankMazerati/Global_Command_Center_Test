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

const quickPicks: QuickPick[] = [
  {
    label: "Tickets",
    detail: "Create & track",
    icon: Ticket,
    href: "/m/service-desk-and-enterprise-operations/ticket-management/active-ticket-workspace",
  },
  {
    label: "Directory",
    detail: "Find people",
    icon: Users,
    href: "/m/identity-and-access-management/directory-overview/global-directory",
  },
  {
    label: "Calendar",
    detail: "Schedule work",
    icon: CalendarDays,
    href: "/m/productivity-and-collaboration/intellistack-collaboration-tools/intellicalendar",
  },
  {
    label: "Knowledge",
    detail: "Find answers",
    icon: BookOpen,
    href: "/m/account-and-administration/training-and-learning/learning-paths",
  },
  {
    label: "Security",
    detail: "Monitor & respond",
    icon: ShieldCheck,
    href: "/m/security-risk-and-governance/security-overview/security-operations-dashboard",
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
] as const;

const availableQuickPicks: QuickPick[] = [
  {
    label: "Missions",
    detail: "Run the queue",
    icon: Activity,
    href: "/m/home-and-command-center/command-center/bring-the-work-to-you",
  },
  {
    label: "Email",
    detail: "Open inbox",
    icon: Mail,
    href: "/m/productivity-and-collaboration/intellistack-collaboration-tools/email",
  },
  {
    label: "Help Buddy",
    detail: "Ask for help",
    icon: Bot,
    href: "/m/ai-business-intelligence/help-buddy/help-buddy-overview",
  },
  {
    label: "NOC",
    detail: "View operations",
    icon: Globe2,
    href: "/m/service-desk-and-enterprise-operations/noc-center/network-operations-dashboard",
  },
  {
    label: "Payments",
    detail: "Manage billing",
    icon: CreditCard,
    href: "/m/business-products/financial-center/financial-overview",
  },
  {
    label: "Integrations",
    detail: "Connected apps",
    icon: LayoutGrid,
    href: "/m/account-and-administration/account-and-system-administration/system-settings",
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
  const [activeBuddyTab, setActiveBuddyTab] = useState("Workflow");
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
  const [newNewsLabel, setNewNewsLabel] = useState("");
  const [newNewsText, setNewNewsText] = useState("");
  const [newTickerSymbol, setNewTickerSymbol] = useState("");
  const [newTickerChange, setNewTickerChange] = useState("");
  const [liveItems, setLiveItems] = useState<WorkItem[]>([]);
  const [ticketSource, setTicketSource] = useState<"supabase" | "project">("project");
  const [managerRecord, setManagerRecord] = useState<Record<string, unknown> | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
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
    toast.info(`${item.id} opened. This item remains active until the work is verified.`);
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
    setClockEntries((current) => [...current, choice]);
    setClockToAdd("");
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
    if (!newNewsLabel.trim() || !newNewsText.trim()) return;
    setNewsItems((current) => [...current, [newNewsLabel.trim(), newNewsText.trim()]]);
    setNewNewsLabel("");
    setNewNewsText("");
  };

  const addTicker = () => {
    if (!newTickerSymbol.trim() || !newTickerChange.trim()) return;
    setTickers((current) => [
      ...current,
      [newTickerSymbol.trim().toUpperCase(), newTickerChange.trim()],
    ]);
    setNewTickerSymbol("");
    setNewTickerChange("");
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
            const sectionLabel =
              section.title === "Business Products" ? "My Business Center" : section.title;
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
            <div className="cc-micro-label">WORLD CLOCK</div>
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
                  <div className="cc-micro-edit-row" key={city}>
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
            <div className="cc-micro-label">NEWS</div>
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
                    <input
                      value={newNewsLabel}
                      onChange={(event) => setNewNewsLabel(event.target.value)}
                      placeholder="Feed name"
                      aria-label="New news feed name"
                    />
                    <input
                      value={newNewsText}
                      onChange={(event) => setNewNewsText(event.target.value)}
                      placeholder="Feed headline"
                      aria-label="New news feed headline"
                    />
                    <button type="submit">
                      <Plus size={12} /> Add feed
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>
          <section className="cc-micro-toolbar cc-market-strip">
            <div className="cc-micro-label">STOCKS</div>
            <div className="cc-micro-items">
              {tickers.slice(0, 5).map(([symbol, change], index) => (
                <div className="cc-ticker-item cc-stock-micro" key={`${symbol}-${index}`}>
                  <button type="button" onClick={() => setExpandedFeed(symbol)}>
                    <b>{symbol}</b>
                    <span className={change.startsWith("-") ? "cc-negative" : "cc-positive"}>
                      {change}
                    </span>
                  </button>
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
                    <input
                      value={newTickerSymbol}
                      onChange={(event) => setNewTickerSymbol(event.target.value)}
                      placeholder="Ticker"
                      aria-label="New stock ticker"
                    />
                    <input
                      value={newTickerChange}
                      onChange={(event) => setNewTickerChange(event.target.value)}
                      placeholder="Change e.g. +1.20%"
                      aria-label="New stock ticker change"
                    />
                    <button type="submit">
                      <Plus size={12} /> Add ticker
                    </button>
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
              <div className="cc-metrics cc-work-statuses">
                <div>
                  <span>Assigned</span>
                  <b>{items.length}</b>
                  <small>Open work</small>
                </div>
                <div>
                  <span>Active</span>
                  <b>3</b>
                  <small>In progress</small>
                </div>
                <div>
                  <span>Pending</span>
                  <b>{items.filter((item) => item.tone === "medium").length}</b>
                  <small>Awaiting action</small>
                </div>
                <div>
                  <span>Review</span>
                  <b>{items.filter((item) => item.tone === "high").length}</b>
                  <small className="warning">Needs review</small>
                </div>
                <div>
                  <span>Overdue</span>
                  <b>{items.filter((item) => item.tone === "urgent").length}</b>
                  <small className="warning">Priority</small>
                </div>
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
                <a href="/m/business-products/business-overview/business-overview-dashboard">
                  <Bot size={16} />
                  <b>Maximus AI</b>
                  <span>Launch assistant →</span>
                </a>
                <a href="/m/security-risk-and-governance/security-overview/security-operations-dashboard">
                  <ShieldCheck size={16} />
                  <b>Threat Matrix</b>
                  <span>Open →</span>
                </a>
                <a href="/m/account-and-administration/training-and-learning/learning-paths">
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
                    className="cc-mini-button"
                    onClick={() => toast.info("Help Buddy is ready for your next question.")}
                  >
                    <Settings2 size={14} />
                  </button>
                </div>
                <div className="cc-buddy-card">
                  <img src="/assets/help-buddy.png" alt="Help Buddy" />
                  <div>
                    <b>Help Buddy</b>
                    <span>Ask. Find. Connect. Get it done.</span>
                  </div>
                </div>
                <div className="cc-buddy-tabs" role="tablist" aria-label="Help Buddy views">
                  {(
                    [
                      ["Assist", Bot],
                      ["Workflow", Activity],
                      ["Tickets", Ticket],
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
                <div className="cc-buddy-actions">
                  <button onClick={() => setMessage("Create a ticket for me")}>
                    Create a Ticket
                  </button>
                  <button onClick={() => setMessage("Find documentation")}>
                    Find Documentation
                  </button>
                  <button onClick={() => setMessage("Check system status")}>
                    Check System Status
                  </button>
                  <button onClick={() => setMessage("Talk to a human")}>Talk to a Human</button>
                </div>
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
    </div>
  );
}

function BriefcaseIcon(props: { size?: number }) {
  return <LayoutGrid {...props} />;
}
