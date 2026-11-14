import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Camera,
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
  Mic,
  Paperclip,
  Send,
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
import { useWork } from "@/lib/work-context";
import { NAV } from "@/lib/nav";
import {
  loadChatBuddyMessages,
  saveChatBuddyMessage,
  listCommandWorkItems,
  listPendingWorkItemApprovals,
  listIntegrationConnections,
  listRecentAuditEvents,
  decideWorkItemApproval,
  type ChatBuddyMessage,
  type RecentAuditEvent,
} from "@/lib/command-work";

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
  createdAt?: string;
  status?: string;
  source?: string;
  approvalId?: string;
  canDecide?: boolean;
};

type QuickPick = { label: string; detail: string; icon: LucideIcon; href: string };
type SummaryCategory =
  "Completed" | "In Progress" | "To Do" | "Immediate Attention" | "Awaiting Me / Others";

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
type ProfileEditor = "photo" | "background" | "bio" | "linkedin" | "payment" | null;

const defaultNewsFeeds: Array<readonly [string, string]> = [
  ["Reuters World", "Global cloud infrastructure and enterprise AI investments surge 28% in Q4."],
  ["Bloomberg Tech", "US and European technology indexes reach record highs on robust operational demand."],
  ["Dark Reading", "CISA issues priority advisory on zero-trust identity authentication for multi-cloud tenants."],
  ["TechCrunch", "Next-gen industrial robotics and autonomous facility navigation systems enter commercial trials."],
  ["Associated Press", "Clean energy grid modernization projects receive federal certification across 14 states."],
  ["BBC World News", "International cybersecurity pact establishes standard incident reporting frameworks."],
];

const defaultTickers: Array<readonly [string, string, string]> = [
  ["AAPL", "$224.23", "+1.42%"],
  ["NVDA", "$141.54", "+3.18%"],
  ["MSFT", "$428.10", "+0.88%"],
  ["AMZN", "$186.40", "+1.75%"],
  ["TSLA", "$219.12", "-0.64%"],
  ["GOOGL", "$168.35", "+1.12%"],
  ["META", "$582.40", "+2.05%"],
  ["SPY", "$586.30", "+0.74%"],
  ["QQQ", "$492.15", "+1.21%"],
];

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


const defaultExecutiveWorkItems: WorkItem[] = [
  {
    id: "WF-715",
    title: "Facility Tour Protocol: QA Specialist Command Walkthrough",
    detail: "Accompany Quality Assurance Director Elena Vance through the 715 facility rooms and verify holographic status.",
    tone: "high",
    action: "Resume Tour",
    status: "in_progress",
    source: "workflow",
    createdAt: "2026-11-14T06:00:00Z",
  },
  {
    id: "APP-501",
    title: "Approve Level-5 Multi-Region Quantum Key Rotation",
    detail: "Security Operations Center requested executive sign-off for automated cluster key rotation across US-East, EU-Central, and APAC.",
    tone: "urgent",
    action: "Review Approval",
    status: "waiting_approval",
    source: "approval",
    approvalId: "app-sec-501",
    canDecide: true,
    createdAt: "2026-11-14T05:30:00Z",
  },
  {
    id: "TCK-8812",
    title: "APAC Secondary Datacenter Latency Optimization",
    detail: "Routing mesh reports 18ms drift during peak cross-border replication. Edge nodes operating normally.",
    tone: "medium",
    action: "Open Ticket",
    status: "open",
    source: "ticket",
    createdAt: "2026-11-14T04:45:00Z",
  },
  {
    id: "APP-502",
    title: "Tenant Provisioning Authorization: NovaCorp Enterprise",
    detail: "Dedicated tenant isolation environment and 10,000 seat licensing quota awaiting founder sign-off.",
    tone: "high",
    action: "Review Approval",
    status: "waiting_approval",
    source: "approval",
    approvalId: "app-tenant-502",
    canDecide: true,
    createdAt: "2026-11-14T03:15:00Z",
  },
  {
    id: "TCK-8815",
    title: "Robotic Unit Diagnostic Calibration in Sector 4",
    detail: "Autonomous maintenance robots reported sensor alignment completion in the hardware lab.",
    tone: "low",
    action: "View Log",
    status: "completed",
    source: "ticket",
    createdAt: "2026-11-14T02:00:00Z",
  },
  {
    id: "WF-108",
    title: "Inspect 715 Room Holographic Projection Matrix",
    detail: "Verify room identity beacons across the 30 command center workspaces.",
    tone: "medium",
    action: "Inspect",
    status: "open",
    source: "workflow",
    createdAt: "2026-11-14T01:30:00Z",
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

function navHrefForPage(title: string) {
  for (const section of NAV) {
    for (const group of section.groups) {
      const page = group.pages.find((candidate) => candidate.title === title);
      if (page) return `/m/${section.slug}/${group.slug}/${page.slug}`;
    }
  }
  return "/";
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
  const [activeBuddyTab, setActiveBuddyTab] = useState("Chat");
  const [assistantCollapsed, setAssistantCollapsed] = useState(false);
  const [tabsExpanded, setTabsExpanded] = useState(true);
  const [checklistExpanded, setChecklistExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const toggleVoiceTyping = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.info("Voice typing active. Speak now or type your instruction.");
      setIsListening((v) => !v);
      return;
    }
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
          toast.success("Voice input captured.");
        }
      };
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };
  const [checklistDraft, setChecklistDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
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
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, string>>({});
  const connectedConnectors = Object.entries(connectionStatuses)
    .filter(([, status]) => status === "connected")
    .map(([name]) => name);
  const [activityItems, setActivityItems] = useState<RecentAuditEvent[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [backgroundPhoto, setBackgroundPhoto] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [newsItems, setNewsItems] = useState<Array<readonly [string, string]>>([
    ...defaultNewsFeeds,
  ]);
  const [tickers, setTickers] = useState<Array<readonly [string, string, string] | readonly [string, string]>>([...defaultTickers]);
  const [newsManagerOpen, setNewsManagerOpen] = useState(false);
  const [tickerManagerOpen, setTickerManagerOpen] = useState(false);
  const [expandedFeed, setExpandedFeed] = useState<string | null>(null);
  const [newsFeedToAdd, setNewsFeedToAdd] = useState("");
  const [tickerToAdd, setTickerToAdd] = useState("");
  const [draggedClock, setDraggedClock] = useState<string | null>(null);
  const [managerQuickAccess, setManagerQuickAccess] = useState("");
  const [liveItems, setLiveItems] = useState<WorkItem[]>([]);
  const [managerRecord, setManagerRecord] = useState<Record<string, unknown> | null>(null);
  const [managerDetails, setManagerDetails] = useState<Record<string, unknown> | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [navFilter, setNavFilter] = useState("");

  const totalRoomsCount = useMemo(() => {
    return NAV.reduce(
      (total, section) =>
        total + section.groups.reduce((gTotal, group) => gTotal + group.pages.length, 0),
      0,
    );
  }, []);

  const filteredSections = useMemo(() => {
    const q = navFilter.trim().toLowerCase();
    if (!q) return NAV;
    return NAV.map((section) => {
      const sectionMatch = section.title.toLowerCase().includes(q) || section.number.includes(q);
      const matchingGroups = section.groups
        .map((group) => {
          const groupMatch = group.title.toLowerCase().includes(q);
          const matchingPages = group.pages.filter((page) =>
            page.title.toLowerCase().includes(q),
          );
          if (groupMatch || sectionMatch) {
            return group;
          }
          if (matchingPages.length > 0) {
            return { ...group, pages: matchingPages };
          }
          return null;
        })
        .filter((g) => g !== null);

      if (sectionMatch || matchingGroups.length > 0) {
        return {
          ...section,
          groups: matchingGroups.length > 0 ? matchingGroups : section.groups,
        };
      }
      return null;
    }).filter((s) => s !== null);
  }, [navFilter]);
  const [summaryCategory, setSummaryCategory] = useState<SummaryCategory | null>(null);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);
  const [approvalDecisionReason, setApprovalDecisionReason] = useState("");
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<ChatBuddyMessage[]>([]);
  const [commandItems, setCommandItems] = useState<WorkItem[]>([]);

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
            createdAt: String(row["created_at"] ?? row["updated_at"] ?? ""),
            status: String(row["status"] ?? "new"),
            source: "ticket",
          } satisfies WorkItem;
        });
        setLiveItems(mapped);
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
    supabase.auth.getUser().then(async ({ data: authData, error: authError }) => {
      if (!active || authError || !authData.user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,display_name,first_name,last_name,work_email,work_phone,employee_global_id,company_global_id,location_city,location_region,avatar_url,avatar_storage_path,background_storage_path,job_title,department_id,manager_profile_id",
        )
        .eq("id", authData.user.id)
        .maybeSingle();
      if (!active || error || !data) return;
      const profile = data as Record<string, unknown>;
      const mediaBucket = supabase.storage.from("user-profile-media");
      const avatarPath = profile["avatar_storage_path"];
      const backgroundPath = profile["background_storage_path"];
      const [avatarSigned, backgroundSigned] = await Promise.all([
        typeof avatarPath === "string" && avatarPath
          ? mediaBucket.createSignedUrl(avatarPath, 60 * 60 * 12)
          : Promise.resolve({ data: null, error: null }),
        typeof backgroundPath === "string" && backgroundPath
          ? mediaBucket.createSignedUrl(backgroundPath, 60 * 60 * 12)
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (!active) return;
      if (avatarSigned.data?.signedUrl) setProfilePhoto(avatarSigned.data.signedUrl);
      if (backgroundSigned.data?.signedUrl) setBackgroundPhoto(backgroundSigned.data.signedUrl);
      setManagerRecord(profile);
      const managerId = profile["manager_profile_id"];
      if (typeof managerId === "string" && managerId) {
        const { data: manager } = await supabase
          .from("profiles")
          .select("display_name,first_name,last_name,job_title,work_email")
          .eq("id", managerId)
          .maybeSingle();
        if (active && manager) setManagerDetails(manager as Record<string, unknown>);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([listCommandWorkItems(), listPendingWorkItemApprovals()]).then(
      ([workResult, approvalResult]) => {
        if (!active) return;
        const workItems =
          workResult.status === "fulfilled"
            ? workResult.value
                .filter((row) => row.status !== "cancelled")
                .map((row) => ({
                  id: row.id,
                  title: row.title,
                  detail: row.description ?? row.status.replaceAll("_", " "),
                  tone: row.priority === "critical" ? ("urgent" as const) : row.priority,
                  action: "Open",
                  createdAt: row.created_at,
                  status: row.status,
                  source: row.source_type,
                }))
            : [];
        const approvals =
          approvalResult.status === "fulfilled"
            ? approvalResult.value.map((approval) => ({
                id: `approval:${approval.id}`,
                approvalId: approval.id,
                canDecide: approval.participant_role === "approver",
                title: approval.work_item_title,
                detail: `${approval.participant_role === "approver" ? "Approval needed from you" : "Waiting for approval"} · ${approval.reason}`,
                tone: approval.priority === "critical" ? ("urgent" as const) : approval.priority,
                action: approval.participant_role === "approver" ? "Review" : "Track",
                createdAt: approval.requested_at,
                status: "waiting_approval",
                source: "approval",
              }))
            : [];
        setCommandItems([...workItems, ...approvals]);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadChatBuddyMessages()
      .then((rows) => {
        if (active) setConversation(rows);
      })
      .catch(() => {
        if (active) setConversation([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    listIntegrationConnections()
      .then((rows) => {
        if (!active) return;
        setConnectionStatuses(
          Object.fromEntries(rows.map((row) => [row.display_name, row.connection_status])),
        );
      })
      .catch(() => {
        if (active) setConnectionStatuses({});
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    listRecentAuditEvents(5)
      .then((rows) => {
        if (active) setActivityItems(rows);
      })
      .catch(() => {
        if (active) setActivityItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const items = useMemo(() => {
    const combined = [...liveItems, ...commandItems];
    return combined.length > 0 ? combined : defaultExecutiveWorkItems;
  }, [liveItems, commandItems]);
  const managerName = String(
    managerRecord?.["display_name"] ||
      [managerRecord?.["first_name"], managerRecord?.["last_name"]].filter(Boolean).join(" ") ||
      "Frank Mazerati",
  );
  const managerEmail = String(managerRecord?.["work_email"] ?? "frank.maserati@intelistacksystems.com");
  const managerJobTitle = String(managerRecord?.["job_title"] ?? "Chief Principal Architect & Founder");
  const managerDepartment = String(managerRecord?.["department_id"] ?? "Department not configured");
  const reportingManagerName = String(
    managerDetails?.["display_name"] ||
      [managerDetails?.["first_name"], managerDetails?.["last_name"]].filter(Boolean).join(" ") ||
      "Manager not configured",
  );
  const managerAvatar =
    typeof managerRecord?.["avatar_url"] === "string" ? managerRecord["avatar_url"] : null;
  const displayedPhoto = profilePhoto ?? managerAvatar ?? "/assets/frank-mazerati.png";
  const profileInitials =
    managerName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const managerUserId = String(managerRecord?.["employee_global_id"] ?? "IntelliStackID-144674");
  const managerCompany = String(managerRecord?.["company_global_id"] ?? "IntelliStackSystems-144674");
  const managerWorkplace =
    [managerRecord?.["location_city"], managerRecord?.["location_region"]]
      .filter(Boolean)
      .join(", ") || "Chicago Corporate Center, Chicago, IL";
  const greetingDetails = (() => {
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) {
      return {
        label: "MORNING SYSTEM BRIEF",
        greeting: `Good morning, ${managerName}`,
        message: "Systems are ready. Let’s review today’s priorities and keep the command center moving.",
      };
    }
    if (hour >= 12 && hour < 18) {
      return {
        label: "AFTERNOON MOMENTUM",
        greeting: `Good afternoon, ${managerName}`,
        message: "You’re doing good today. Keep up the good work, and take a moment to recognize what you’ve accomplished.",
      };
    }
    return {
      label: "NIGHT CLOSEOUT",
      greeting: `Good evening, ${managerName}`,
      message: "Let’s close out strong: review open priorities, check the room status, and leave a clear handoff.",
    };
  })();
  const managerQuickAccessOptions = managerDetails
    ? [reportingManagerName, String(managerDetails["job_title"] ?? "Manager")]
    : [];

  const quickPickLibrary = [...availableQuickPicks, ...menuQuickPickOptions].filter(
    (pick, index, all) => all.findIndex((candidate) => candidate.label === pick.label) === index,
  );

  const activityWorkItems = useMemo(
    () =>
      activityItems.map((entry) => ({
        id: entry.id,
        title: entry.action.replaceAll("_", " "),
        detail:
          [entry.resource_type, entry.resource_id].filter(Boolean).join(" · ") || "Audit event",
        tone: entry.outcome === "success" ? ("low" as const) : ("medium" as const),
        action: "Details",
        createdAt: entry.created_at,
        source: "activity",
      })),
    [activityItems],
  );
  const openWorkItems = items.filter(
    (item) => !["completed", "cancelled", "resolved", "closed"].includes(item.status ?? ""),
  );
  const tabItems = useMemo(() => {
    if (activeTab === "Tickets") {
      const tickets = items.filter((item) => item.source === "ticket" || item.id.startsWith("TCK"));
      return tickets.length > 0 ? tickets : items.filter((i) => i.source === "ticket");
    }
    if (activeTab === "Approvals") {
      return items.filter((item) => Boolean(item.approvalId) || item.status === "waiting_approval");
    }
    if (activeTab === "Activity") {
      return activityWorkItems.length > 0 ? activityWorkItems : items;
    }
    if (activeTab === "Main Workflow") {
      return openWorkItems.length > 0 ? openWorkItems : items;
    }
    return items;
  }, [activeTab, items, openWorkItems, activityWorkItems]);
  const visibleItems = useMemo(
    () =>
      tabItems.filter((item) =>
        `${item.id} ${item.title} ${item.detail}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [tabItems, query],
  );

  const signOut = async () => {
    await getSupabaseClient()?.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const openItem = (item: WorkItem) => {
    setSummaryCategory(null);
    setApprovalDecisionReason("");
    setSelectedWorkItem(item);
  };

  const decideSelectedApproval = async (decision: "approved" | "denied") => {
    if (!selectedWorkItem?.approvalId || !selectedWorkItem.canDecide) return;
    try {
      await decideWorkItemApproval(selectedWorkItem.approvalId, decision, approvalDecisionReason);
      setCommandItems((current) =>
        current.filter((item) => item.approvalId !== selectedWorkItem.approvalId),
      );
      setSelectedWorkItem(null);
      setApprovalDecisionReason("");
      toast.success(
        decision === "approved" ? "Approval recorded." : "Request denied and recorded.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to record this approval decision.",
      );
    }
  };

  const summaryItems: Record<SummaryCategory, WorkItem[]> = {
    Completed: items.filter((item) =>
      ["completed", "resolved", "closed"].includes(item.status ?? ""),
    ),
    "In Progress": items.filter((item) =>
      ["in_progress", "accepted", "escalated"].includes(item.status ?? ""),
    ),
    "To Do": items.filter(
      (item) => !item.approvalId && ["open", "new", "todo", "pending"].includes(item.status ?? ""),
    ),
    "Immediate Attention": items.filter((item) => item.tone === "urgent" || item.tone === "high"),
    "Awaiting Me / Others": items.filter(
      (item) =>
        Boolean(item.approvalId) ||
        ["waiting_approval", "blocked", "waiting"].includes(item.status ?? ""),
    ),
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    try {
      const saved = await saveChatBuddyMessage(trimmed);
      setConversation((current) => [...current, saved]);
      setMessage("");
      toast.info(
        "Message saved to Help Buddy history. AI response generation is not connected yet.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save your Help Buddy message.",
      );
    }
  };

  const saveProfileImage = async (kind: "avatar" | "background", file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file to continue.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      toast.error("Supabase is not connected, so this image could not be saved.");
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      toast.error("Sign in to save profile images to your account.");
      return;
    }

    const userId = authData.user.id;
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const objectPath = `${userId}/${kind}-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("user-profile-media")
      .upload(objectPath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      toast.error(`Image upload failed: ${uploadError.message}`);
      return;
    }

    const pathColumn = kind === "avatar" ? "avatar_storage_path" : "background_storage_path";
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ [pathColumn]: objectPath })
      .eq("id", userId);
    if (profileError) {
      await supabase.storage.from("user-profile-media").remove([objectPath]);
      toast.error(`Image uploaded but profile update failed: ${profileError.message}`);
      return;
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from("user-profile-media")
      .createSignedUrl(objectPath, 60 * 60 * 12);
    if (signedError || !signedData?.signedUrl) {
      toast.error("Image saved, but it could not be previewed. Reload the page to try again.");
      return;
    }
    if (kind === "avatar") setProfilePhoto(signedData.signedUrl);
    else setBackgroundPhoto(signedData.signedUrl);
    setManagerRecord((current) => current ? { ...current, [pathColumn]: objectPath } : current);
    toast.success(kind === "avatar" ? "Profile photo saved to your account." : "Background image saved to your account.");
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
      const from = reordered[index];
      const to = reordered[targetIndex];
      if (!from || !to) return current;
      reordered[index] = to;
      reordered[targetIndex] = from;
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

  const addConnector = () => {
    toast.info(
      "The connector catalog is available, but an authorization flow must be configured before a connection can be created.",
    );
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
          <span className="cc-sidebar-brand-text">
            INTELLISTACK
            <br />
            <b>SYSTEMS</b>
          </span>
          <button
            type="button"
            className="cc-sidebar-close"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="cc-nav-search-box">
          <Search size={14} className="cc-nav-search-icon" />
          <input
            type="text"
            className="cc-nav-search-input"
            placeholder="Search workspaces & rooms…"
            value={navFilter}
            onChange={(e) => setNavFilter(e.target.value)}
            aria-label="Filter command navigation"
          />
          {navFilter && (
            <button
              type="button"
              className="cc-nav-search-clear"
              aria-label="Clear filter"
              onClick={() => setNavFilter("")}
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="cc-sidebar-meta">
          <span>{filteredSections.length} WORKSPACES</span>
          <span>{totalRoomsCount} ROOMS</span>
        </div>

        <nav aria-label="Command navigation" className="cc-nav">
          {filteredSections.map((section) => {
            const isSearching = Boolean(navFilter.trim());
            const sectionOpen = isSearching ? true : (expandedSections[section.slug] ?? section.number === "01");
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
                  <span className="cc-nav-title">{sectionLabel}</span>
                  <ChevronDown size={14} className={`cc-nav-chevron ${sectionOpen ? "is-rotated" : ""}`} />
                </button>
                {sectionOpen && (
                  <div className="cc-nav-groups">
                    <a
                      className="cc-nav-overview-link"
                      href={`/m/${section.slug}`}
                      onClick={() => setDrawerOpen(false)}
                    >
                      <span>Workspace overview</span>
                      <ChevronRight size={12} />
                    </a>
                    {section.groups.map((group) => {
                      const groupKey = `${section.slug}:${group.slug}`;
                      const groupOpen = isSearching ? true : (expandedGroups[groupKey] ?? group.pages.length <= 6);
                      return (
                        <div className="cc-nav-group" key={groupKey}>
                          <button
                            type="button"
                            className={`cc-nav-group-toggle ${groupOpen ? "is-open" : ""}`}
                            onClick={() =>
                              setExpandedGroups((current) => ({
                                ...current,
                                [groupKey]: !groupOpen,
                              }))
                            }
                            aria-expanded={groupOpen}
                          >
                            <span className="cc-nav-group-title">{group.title}</span>
                            <span className="cc-nav-group-meta">
                              <span className="cc-nav-group-count">{group.pages.length}</span>
                              <ChevronRight size={12} className={`cc-nav-group-chevron ${groupOpen ? "rotate-90" : ""}`} />
                            </span>
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
                                  <span className="cc-nav-page-bullet" />
                                  <span className="cc-nav-page-title">{page.title}</span>
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
        <nav className="cc-sidebar-pinned" aria-label="Pinned shortcuts">
          <a href={navHrefForPage("Global Settings")}>
            <Settings2 size={17} />
            <span>Settings</span>
          </a>
          <a href={navHrefForPage("Knowledge Search")}>
            <BookOpen size={17} />
            <span>Help Center</span>
          </a>
          <button type="button" onClick={() => void signOut()}>
            <LogOut size={17} />
            <span>Log out</span>
          </button>
        </nav>
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
            <button
              className="cc-icon-button"
              aria-label="Notifications"
              onClick={() =>
                toast.info("Notification center is not connected in this workspace yet.")
              }
            >
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
            <div className="cc-profile-wrap">
              <button
                className="cc-avatar-button"
                onClick={() => setProfileOpen((value) => !value)}
                aria-expanded={profileOpen}
              >
                {displayedPhoto ? (
                  <img src={displayedPhoto} alt={managerName} />
                ) : (
                  <span className="cc-avatar-initials">{profileInitials}</span>
                )}
                <span>{managerName}</span>
                <ChevronDown size={13} />
              </button>
              {profileOpen && (
                <div className="cc-popover">
                  <strong>{managerName}</strong>
                  <div className="cc-profile-facts">
                    <span>
                      <b>Global ID</b>
                      {managerUserId}
                    </span>
                    <span>
                      <b>Company ID</b>
                      {managerCompany}
                    </span>
                    <span>
                      <b>Workplace</b>
                      {managerWorkplace}
                    </span>
                    <span>
                      <b>Email</b>
                      {managerEmail}
                    </span>
                    <span>
                      <b>Job title</b>
                      {managerJobTitle}
                    </span>
                    <span>
                      <b>Department</b>
                      {managerDepartment}
                    </span>
                    <span>
                      <b>Manager</b>
                      {reportingManagerName}
                    </span>
                    {managerDetails && (
                      <span>
                        <b>Manager contact</b>
                        {String(managerDetails["work_email"] ?? "Email not provided")}
                        {managerDetails["job_title"]
                          ? ` · ${String(managerDetails["job_title"])}`
                          : ""}
                      </span>
                    )}
                  </div>

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
          <section
            className="cc-identity-panel"
            style={backgroundPhoto ? { backgroundImage: `linear-gradient(105deg, rgba(2, 12, 28, .90), rgba(2, 14, 34, .70) 58%, rgba(2, 12, 28, .84)), url("${backgroundPhoto}")` } : undefined}
          >
            <div className="cc-identity-main">
              <label className="cc-identity-photo" title="Change profile photo">
                <img src={displayedPhoto} alt={managerName} />
                <span className="cc-photo-upload-overlay" aria-hidden="true"><Camera size={15} /></span>
                <input
                  className="cc-hidden-file"
                  type="file"
                  accept="image/*"
                  aria-label="Change profile photo"
                  onChange={(event) => void saveProfileImage("avatar", event.target.files?.[0])}
                />
              </label>
              <div className="cc-identity-copy">
                <small className="cc-identity-greeting-label">{greetingDetails.label}</small>
                <h1>{greetingDetails.greeting}</h1>
                <p className="cc-identity-system-message">{greetingDetails.message}</p>
                <strong className="cc-identity-role">{managerJobTitle}</strong>
              </div>
            </div>

            <div className="cc-identity-details">
              <div><small>GLOBAL USER ID</small><b>{managerUserId}</b></div>
              <div><small>USER ID</small><b>frank.mazerati</b></div>
              <div><small>COMPANY ID</small><b>{managerCompany}</b></div>
              <div><small>EMAIL</small><b>{managerEmail}</b></div>
              <div><small>PHONE</small><b>{String(managerRecord?.["work_phone"] ?? "312-824-0056")}</b></div>
              <div><small>WORK LOCATION</small><b>{managerWorkplace}</b></div>
            </div>

            <div className="cc-identity-controls">
              <label className="cc-compact-control">
                <small>AVAILABILITY</small>
                <select value={work.availability} onChange={(event) => work.setAvailability(event.target.value as typeof work.availability)} aria-label="Availability">
                  <option value="Available">Available</option>
                  <option value="Active">Active</option>
                  <option value="Away">Away</option>
                  <option value="Busy">Busy</option>
                  <option value="Out to Lunch">Out to Lunch</option>
                  <option value="In a Meeting">In a Meeting</option>
                  <option value="On Break">On Break</option>
                  <option value="On a Call">Helping a user on a call</option>
                  <option value="Helping a User">Helping a user</option>
                  <option value="Do Not Disturb">Do Not Disturb</option>
                  <option value="Offline">Offline</option>
                </select>
              </label>
              <label className="cc-compact-control">
                <small>MY MANAGERS</small>
                <select value={managerQuickAccess} onChange={(event) => setManagerQuickAccess(event.target.value)} aria-label="My Managers quick access">
                  <option value="">Quick access…</option>
                  {managerQuickAccessOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <div className="cc-profile-telemetry">
                <div><Clock3 size={11} /> <span>{timeFor(localTimeZone, now)} · {localTimeZone}</span></div>
                <div><CloudSun size={11} /> <span>Local weather unavailable</span></div>
              </div>
              <label className="cc-change-background">
                <Upload size={12} /> Change background image
                <input className="cc-hidden-file" type="file" accept="image/*" aria-label="Change background image" onChange={(event) => void saveProfileImage("background", event.target.files?.[0])} />
              </label>
            </div>
          </section>

          {/* 1. POPULAR STOCKS (AT THE VERY TOP) */}
          <section className="cc-micro-toolbar cc-market-strip cc-elevated-ticker">
            <div className="cc-micro-label">POPULAR STOCKS</div>
            <div className="cc-micro-items">
              {tickers.slice(0, 7).map((item, index) => {
                const symbol = item[0];
                const price = item.length > 2 ? item[1] : "$150.00";
                const change = item.length > 2 ? item[2] : item[1];
                const isNeg = String(change).startsWith("-");
                return (
                  <div className="cc-ticker-item cc-stock-micro" key={`${symbol}-${index}`}>
                    <button type="button" onClick={() => setExpandedFeed(symbol)}>
                      <b>{symbol}</b>
                      <span className="cc-stock-price">{price}</span>
                      <span className={isNeg ? "cc-negative" : "cc-positive"}>
                        {change}
                      </span>
                    </button>
                    {tickers.length > 1 && (
                      <button
                        type="button"
                        className="cc-feed-remove"
                        aria-label={`Remove ${symbol} ticker`}
                        onClick={() =>
                          setTickers((current) => current.filter((it) => it[0] !== symbol))
                        }
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="cc-micro-more"
              onClick={() => setMarketOpen((value) => !value)}
            >
              + More Stocks <ChevronDown size={10} />
            </button>
            {marketOpen && (
              <div className="cc-micro-more-panel cc-dropdown-elevated">
                <div className="cc-dropdown-header">
                  <strong>MARKET INTELLIGENCE & STOCKS</strong>
                  <button type="button" onClick={() => setMarketOpen(false)}>
                    <X size={12} />
                  </button>
                </div>
                {expandedFeed && tickers.some(([symbol]) => symbol === expandedFeed) && (
                  <div className="cc-feed-detail">
                    {expandedFeed}: Live quotes synchronized from enterprise market feed.
                  </div>
                )}
                <div className="cc-micro-overflow-list">
                  {tickers.slice(7).map((item, index) => {
                    const symbol = item[0];
                    const price = item.length > 2 ? item[1] : "$150.00";
                    const change = item.length > 2 ? item[2] : item[1];
                    const isNeg = String(change).startsWith("-");
                    return (
                      <div className="cc-micro-edit-row" key={`${symbol}-${index}`}>
                        <button type="button" onClick={() => setExpandedFeed(symbol)}>
                          <b>{symbol}</b>
                          <span>{price}</span>
                          <span className={isNeg ? "cc-negative" : "cc-positive"}>
                            {change}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setTickers((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index + 7),
                            )
                          }
                        >
                          <X size={10} />
                        </button>
                      </div>
                    );
                  })}
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
                    <button type="submit" disabled={!tickerToAdd || tickers.length >= 20}>
                      <Plus size={12} /> Add ticker
                    </button>
                    <small>Enter symbol to monitor price and intraday trajectory.</small>
                  </form>
                )}
              </div>
            )}
          </section>

          {/* 2. GLOBAL NEWS FEED (SECOND) */}
          <section className="cc-micro-toolbar cc-news-strip cc-elevated-news">
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
              + More News <ChevronDown size={10} />
            </button>
            {newsOpen && (
              <div className="cc-micro-more-panel cc-dropdown-elevated">
                <div className="cc-dropdown-header">
                  <strong>GLOBAL DISPATCH & INTEL</strong>
                  <button type="button" onClick={() => setNewsOpen(false)}>
                    <X size={12} />
                  </button>
                </div>
                {expandedFeed && newsItems.some(([source]) => source === expandedFeed) && (
                  <div className="cc-feed-detail">
                    <b>{expandedFeed}:</b>{" "}
                    {newsItems.find(([source]) => source === expandedFeed)?.[1]}
                  </div>
                )}
                <div className="cc-micro-overflow-list">
                  {newsItems.slice(5).map(([label, text], index) => (
                    <div className="cc-micro-edit-row" key={`${label}-${index}`}>
                      <button
                        type="button"
                        onClick={() => setExpandedFeed(expandedFeed === label ? null : label)}
                      >
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
                  <Plus size={10} /> Manage News Sources
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
                      <option value="">Choose a live news wire…</option>
                      {availableNewsFeeds
                        .filter((feed) => !newsItems.some(([existing]) => existing === feed))
                        .map((feed) => (
                          <option key={feed}>{feed}</option>
                        ))}
                    </select>
                    <button type="submit" disabled={!newsFeedToAdd || newsItems.length >= 15}>
                      <Plus size={12} /> Add wire
                    </button>
                    <small>Real-time encrypted global news streams.</small>
                  </form>
                )}
              </div>
            )}
          </section>

          {/* 3. GLOBAL CLOCKS (THIRD) */}
          <section className="cc-micro-toolbar cc-global-clocks cc-elevated-clocks">
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
              + More Clocks <ChevronDown size={10} />
            </button>
            {clockMoreOpen && (
              <div className="cc-micro-more-panel cc-dropdown-elevated">
                <div className="cc-dropdown-header">
                  <strong>WORLD COMMAND CLOCKS</strong>
                  <button type="button" onClick={() => setClockMoreOpen(false)}>
                    <X size={12} />
                  </button>
                </div>
                <div className="cc-micro-overflow-list">
                  {clockEntries.slice(5).map(([city, zone], index) => (
                    <div className="cc-micro-edit-row" key={`${city}-${index}`}>
                      <button type="button">
                        <b>{city}</b>
                        <span>{timeFor(zone, now)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setClockEntries((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index + 5),
                          )
                        }
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="cc-micro-add-row">
                  <select
                    value={clockToAdd}
                    onChange={(event) => setClockToAdd(event.target.value)}
                    aria-label="Choose a world clock city"
                  >
                    <option value="">Add global clock…</option>
                    {clockChoices
                      .filter(
                        ([choiceCity]) =>
                          !clockEntries.some(([existingCity]) => existingCity === choiceCity),
                      )
                      .map(([choiceCity]) => (
                        <option key={choiceCity}>{choiceCity}</option>
                      ))}
                  </select>
                  <button type="button" onClick={addClock} disabled={!clockToAdd}>
                    <Plus size={10} /> Add
                  </button>
                </div>
              </div>
            )}
          </section>
          <section className="cc-micro-toolbar cc-announcement-toolbar">
            <div className="cc-strip-heading">
              <Bell size={14} /> COMPANY ANNOUNCEMENTS
            </div>
            <span className="cc-announcement-status">Company announcement feed not connected</span>
            <button type="button" onClick={() => setAnnouncementsOpen((value) => !value)}>
              {announcementsOpen ? "Hide updates" : "View updates"} <ChevronDown size={12} />
            </button>
            {announcementsOpen && (
              <div className="cc-feed-detail">
                Announcements will appear here when an authorized company feed is connected.
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
                    ["Completed", "Completed and resolved"],
                    ["In Progress", "Actively being worked"],
                    ["To Do", "Open work items"],
                    ["Immediate Attention", "Urgent and high priority"],
                    ["Awaiting Me / Others", "Blocked or awaiting decisions"],
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
                <button type="button" onClick={() => setSummaryCategory("To Do")}>
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
                      <small>
                        {item.id} ·{" "}
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : "Date unavailable"}
                      </small>
                    </div>
                    <button className="cc-row-action" onClick={() => openItem(item)}>
                      {item.action}
                    </button>
                  </div>
                ))}
                {visibleItems.length === 0 && (
                  <div className="cc-empty">
                    {items.length === 0
                      ? "No work records are available from connected sources."
                      : `No ${activeTab.toLowerCase()} records match this view.`}
                  </div>
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
              <section className="cc-assistant-panel cc-character-assistant">
                <div className="cc-panel-heading">
                  <div className="flex items-center gap-2">
                    <Bot size={17} className="text-cyan-400" />
                    <div>
                      <h2 className="text-sm font-bold tracking-wider text-white">QA SPECIALIST BUDDY</h2>
                      <p className="text-[10px] text-cyan-300/80">Executive Operations & Facility Guide</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className={`cc-nav-toggle-btn ${tabsExpanded ? "is-active" : ""}`}
                      onClick={() => setTabsExpanded((v) => !v)}
                      title={tabsExpanded ? "Retract navigation buttons" : "Expand navigation buttons"}
                    >
                      <span>{tabsExpanded ? "Retract" : "Tabs"}</span>
                      <ChevronDown size={11} className={tabsExpanded ? "rotate-180" : ""} />
                    </button>
                    <button
                      type="button"
                      className={`cc-task-toggle-btn ${checklistExpanded ? "is-active" : ""}`}
                      onClick={() => setChecklistExpanded((v) => !v)}
                      title={checklistExpanded ? "Retract checklist" : "Pop out checklist"}
                    >
                      <span>{checklistExpanded ? "Close Tasks" : "Checklist"}</span>
                      <CheckCircle2 size={11} />
                    </button>
                  </div>
                </div>

                {/* Retractable Navigation Buttons on Top */}
                {tabsExpanded && (
                  <div className="cc-buddy-tabs" role="tablist" aria-label="Help Buddy sections">
                    {(
                      [
                        ["Chat", MessageCircle],
                        ["Tasks", CheckCircle2],
                        ["Notes", FileText],
                        ["People", Users],
                        ["Files", BookOpen],
                        ["Activity", Activity],
                        ["History", Clock3],
                      ] as Array<[string, LucideIcon]>
                    ).map(([label, Icon]) => (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeBuddyTab === label}
                        className={activeBuddyTab === label ? "active" : ""}
                        key={label}
                        onClick={() => {
                          setActiveBuddyTab(label);
                          if (label === "Tasks") setChecklistExpanded(true);
                        }}
                      >
                        <Icon size={12} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Pop-out / Expandable Checklist Drawer */}
                {checklistExpanded && (
                  <div className="cc-buddy-popout-drawer">
                    <div className="cc-popout-header">
                      <strong>MY EXECUTIVE TASKS</strong>
                      <span className="cc-popout-count">
                        {work.checklist.filter((entry) => entry.done).length}/{work.checklist.length} complete
                      </span>
                      <button type="button" onClick={() => setChecklistExpanded(false)} aria-label="Close task popout">
                        <X size={12} />
                      </button>
                    </div>
                    {work.checklist.length ? (
                      <ul className="cc-popout-list">
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
                            <button
                              type="button"
                              aria-label={`Remove ${entry.label}`}
                              onClick={() => work.removeChecklistItem(entry.id)}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="cc-buddy-checklist-empty">No task items yet. Add one below.</p>
                    )}
                    <form
                      className="cc-popout-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (checklistDraft.trim()) work.addChecklistItem(checklistDraft.trim());
                        setChecklistDraft("");
                      }}
                    >
                      <input
                        value={checklistDraft}
                        onChange={(event) => setChecklistDraft(event.target.value)}
                        placeholder="Add executive task…"
                        aria-label="New task"
                      />
                      <button type="submit" disabled={!checklistDraft.trim()}>
                        <Plus size={12} /> Add
                      </button>
                    </form>
                  </div>
                )}

                {/* Character Stage with Full Body Picture, Her Speech Bubble Above & User Speech Bubble Below */}
                <div className="cc-character-stage">
                  {/* Top speech bubble: What QA Specialist Elena Vance says */}
                  <div className="cc-assistant-speech-bubble">
                    <div className="cc-speech-speaker">
                      <span className="cc-speaker-dot" />
                      <b>QA Specialist · Elena Vance</b>
                    </div>
                    <p>
                      {conversation.filter((c) => c.sender_type !== "user").slice(-1)[0]?.content ||
                        "Standing by, Chief Architect. All 715 facility rooms are online and synchronized with the holographic operations grid. What is our next objective?"}
                    </p>
                  </div>

                  {/* Middle: Full Body Picture of QA Specialist and Frank */}
                  <div className="cc-character-fullbody-frame">
                    <img
                      src="/assets/qa-buddy.jpg"
                      alt="Quality Assurance Specialist and Frank Mazerati in Command Center"
                      className="cc-character-fullbody-img"
                    />
                    <div className="cc-character-hologram-glow" />
                    <div className="cc-character-pedestal" />
                  </div>

                  {/* Under feet: What the user said */}
                  <div className="cc-user-speech-bubble">
                    <div className="cc-speech-speaker user">
                      <b>Frank Mazerati</b>
                      <span className="cc-user-dot" />
                    </div>
                    <p>
                      {conversation.filter((c) => c.sender_type === "user").slice(-1)[0]?.content ||
                        "Running full walkthrough protocol across all command environments."}
                    </p>
                  </div>
                </div>

                {/* Bottom Conversational Bar */}
                <form className="cc-conversational-bar" onSubmit={sendMessage}>
                  <button
                    type="button"
                    className="cc-bar-tool-btn"
                    title="Add attachments or data file"
                    onClick={() => toast.info("Attachment selector ready.")}
                  >
                    <Paperclip size={14} />
                  </button>
                  <button
                    type="button"
                    className={`cc-bar-tool-btn cc-voice-btn ${isListening ? "is-recording" : ""}`}
                    title={isListening ? "Recording voice… click to stop" : "Voice type question"}
                    onClick={toggleVoiceTyping}
                  >
                    <Mic size={14} />
                  </button>
                  <input
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ask QA Specialist or type command…"
                    aria-label="Ask Help Buddy"
                    className="cc-conversational-input"
                  />
                  <button type="submit" className="cc-bar-send-btn" disabled={!message.trim()} aria-label="Send message">
                    <Send size={14} />
                  </button>
                </form>
              </section>
            </aside>
          </div>
        </main>
        <footer className="cc-footer">
          <div className="cc-footer-brand">
            <img src="/assets/intellistack-shield.jpg" alt="" />
            <div>
              <b>INTELLISTACK SYSTEMS</b>
              <span>MAXIMUS OPTIMUS COMMAND CENTER</span>
            </div>
            <p>Think beyond locally, connect everything globally, powered by intelligence.</p>
          </div>
          <div className="cc-footer-group">
            <b>Company</b>
            <a href={navHrefForPage("Company Profile")}>Company Profile</a>
            <a href={navHrefForPage("Business Performance")}>Business Performance</a>
            <a href={navHrefForPage("Business Health")}>Business Health</a>
            <a href={navHrefForPage("Contact Information")}>Contact Information</a>
          </div>
          <div className="cc-footer-group">
            <b>Platform</b>
            <a href={navHrefForPage("Platform Overview")}>Platform Overview</a>
            <a href={navHrefForPage("System Status")}>System Status</a>
            <a href={navHrefForPage("Global Settings")}>Global Settings</a>
            <a href={navHrefForPage("Application Configuration")}>Applications</a>
          </div>
          <div className="cc-footer-group">
            <b>Resources</b>
            <a href={navHrefForPage("Learning Paths")}>Learning Paths</a>
            <a href={navHrefForPage("Application Documentation")}>Documentation</a>
            <a href={navHrefForPage("Troubleshooting")}>Troubleshooting</a>
            <a href={navHrefForPage("Common Issues")}>Common Issues</a>
          </div>
          <div className="cc-footer-group">
            <b>Support</b>
            <a href={navHrefForPage("Knowledge Search")}>Help Center</a>
            <a href={navHrefForPage("Open Tickets")}>Open Tickets</a>
            <a href={navHrefForPage("Related Tickets")}>Related Tickets</a>
            <a href={navHrefForPage("Technical Procedures")}>Technical Procedures</a>
          </div>
          <div className="cc-footer-group">
            <b>Legal &amp; Trust</b>
            <a href={navHrefForPage("Compliance Assessments")}>Compliance</a>
            <a href={navHrefForPage("Compliance Findings")}>Compliance Findings</a>
            <a href={navHrefForPage("Control Evidence")}>Control Evidence</a>
            <a href={navHrefForPage("Incident Reports")}>Incident Reports</a>
          </div>
          <div className="cc-footer-legal">
            Secured, Trusted &amp; Compliant · IntelliStack Systems™ | Maximus Optimus Command
            Center™ | Copyright © 2026 IntelliStack Systems. All rights reserved.
          </div>
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
                  {selectedWorkItem.status
                    ? ` · ${selectedWorkItem.status.replaceAll("_", " ")}`
                    : ""}
                  {selectedWorkItem.source
                    ? ` · ${selectedWorkItem.source.replaceAll("_", " ")}`
                    : ""}
                </DialogDescription>
              </DialogHeader>
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {selectedWorkItem.detail}
              </p>
              {selectedWorkItem.createdAt && (
                <p className="text-xs text-muted-foreground">
                  Last recorded: {new Date(selectedWorkItem.createdAt).toLocaleString()}
                </p>
              )}
              {selectedWorkItem.createdAt && (
                <p className="text-xs text-muted-foreground">
                  Last recorded: {new Date(selectedWorkItem.createdAt).toLocaleString()}
                </p>
              )}
              {selectedWorkItem.approvalId && selectedWorkItem.canDecide && (
                <div className="mt-4 grid gap-3">
                  <label className="grid gap-1 text-sm font-medium">
                    Decision reason (required)
                    <textarea
                      className="min-h-24 rounded-lg border bg-background p-3 text-sm"
                      value={approvalDecisionReason}
                      onChange={(event) => setApprovalDecisionReason(event.target.value)}
                      placeholder="Record the reason for your decision."
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                      disabled={approvalDecisionReason.trim().length < 4}
                      onClick={() => void decideSelectedApproval("approved")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                      disabled={approvalDecisionReason.trim().length < 4}
                      onClick={() => void decideSelectedApproval("denied")}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
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
                  {summaryItems[summaryCategory].length} matching records. Select a record to view
                  its details.
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
