import type { CommandState, Connector } from "@/lib/domain/types";

/**
 * IntelliSync is the shared backbone described in the platform standard: one registry of engines,
 * one adapter model for external systems, one event trail. Everything in this file is derived from
 * real state — a service is only reported operational when the records and configuration exist.
 */

export type ServiceState = "operational" | "attention" | "not_configured" | "empty";

export interface EngineService {
  id: string;
  name: string;
  description: string;
  state: ServiceState;
  evidence: string;
  /** Where the records actually live in this build. */
  source: "command-state" | "provider-adapter" | "both";
}

export interface Engine {
  id: string;
  name: string;
  purpose: string;
  icon: "identity" | "assets" | "workflow" | "communications" | "events" | "governance";
  services: EngineService[];
}

export interface AdapterRequirement {
  id: string;
  provider: string;
  capability: string;
  requiredConfiguration: string;
  /** Connector id in the workspace that carries this adapter, when one exists. */
  connectorId: string | null;
}

export interface AdapterStatus extends AdapterRequirement {
  state: ServiceState;
  detail: string;
}

function connectorOf(state: CommandState, connectorId: string | null): Connector | null {
  if (!connectorId) return null;
  return state.connectors.find((connector) => connector.id === connectorId) ?? null;
}

function statusOfConnector(connector: Connector | null): ServiceState {
  if (!connector) return "not_configured";
  if (!connector.configured) return "not_configured";
  if (connector.status === "attention" || connector.status === "disconnected") return "attention";
  return "operational";
}

export const ADAPTER_REQUIREMENTS: AdapterRequirement[] = [
  {
    id: "directory.entra",
    provider: "Microsoft Entra ID",
    capability: "Directory identity read/write, group membership, account state",
    requiredConfiguration: "Entra app registration with Graph delegated scopes and tenant ID",
    connectorId: "ms365",
  },
  {
    id: "directory.ad",
    provider: "Active Directory (on-premises)",
    capability: "Organizational units, group membership, account enable/disable",
    requiredConfiguration: "LDAP or AD Connect endpoint with a least-privilege service account",
    connectorId: null,
  },
  {
    id: "mail.smtp",
    provider: "Email delivery",
    capability: "Send invitations and notifications, record delivery results",
    requiredConfiguration: "SMTP or Graph sendMail credentials with a verified sender",
    connectorId: "outlook",
  },
  {
    id: "calendar.graph",
    provider: "Calendar provider",
    capability: "Create events, invite attendees, track responses",
    requiredConfiguration: "Calendar write scope and a connected mailbox",
    connectorId: "outlook",
  },
  {
    id: "device.mdm",
    provider: "Endpoint management",
    capability: "Device enrolment, compliance state, remote actions",
    requiredConfiguration: "MDM tenant with device write permissions",
    connectorId: null,
  },
  {
    id: "monitor.network",
    provider: "Network monitoring",
    capability: "Interface state, tunnel state, alert acknowledgement",
    requiredConfiguration: "Monitoring API token and read scope",
    connectorId: null,
  },
  {
    id: "storage.library",
    provider: "Workspace Library",
    capability: "Store and read original documents with permissions preserved",
    requiredConfiguration: "Local library root (already available in this build)",
    connectorId: "local",
  },
  {
    id: "docs.intellidesk",
    provider: "IntelliDesk records",
    capability: "Tickets, missions, checkpoints, approvals, audit trail",
    requiredConfiguration: "Shared application data layer (Supabase Postgres in production)",
    connectorId: null,
  },
];

export function adapterStatuses(state: CommandState): AdapterStatus[] {
  return ADAPTER_REQUIREMENTS.map((requirement) => {
    if (requirement.id === "docs.intellidesk") {
      return {
        ...requirement,
        state: "operational",
        detail: `${state.missions.length} missions, ${state.approvals.length} approvals and ${state.activity.length} activity records are served by the shared command state.`,
      };
    }
    const connector = connectorOf(state, requirement.connectorId);
    const serviceState = statusOfConnector(connector);
    if (!connector) {
      return {
        ...requirement,
        state: serviceState,
        detail: `No connector carries this adapter yet. ${requirement.requiredConfiguration}.`,
      };
    }
    if (!connector.configured) {
      return {
        ...requirement,
        state: "not_configured",
        detail: `${connector.name}: ${connector.requirement ?? requirement.requiredConfiguration}`,
      };
    }
    return {
      ...requirement,
      state: serviceState,
      detail:
        connector.status === "attention"
          ? `${connector.name}: ${connector.healthMessage || "reported an error on the last operation."}`
          : `${connector.name}: connected, last sync ${connector.lastSyncAt ?? "not yet recorded"}.`,
    };
  });
}

function countBy<T>(rows: T[], predicate: (row: T) => boolean): number {
  return rows.filter(predicate).length;
}

export function buildEngineRegistry(state: CommandState): Engine[] {
  const adapters = adapterStatuses(state);
  const adapterState = (id: string) =>
    adapters.find((adapter) => adapter.id === id)?.state ?? "not_configured";
  const people = state.users.length;
  const assignments = state.missions.reduce(
    (sum, mission) =>
      sum + mission.checkpoints.filter((checkpoint) => Boolean(checkpoint.assigneeId)).length,
    0,
  );
  const handedOff = state.missions.reduce(
    (sum, mission) =>
      sum +
      mission.checkpoints.filter((checkpoint) => checkpoint.state === "waiting_on_person").length,
    0,
  );

  return [
    {
      id: "identity",
      name: "Identity and People",
      purpose: "People, roles, directory identities and provisioning.",
      icon: "identity",
      services: [
        {
          id: "people.records",
          name: "People records",
          description:
            "One person record per employee, contractor and requester, addressed by a stable id.",
          state: people > 0 ? "operational" : "empty",
          evidence: `${people} people · ${new Set(state.users.map((user) => user.department)).size} departments · ${new Set(state.users.map((user) => user.tenantId)).size} tenant`,
          source: "command-state",
        },
        {
          id: "identity.directory",
          name: "Directory provisioning",
          description: "Create, disable and group accounts through the directory provider.",
          state: adapterState("directory.entra"),
          evidence:
            adapterState("directory.entra") === "operational"
              ? "Directory adapter connected"
              : "Requires an Entra app registration; directory writes are not simulated",
          source: "provider-adapter",
        },
        {
          id: "identity.assignments",
          name: "Task ownership",
          description:
            "Every checklist item can be owned by a different person without moving the mission.",
          state: assignments > 0 ? "operational" : "empty",
          evidence: `${assignments} assigned tasks · ${handedOff} waiting on another person`,
          source: "command-state",
        },
      ],
    },
    {
      id: "assets",
      name: "Assets and Devices",
      purpose: "Devices, ownership, assignments and lifecycle.",
      icon: "assets",
      services: [
        {
          id: "assets.devices",
          name: "Device records",
          description: "Serial, model, owner and assignment history for every device.",
          state: "not_configured",
          evidence:
            "No asset store in this build — device details are recorded inside mission steps and their evidence",
          source: "command-state",
        },
        {
          id: "assets.mdm",
          name: "Endpoint management",
          description: "Enrolment state, compliance and remote actions through the MDM provider.",
          state: adapterState("device.mdm"),
          evidence: "Requires an MDM tenant with device write permissions",
          source: "provider-adapter",
        },
      ],
    },
    {
      id: "workflow",
      name: "Workflow and Mission",
      purpose: "Tickets, missions, checkpoints, approvals and handoffs.",
      icon: "workflow",
      services: [
        {
          id: "workflow.missions",
          name: "Mission engine",
          description:
            "Admission, acceptance, checkpoints, escalation, resolution and completion as separate recorded events.",
          state: state.missions.length > 0 ? "operational" : "empty",
          evidence: `${state.missions.length} missions · ${state.missions.reduce((sum, mission) => sum + mission.checkpoints.length, 0)} recorded tasks`,
          source: "command-state",
        },
        {
          id: "workflow.approvals",
          name: "Authorization decisions",
          description:
            "Approvals are separate records with a named approver and their own history.",
          state: state.approvals.length > 0 ? "operational" : "empty",
          evidence: `${countBy(state.approvals, (approval) => approval.status === "pending")} pending · ${countBy(state.approvals, (approval) => approval.status === "approved")} approved`,
          source: "command-state",
        },
        {
          id: "workflow.handoffs",
          name: "Handoffs and escalation",
          description:
            "Task-level assignment and mission-level transfer, both recorded in the trail.",
          state: handedOff > 0 ? "attention" : "operational",
          evidence:
            handedOff > 0
              ? `${handedOff} tasks are waiting on another person`
              : "No tasks are waiting on another person",
          source: "command-state",
        },
      ],
    },
    {
      id: "communications",
      name: "Communications",
      purpose: "Email, calendar, invitations and delivery tracking.",
      icon: "communications",
      services: [
        {
          id: "comms.email",
          name: "Email delivery",
          description: "Send notifications and invitations, then record the provider response.",
          state: adapterState("mail.smtp"),
          evidence:
            "Requires verified sender credentials; nothing is reported as delivered until the provider says so",
          source: "provider-adapter",
        },
        {
          id: "comms.calendar",
          name: "Calendar and invitations",
          description: "Create events, resolve participants and track responses.",
          state: adapterState("calendar.graph"),
          evidence: "Requires a connected calendar with write scope",
          source: "provider-adapter",
        },
      ],
    },
    {
      id: "events",
      name: "Events and Synchronization",
      purpose: "Structured events, retries, duplicates and failure queues.",
      icon: "events",
      services: [
        {
          id: "events.stream",
          name: "Event stream",
          description:
            "Every connector, document and mission operation appends a structured event.",
          state: state.syncEvents.length > 0 ? "operational" : "empty",
          evidence: `${state.syncEvents.length} events · ${countBy(state.syncEvents, (event) => event.type === "sync.retried")} retries · ${countBy(state.syncEvents, (event) => event.type === "event.duplicate_suppressed")} duplicates suppressed`,
          source: "command-state",
        },
        {
          id: "events.health",
          name: "Integration health",
          description: "Per-connector status, last successful sync and outstanding requirement.",
          state:
            countBy(state.connectors, (connector) => connector.status === "attention") > 0
              ? "attention"
              : "operational",
          evidence: `${countBy(state.connectors, (connector) => connector.status === "connected")} connected · ${countBy(state.connectors, (connector) => !connector.configured)} unconfigured`,
          source: "command-state",
        },
      ],
    },
    {
      id: "governance",
      name: "Security, Governance and Audit",
      purpose: "Permissions, tenant isolation, approvals and the audit record.",
      icon: "governance",
      services: [
        {
          id: "governance.activity",
          name: "Activity and audit trail",
          description: "Who did what, to which record, when, and with which evidence.",
          state: state.activity.length > 0 ? "operational" : "empty",
          evidence: `${state.activity.length} activity records · ${state.missions.reduce((sum, mission) => sum + mission.trail.length, 0)} ticket trail events`,
          source: "command-state",
        },
        {
          id: "governance.recognition",
          name: "Recognition ledger",
          description: "Stars, XP, levels and badges written only by recorded work.",
          state: state.ledger.length > 0 ? "operational" : "empty",
          evidence: `${state.ledger.length} ledger entries · ${state.ledger.reduce((sum, entry) => sum + entry.stars, 0)} stars awarded`,
          source: "command-state",
        },
        {
          id: "governance.rowlevel",
          name: "Tenant isolation and row-level security",
          description: "Database-level isolation and least-privilege policies.",
          state: "not_configured",
          evidence: "Defined in supabase/schema.sql; not enforced until the database is connected",
          source: "provider-adapter",
        },
      ],
    },
  ];
}

export function engineSummary(engines: Engine[]): Record<ServiceState, number> {
  const summary: Record<ServiceState, number> = {
    operational: 0,
    attention: 0,
    not_configured: 0,
    empty: 0,
  };
  for (const engine of engines) {
    for (const service of engine.services) summary[service.state] += 1;
  }
  return summary;
}
