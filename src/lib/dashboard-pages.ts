import company from "@/assets/scenes/global-company-id.jpg.asset.json";
import user from "@/assets/scenes/global-user-id.jpg.asset.json";
import directory from "@/assets/scenes/intellidirectory.jpg.asset.json";
import roles from "@/assets/scenes/user-role-administration.jpg.asset.json";
import marketplace from "@/assets/scenes/intellimarketplace.jpg.asset.json";
import people from "@/assets/scenes/people-workforce.jpg.asset.json";
import desk from "@/assets/scenes/intellidesk.jpg.asset.json";
import assets from "@/assets/scenes/assets-resources.jpg.asset.json";
import settings from "@/assets/scenes/administration-settings-support.jpg.asset.json";
import globalAdmin from "@/assets/scenes/global-administration.jpg.asset.json";

export type DemoRecord = {
  id: string;
  name: string;
  detail: string;
  status: string;
  region: string;
};
export type DashboardPage = {
  slug: string;
  title: string;
  subtitle: string;
  scene: string;
  tabs: string[];
  metrics: [string, string][];
  listTitle: string;
  entity: string;
  actions: string[];
  records: DemoRecord[];
  health: string;
  percent: number;
  secondary: string;
  bars: [string, number][];
  format?: string;
};
const records = (rows: string[][]): DemoRecord[] =>
  rows.map((r, i) => ({
    id: `record-${i + 1}`,
    name: r[0] ?? "",
    detail: r[1] ?? "",
    status: r[2] ?? "Active",
    region: r[3] ?? "Americas",
  }));
export const dashboardPages: DashboardPage[] = [
  {
    slug: "global-company-id",
    title: "Global Company ID",
    subtitle: "Corporate Identity Registry",
    scene: company.url,
    tabs: ["Companies", "Hierarchy", "Verification", "Global Registry", "ID Format", "Analytics"],
    metrics: [
      ["2,847", "Global Companies"],
      ["2,619", "Active"],
      ["142", "Pending"],
      ["86", "Suspended"],
    ],
    listTitle: "Companies",
    entity: "Company",
    actions: [
      "Register Company",
      "Verify Entity",
      "Update Hierarchy",
      "Issue Company ID",
      "Sync Registry",
      "View Ledger",
    ],
    records: records([
      ["Northstar Industries", "MO-US-2847-9F3B", "Verified", "Americas"],
      ["Aurora Holdings", "Enterprise · Manufacturing", "Pending", "EMEA"],
      ["Vectra Corp", "Enterprise · Technology", "Verified", "APAC"],
      ["Orion Dynamics", "Enterprise · Services", "Under Review", "Americas"],
    ]),
    health: "Verification Status",
    percent: 81,
    secondary: "Global Registry",
    bars: [
      ["North America", 987],
      ["Europe", 764],
      ["Asia Pacific", 698],
      ["Latin America", 248],
      ["Middle East & Africa", 150],
    ],
    format: "MO-US-2847-9F3B",
  },
  {
    slug: "global-user-id",
    title: "Global User ID",
    subtitle:
      "Universal Identity Management · Unify, federate, and resolve identities across every tenant, platform, and boundary.",
    scene: user.url,
    tabs: [
      "Overview",
      "Identity Graph",
      "Tenants",
      "Cross-Tenant",
      "Federation",
      "Resolution",
      "Audit & Compliance",
    ],
    metrics: [
      ["124,847", "Unique Global User IDs"],
      ["342", "Tenants Connected"],
      ["18", "ID Namespaces"],
      ["312 ms", "Avg. Resolution"],
    ],
    listTitle: "Cross-Tenant Mapping",
    entity: "Identity",
    actions: [
      "Provision ID",
      "Link Tenant",
      "Federate IdP",
      "Resolve Identity",
      "Audit Trail",
      "Policy Center",
    ],
    records: records([
      ["TENANT-ALPHA", "28,412 identities", "Resolved", "Americas"],
      ["TENANT-OMEGA", "24,105 identities", "Resolved", "EMEA"],
      ["TENANT-NOVA", "22,873 identities", "In Progress", "APAC"],
      ["TENANT-APEX", "19,560 identities", "Resolved", "Americas"],
    ]),
    health: "Resolution Status",
    percent: 98.7,
    secondary: "Identity Federation",
    bars: [
      ["Azure AD", 27],
      ["Okta", 24],
      ["Google Workspace", 18],
      ["LDAP", 15],
    ],
    format: "GUID-IS-XXXX-XXXX-XXXX",
  },
  {
    slug: "intellidirectory",
    title: "IntelliDirectory",
    subtitle:
      "Unified Directory Intelligence · Harmonize identity across every source, in real time.",
    scene: directory.url,
    tabs: ["Overview", "Sources", "Sync Engine", "Schema", "Policies", "Audit"],
    metrics: [
      ["45,291", "Total Objects"],
      ["18,742", "Users"],
      ["6,318", "Groups"],
      ["9,204", "Devices"],
    ],
    listTitle: "Connected Sources",
    entity: "Source",
    actions: [
      "Add Source",
      "Sync Directory",
      "Map Attributes",
      "Review Conflicts",
      "Run Audit",
      "Export Report",
    ],
    records: records([
      ["AD", "Active Directory · 12,841 objects", "Connected", "Americas"],
      ["Azure AD", "Cloud Identity · 18,203 objects", "Connected", "EMEA"],
      ["LDAP", "Directory Protocol · 8,117 objects", "Connected", "APAC"],
      ["HRIS", "Human Capital · 6,130 objects", "Connected", "Americas"],
    ]),
    health: "Sync Status",
    percent: 100,
    secondary: "Directory Intelligence",
    bars: [
      ["Attributes Mapped", 1284],
      ["Duplicates Resolved", 23],
      ["Risk Score", 12],
      ["Anomalies", 0],
    ],
  },
  {
    slug: "people-workforce",
    title: "People & Workforce",
    subtitle: "Manage your global workforce, identities, and organizational structure.",
    scene: people.url,
    tabs: [
      "Employees",
      "Org Chart",
      "Identities",
      "Skills Matrix",
      "Workforce Analytics",
      "Locations",
    ],
    metrics: [
      ["14,291", "Personnel"],
      ["128", "Departments"],
      ["56", "Locations"],
      ["92%", "Identity Verified"],
    ],
    listTitle: "Employee Directory",
    entity: "Employee",
    actions: [
      "Add Employee",
      "Onboard",
      "Assign Role",
      "Verify Identity",
      "Update Skills",
      "View Report",
    ],
    records: records([
      ["Ava Chen", "Principal Engineer · Product & Engineering", "Active", "San Francisco, US"],
      ["Marcus Johnson", "IT Support Specialist · Technology", "Active", "London, UK"],
      ["Sofia Ramirez", "HR Business Partner · Human Resources", "Active", "Toronto, CA"],
      ["Liam O’Connor", "Data Analyst · Business Intelligence", "On Leave", "Dublin, IE"],
      ["Priya Nair", "Cybersecurity Lead · Security", "Active", "Singapore, SG"],
    ]),
    health: "Identity Verification Status",
    percent: 92.4,
    secondary: "Skills Matrix",
    bars: [
      ["Cloud & DevOps", 342],
      ["Data & AI", 276],
      ["Cybersecurity", 226],
      ["Product Management", 523],
      ["Engineering", 333],
    ],
  },
  {
    slug: "intellidesk",
    title: "IntelliDesk",
    subtitle: "Intelligent IT Service Operations & Support Management",
    scene: desk.url,
    tabs: ["Dashboard", "Tickets", "SLA", "Teams", "Service Catalog", "Knowledge Base"],
    metrics: [
      ["847", "Active Tickets"],
      ["98.7%", "SLA Compliance"],
      ["312", "Service Requests"],
      ["23", "Priority Incidents"],
    ],
    listTitle: "Ticket Queue",
    entity: "Ticket",
    actions: [
      "New Ticket",
      "Assign Ticket",
      "Escalate",
      "Knowledge Base",
      "Run Automation",
      "View Reports",
    ],
    records: records([
      ["INC-9842 · VPN connection failure", "Marcus Johnson · L1 Support", "Open", "Americas"],
      ["SR-4810 · Laptop request", "Ava Chen · Hardware", "In Progress", "EMEA"],
      ["INC-9839 · Device offline", "WS-D1047 · Network Ops", "Open", "APAC"],
      ["SR-4805 · Finance Portal access", "Sofia Ramirez · Access", "Resolved", "Americas"],
    ]),
    health: "Service Desk Status",
    percent: 98.7,
    secondary: "Support Teams Workload",
    bars: [
      ["L1 Support", 78],
      ["L2 Support", 65],
      ["L3 Engineering", 52],
      ["Network Ops", 71],
      ["Security Ops", 63],
    ],
  },
  {
    slug: "assets-resources",
    title: "Assets & Resources",
    subtitle: "Enterprise Asset Intelligence & Resource Management",
    scene: assets.url,
    tabs: ["Hardware", "Software", "Lifecycle", "Inventory", "Tracking", "Vendors"],
    metrics: [
      ["8,492", "Assets Tracked"],
      ["3,217", "Laptops"],
      ["2,104", "Desktops"],
      ["1,486", "Mobile Devices"],
    ],
    listTitle: "Asset Inventory",
    entity: "Asset",
    actions: ["Add Asset", "Check In", "Check Out", "Assign", "Maintenance", "Audit"],
    records: records([
      ["LT-3217 · ThinkPad X1", "Assigned to Ava Chen", "Deployed", "Americas"],
      ["DT-2104 · Workstation", "Engineering · Desktop", "In Stock", "EMEA"],
      ["MD-1486 · Mobile Device", "Assigned to Priya Nair", "Deployed", "APAC"],
      ["SV-1685 · Server", "Infrastructure · Rack 12", "Maintenance", "Americas"],
    ]),
    health: "Asset Health",
    percent: 93.7,
    secondary: "Lifecycle Status",
    bars: [
      ["Procurement", 642],
      ["Deployment", 1128],
      ["Active", 5217],
      ["Maintenance", 1024],
      ["Retirement", 481],
    ],
  },
  {
    slug: "intellimarketplace",
    title: "IntelliMarketplace",
    subtitle: "Enterprise Technology Marketplace & Intelligence",
    scene: marketplace.url,
    tabs: [
      "Featured",
      "All Apps",
      "My Subscriptions",
      "Vendors",
      "Deals",
      "Analytics",
      "Procurement",
    ],
    metrics: [
      ["24", "Active Subscriptions"],
      ["$48.7K", "Monthly Spend"],
      ["$585K", "Annual Commitment"],
      ["$127.4K", "YTD Savings"],
    ],
    listTitle: "App Catalog",
    entity: "Application",
    actions: [
      "Add Application",
      "Review Subscriptions",
      "Compare Plans",
      "Review Vendors",
      "Export Report",
    ],
    records: records([
      ["CRM Nexus", "Productivity · $889/mo", "Subscribed", "Global"],
      ["DataFlow Analytics", "Data & AI · $1,299/mo", "Subscribed", "Global"],
      ["SecureVault", "Security · $749/mo", "Available", "Global"],
      ["CollabSphere", "Productivity · $599/mo", "Available", "Global"],
      ["CloudSync Pro", "Operations · $649/mo", "Available", "Global"],
      ["FinanceCore", "Finance · $1,099/mo", "Subscribed", "Global"],
    ]),
    health: "Technology Assessment",
    percent: 89,
    secondary: "Cost Analysis",
    bars: [
      ["Productivity", 28],
      ["Security", 22],
      ["Data & AI", 24],
      ["Finance", 14],
      ["Operations", 12],
    ],
  },
  {
    slug: "user-role-administration",
    title: "User & Role Administration",
    subtitle: "Identity Governance & Access Control Command",
    scene: roles.url,
    tabs: [
      "Users Overview",
      "Roles",
      "Permissions Matrix",
      "Access Reviews",
      "Role Assignments",
      "RBAC Visualization",
      "Audit & Compliance",
    ],
    metrics: [
      ["12,847", "Total Users"],
      ["842", "Roles"],
      ["94.6%", "Policy Compliance"],
      ["23", "SoD Violations"],
    ],
    listTitle: "Access Reviews",
    entity: "User",
    actions: [
      "Add User",
      "Create Role",
      "Assign Permission",
      "Start Review",
      "Certify Access",
      "View Audit Log",
    ],
    records: records([
      ["Q4 2026 · Finance Review", "128 items · Due Dec 12", "In Review", "Americas"],
      ["Privileged Access Review", "56 items · Due Dec 08", "In Review", "EMEA"],
      ["Third-Party Vendor Review", "34 items · Due Dec 05", "Attention", "APAC"],
      ["Service Account Review", "41 items · Certification", "Completed", "Global"],
    ]),
    health: "Identity Risk Posture",
    percent: 94.6,
    secondary: "Role Distribution",
    bars: [
      ["Custom", 512],
      ["System", 198],
      ["Composite", 132],
    ],
  },
  {
    slug: "administration-settings-support",
    title: "Administration & Settings",
    subtitle: "Global Platform Administration & Configuration",
    scene: settings.url,
    tabs: ["Platform", "Tenants", "Company", "Permissions", "Security", "Health"],
    metrics: [
      ["99.99%", "Uptime"],
      ["128", "Services Online"],
      ["42 ms", "API Latency"],
      ["36", "Total Tenants"],
    ],
    listTitle: "Tenant Overview",
    entity: "Tenant",
    actions: [
      "New Tenant",
      "Edit Configuration",
      "Review Permissions",
      "Run Health Check",
      "Export Report",
    ],
    records: records([
      ["NexaCorp", "Enterprise · 1,248 users", "Active", "US-East"],
      ["Orion Dynamics", "Enterprise · 986 users", "Active", "EU-West"],
      ["Astra Finance", "Financial · 742 users", "Suspended", "APAC"],
      ["Velum Health", "Healthcare · 532 users", "Pending", "US-Central"],
    ]),
    health: "Configuration Status",
    percent: 100,
    secondary: "System Settings",
    bars: [
      ["CPU Usage", 62],
      ["Memory Usage", 58],
      ["Storage Usage", 74],
    ],
  },
  {
    slug: "global-administration",
    title: "Global Administration",
    subtitle: "Global Platform Command & Central Administration",
    scene: globalAdmin.url,
    tabs: ["Overview", "Tenants", "Policies", "Access", "Controls", "Audit"],
    metrics: [
      ["48", "Tenants"],
      ["186,429", "Total Users"],
      ["156", "Active Services"],
      ["6", "Regions"],
    ],
    listTitle: "Privileged Access Management",
    entity: "Tenant",
    actions: [
      "New Tenant",
      "Invite Admin",
      "Global Policy",
      "Emergency Lockdown",
      "Run Audit",
      "Export Report",
    ],
    records: records([
      ["sarah.chen", "Global Super Admin · 12m", "Active", "AMER"],
      ["david.okoro", "Security Admin · 8m", "Active", "EMEA"],
      ["elena.martinez", "Compliance Admin · 5m", "Active", "EMEA"],
      ["james.wong", "Infrastructure Admin · 2m", "Active", "APAC"],
    ]),
    health: "Platform Health",
    percent: 99.99,
    secondary: "Platform Controls",
    bars: [
      ["Identity", 100],
      ["Compute", 100],
      ["Storage", 99],
      ["Network", 100],
      ["Security", 100],
    ],
  },
];
export const getDashboardPage = (slug: string) => dashboardPages.find((p) => p.slug === slug);
export const resolveMenuItem = (item: string, fallback: string) =>
  (
    ({
      "Global User ID": "global-user-id",
      "Global User Identity": "global-user-id",
      "Global Company ID": "global-company-id",
      "Global Company Identity": "global-company-id",
      IntelliDirectory: "intellidirectory",
      "Global Administrator Dashboard": "global-administration",
      "Global Overview": "global-administration",
      "User Administration": "user-role-administration",
      "Role Administration": "user-role-administration",
      Roles: "user-role-administration",
      "Global User Management": "user-role-administration",
      "Global Role Management": "user-role-administration",
    }) as Record<string, string>
  )[item] ?? fallback;
export const filterRecords = (rows: DemoRecord[], query: string, status: string) =>
  rows.filter(
    (r) =>
      (status === "All" || r.status === status) &&
      `${r.name} ${r.detail} ${r.region}`.toLowerCase().includes(query.toLowerCase()),
  );
