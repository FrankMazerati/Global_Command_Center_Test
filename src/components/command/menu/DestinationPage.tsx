import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  Building2,
  Cable,
  Database,
  ExternalLink,
  Lock,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import {
  Chip,
  Empty,
  Note,
  Panel,
  WorkspaceShell,
  formatRelative,
  type Tone,
} from "@/components/command/ui";
import { useCommandState } from "@/lib/domain/store";
import {
  findDestination,
  menuSections,
  REAL_ROUTES,
  type Destination,
  type MenuSection,
} from "@/lib/menu-spec";

const SHARED_SERVICES = [
  "Identity & Access Management",
  "User & Company Records",
  "File Storage & Permissions",
  "Search",
  "Notifications",
  "Calendar & Events",
  "Activity History",
  "Workflow & Approvals",
  "Synchronization",
  "Security",
  "Governance",
  "Audit",
];

const OWNERSHIP: Record<string, string> = {
  "business-center":
    "Financial records, subscriptions, licensing and corporate documents for every tenant business.",
  "command-center":
    "Operational missions, tickets, service requests, checkpoints, approvals and the ticket trail.",
  "new-active-directory":
    "Authoritative users, groups, devices, organizational units, policy and directory synchronization.",
  productivity: "Document, spreadsheet, slide, note and task editing, each in its own application.",
  communication: "Messages, channels, email, meetings, calls and invitations.",
  collaboration:
    "File storage and permissions, shared workspaces, shared calendars and team activity.",
  "knowledge-base": "Company, department, tenant and personal knowledge, procedures and playbooks.",
  "ai-systems": "Assistant behaviour, prompts, permissions and the activity of every model.",
  "network-operations":
    "Network devices, infrastructure, connectivity, performance and maintenance.",
  security: "Monitoring, threat detection, vulnerabilities, endpoint policy and incident response.",
  governance: "Policies, standards, frameworks, controls, risk and compliance evidence.",
  audit: "Every recorded action, administrative change, approval decision and data access.",
  settings: "Personal profile, preferences, sessions and connected accounts.",
  "external-connectors":
    "Authorized third-party integrations: their permissions, data direction and sync history.",
};

export function DestinationPage({ slug }: { slug: string }) {
  const state = useCommandState();
  const destination = findDestination(slug);
  const role = state.users.find((user) => user.id === state.activeUserId)?.role;

  if (!destination) {
    return (
      <WorkspaceShell
        eyebrow="COMMAND CENTER"
        title="Destination not found"
        subtitle="This address is not part of the master menu."
      >
        <Note tone="warning">
          Return to the Command Center and choose a destination from the menu.
        </Note>
      </WorkspaceShell>
    );
  }

  const section = menuSections.find((item) => item.id === destination.sectionId);
  const group = section?.groups.find((item) => item.id === destination.groupId);
  const siblings = (group?.destinations ?? [])
    .filter((item) => item.slug !== destination.slug)
    .slice(0, 8);
  const realRoute = REAL_ROUTES[destination.slug];
  const keywords = [destination.owner, destination.groupName, destination.label]
    .flatMap((value) => value.toLowerCase().split(/\s+/))
    .filter((word) => word.length > 3);
  const areaActivity = state.activity
    .filter((entry) => {
      const text =
        `${entry.surface} ${entry.summary} ${entry.detail} ${entry.targetLabel ?? ""}`.toLowerCase();
      return keywords.some((word) => text.includes(word));
    })
    .slice(0, 6);
  const external = destination.external;

  return (
    <WorkspaceShell
      eyebrow={`${destination.sectionTitle.toUpperCase()} · ${destination.groupName.toUpperCase()}`}
      title={destination.label}
      subtitle={destination.summary}
      actions={
        <>
          <Chip tone={external ? "warning" : "info"} icon={external ? ExternalLink : Building2}>
            {external ? "Third-party application" : destination.owner}
          </Chip>
          <Chip tone="neutral" icon={Boxes}>
            {destination.groupName}
          </Chip>
          {role ? <Chip tone="accent" icon={ShieldCheck}>{`${role} permissions`}</Chip> : null}
        </>
      }
    >
      <div className="mx-body mx-body--split" style={{ minHeight: 0 }}>
        <div className="mx-col mx-scroll">
          <Panel title="What this destination owns" icon={Workflow} note={destination.owner}>
            <p className="mx-tiny" style={{ margin: 0, lineHeight: 1.6 }}>
              {OWNERSHIP[destination.sectionId] ?? destination.summary}
            </p>
            <div className="mx-destination-facts">
              <Fact label="Section" value={destination.sectionTitle} />
              <Fact label="Group" value={destination.groupName} />
              <Fact label="Authority" value={destination.owner} />
              <Fact
                label="Records"
                value={external ? "Requires authorization" : "Shared platform records"}
              />
            </div>
            {realRoute ? (
              <Link
                to={realRoute}
                className="mx-btn mx-btn--sm mx-btn--primary"
                style={{ alignSelf: "flex-start" }}
              >
                Open the live workspace <ArrowRight aria-hidden />
              </Link>
            ) : (
              <Note tone="info">
                This destination is part of the platform shell. It reads and writes the shared
                identity, record, storage, workflow and audit services — it never keeps a private
                copy of another application&apos;s data.
              </Note>
            )}
          </Panel>

          <Panel title="Shared records this destination reads" icon={Database} note="live counts">
            <div className="mx-destination-facts">
              <Fact label="People" value={`${state.users.length} records`} />
              <Fact label="Missions" value={`${state.missions.length} missions`} />
              <Fact label="Approvals" value={`${state.approvals.length} decisions`} />
              <Fact label="Documents" value={`${state.documentActions.length} actions`} />
              <Fact label="Connectors" value={`${state.connectors.length} providers`} />
              <Fact
                label="Events"
                value={`${state.syncEvents.length + state.activity.length} recorded`}
              />
            </div>
          </Panel>

          {siblings.length > 0 ? (
            <Panel
              title={`More in ${destination.groupName}`}
              icon={Boxes}
              note={`${siblings.length} destinations`}
            >
              <div className="mx-destination-links">
                {siblings.map((item) => (
                  <Link
                    key={item.slug}
                    to="/section/$slug"
                    params={{ slug: item.slug }}
                    className="mx-destination-link"
                  >
                    <span>{item.label}</span>
                    <ArrowRight aria-hidden />
                  </Link>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>

        <aside className="mx-col mx-scroll">
          <Panel title="Shared platform services" icon={Database} note="one backbone">
            <div className="mx-service-chips">
              {SHARED_SERVICES.map((service) => (
                <span className="mx-service-chip" key={service}>
                  <i aria-hidden />
                  {service}
                </span>
              ))}
            </div>
          </Panel>

          <Panel
            title="Recorded activity in this area"
            icon={Workflow}
            note={`${areaActivity.length} events`}
          >
            {areaActivity.length === 0 ? (
              <Empty
                title="No activity recorded here yet"
                description="Actions taken in this destination are written to the shared activity trail and Audit."
              />
            ) : (
              <div className="mx-timeline">
                {areaActivity.map((entry) => (
                  <div className="mx-timeline-item" key={entry.id}>
                    <strong>{entry.summary}</strong>
                    <span className="mx-tiny mx-muted">
                      {entry.detail} · {formatRelative(entry.at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Access and boundaries" icon={Lock}>
            <ul className="mx-destination-rules">
              <li>
                Navigation and actions respect the signed-in role, company boundary and
                subscription.
              </li>
              <li>
                Identifiers are the User ID and the Company ID; there is no separate global
                identifier.
              </li>
              <li>
                {external
                  ? "External connectors stay separate from native applications and can be disconnected at any time."
                  : "Other modules may link here, but this application remains the authoritative owner of its data."}
              </li>
              <li>Every write is recorded in Audit with the actor, target and evidence.</li>
            </ul>
          </Panel>

          {external ? (
            <Panel title="Connector record" icon={Cable} note="required for authorization">
              <div className="mx-destination-facts">
                <Fact label="Provider" value={destination.groupName} />
                <Fact label="Status" value="Not authorized" tone="warning" />
                <Fact label="Data direction" value="Set at authorization" />
                <Fact label="Connection owner" value="Unassigned" />
              </div>
              <Link to="/connectors" className="mx-btn mx-btn--sm">
                Review the connector catalog
              </Link>
            </Panel>
          ) : null}
        </aside>
      </div>
    </WorkspaceShell>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="mx-destination-fact">
      <span>{label}</span>
      <strong data-tone={tone ?? "neutral"}>{value}</strong>
    </div>
  );
}

export function destinationCount(section: MenuSection): number {
  return section.groups.reduce((sum, group) => sum + group.destinations.length, 0);
}

export type { Destination };
