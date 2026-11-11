// Single source of truth for the eleven primary hamburger navigation areas.
// Every item resolves to a real route: /m/$section/$group/$page.

export type SectionTone =
  | "primary"
  | "contractor"
  | "tenant"
  | "maximus"
  | "optimus"
  | "world"
  | "network"
  | "everything";

export interface NavPage {
  title: string;
  slug: string;
}
export interface NavGroup {
  title: string;
  slug: string;
  pages: NavPage[];
}
export interface NavSection {
  number: string;
  title: string;
  slug: string;
  summary: string;
  tone: SectionTone;
  groups: NavGroup[];
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type RawSection = [string, string, SectionTone, Array<[string, string[]]>];

const RAW: RawSection[] = [
  [
    "My Business Center",
    "The business workspace for IntelliStack Systems, IntelliHire, IntelliStaff and authorized tenant business records.",
    "primary",
    [
      ["Business Overview", ["Business Overview Dashboard", "Company Management", "Business Operations", "Business Locations", "Business Settings", "Business Activity", "Business Approvals", "Business Resources", "Business Integrations", "Business Performance", "Business Reporting and Analytics"]],
      ["Financial Center", ["Financial Overview", "Income and Revenue", "Expenses", "Transactions and Payments", "Accounts and Financial Records", "Budgets", "Cash Flow", "Forecasts", "Financial Projections", "Financial Reports", "Company Financial Comparisons", "Tenant Financial Records"]],
      ["Company and Organization Management", ["IntelliStack Systems", "IntelliHire", "IntelliStaff", "Tenant Business Records", "Company Profiles", "Organization Records", "Business Documentation"]],
      ["Executive Center", ["Executive Briefings", "CEO Talking Points", "CFO Talking Points", "Strategy and Planning", "Business Plans", "Presentations", "Spreadsheets and Reports", "Business Projections", "Side-by-Side Comparisons"]],
      ["IntelliSphere Marketplace", ["Marketplace Overview", "Products and Services", "Five Subscription Levels", "Pricing and Feature Comparisons", "Side-by-Side Product Comparisons", "Company Purchases", "Tenant Purchases", "Seats and Licensing", "Subscription Management", "Billing and Renewals", "Upgrades and Feature Access"]],
    ],
  ],
  [
    "New Active Directory",
    "Directory management for users, devices, groups, access, licensing and the workforce lifecycle.",
    "contractor",
    [
      ["Directory Overview", ["Directory Dashboard", "Global Directory", "Directory Health", "Directory Activity"]],
      ["Users and Identity", ["User Accounts", "Global User ID", "User Profiles", "Employee Accounts", "Contractor Accounts", "Business Accounts", "Tenant User Accounts", "External Users", "Identity Verification", "Account Status"]],
      ["Devices and Inventory", ["Device Overview", "Desktop Computers", "Laptops", "Tablets", "Mobile Devices", "Servers", "Docking Stations", "Printers and Peripherals", "Device Inventory", "Device Assignments", "Device History", "Device Compliance"]],
      ["Groups and Organization", ["Organizational Units", "Departments", "Teams", "Security Groups", "Distribution Groups", "Group Objects", "Group Membership", "Group Policies", "Directory Objects", "Organizational Hierarchy"]],
      ["Access and Licensing", ["Roles and Permissions", "Access Management", "Application Access", "Software Licenses", "License Assignments", "License Availability", "Authentication", "Multi-Factor Authentication", "Single Sign-On", "Access Requests", "Access Audit"]],
      ["Workforce Lifecycle", ["User Onboarding", "Device Assignment", "License Assignment", "Group Assignment", "Account Changes", "Offboarding", "Account Deactivation", "Directory Audit History"]],
    ],
  ],
  [
    "Command Center",
    "IntelliDesk, Workforce Performance & Recognition, and Command Operations in one working surface.",
    "maximus",
    [
      ["IntelliDesk Overview", ["IntelliDesk Dashboard", "Command Queue", "My Tickets", "My Assigned Tickets", "Other Users' Tickets", "Team Tickets", "All Tickets", "Create Ticket"]],
      ["Ticket Management", ["Ticket Briefing", "Active Ticket Workspace", "Ticket Categories", "Ticket Subcategories", "Ticket Types", "Priority and Severity", "Assignment and Routing", "Ticket Templates", "Ticket Notes", "Attachments", "Ticket Conversation", "Ticket History", "Related Tickets", "Resolution and Closure"]],
      ["Mission Control", ["Mission Control Dashboard", "Mission Queue", "My Missions", "Mission Workspace", "Mission Briefing", "Mission History", "Mission Templates", "Technician Workspace"]],
      ["Ticket Actions", ["Accept Ticket / Accept Mission", "Work Ticket", "Pause", "Resume", "Request Assistance", "Hand Off", "Transfer", "Escalate", "Return to Queue", "Reopen", "Complete", "Submit for Verification", "Supervisor Approval"]],
      ["SLA Management", ["SLA Overview", "SLA Policies", "Response Timers", "Resolution Timers", "SLA Status", "Breach Monitoring", "Escalation Rules", "Escalation History", "SLA Reporting"]],
      ["Technician Management", ["Technician Directory", "Technician Profiles", "Support Levels", "Team Assignments", "Availability", "Objectives and Checkpoints", "Supervisor Reviews", "Technician Reporting"]],
      ["IntelliDesk Reporting", ["Ticket Reports", "Workload Reports", "Response and Resolution Times", "SLA Performance", "Escalation Reports", "Quality and Verification Reports"]],
      ["Workforce Performance & Recognition", ["Workforce Overview", "Employee Performance Profiles", "XP and Levels", "Stars and Recognition", "Badges and Achievements", "Leaderboards and Rankings", "Contribution Ledger", "Manager and Supervisor Tools", "Objectives and Checkpoints", "Skills and Experience", "Training and Development", "Career Opportunities", "Rewards and Gift Cards", "Monthly Achievements", "Performance Reporting"]],
      ["Command Operations", ["Team Operations", "Workload Distribution", "Assignment Management", "Team Availability", "Supervisor Oversight", "Operational Reporting", "Operational Activity", "Cross-Team Coordination"]],
    ],
  ],
  [
    "Productivity",
    "Native IntelliStack productivity products, kept separate from connected external applications.",
    "optimus",
    [
      ["IntelliStack Productivity Tools", ["Productivity Overview", "IntelliWord", "IntelliSheets", "IntelliSlides", "IntelliNotes", "IntelliDrive", "IntelliForms", "IntelliStudio", "IntelliText", "Native Productivity Applications", "Personal Productivity Workspace", "Business Productivity Workspace"]],
      ["Connected Productivity Tools", ["Microsoft 365", "Microsoft Project and Project Management", "Monday.com", "Financial and Accounting Applications", "External Productivity Applications", "Connected Application Directory", "Connector Settings", "Connection Status", "Data and Permission Settings"]],
    ],
  ],
  [
    "Collaboration",
    "IntelliStack collaboration tools and approved connected collaboration platforms.",
    "world",
    [
      ["IntelliStack Collaboration Tools", ["Collaboration Overview", "IntelliChat", "IntelliCalendar", "IntelliAccess", "IntelliSearch", "IntelliSync", "Shared Workspaces", "Team Collaboration", "Shared Documents", "Meetings", "Collaboration Rooms", "Workspace Management"]],
      ["Connected Collaboration Tools", ["External Calendars", "Communication Platforms", "File Storage Platforms", "Document Platforms", "Approved External Connectors", "Connected Workspace Management", "Sharing and Access Permissions"]],
    ],
  ],
  [
    "Knowledge & Learning",
    "Guides, training, references and access-controlled knowledge bases.",
    "tenant",
    [
      ["Getting Started", ["Getting Started with Your Command Center", "System Navigation", "Dashboard Walkthrough", "Global Search Walkthrough", "Help Buddy Walkthrough", "Role-Based Getting Started"]],
      ["System User Guides", ["My Business Center Guide", "Active Directory Guide", "Command Center Guide", "IntelliDesk Guide", "Workforce Performance Guide", "Productivity Guide", "Collaboration Guide", "AI Systems Guide", "NOC Center Guide", "Security Guide", "Governance Guide"]],
      ["Help Buddy and Bring the Work to You", ["Help Buddy Complete Guide", "Help Buddy Workflow Guidance", "Bring the Work to You", "Personal Workflows", "Guided Tasks", "Checklists", "Attachments and Notes", "Follow-Up Management", "Progress and Learning History"]],
      ["Administration and Technical Reference", ["Global Administration Guide", "Tenant Administration Guide", "Role and Permission Reference", "Integration Reference", "IntelliSync Technical Reference", "Database and Backend Reference", "Security and Compliance Reference"]],
      ["Training and Learning", ["Learning Paths", "Role-Based Training", "Training Checkpoints", "Skills Development", "Certifications", "Learning Progress", "Resume Learning"]],
      ["Business and Executive Reference", ["Business Reference", "Executive Reference", "CEO and CFO Materials", "Business Procedures"]],
      ["Future Development and Historical Archive", ["Future Development Plans", "Expansion Roadmap", "Product Concepts", "Development Decisions", "Historical Archive", "Version History", "Completed Development Phases", "Superseded Designs and Decisions"]],
      ["Personal and Restricted Knowledge", ["Personal Knowledge Bases", "Founder’s Papers", "Restricted Knowledge Bases", "Access Permissions", "Locked and Unlocked Content"]],
    ],
  ],
  [
    "AI Systems",
    "Dedicated experiences for Trinity, Maximus, Optimus and Help Buddy.",
    "everything",
    [
      ["Trinity", ["Trinity Overview", "Security Intelligence", "Network Intelligence", "Operational Oversight", "Business and Operational Risk", "Independent Review", "Maximus Oversight", "Optimus Oversight", "Cross-System Analysis", "Governance Intelligence", "Recommendations and Findings", "Audit History"]],
      ["Maximus", ["Maximus Overview", "Business Intelligence", "Executive Assistance", "Business Analysis", "Business Operations", "Financial and Business Insights", "Executive Reporting", "Strategic Recommendations"]],
      ["Optimus", ["Optimus Overview", "Help Desk Intelligence", "End-User Assistance", "Technical Guidance", "Ticket Support", "Workflow Assistance", "Knowledge Retrieval", "Operational Recommendations"]],
      ["Help Buddy", ["Help Buddy Overview", "Conversation", "Attachments", "Notes", "Help Buddy Workflow Guidance", "Checklists", "Knowledge Base", "Recognition Ledger", "My Tickets and Contributions", "Personal Work Area", "Follow-Ups", "Pending and Open Work", "Closed Work", "Transferred Work", "Manager Sign-Off"]],
    ],
  ],
  [
    "NOC Center",
    "Infrastructure monitoring. Related service tickets are managed through IntelliDesk.",
    "network",
    [
      ["NOC Overview", ["Network Operations Dashboard", "Infrastructure Health", "Global Network Overview"]],
      ["Monitoring", ["Network Monitoring", "Device and Infrastructure Monitoring", "Server Monitoring", "Network Performance", "Availability and Health"]],
      ["Events and Alerts", ["Network Events", "Network Alerts", "Incident Monitoring", "Event History", "Alert Rules"]],
      ["Analysis and Reporting", ["Network Performance Reports", "Capacity and Utilization", "Infrastructure Reports", "Network Trends"]],
    ],
  ],
  [
    "Security",
    "Security operations, threats, vulnerabilities, incidents and administration.",
    "optimus",
    [
      ["Security Overview", ["Security Operations Dashboard", "Security Posture", "Security Health"]],
      ["Threat Monitoring", ["Threat Monitoring", "Threat Intelligence", "Security Events", "Security Alerts", "Suspicious Activity"]],
      ["Vulnerability Management", ["Vulnerability Overview", "Vulnerability Assessments", "Vulnerability Tracking", "Remediation Status"]],
      ["Incident Response", ["Security Incidents", "Incident Investigation", "Response Actions", "Incident History"]],
      ["Security Administration", ["Security Policies", "Security Controls", "Access and Identity Security", "Security Reporting", "Security Audit History"]],
    ],
  ],
  [
    "Governance",
    "Compliance, policies, risk, audit and administration with a permanent ticket audit archive.",
    "tenant",
    [
      ["Governance Overview", ["Governance Dashboard", "Governance Status", "Organization Oversight"]],
      ["Compliance Management", ["Compliance Overview", "Compliance Frameworks", "Compliance Controls", "Compliance Evidence", "Compliance Reporting"]],
      ["Policies and Procedures", ["Policies", "Procedures", "Policy Approvals", "Policy Versions", "Policy Acknowledgments"]],
      ["Risk Management", ["Risk Register", "Risk Assessments", "Risk Treatment", "Risk Monitoring"]],
      ["Audit Management", ["Audit Overview", "Audit Events", "Audit Findings", "Corrective Actions", "Audit History", "Ticket Audit Archive", "Ticket Audit Detail", "Technician Contribution Audit", "Manager Approval Audit", "Signature Verification", "SLA Compliance Audit", "Checklist and Evidence Audit", "Recognition and Star Award Audit", "Handoff and Transfer Audit", "Reopened Ticket Audit", "Audit Search and Retrieval", "Audit Export and Reporting"]],
      ["SLA and Compliance", ["SLA and Compliance Reporting", "Governance Reports", "Management Reviews"]],
      ["Administration", ["Global Administration", "Organization Administration", "Tenant Administration", "Role and Permission Administration", "System Configuration"]],
    ],
  ],
];


const rawSection = (name: string) => RAW.find((item) => item[0] === name)!;
const rawGroups = (...names: string[]) => names.flatMap((name) => rawSection(name)[3]);
const commandGroups = rawSection("Command Center")[3];
const workforceGroup = commandGroups.find(([name]) => name === "Workforce Performance & Recognition")!;
const serviceDeskGroups = commandGroups.filter(([name]) => name !== "Workforce Performance & Recognition");
const productivityGroups = rawGroups("Productivity", "Collaboration");
const securityGroups = rawGroups("Security", "Governance");

const MENU: RawSection[] = [
  ["Home & Command Center", "Your personal command surface, global clocks, intelligence feeds and the work that needs your attention.", "maximus", [
    ["Command Center", ["Dashboard", "Bring the Work to You", "Global Time Zones", "News and Intelligence Feed", "Market Watch", "Company Announcements", "Command Status"]],
    ["Workflow Center", ["Workflow Dashboard", "Workflow Templates", "Template Builder", "Active Workflows", "My Assigned Tasks", "Approvals and Checkpoints", "Workflow History", "Automation Rules", "Workflow Analytics"]],
  ]],
  ["My Business Center", "Company operations, executive workspaces, financial products and business records.", "primary", rawGroups("My Business Center").filter(([group]) => group !== "IntelliSphere Marketplace")],
  ["New Active Directory", "Global directory services, identities, devices, organizations, groups, authentication, access and workforce lifecycle.", "contractor", rawGroups("New Active Directory").concat([
    ["Global Identity and Access", ["Global IAM Overview", "Global Company ID", "Global User ID", "Organizations", "Tenants", "Tenant Membership", "Company Profiles", "Organizational Units", "Departments", "Groups", "Roles", "Permissions", "Managers and Reporting Structure", "Identity Verification", "Authentication", "Multi-Factor Authentication", "Single Sign-On", "Access Requests", "Access Reviews", "Identity Audit"]],
    ["Directory Services", ["IntelliDirectory Overview", "Directory Services", "Directory Objects", "Directory Synchronization", "Directory Health", "Directory Audit History"]],
  ])],
  ["Productivity", "Native IntelliStack productivity products and connected productivity applications.", "optimus", rawGroups("Productivity")],
  ["Collaboration", "IntelliStack communication, calendar, shared workspaces and connected collaboration platforms.", "world", rawGroups("Collaboration").map(([group, pages]) => [group, [...pages, ...(group === "IntelliStack Collaboration Tools" ? ["Email"] : [])]])],
  ["Service Desk & Ticket Operations", "IntelliDesk, ticket management, mission execution, technician workflows, SLA operations and service reporting.", "network", rawSection("Command Center")[3].filter(([group]) => group !== "Workforce Performance & Recognition" && group !== "Command Operations")],
  ["NOC & Infrastructure Operations", "Network operations, infrastructure monitoring, events, alerts, field service and operational coordination.", "network", [
    ...rawGroups("NOC Center"),
    ["Infrastructure and Field Operations", ["Infrastructure Overview", "Infrastructure Inventory", "Server Operations", "Network Operations", "Field Service", "Remote Support", "Remote Sessions", "War Room", "Incident Coordination", "Service Health", "Operational Runbooks"]],
    ["Command Operations", ["Team Operations", "Workload Distribution", "Assignment Management", "Team Availability", "Supervisor Oversight", "Operational Reporting", "Operational Activity", "Cross-Team Coordination"]],
  ]],
  ["Security Operations", "Security posture, threats, vulnerabilities, incident response and security administration.", "optimus", rawGroups("Security")],
  ["Governance & Compliance", "Compliance frameworks, policies, risk, audit evidence, approvals, sign-offs and permanent audit history.", "tenant", rawGroups("Governance")],
  ["AI & Business Intelligence", "Governed intelligence experiences, analytics, insights and executive decision support.", "everything", rawGroups("AI Systems").filter(([group]) => group !== "Help Buddy")],
  ["Help Buddy", "The conversational assistant, onboarding guide, user workflow, checklists, follow-ups and guided work experience.", "everything", [
    ...rawGroups("AI Systems").filter(([group]) => group === "Help Buddy"),
    ["Onboarding and Guided Work", ["New User Onboarding", "Role-Based Onboarding", "Personal Workflow Checklist", "First Week Checklist", "Manager Onboarding Checklist", "My Work and Follow-Ups", "Guided Tasks", "Learning Progress", "Escalation and Handoff"]],
  ]],
  ["Employee & Manager Workspace", "Employee, contractor, manager and workforce experiences, progression, recognition and team oversight.", "optimus", [
    ["Workforce Experiences", ["IntelliStaff", "IntelliStaff Overview", "IntelliHire", "IntelliHire Overview", "IntelliWork", "IntelliWork Overview"]],
    ["People and Organization", ["Employees", "Contractors", "Workforce Directory", "Teams", "Managers", "Reporting Structure", "Availability and Shifts", "Onboarding", "Offboarding"]],
    [workforceGroup[0], workforceGroup[1]],
    ["Manager Workspace", ["Manager Dashboard", "Team Overview", "Work Assignment Overview", "Progression and XP Levels", "Stars and Recognition", "Manager Sign-Off Queue", "Performance Reviews", "Objectives and Checkpoints", "Team Reporting"]],
  ]],
  ["IntelliSphere Marketplace", "Discover IntelliStack products, subscriptions, services, licensing and tenant purchasing.", "primary", rawGroups("My Business Center").filter(([group]) => group === "IntelliSphere Marketplace")],
  ["IntelliBase — Knowledge Bases", "Permission-aware platform guides, company knowledge, operational playbooks, training and development history.", "tenant", [
    ["Getting Started", ["Getting Started Platform Guide", "System Navigation", "Dashboard and Global Widgets", "Platform User Guides", "Role-Based Getting Started"]],
    ["Knowledge Base Overview", ["All Knowledge Bases", "Search Knowledge", "Recent Articles", "Knowledge Administration", "Knowledge Permissions", "Review and Version History"]],
    ...rawGroups("Knowledge & Learning").filter(([group]) => group !== "Getting Started"),
  ]],
  ["Global Network & Connected Services", "Global infrastructure, connected providers, service health, integrations, data flows and platform availability.", "world", [
    ["Global Network", ["Global Network Overview", "Regional Operations", "Global Service Map", "Network Connectivity", "Service Availability", "Regional Health"]],
    ["Connected Services", ["Integration Directory", "Connected Applications", "Identity Providers", "Calendar Connections", "Email Connections", "Storage Connections", "Connector Status", "Connection Requests"]],
    ["Platform Operations", ["Platform Health", "Service Dependencies", "System Events", "Data Synchronization", "Background Jobs", "Operational Status"]],
  ]],
  ["Account & Personal Settings", "Your profile, personal preferences, notifications, security and sign-in settings.", "primary", [
    ["My Account", ["My Account", "Profile Settings", "Edit Bio", "Profile Photo", "LinkedIn Profile", "Availability and Status", "Preferences", "Notification Settings", "Personal Security Settings", "Sign Out"]],
  ]],
  ["Global Administration", "Global administrator controls for tenants, roles, access policies, configuration, audit and system operations.", "primary", [
    ["Global Administration", ["Global Administration Dashboard", "Tenant Administration", "Company Administration", "Role and Permission Administration", "Global Access Policies", "Integration Management", "System Configuration", "Feature Management", "Navigation Management", "Audit and Activity", "Service Status", "Backup and Recovery", "Administration Reports"]],
  ]],
];

export const NAV: NavSection[] = MENU.map(([title, summary, tone, groups], i) => ({
  number: String(i + 1).padStart(2, "0"),
  title,
  slug: title === "My Business Center" ? "business-products" : title === "Knowledge Bases" ? "knowledge-spaces" : slugify(title),
  summary,
  tone,
  groups: groups.map(([g, pages]) => ({
    title: g,
    slug: slugify(g),
    pages: pages.map((p) => ({ title: p, slug: slugify(p) })),
  })),
}));

export function findSection(slug: string) {
  const aliases: Record<string, string> = {
    "my-business-center": "business-products",
    "knowledge-bases": "knowledge-spaces",
    "intellibase": "knowledge-spaces",
  };
  return NAV.find((s) => s.slug === (aliases[slug] ?? slug));
}

export function findPage(sectionSlug: string, groupSlug: string, pageSlug: string) {
  const section = findSection(sectionSlug);
  const group = section?.groups.find((g) => g.slug === groupSlug);
  const pageAliases: Record<string, string> = {
    "all-knowledge-bases": "all-knowledge-bases",
    "getting-started-and-platform-guide": "getting-started-platform-guide",
    "platform-guide": "getting-started-platform-guide",
  };
  const page = group?.pages.find((p) => p.slug === (pageAliases[pageSlug] ?? pageSlug));
  return section && group && page ? { section, group, page } : undefined;
}

export interface FlatDestination {
  section: NavSection;
  group: NavGroup;
  page: NavPage;
}

export const ALL_DESTINATIONS: FlatDestination[] = NAV.flatMap((section) =>
  section.groups.flatMap((group) => group.pages.map((page) => ({ section, group, page }))),
);

export const toneVar: Record<SectionTone, string> = {
  primary: "var(--primary)",
  contractor: "var(--contractor)",
  tenant: "var(--tenant)",
  maximus: "var(--maximus)",
  optimus: "var(--optimus)",
  world: "var(--world)",
  network: "var(--network)",
  everything: "var(--everything)",
};
