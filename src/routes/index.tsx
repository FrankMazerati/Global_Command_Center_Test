import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Globe2,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Maximus Optimus · Global Command Center" },
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

const quickPicks = [
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
  {
    label: "Integrations",
    detail: "Connected apps",
    icon: LayoutGrid,
    href: "/m/account-and-administration/account-and-system-administration/system-settings",
  },
];

const clocks = [
  ["New York", "America/New_York"],
  ["Chicago", "America/Chicago"],
  ["London", "Europe/London"],
  ["Dubai", "Asia/Dubai"],
  ["Tokyo", "Asia/Tokyo"],
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

const hamburgerDestinations = [
  ["Command Center", LayoutGrid, "/m/home-and-command-center/command-center/dashboard"],
  [
    "Global ID",
    UserRound,
    "/m/identity-and-access-management/global-identity-and-access-management/global-user-id",
  ],
  [
    "Organizations",
    Users,
    "/m/identity-and-access-management/global-identity-and-access-management/organizations",
  ],
  [
    "IntelliConnect",
    Globe2,
    "/m/productivity-and-collaboration/connected-productivity-tools/connected-application-directory",
  ],
  [
    "IntelliSync",
    Activity,
    "/m/productivity-and-collaboration/intellistack-collaboration-tools/intellisync",
  ],
  [
    "Connect & Build",
    Sparkles,
    "/m/productivity-and-collaboration/connected-productivity-tools/connector-settings",
  ],
  [
    "IntelliAccess",
    ShieldCheck,
    "/m/productivity-and-collaboration/intellistack-collaboration-tools/intelliaccess",
  ],
  [
    "IntelliChat",
    MessageSquare,
    "/m/productivity-and-collaboration/intellistack-collaboration-tools/intellichat",
  ],
  [
    "IntelliCalendar",
    CalendarDays,
    "/m/productivity-and-collaboration/intellistack-collaboration-tools/intellicalendar",
  ],
  [
    "IntelliDrive",
    LayoutGrid,
    "/m/productivity-and-collaboration/intellistack-collaboration-tools/intellidrive",
  ],
  [
    "IntelliSearch",
    Search,
    "/m/productivity-and-collaboration/intellistack-collaboration-tools/intellisearch",
  ],
  [
    "Business Center",
    BriefcaseIcon,
    "/m/business-products/business-overview/business-overview-dashboard",
  ],
  [
    "Workspaces",
    Users,
    "/m/productivity-and-collaboration/intellistack-collaboration-tools/shared-workspaces",
  ],
  ["Help Buddy", Bot, "/m/ai-business-intelligence/help-buddy/help-buddy-overview"],
  [
    "Settings",
    Settings2,
    "/m/account-and-administration/account-and-system-administration/system-settings",
  ],
] as const;

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

function CommandCenterHome() {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [availability, setAvailability] = useState("Available");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Main Workflow");
  const items = workItems;
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);

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

  return (
    <div className="command-center-home">
      <div
        className={`cc-drawer-backdrop ${drawerOpen ? "is-open" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />
      <aside className={`cc-sidebar ${drawerOpen ? "is-open" : ""}`}>
        <div className="cc-sidebar-brand">
          <img src="/assets/intellistack-shield.jpg" alt="IntelliStack Systems" />
          <span>
            INTELLISTACK
            <br />
            <b>SYSTEMS</b>
          </span>
        </div>
        <nav aria-label="Command navigation" className="cc-nav">
          {hamburgerDestinations.map(([label, Icon, href], index) => (
            <a
              key={label}
              href={href}
              className={`cc-nav-item ${index === 0 ? "active" : ""}`}
              onClick={() => setDrawerOpen(false)}
            >
              <Icon size={15} />
              <span>{label}</span>
            </a>
          ))}
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
              aria-label="Open navigation"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu size={19} />
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
            <button className="cc-icon-button" aria-label="Notifications">
              <Bell size={17} />
              <i />
            </button>
            <button className="cc-icon-button" aria-label="Messages">
              <MessageSquare size={17} />
            </button>
            <div className="cc-profile-wrap">
              <button
                className="cc-avatar-button"
                onClick={() => setProfileOpen((value) => !value)}
                aria-expanded={profileOpen}
              >
                <img src="/assets/frank-mazerati.png" alt="Frank Mazerati" />
                <span>
                  Frank
                  <br />
                  <b>Mazerati</b>
                </span>
                <ChevronDown size={13} />
              </button>
              {profileOpen && (
                <div className="cc-popover">
                  <strong>Frank Mazerati</strong>
                  <span>Founder · Global Admin</span>
                  <button onClick={() => void signOut()}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="cc-content">
          <section className="cc-identity-panel">
            <div className="cc-identity-main">
              <div className="cc-identity-photo">
                <img src="/assets/frank-mazerati.png" alt="Frank Mazerati" />
                <span />
              </div>
              <div>
                <small>WELCOME TO YOUR COMMAND CENTER</small>
                <h1>Good evening, Frank Mazerati!</h1>
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
                <b>001</b>
              </div>
              <div>
                <small>COMPANY ID</small>
                <b>INTELLISTACK</b>
              </div>
              <div>
                <small>EMAIL</small>
                <b>Work email</b>
              </div>
              <div>
                <small>WORKPLACE</small>
                <b>Downtown Chicago</b>
              </div>
            </div>
            <div className="cc-identity-control">
              <label>
                STATUS
                <select
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value)}
                >
                  <option>Available</option>
                  <option>Busy</option>
                  <option>In a Meeting</option>
                  <option>Away</option>
                </select>
              </label>
              <div className="cc-local-time">
                <Clock3 size={13} />
                <b>{timeFor("America/Chicago", now)}</b>
                <span>Tuesday · Nov 10</span>
              </div>
            </div>
          </section>

          <section className="cc-info-strip">
            <div className="cc-strip-heading">
              <Globe2 size={14} /> GLOBAL CLOCKS
            </div>
            {clocks.map(([city, zone]) => (
              <div className="cc-clock" key={city}>
                <span>{city}</span>
                <b>{timeFor(zone, now)}</b>
              </div>
            ))}
            <button className="cc-strip-link">WORLD CLOCK +</button>
          </section>
          <section className="cc-utility-strip">
            <div className="cc-utility-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people, work, systems and knowledge…"
                aria-label="Search command center"
              />
            </div>
            <div className="cc-utility-links">
              <button>
                NEWS <span>AI · Network · Security</span>
              </button>
              <button>
                MARKETS <span>NASDAQ +0.87%</span>
              </button>
              <button>
                ANNOUNCEMENTS{" "}
                <span>
                  View updates <ChevronRight size={12} />
                </span>
              </button>
            </div>
          </section>

          <section className="cc-quick-picks">
            <div className="cc-section-heading">
              <div>
                <Sparkles size={15} /> MY QUICK PICKS
              </div>
              <span>Drag to reorder · Click to open</span>
            </div>
            <div className="cc-quick-grid">
              {quickPicks.map(({ label, detail, icon: Icon, href }) => (
                <a href={href} className="cc-quick-card" key={label}>
                  <Icon size={19} />
                  <b>{label}</b>
                  <span>{detail}</span>
                </a>
              ))}
            </div>
          </section>

          <div className="cc-work-layout">
            <section className="cc-work-panel">
              <div className="cc-panel-heading">
                <div>
                  <Activity size={16} />
                  <h2>MAIN WORKFLOW SECTION</h2>
                  <p>Bring the work to you · Your priority center</p>
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
              <div className="cc-metrics">
                <div>
                  <span>Total Tasks</span>
                  <b>{items.length + 18}</b>
                  <small>+6 new today</small>
                </div>
                <div>
                  <span>High Priority</span>
                  <b>
                    {items.filter((item) => item.tone === "high" || item.tone === "urgent").length}
                  </b>
                  <small className="warning">Requires attention</small>
                </div>
                <div>
                  <span>In Progress</span>
                  <b>6</b>
                  <small>On track</small>
                </div>
                <div>
                  <span>Completed</span>
                  <b>11</b>
                  <small className="success">Today</small>
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
