import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import {
  Menu,
  X,
  Bell,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Home,
  Search,
  Globe2,
  Newspaper,
  TrendingUp,
  Megaphone,
  BriefcaseBusiness,
  BrainCircuit,
  Plug,
  CirclePlus,
  UserRound,
  Camera,
  Image as ImageIcon,
  Settings,
  LogOut,
  ArrowUpRight,
  Send,
} from "lucide-react";
import portraitAsset from "@/assets/frank-mazerati.jpg.asset.json";
import shieldAsset from "@/assets/intellistack-shield.jpg.asset.json";
import commandBg from "@/assets/command-center-bg.jpg";
import buddy from "@/assets/help-buddy-character.png";
import { menu } from "@/lib/menu";
import { dashboardPages, resolveMenuItem } from "@/lib/dashboard-pages";
import {
  clockCatalog,
  newsCatalog,
  tickerCatalog,
  quickPickCatalog,
  dayPart,
  greetingMessages,
} from "@/lib/home-config";
import { useAction, useCommandState, useDraft } from "@/lib/domain/store";
import {
  activeUser,
  connectorSummary,
  workQueue,
  workSummary,
  type WorkItem,
} from "@/lib/domain/selectors";
import { CommandMenu } from "./CommandMenu";
import { Chip } from "@/components/command/ui";
import { WorkQueue } from "@/components/command/home/WorkQueue";
import { WorkSurface } from "@/components/command/home/WorkSurface";

const timeLabel = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(date);

const profileDetails = [
  ["USER ID", "001"],
  ["COMPANY ID", "001"],
  ["EMAIL", "Work email"],
  ["PHONE", "Work phone"],
  ["WORKPLACE", "Downtown Chicago"],
  ["LOCATION", "Global Center"],
];

const footerGroups = [
  { title: "COMPANY", links: ["Home", "About Us", "Contact Us", "Partner With Us", "Careers"] },
  {
    title: "CONNECT",
    links: ["Customer Support", "Business Inquiries", "Partnerships", "Integrations", "Community"],
  },
  {
    title: "PLATFORM",
    links: ["Maximus Optimus", "Global Command Center", "IntelliDesk", "Help Buddy", "Marketplace"],
  },
  {
    title: "PRIVACY & LEGAL",
    links: [
      "Privacy Policy",
      "Cookie Policy",
      "How We Handle Your Data",
      "Terms of Service",
      "Accessibility",
    ],
  },
  {
    title: "RESOURCES",
    links: ["User Guide", "Knowledge Base", "Announcements", "FAQs", "Support Resources"],
  },
];

const newsTopics = newsCatalog.slice(0, 5);
const watchlist = tickerCatalog.slice(0, 5);

export function CommandCenterHome() {
  const [now, setNow] = useState(() => new Date());
  const [drawer, setDrawer] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const commandState = useCommandState();
  const act = useAction();
  const user = activeUser(commandState);
  const queue = workQueue(commandState, commandState.activeUserId);
  const summary = workSummary(commandState, commandState.activeUserId);
  const connectionHealth = connectorSummary(commandState);
  const search = useSearch({ strict: false }) as { connector?: string; doc?: string };
  const [openItem, setOpenItem] = useState<WorkItem | null>(null);
  const [connectorPanel, setConnectorPanel] = useState<{ id: string; docId: string | null } | null>(
    null,
  );
  const [photo, setPhoto] = useState(portraitAsset.url);
  const [background, setBackground] = useState(commandBg);
  const [availability, setAvailability] = useState("Available");
  const [managerOpen, setManagerOpen] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [helpMessage, setHelpMessage] = useDraft("home.help.composer", "");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (openItem || connectorPanel) {
        setOpenItem(null);
        setConnectorPanel(null);
        return;
      }
      setDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openItem, connectorPanel]);

  useEffect(() => {
    if (search.connector) setConnectorPanel({ id: search.connector, docId: search.doc ?? null });
  }, [search.connector, search.doc]);

  const conversation = commandState.conversations.find(
    (entry) => entry.id === commandState.activeConversationId,
  );
  const latestReply = [...(conversation?.messages ?? [])]
    .reverse()
    .find((message) => message.role === "assistant");
  const character =
    commandState.characters.find((entry) => entry.id === commandState.activeCharacterId) ??
    commandState.characters[0];
  const featuredConnectors = [...commandState.connectors]
    .filter((connector) =>
      ["microsoft365", "onedrive", "sharepoint", "teams", "outlook", "local"].includes(
        connector.id,
      ),
    )
    .slice(0, 6);

  const hour =
    Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        hour12: false,
      }).format(now),
    ) % 24;
  const greeting = greetingMessages[dayPart(hour)];
  const visibleMenu = useMemo(
    () =>
      menu.filter((item) => JSON.stringify(item).toLowerCase().includes(menuQuery.toLowerCase())),
    [menuQuery],
  );

  const chooseImage =
    (setter: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) setter(URL.createObjectURL(file));
    };

  return (
    <div
      className="command-home"
      style={{
        backgroundImage: `linear-gradient(115deg,rgba(245,250,255,.91),rgba(239,246,255,.83)),url(${background})`,
      }}
    >
      <header className="command-header">
        <div className="command-brand">
          <button
            className="command-icon-button"
            onClick={() => setDrawer((value) => !value)}
            aria-label={drawer ? "Close navigation" : "Open navigation"}
            aria-expanded={drawer}
          >
            {drawer ? <X /> : <Menu />}
          </button>
          <div className="command-shield">
            <img src={shieldAsset.url} alt="IntelliStack Systems shield" />
            <span>SECURE</span>
            <span>TRUSTED</span>
            <span>COMPLIANT</span>
          </div>
        </div>

        <div className="command-title">
          <div className="command-presented">
            INTELLISTACK SYSTEMS PRESENTS <span>•••</span>
          </div>
          <div className="command-product">MAXIMUS OPTIMUS</div>
          <div className="command-subtitle">GLOBAL COMMAND CENTER</div>
        </div>

        <div className="command-header-actions">
          <button className="command-icon-button" aria-label="Notifications">
            <Bell />
          </button>
          <button className="command-icon-button" aria-label="Email">
            <Mail />
          </button>
          <button className="command-icon-button" aria-label="Messages">
            <MessageSquare />
          </button>
          <div className="command-profile-menu">
            <button
              className="command-icon-button"
              onClick={() => setProfileMenu((value) => !value)}
              aria-label="Profile options"
              aria-expanded={profileMenu}
            >
              <UserRound />
            </button>
            {profileMenu && (
              <div className="command-popover">
                <label>
                  <Camera size={14} /> Change profile photo
                  <input type="file" accept="image/*" onChange={chooseImage(setPhoto)} />
                </label>
                <label>
                  <ImageIcon size={14} /> Change background photo
                  <input type="file" accept="image/*" onChange={chooseImage(setBackground)} />
                </label>
                <button onClick={() => setProfileMenu(false)}>
                  <Settings size={14} /> Profile settings
                </button>
                <button onClick={() => setProfileMenu(false)}>
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="command-welcome">
        <div className="command-welcome-main">
          <img className="command-avatar" src={photo} alt="Frank Mazerati profile" />
          <div className="command-welcome-copy">
            <div className="command-welcome-eyebrow">WELCOME TO YOUR COMMAND CENTER</div>
            <h1>{greeting.title}, Frank Mazerati!</h1>
            <p>
              Today is another opportunity to learn, grow and accomplish more. You've got a lot of
              work ahead of you, but you've got this.
            </p>
            <strong>
              Chief Principal Architect <i /> Founder
            </strong>
          </div>
        </div>
        <div className="command-profile-details">
          {profileDetails.map(([label, value], index) => (
            <div className="command-detail" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              {index !== profileDetails.length - 1 && <i aria-hidden="true" />}
            </div>
          ))}
        </div>
        <div className="command-profile-controls">
          <label className="command-select">
            ● {availability}
            <ChevronDown size={12} />
            <select
              aria-label="Availability"
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
            >
              {["Available", "Busy", "In a Meeting", "Away", "On Break"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <div className="command-manager-wrap">
            <button className="command-select" onClick={() => setManagerOpen((value) => !value)}>
              Manager <ChevronDown size={12} />
            </button>
            {managerOpen && (
              <div className="command-popover command-manager-popover">
                <strong>Manager directory</strong>
                <span>Manager details are provided by your organization.</span>
              </div>
            )}
          </div>
          <div className="command-local-meta" aria-label="Local date and time">
            <strong>{timeLabel(now, "America/Chicago")}</strong>
            <span>
              {new Intl.DateTimeFormat("en-US", {
                timeZone: "America/Chicago",
                weekday: "long",
                month: "short",
                day: "numeric",
              }).format(now)}
            </span>
          </div>
        </div>
      </section>

      <section className="command-info-strip" aria-label="Global information">
        <div className="command-clock-row">
          <div className="command-strip-label">
            <Globe2 size={13} /> GLOBAL CLOCKS
          </div>
          {clockCatalog.slice(0, 5).map((clock) => (
            <div className="command-clock" key={clock.id}>
              <span>{clock.label}</span>
              <strong>{timeLabel(now, clock.tz)}</strong>
            </div>
          ))}
          <span className="command-more">WORLD CLOCK +</span>
        </div>
        <div className="command-feed-row">
          <div className="command-feed-block command-news">
            <span className="command-strip-label">
              <Newspaper size={13} /> NEWS
            </span>
            {newsTopics.map((item) => (
              <span className="command-feed-item" key={item.id}>
                {item.label}
              </span>
            ))}
            <small>PREVIEW FEED</small>
          </div>
          <div className="command-feed-block command-market">
            <span className="command-strip-label">
              <TrendingUp size={13} /> STOCK WATCHER
            </span>
            {watchlist.map((item) => (
              <span className="command-market-item" key={item.id}>
                {item.label}
              </span>
            ))}
            <small>WATCHLIST PREVIEW</small>
          </div>
          <div className="command-announcement">
            <Megaphone size={13} /> ANNOUNCEMENTS{" "}
            <span>
              View updates <ArrowUpRight size={11} />
            </span>
          </div>
        </div>
        <div className="command-utility-row">
          <div className="command-search">
            <Search size={14} />
            <input
              aria-label="Global search"
              placeholder="Search people, work, systems and knowledge..."
            />
          </div>
          <div className="command-quick-picks">
            <strong>MY QUICK PICKS</strong>
            {quickPickCatalog.slice(0, 5).map((item) => (
              <Link key={item.id} to="/section/$slug" params={{ slug: item.slug }}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className={`command-workspace ${drawer ? "has-navigation" : ""}`}>
        {drawer && <CommandMenu onClose={() => setDrawer(false)} />}

        <section className="command-work-column" aria-label="Bring the Work to You">
          <div className="command-column-heading">
            <div>
              <BriefcaseBusiness size={16} />
              <h2>Bring the Work to You</h2>
            </div>
            <span>{queue.length} recorded items</span>
          </div>
          <div className="mx-workwrap mx-scope">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                flex: 1,
                visibility: openItem || connectorPanel ? "hidden" : "visible",
              }}
              aria-hidden={openItem !== null || connectorPanel !== null}
            >
              <div className="command-work-summary">
                <span>YOUR WORKSPACE · LIVE RECORDS</span>
                <strong>
                  {summary.newCount} new · {summary.approvals} decisions · {summary.tasks} tasks ·{" "}
                  {summary.documents} documents
                </strong>
              </div>
              <WorkQueue
                activeId={openItem?.id ?? null}
                onOpen={(item) => {
                  setConnectorPanel(null);
                  setOpenItem(item);
                }}
              />
            </div>
            {openItem || connectorPanel ? (
              <WorkSurface
                target={openItem}
                connector={connectorPanel}
                onClose={() => {
                  setOpenItem(null);
                  setConnectorPanel(null);
                }}
              />
            ) : null}
          </div>
        </section>

        <aside className="command-assistant-column" aria-label="Help Buddy and connectors">
          <section className="command-help-card">
            <div className="command-column-heading">
              <div>
                <img src={buddy} alt="" />
                <h2>Help Buddy</h2>
              </div>
              <Link to="/help-buddy">
                Open <ArrowUpRight size={10} />
              </Link>
            </div>
            <div className="command-buddy-strip">
              <img src={buddy} alt="Help Buddy, your intelligent assistant" />
              <div>
                <strong>{character?.name ?? "Help Buddy"}</strong>
                <span>
                  {summary.newCount + summary.approvals > 0
                    ? `${summary.newCount + summary.approvals} things are waiting on you`
                    : "Nothing is waiting on you"}
                </span>
                <em>Ask. Find. Connect. Get it done.</em>
              </div>
            </div>
            <div className="command-help-intro">
              {character?.name ?? "Help Buddy"} · {user.title}. Answers are grounded in records you
              can access.
            </div>
            <div className="command-help-scroll mx-scope">
              <div className="mx-queue-group" style={{ padding: "0 2px 6px" }}>
                <div className="mx-queue-grouphead">
                  <span>Where to start</span>
                  <span>{summary.newCount + summary.approvals}</span>
                </div>
                {queue.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    className="mx-queue-item"
                    onClick={() => {
                      setConnectorPanel(null);
                      setOpenItem(item);
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span className="mx-queue-title">{item.title}</span>
                      <span className="mx-queue-meta">
                        {item.statusLabel}
                        <span style={{ opacity: 0.5 }}>·</span>
                        {item.requiredAction}
                      </span>
                    </span>
                    <ChevronRight size={11} style={{ color: "#5d8fbe" }} />
                  </button>
                ))}
              </div>
            </div>
            <form
              className="command-help-input"
              onSubmit={(event) => {
                event.preventDefault();
                if (!helpMessage.trim()) return;
                act(
                  {
                    type: "conversation.send",
                    text: helpMessage.trim(),
                    missionId: openItem?.missionId ?? null,
                  },
                  { silent: true },
                );
                setHelpMessage("");
              }}
            >
              <input
                value={helpMessage}
                onChange={(event) => setHelpMessage(event.target.value)}
                placeholder="Ask Help Buddy..."
                aria-label="Ask Help Buddy"
              />
              <button type="submit" aria-label="Send message" disabled={!helpMessage.trim()}>
                <Send size={14} />
              </button>
            </form>
            {latestReply ? (
              <div
                className="command-help-notice"
                role="status"
                style={{ display: "grid", gap: 3 }}
              >
                <span style={{ color: "#3c6a94", fontSize: 9, lineHeight: 1.45 }}>
                  {latestReply.text.slice(0, 190)}
                  {latestReply.text.length > 190 ? "…" : ""}
                </span>
                <span style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                  <Chip tone={latestReply.grounded ? "success" : "warning"}>
                    {latestReply.grounded ? "Grounded" : "No source"}
                  </Chip>
                  <Link to="/help-buddy" style={{ color: "#2a6eb0", fontSize: 8, fontWeight: 700 }}>
                    Continue in Help Buddy
                  </Link>
                </span>
              </div>
            ) : null}
            <div className="command-workflow-label">
              <BrainCircuit size={13} />{" "}
              {latestReply ? "WORKFLOW COMPANION · LIVE" : "WORKFLOW COMPANION"}
            </div>
          </section>

          <section className="command-connectors-card">
            <div className="command-column-heading">
              <div>
                <Plug size={15} />
                <h2>Connectors</h2>
              </div>
              <Link to="/connectors">
                Manage <ArrowUpRight size={11} />
              </Link>
            </div>
            <div className="command-connectors-grid">
              {featuredConnectors.map((connector) => {
                const tone =
                  connector.status === "connected"
                    ? "#1b8355"
                    : connector.status === "attention"
                      ? "#ae3d34"
                      : connector.status === "syncing"
                        ? "#2a6eb0"
                        : "#90a4b8";
                return (
                  <button
                    key={connector.id}
                    type="button"
                    onClick={() => {
                      setOpenItem(null);
                      setConnectorPanel({ id: connector.id, docId: null });
                    }}
                    title={connector.healthMessage}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 4,
                      minWidth: 0,
                      padding: "6px 7px",
                      border: "1px solid rgba(96,149,198,.2)",
                      borderRadius: 7,
                      color: "#4a7198",
                      background: "rgba(239,247,255,.65)",
                      fontSize: 8,
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {connector.name}
                    </span>
                    <span className="mx-dot" style={{ color: tone, flex: "none" }} />
                  </button>
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
                paddingTop: 6,
                color: "#6c8399",
                fontSize: 8,
              }}
            >
              <span>
                {connectionHealth.connected} connected · {connectionHealth.attention} need attention
              </span>
              <Link to="/connectors" style={{ color: "#2a6eb0", fontWeight: 700 }}>
                Catalog
              </Link>
            </div>
          </section>
        </aside>
      </div>

      <footer className="command-footer">
        <div className="command-footer-columns">
          {footerGroups.map((group) => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              {group.links.map((label) =>
                label === "Home" ? (
                  <Link key={label} to="/">
                    {label}
                  </Link>
                ) : (
                  <Link
                    key={label}
                    to="/section/$slug"
                    params={{
                      slug:
                        label === "IntelliDesk"
                          ? "intellidesk"
                          : label === "Marketplace"
                            ? "intellimarketplace"
                            : "administration-settings-support",
                    }}
                  >
                    {label}
                  </Link>
                ),
              )}
            </section>
          ))}
        </div>
        <div className="command-footer-legal">
          <strong>IntelliStack Systems™</strong>
          <strong>Maximus Optimus Global Command Center™</strong>
          <span>© 2026 IntelliStack Systems. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
