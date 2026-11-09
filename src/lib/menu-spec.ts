/**
 * Master hamburger menu for the Maximus Optimus Global Command Center.
 *
 * Rules encoded here:
 *  - every native application has one authoritative home (see `owner`);
 *  - each destination is addressable on its own (`slug`) and renders a real page;
 *  - tenant operational work lives in IntelliDesk › Tenant Desk;
 *  - External Connectors are a separate, non-native block;
 *  - Settings is the final native destination;
 *  - navigation is filtered by role.
 */

export type Role = "technician" | "manager" | "administrator" | "employee" | "contractor";

export interface Destination {
  id: string;
  label: string;
  slug: string;
  sectionId: string;
  sectionTitle: string;
  groupId: string;
  groupName: string;
  owner: string;
  summary: string;
  external: boolean;
}

export interface MenuGroup {
  id: string;
  name: string;
  destinations: Destination[];
}

export interface MenuSection {
  id: string;
  number: number;
  title: string;
  description: string;
  groups: MenuGroup[];
  external?: boolean;
  minRole?: Role;
}

interface SectionSeed {
  id: string;
  number: number;
  title: string;
  description: string;
  owner: string;
  external?: boolean;
  minRole?: Role;
  groups: { name: string; items: string[] }[];
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const SUMMARIES: Record<string, string> = {
  "business-overview":
    "Company performance, priorities and the operating picture for IntelliStack Systems.",
  "command-center": "The operational dashboard for missions, tickets and the work in front of you.",
  "help-buddy":
    "Your intelligent assistant: conversation, records, approvals and recognition in one workspace.",
  "mission-control":
    "Admission, checkpoints, escalation and resolution for the mission you are working.",
  intellidesk: "Operational missions, tickets, service requests and delivery for every desk.",
  "new-active-directory":
    "The authoritative directory for users, groups, devices and organizational units.",
  intellidocs: "Document creation and editing, with permissions inherited from IntelliDrive.",
  intellichat: "Direct messages, team channels and conversation history.",
  intellidrive: "File storage, sharing, permissions and file activity for the whole platform.",
  intellisync: "Connection health, synchronization events and integration requirements.",
  security: "Monitoring, threat detection, vulnerabilities and incident response.",
  governance: "Policies, controls, risk and compliance evidence.",
  audit: "Every recorded action, administrative change and approval decision.",
  settings: "Your profile, preferences and connected accounts.",
};

const SEED: SectionSeed[] = [
  {
    id: "business-center",
    number: 1,
    title: "My Business Center",
    description:
      "The business headquarters for IntelliStack Systems, IntelliSphere, IntelliHire, IntelliStaff and tenant businesses.",
    owner: "My Business Center",
    minRole: "manager",
    groups: [
      {
        name: "Overview",
        items: [
          "Business Overview",
          "Company Overview",
          "Tenant Business Overview",
          "Business Performance",
        ],
      },
      {
        name: "Executive Center",
        items: [
          "CEO Workspace",
          "CFO Workspace",
          "Executive Briefings",
          "Executive Talking Points",
          "Business Plans",
          "Board Presentations",
          "Projections & Forecasts",
        ],
      },
      {
        name: "Finance & Business",
        items: [
          "Financial Records",
          "Budgets",
          "Revenue & Expenses",
          "Billing & Invoices",
          "IntelliTax",
          "IntelliPay",
        ],
      },
      {
        name: "Products & Subscriptions",
        items: [
          "Product Catalog",
          "Subscription Plans",
          "Company Seats",
          "Personal Add-ons",
          "Licensing",
          "Activations",
          "Renewals",
          "Trials",
        ],
      },
      {
        name: "IntelliSphere Marketplace",
        items: [
          "IntelliStack Products",
          "Available Modules",
          "Packages & Tiers",
          "Product Comparisons",
          "Purchases & Orders",
        ],
      },
      {
        name: "External Integration Marketplace",
        items: [
          "Browse External Applications",
          "Available Connectors",
          "Connector Permissions",
          "Integration Setup",
        ],
      },
      {
        name: "Business Documents",
        items: [
          "Corporate Records",
          "Proposals",
          "Contracts",
          "Presentations",
          "Spreadsheets",
          "Reports",
        ],
      },
    ],
  },
  {
    id: "command-center",
    number: 2,
    title: "Command Center",
    description:
      "The operational headquarters for managing missions, tickets, assignments, service delivery and daily operations.",
    owner: "IntelliDesk",
    groups: [
      {
        name: "IntelliDesk",
        items: [
          "Mission Center",
          "Mission Queue",
          "Accept Mission",
          "Reject Mission",
          "Active Missions",
          "Assigned Missions",
          "Mission History",
          "Ticket Management",
          "Service Requests",
          "Incident Management",
          "Workflows",
          "Remote Support",
          "SLA Management",
          "Checkpoints",
          "Escalations",
          "Handoffs",
          "Manager Sign-Off",
        ],
      },
      {
        name: "IntelliDesk Mission Records",
        items: [
          "Conversations",
          "Attachments",
          "Checklists",
          "Notes",
          "Tasks",
          "Approvals",
          "Signatures",
          "Activity Connectors",
          "Recognition Ledger",
          "Ticket Trail",
          "Knowledge Base References",
          "Playbooks",
          "Contacts",
          "Walkthroughs & Tutorials",
          "Add Modules",
        ],
      },
      {
        name: "Tenant Desk",
        items: [
          "Tenant Overview",
          "Tenant Work Queues",
          "Tenant Tickets",
          "Tenant Service Requests",
          "Tenant Activity",
          "Tenant Support History",
          "Tenant Escalations",
        ],
      },
    ],
  },
  {
    id: "new-active-directory",
    number: 3,
    title: "New Active Directory",
    description: "The authoritative directory and organizational management system.",
    owner: "New Active Directory",
    groups: [
      {
        name: "Users",
        items: [
          "User Directory",
          "Create User",
          "Edit User",
          "User Details",
          "User Status",
          "Onboarding",
          "Offboarding",
        ],
      },
      {
        name: "Groups",
        items: [
          "Security Groups",
          "Distribution Groups",
          "Microsoft 365 Groups",
          "Group Membership",
        ],
      },
      {
        name: "Devices",
        items: [
          "Device Directory",
          "Device Enrollment",
          "Device Assignments",
          "Device Compliance",
          "Device Status",
        ],
      },
      {
        name: "Organizational Management",
        items: ["Organizational Units", "Departments", "Group Policy"],
      },
      {
        name: "Identity & Access",
        items: [
          "Access Management",
          "Roles & Permissions",
          "Directory Synchronization",
          "Identity Connections",
        ],
      },
    ],
  },
  {
    id: "productivity",
    number: 4,
    title: "Productivity",
    description: "The everyday productivity applications.",
    owner: "Productivity Suite",
    groups: [
      {
        name: "Applications",
        items: ["IntelliDocs", "IntelliSheets", "IntelliSlides", "Notes", "IntelliTasks"],
      },
    ],
  },
  {
    id: "communication",
    number: 5,
    title: "Communication",
    description: "Communication tools and services.",
    owner: "IntelliChat",
    groups: [
      {
        name: "IntelliChat",
        items: [
          "Direct Messages",
          "Group Conversations",
          "Team Channels",
          "Message History",
          "File Sharing",
          "Chat Notifications",
        ],
      },
      {
        name: "Other Communication",
        items: ["Email", "Meetings", "Calls", "Invitations", "Communication History"],
      },
    ],
  },
  {
    id: "collaboration",
    number: 6,
    title: "Collaboration",
    description: "Shared workspaces and collaborative tools.",
    owner: "IntelliDrive",
    groups: [
      {
        name: "IntelliDrive",
        items: [
          "My Files",
          "Shared Files",
          "Team Folders",
          "Company Folders",
          "File Permissions",
          "File Activity",
          "Synchronization",
        ],
      },
      {
        name: "Shared Work",
        items: [
          "Shared Workspaces",
          "Team Projects",
          "Shared Calendars",
          "Calendar",
          "Co-Authoring",
          "Shared Documents",
          "Shared Tasks",
          "Team Activity",
        ],
      },
    ],
  },
  {
    id: "knowledge-base",
    number: 7,
    title: "Knowledge Base",
    description:
      "Company, department, tenant and personal knowledge, guides, procedures and playbooks.",
    owner: "Knowledge Base",
    groups: [
      {
        name: "Knowledge",
        items: [
          "Company Knowledge Base",
          "Department Knowledge Bases",
          "Tenant Knowledge Bases",
          "Personal Knowledge Base",
          "User Guides",
          "Technical Documentation",
          "Standard Operating Procedures",
          "Playbooks",
          "Tutorials",
          "Frequently Asked Questions",
          "Knowledge Contributions",
        ],
      },
    ],
  },
  {
    id: "ai-systems",
    number: 8,
    title: "AI Systems",
    description:
      "The intelligence layer: Trinity, Maximus, Optimus, Help Buddy and the workflow companion.",
    owner: "AI Systems",
    groups: [
      {
        name: "Assistants",
        items: ["Trinity", "Maximus", "Optimus", "Help Buddy", "Workflow Companion"],
      },
      {
        name: "Governance",
        items: ["AI Activity", "AI Configuration", "AI Permissions", "AI Knowledge Sources"],
      },
    ],
  },
  {
    id: "network-operations",
    number: 9,
    title: "Network Operations Center",
    description: "Network, infrastructure and service health.",
    owner: "Network Operations Center",
    groups: [
      {
        name: "Operations",
        items: [
          "NOC Dashboard",
          "Network Monitoring",
          "Network Devices",
          "Infrastructure",
          "Servers",
          "Connectivity",
          "Performance Monitoring",
          "Alerts",
          "Network Events",
          "Network Topology",
          "Maintenance",
          "Network Reports",
        ],
      },
    ],
  },
  {
    id: "security",
    number: 10,
    title: "Security",
    description: "Security monitoring, threat detection and incident response.",
    owner: "Security",
    groups: [
      {
        name: "Security Operations",
        items: [
          "Security Dashboard",
          "Security Monitoring",
          "Threat Detection",
          "Vulnerability Management",
          "Endpoint Security",
          "Security Policies",
          "Security Alerts",
          "Incident Response",
          "Risk Assessment",
          "Security Integrations",
        ],
      },
    ],
  },
  {
    id: "governance",
    number: 11,
    title: "Governance",
    description: "Policies, standards, controls, risk and compliance evidence.",
    owner: "Governance",
    minRole: "manager",
    groups: [
      {
        name: "Governance Program",
        items: [
          "Governance Dashboard",
          "Policies",
          "Standards",
          "Compliance Frameworks",
          "Control Management",
          "Risk Register",
          "Exceptions",
          "Compliance Assessments",
          "Evidence Management",
          "Governance Reports",
        ],
      },
    ],
  },
  {
    id: "audit",
    number: 12,
    title: "Audit",
    description:
      "The recorded history of the platform: who did what, when and with which evidence.",
    owner: "Audit",
    groups: [
      {
        name: "Audit Records",
        items: [
          "Audit Dashboard",
          "User Activity",
          "Administrative Activity",
          "System Activity",
          "Access History",
          "Configuration Changes",
          "Approval History",
          "Integration Activity",
          "Data Access History",
          "Audit Reports",
          "Audit Exports",
        ],
      },
    ],
  },
  {
    id: "settings",
    number: 13,
    title: "Settings",
    description: "Your profile, preferences and connected account settings.",
    owner: "Settings",
    groups: [
      {
        name: "Personal Settings",
        items: [
          "My Profile",
          "Account Preferences",
          "Appearance & Themes",
          "Notifications",
          "Language & Region",
          "Security Preferences",
          "Session Management",
          "Application Preferences",
          "Workspace Preferences",
          "Connected Account Settings",
          "Help & Support",
        ],
      },
    ],
  },
  {
    id: "external-connectors",
    number: 14,
    title: "External Connectors",
    description:
      "Third-party applications that may be authorized for this workspace. They are not IntelliStack products and stay separate from the native menu.",
    owner: "External Connectors",
    external: true,
    groups: [
      {
        name: "GitHub",
        items: ["Repositories", "Issues", "Pull Requests", "Development Activity"],
      },
      { name: "Airtable", items: ["Bases", "Records", "Data Synchronization", "Workflows"] },
      { name: "Monday.com", items: ["Boards", "Projects", "Assignments", "Status Updates"] },
      {
        name: "Microsoft 365",
        items: ["Files", "Email", "Calendar", "Microsoft Account Connections"],
      },
      {
        name: "Google Workspace",
        items: ["Google Drive", "Gmail", "Calendar", "Workspace Services"],
      },
      { name: "Zoom", items: ["Meetings", "Schedules", "Conferencing"] },
    ],
  },
];

/** Destinations that already have a bespoke, fully implemented screen. */
export const REAL_ROUTES: Record<string, string> = {
  "ai-systems-help-buddy": "/help-buddy",
  "command-center-mission-center": "/mission-control",
  "external-integration-marketplace-available-connectors": "/connectors",
  "identity-and-access-directory-synchronization": "/intellisync",
  "ai-systems-ai-configuration": "/character-studio",
};

function build(): MenuSection[] {
  const used = new Set<string>();
  return SEED.map((section) => {
    const groups: MenuGroup[] = section.groups.map((group) => {
      const groupId = `${section.id}-${slugify(group.name)}`;
      const destinations: Destination[] = group.items.map((label) => {
        const base = `${section.id}-${slugify(label)}`;
        const slug = used.has(base) ? `${base}-${slugify(group.name)}` : base;
        used.add(slug);
        return {
          id: slug,
          label,
          slug,
          sectionId: section.id,
          sectionTitle: section.title,
          groupId,
          groupName: group.name,
          owner: section.owner,
          summary:
            SUMMARIES[slug] ??
            `${label} belongs to ${section.owner} and reads the shared identity, record, storage and audit services.`,
          external: Boolean(section.external),
        };
      });
      return { id: groupId, name: group.name, destinations };
    });
    return {
      id: section.id,
      number: section.number,
      title: section.title,
      description: section.description,
      groups,
      ...(section.external ? { external: true } : {}),
      ...(section.minRole ? { minRole: section.minRole } : {}),
    };
  });
}

export const menuSections: MenuSection[] = build();

export const nativeSections = menuSections.filter((section) => !section.external);

export const externalSections = menuSections.filter((section) => section.external);

export const allDestinations: Destination[] = menuSections.flatMap((section) =>
  section.groups.flatMap((group) => group.destinations),
);

const bySlug = new Map(allDestinations.map((destination) => [destination.slug, destination]));

export const findDestination = (slug: string): Destination | undefined => bySlug.get(slug);

export const destinationsInSection = (section: MenuSection): Destination[] =>
  section.groups.flatMap((group) => group.destinations);

const ROLE_RANK: Record<Role, number> = {
  employee: 0,
  contractor: 0,
  technician: 1,
  manager: 2,
  administrator: 3,
};

export function canRoleSee(section: MenuSection, role: Role | undefined): boolean {
  if (!section.minRole) return true;
  const rank = ROLE_RANK[role ?? "employee"] ?? 0;
  return rank >= ROLE_RANK[section.minRole];
}

export function sectionsForRole(role: Role | undefined): MenuSection[] {
  return menuSections.filter((section) => canRoleSee(section, role));
}

export function searchDestinations(query: string): Destination[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return allDestinations
    .filter((destination) =>
      [destination.label, destination.groupName, destination.sectionTitle, destination.owner]
        .join(" ")
        .toLowerCase()
        .includes(term),
    )
    .slice(0, 24);
}

/** Native sections end with Settings; external connectors stay after them. */
export function orderedSections(order: string[]): MenuSection[] {
  const rank = (section: MenuSection) => {
    const index = order.indexOf(section.id);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  const native = [...nativeSections].sort((a, b) => rank(a) - rank(b) || a.number - b.number);
  const settingsIndex = native.findIndex((section) => section.id === "settings");
  if (settingsIndex !== -1 && settingsIndex !== native.length - 1) {
    const [settings] = native.splice(settingsIndex, 1);
    if (settings) native.push(settings);
  }
  return [...native, ...externalSections];
}

export const MENU_ORDER_KEY = "maximus.menu.order";
export const MENU_COLLAPSED_KEY = "maximus.menu.collapsed";
