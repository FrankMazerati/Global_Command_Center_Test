// The PDF-defined 30-workspace catalog is the only navigation source.
// Every item resolves to a real route: /m/$section/$group/$page.

export type SectionTone =
  "primary" | "contractor" | "tenant" | "maximus" | "optimus" | "world" | "network" | "everything";

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

const MENU: RawSection[] = [
  [
    "My Business Center",
    "The corporate management and business operations environment.",
    "primary",
    [
      [
        "Business Overview",
        ["Executive Dashboard", "Business Performance", "Company Profile", "Business Health"],
      ],
      [
        "Executive Office",
        ["CEO Dashboard", "CEO Talking Points", "Executive Decisions", "Strategic Initiatives"],
      ],
      [
        "Finance & Accounting",
        [
          "CFO Dashboard",
          "CFO Talking Points",
          "Financial Statements",
          "Quarterly Financial Records",
          "Annual Financial Records",
          "Budgeting and Forecasting",
          "Accounts Payable",
          "Accounts Receivable",
          "General Ledger",
          "Financial Reconciliation",
        ],
      ],
      [
        "Organizations & Structure",
        [
          "Organizations",
          "Departments",
          "Organizational Units",
          "Reporting Structure",
          "Business Locations",
        ],
      ],
      [
        "Human Resources Management",
        [
          "Workforce Overview",
          "Payroll Administration",
          "Benefits",
          "Employee Records",
          "Performance Management",
        ],
      ],
      [
        "Sales & Customer Management",
        ["Sales Pipeline", "Customer Directory", "Accounts", "Contracts", "Customer Relationships"],
      ],
      [
        "Marketing & Communications",
        [
          "Marketing Dashboard",
          "Social Media Pages",
          "Social Media Links",
          "Campaigns",
          "Brand Assets",
          "Publishing Calendar",
        ],
      ],
      [
        "Corporate Administration",
        [
          "Corporate Documents",
          "Business Policies",
          "Legal Records",
          "Insurance",
          "Vendors",
          "Procurement",
        ],
      ],
      [
        "Business Intelligence",
        ["Revenue Analytics", "Expense Analytics", "Growth Metrics", "Business Forecasts"],
      ],
    ],
  ],
  [
    "My Workspace",
    "Each employee's personal work environment.",
    "contractor",
    [
      [
        "My Profile",
        [
          "Personal Information",
          "Professional Biography",
          "Profile Photo",
          "LinkedIn Biography and Link",
          "Social Media Links",
          "Employment Information",
          "Contact Information",
        ],
      ],
      [
        "My Identity",
        ["Global ID", "Company ID", "Personal/User ID", "Employee ID", "Tenant Association"],
      ],
      ["My Work", ["Assigned Tasks", "Projects", "Work Queue", "My Approvals", "My Requests"]],
      ["My Documents", ["Personal Documents", "Work Documents", "Shared Files", "Attachments"]],
      [
        "My Learning",
        [
          "Getting Started",
          "Training Progress",
          "Certifications",
          "Achievements",
          "Star Levels",
          "Badges",
          "Leaderboards",
        ],
      ],
      ["My Calendar", ["Meetings", "Appointments", "Reminders", "Work Schedule"]],
      [
        "My Favorites",
        ["Favorite Applications", "Favorite Pages", "Favorite People", "Favorite Documents"],
      ],
    ],
  ],
  [
    "Global ID Center",
    "Central management of platform-wide identifiers and identity relationships.",
    "optimus",
    [
      ["Identity Dashboard", ["Global Identity Overview", "Identity Statistics"]],
      ["Global ID Registry", ["Global ID Records", "Identity Details", "Identity History"]],
      [
        "Company & Tenant IDs",
        ["Company ID Registry", "Tenant ID Registry", "Organization Associations"],
      ],
      [
        "User & Employee IDs",
        ["User IDs", "Employee IDs", "Contractor IDs", "Service Account IDs"],
      ],
      [
        "Identity Mapping",
        [
          "Identity Relationships",
          "Duplicate Detection",
          "Identity Reconciliation",
          "External Identifier Mapping",
        ],
      ],
      [
        "Identity Lifecycle",
        ["New Identity", "Identity Changes", "Identity Deactivation", "Identity Merge Review"],
      ],
    ],
  ],
  [
    "Identity & Access Management",
    "Platform-wide authentication, authorization, and security access administration.",
    "network",
    [
      ["IAM Dashboard", ["Access Overview", "Security Posture"]],
      ["User Access", ["User Permissions", "Role Assignments", "Group-Based Access"]],
      ["Access Requests", ["Submitted Requests", "Pending Requests", "Request History"]],
      ["Approvals", ["Manager Approval", "Resource Owner Approval", "Administrative Approval"]],
      ["Authentication", ["SSO", "MFA", "Authentication Policies", "Session Management"]],
      ["Authorization", ["RBAC", "ABAC", "Permission Policies", "Tenant Restrictions"]],
      ["Privileged Access", ["Administrator Access", "Temporary Access", "Emergency Access"]],
      ["Access Reviews", ["Periodic Reviews", "Expired Access", "Revocation History"]],
    ],
  ],
  [
    "New Active Directory",
    "Full directory administration, not merely an employee contact list.",
    "contractor",
    [
      ["Directory Dashboard", ["Directory Health", "Directory Statistics"]],
      ["People & Accounts", ["Employees", "Contractors", "Administrators", "Service Accounts"]],
      ["Groups", ["Security Groups", "Distribution Groups", "Dynamic Groups", "Group Membership"]],
      [
        "Organizational Units",
        ["Organizational Structure", "OU Administration", "Directory Hierarchy"],
      ],
      ["Devices", ["Computers", "Servers", "Mobile Devices", "Registered Devices"]],
      ["Directory Objects", ["User Objects", "Group Objects", "Device Objects", "Attributes"]],
      ["Directory Policies", ["Password Policies", "Account Policies", "Group Policies"]],
      [
        "Directory Integrations",
        [
          "Active Directory DS",
          "Microsoft Entra ID",
          "Directory Synchronization",
          "Directory Health",
        ],
      ],
    ],
  ],
  [
    "IntelliStack Configuration Center",
    "Platform-wide system administration and operations.",
    "primary",
    [
      ["Configuration Dashboard", ["Platform Overview", "System Status"]],
      ["Platform Configuration", ["Global Settings", "System Defaults", "Platform Policies"]],
      [
        "Application Administration",
        ["Application Configuration", "Module Activation", "Application Settings"],
      ],
      ["Environment Management", ["Development", "Testing", "Staging", "Production"]],
      ["System Monitoring", ["Platform Health", "Performance", "Errors", "Capacity"]],
      ["Release Management", ["Releases", "Deployments", "Rollbacks", "Version History"]],
      ["Feature Management", ["Feature Flags", "Feature Rollouts"]],
      ["Licensing & Entitlements", ["Licenses", "Subscriptions", "Entitlements"]],
      ["Backup & Recovery", ["Backup Policies", "Recovery Operations", "Restoration History"]],
      ["Administrative Audit", ["Configuration Changes", "Administrator Activity"]],
    ],
  ],
  [
    "IntelliDesk Command Center",
    "IT service management and technical service delivery.",
    "maximus",
    [
      ["Service Desk Dashboard", ["Open Tickets", "Service Performance"]],
      ["Tickets", ["Incidents", "Service Requests", "Problems", "Change Requests"]],
      ["Technician Workspace", ["Assigned Tickets", "Work Queue", "Escalations"]],
      [
        "Service Catalog",
        ["Hardware Services", "Software Services", "Account Services", "Access Services"],
      ],
      ["Change Management", ["Change Calendar", "Change Approvals", "Change History"]],
      ["Service Levels", ["SLA Dashboard", "Response Times", "Resolution Times"]],
      ["Knowledge Assistance", ["Suggested Articles", "Troubleshooting", "Related Tickets"]],
    ],
  ],
  [
    "IntelliBase",
    "Enterprise knowledge, documentation, training, and learning center.",
    "tenant",
    [
      ["Knowledge Dashboard", ["Featured Knowledge", "Recently Updated"]],
      ["Help Desk Knowledge Base", ["Troubleshooting", "Technical Procedures", "Common Issues"]],
      [
        "Getting Started",
        [
          "Welcome",
          "Platform Overview",
          "Navigation Training",
          "Profile Setup",
          "Identity & Access Training",
        ],
      ],
      [
        "Platform & Service Reference",
        ["Application Documentation", "Service Documentation", "Integration Guides"],
      ],
      [
        "Business Knowledge",
        ["Business Procedures", "Financial Procedures", "Department Documentation"],
      ],
      [
        "Idea Ledger",
        ["Ideas", "Conversation References", "Proposed Features", "Approved Requirements"],
      ],
      [
        "Training & Certification",
        [
          "Learning Paths",
          "Basic Training",
          "Intermediate Training",
          "Advanced Training",
          "Assessments",
          "Certifications",
        ],
      ],
      [
        "Knowledge Administration",
        ["Article Editor", "Review Queue", "Publishing", "Revision History"],
      ],
    ],
  ],
  [
    "IntelliStack Marketplace",
    "Discover, evaluate, activate, and manage applications, modules, and extensions.",
    "world",
    [
      ["Marketplace Dashboard", ["Featured Applications", "Recommended Products"]],
      [
        "Applications",
        ["Business Applications", "Productivity Applications", "Administrative Applications"],
      ],
      ["Modules & Extensions", ["Available Modules", "Extensions", "Add-ons"]],
      ["Connector Listings", ["Integration Catalog", "Provider Listings"]],
      ["Subscriptions", ["Active Subscriptions", "Available Plans", "Renewals"]],
      ["Installed Applications", ["Installed Modules", "Application Updates", "Entitlements"]],
      ["Marketplace Administration", ["Listings", "Publishing", "Reviews"]],
    ],
  ],
  [
    "Help Buddy",
    "Personal AI assistant and work coordination workspace.",
    "everything",
    [
      ["Help Buddy Dashboard", ["Assistant Overview", "Assigned Work"]],
      ["Conversations", ["New Conversation", "Conversation History", "Saved Conversations"]],
      ["Tasks & Checklists", ["My Tasks", "Team Tasks", "Completed Tasks"]],
      ["Notes & Reminders", ["Quick Notes", "Reminders", "Saved Information"]],
      ["Knowledge Assistance", ["Knowledge Search", "Article Recommendations"]],
      ["Team Coordination", ["Manager Coordination", "Team Assignments", "Escalations"]],
      ["Attachments & Voice", ["File Attachments", "Voice Input", "Voice Notes"]],
      [
        "Help Buddy Studio",
        [
          "Avatar",
          "Personality",
          "Voice",
          "Greetings",
          "Knowledge Connections",
          "Skills & Capabilities",
          "Workflow Configuration",
          "Tool Permissions",
          "Testing & Simulation",
          "Publishing & Version History",
        ],
      ],
    ],
  ],
  [
    "Collaboration & Productivity",
    "Internal communication and business productivity applications.",
    "optimus",
    [
      [
        "IntelliChat",
        [
          "Direct Messages",
          "Group Conversations",
          "Voice Calls",
          "Video Meetings",
          "Team Channels",
        ],
      ],
      [
        "Document Productivity",
        ["IntelliWord", "IntelliNotes", "IntelliSheets", "IntelliSlides", "IntelliForms"],
      ],
      ["Communication", ["IntelliText", "Internal Messaging", "Announcements"]],
      ["File Management", ["IntelliDrive", "Shared Files", "Document Collaboration"]],
      ["Creative Workspace", ["IntelliStudio", "Templates", "Creative Projects"]],
      ["Team Collaboration", ["Shared Workspaces", "Project Collaboration", "Team Calendars"]],
    ],
  ],
  [
    "AI Systems & Intelligence",
    "Central operating workspace for the platform's AI systems.",
    "everything",
    [
      ["AI Dashboard", ["AI System Overview", "AI Service Health"]],
      [
        "Maximus",
        [
          "Executive Intelligence",
          "Business Analysis",
          "Strategy & Planning",
          "War Room Assistance",
        ],
      ],
      [
        "Optimus",
        ["Technical Intelligence", "Evidence Search", "Platform Analysis", "Troubleshooting"],
      ],
      ["AI Assistants", ["Available Assistants", "Assistant Directory"]],
      ["AI Knowledge", ["Knowledge Sources", "Approved Data Access"]],
      ["AI Actions", ["Proposed Actions", "Pending Approvals", "Completed Actions"]],
      ["AI Governance", ["Permissions", "Safety Controls", "AI Activity History"]],
    ],
  ],
  [
    "IntelliStaff",
    "Workforce management, recruiting, employee lifecycle, and staff administration.",
    "contractor",
    [
      ["Workforce Dashboard", ["Workforce Overview", "Headcount", "Workforce Analytics"]],
      [
        "IntelliHire",
        [
          "Job Requisitions",
          "Job Listings",
          "Candidates",
          "Applicant Tracking",
          "Interviews",
          "Offers",
          "Hiring Approvals",
        ],
      ],
      [
        "IntelliWork",
        [
          "Employee Workspace",
          "Onboarding",
          "Offboarding",
          "Assignments",
          "Performance",
          "Training",
        ],
      ],
      [
        "Employee Administration",
        ["Employee Directory", "Contractor Directory", "Employment Records"],
      ],
      ["Workforce Scheduling", ["Work Schedules", "Shift Assignments", "Availability"]],
      ["Workforce Reporting", ["Hiring Analytics", "Retention", "Training Completion"]],
    ],
  ],
  [
    "NOC — Network Operations Center",
    "Monitor and operate network infrastructure.",
    "network",
    [
      ["NOC Dashboard", ["Network Health", "Infrastructure Status"]],
      ["Network Monitoring", ["Devices", "Routers", "Switches", "Firewalls", "Connections"]],
      ["Network Performance", ["Bandwidth", "Latency", "Availability"]],
      ["Network Incidents", ["Outages", "Performance Degradation", "Escalations"]],
      ["Infrastructure Inventory", ["Hardware", "Network Assets", "Locations"]],
      ["Maintenance", ["Maintenance Windows", "Planned Changes"]],
      ["NOC Reporting", ["Availability Reports", "Incident Reports"]],
    ],
  ],
  [
    "SOC — Security Operations Center",
    "Security monitoring, detection, investigation, and response.",
    "optimus",
    [
      ["SOC Dashboard", ["Security Posture", "Threat Overview"]],
      ["Threat Detection", ["Security Alerts", "Threat Intelligence", "Suspicious Activity"]],
      ["Security Incidents", ["Active Incidents", "Investigations", "Incident Evidence"]],
      ["Vulnerability Management", ["Vulnerability Inventory", "Risk Assessment", "Remediation"]],
      [
        "Identity Security",
        ["Suspicious Logins", "Privileged Access Monitoring", "Account Threats"],
      ],
      ["Response Operations", ["Response Playbooks", "Containment Requests", "Escalations"]],
      ["Security Reporting", ["Incident Reports", "Risk Reports", "Compliance Findings"]],
    ],
  ],
  [
    "Reports, Governance, Audit & Administration",
    "Enterprise-wide compliance, governance, oversight, and audit administration.",
    "tenant",
    [
      ["Governance Dashboard", ["Governance Overview", "Policy Status"]],
      [
        "Policies & Standards",
        ["Corporate Policies", "Security Standards", "Operational Standards"],
      ],
      ["Compliance", ["Compliance Frameworks", "Compliance Assessments", "Control Evidence"]],
      [
        "Audit Management",
        ["Audit Plans", "Audit Findings", "Evidence Requests", "Remediation Tracking"],
      ],
      [
        "Administrative Oversight",
        ["Administrator Directory", "Administrative Activity", "Privileged Operations"],
      ],
      ["Records Management", ["Retention", "Legal Holds", "Records Classification"]],
      ["Governance Reporting", ["Compliance Reports", "Audit Reports", "Risk Reports"]],
    ],
  ],
  [
    "Tenant Desk",
    "Manage companies, tenants, tenant administrators, and tenant-level operations.",
    "tenant",
    [
      ["Tenant Dashboard", ["Tenant Overview", "Tenant Health"]],
      ["Tenant Registry", ["Active Tenants", "Pending Tenants", "Tenant History"]],
      ["Tenant Administration", ["Tenant Profiles", "Tenant Administrators", "Tenant Settings"]],
      ["Tenant Resources", ["Applications", "Services", "Storage", "Licensing"]],
      ["Tenant Security", ["Tenant Policies", "Tenant Access", "Security Status"]],
      ["Tenant Support", ["Tenant Requests", "Tenant Incidents", "Escalations"]],
    ],
  ],
  [
    "Connector Hub",
    "Discover, authorize, configure, and manage external application connections.",
    "world",
    [
      ["Connector Dashboard", ["Connected Services", "Connection Health"]],
      ["Connector Marketplace", ["Available Providers", "Connector Catalog"]],
      [
        "Connected Applications",
        ["Microsoft", "Google", "AWS", "GitHub", "Other Authorized Providers"],
      ],
      [
        "Connector Configuration",
        ["Connection Settings", "API Configuration", "Scopes & Permissions"],
      ],
      ["Authentication", ["OAuth Connections", "Service Accounts", "Credential References"]],
      ["Custom Connectors", ["Custom API Connections", "Webhooks", "Connector Development"]],
      ["Testing & Monitoring", ["Connection Tests", "Connector Logs", "Failures", "Reconnection"]],
      ["Connector Administration", ["Permissions", "Ownership", "Disconnect", "Audit History"]],
    ],
  ],
  [
    "IntelliSync",
    "The central data synchronization, exchange, mapping, validation, and transfer engine.",
    "network",
    [
      ["IntelliSync Dashboard", ["Sync Health", "Transfer Overview"]],
      ["Sync Jobs", ["Active Jobs", "Completed Jobs", "Failed Jobs"]],
      ["Scheduling", ["Scheduled Sync", "Real-Time Sync", "Event-Triggered Sync"]],
      [
        "Data Mapping",
        ["Source Mapping", "Destination Mapping", "Field Mapping", "Transformation Rules"],
      ],
      ["Data Validation", ["Validation Rules", "Duplicate Detection", "Data Quality"]],
      ["Conflict Management", ["Conflict Review", "Resolution Rules", "Manual Resolution"]],
      ["Transfer Operations", ["Imports", "Exports", "Data Exchange"]],
      ["Recovery", ["Failed Transfers", "Retry", "Recovery", "Reconciliation"]],
      ["Sync Monitoring", ["Transfer Logs", "Performance", "Job Status"]],
      ["Sync Administration", ["Sync Permissions", "Connector Associations", "Audit History"]],
    ],
  ],
  [
    "Automation Center",
    "Create, schedule, manage, and monitor automated tasks.",
    "primary",
    [
      ["Automation Dashboard", ["Automation Health", "Active Automations"]],
      ["Automation Builder", ["Visual Builder", "Triggers", "Actions"]],
      ["Templates", ["Approved Templates", "Custom Templates"]],
      ["Scheduled Automation", ["Scheduled Jobs", "Recurring Jobs"]],
      ["Event Automation", ["Event Triggers", "Conditional Actions"]],
      ["Approval-Based Automation", ["Approval Gates", "Pending Approvals"]],
      ["Monitoring", ["Execution History", "Failed Automations", "Recovery"]],
    ],
  ],
  [
    "API & Developer Center",
    "Developer tools, API management, application integration, and technical documentation.",
    "world",
    [
      ["Developer Dashboard", ["Developer Overview", "API Usage"]],
      ["API Registry", ["API Directory", "API Versions"]],
      ["Documentation", ["API Reference", "Developer Guides"]],
      ["Credentials", ["API Key Management", "OAuth Applications", "Credential References"]],
      ["Webhooks", ["Webhook Registry", "Event Subscriptions"]],
      ["Developer Applications", ["Application Registration", "Application Ownership"]],
      ["Testing", ["Sandbox", "API Testing", "Test Results"]],
      ["Monitoring", ["API Performance", "Rate Limits", "Error Logs"]],
    ],
  ],
  [
    "Data Management Center",
    "Manage enterprise data quality, classification, ownership, retention, and lifecycle.",
    "tenant",
    [
      ["Data Dashboard", ["Data Health", "Data Inventory"]],
      ["Data Sources", ["Internal Sources", "External Sources"]],
      ["Data Catalog", ["Data Assets", "Data Ownership", "Data Lineage"]],
      ["Classification", ["Sensitive Data", "Confidential Data", "Public Data"]],
      ["Data Quality", ["Validation", "Completeness", "Duplicate Detection"]],
      ["Governance", ["Data Policies", "Access Rules", "Retention"]],
      ["Data Exchange", ["Imports", "Exports", "Transfer Approvals"]],
      ["Recovery", ["Recovery Requests", "Data Restoration"]],
    ],
  ],
  [
    "Workflow Center",
    "Design and operate business processes and approval workflows.",
    "maximus",
    [
      ["Workflow Dashboard", ["Active Workflows", "Workflow Health"]],
      ["Workflow Designer", ["Workflow Builder", "Conditions", "Assignments"]],
      ["Templates", ["Business Templates", "Approval Templates"]],
      ["Approvals", ["Pending Approvals", "Approval History"]],
      ["Active Workflows", ["Running Processes", "Paused Processes"]],
      ["Assignments", ["My Assignments", "Team Assignments"]],
      ["Monitoring", ["Execution History", "Failed Workflows", "Performance"]],
    ],
  ],
  [
    "Notification Center",
    "Central administration and delivery of platform notifications.",
    "primary",
    [
      ["Notification Dashboard", ["Delivery Status", "Notification Overview"]],
      [
        "Announcements",
        ["Global Announcements", "Company Announcements", "Department Announcements"],
      ],
      ["Employee Notifications", ["Personal Alerts", "Work Notifications"]],
      ["System Alerts", ["Service Alerts", "Platform Alerts"]],
      ["Security Alerts", ["Account Alerts", "Security Events"]],
      ["Templates", ["Notification Templates", "Message Templates"]],
      ["Delivery Monitoring", ["Sent", "Failed", "Retry History"]],
      ["Preferences", ["User Preferences", "Delivery Channels"]],
    ],
  ],
  [
    "Command & Control Center",
    "Executive-level operational coordination across the enterprise.",
    "maximus",
    [
      ["Global Operations Dashboard", ["Organization Overview", "Operational Status"]],
      ["Cross-Department Operations", ["Department Status", "Coordination"]],
      ["Critical Events", ["Critical Event Register", "Active Response"]],
      ["Incident Coordination", ["Incident Overview", "Escalations"]],
      ["Executive Operations", ["Executive Briefings", "Operational Decisions"]],
      ["Command Monitoring", ["System Status", "Business Continuity", "Operational Risks"]],
    ],
  ],
  [
    "Global Search",
    "One authorized search interface across the enterprise platform.",
    "everything",
    [
      ["Search Dashboard", ["Recent Searches", "Suggested Searches"]],
      ["People Search", ["Employees", "Contractors", "Administrators"]],
      ["Application Search", ["Applications", "Modules", "Services"]],
      ["Knowledge Search", ["Articles", "Documentation", "Training"]],
      ["Business Search", ["Organizations", "Financial Records", "Business Documents"]],
      ["Operations Search", ["Tickets", "Incidents", "Tasks"]],
      ["Search Administration", ["Index Health", "Search Configuration"]],
    ],
  ],
  [
    "Calendar & Scheduling Center",
    "Central calendar and scheduling management.",
    "world",
    [
      ["Calendar Dashboard", ["Today's Schedule", "Upcoming Events"]],
      ["Personal Calendar", ["Meetings", "Appointments"]],
      ["Business Calendar", ["Corporate Events", "Executive Events"]],
      ["Department Calendars", ["Team Events", "Shift Schedules"]],
      ["Meetings", ["Meeting Rooms", "Video Meetings", "Invitations"]],
      ["Resource Scheduling", ["Room Booking", "Equipment Booking"]],
      ["Scheduling Administration", ["Calendar Policies", "Availability Rules"]],
    ],
  ],
  [
    "War Room & Emergency Operations Center",
    "Coordinated response to serious operational, security, infrastructure, and business emergencies.",
    "network",
    [
      ["War Room Dashboard", ["Active War Rooms", "Emergency Status"]],
      ["War Room Management", ["Create War Room", "Active Sessions", "War Room History"]],
      ["Emergency Operations", ["Emergency Coordination", "Response Assignments", "Escalations"]],
      [
        "Scenario Simulator",
        ["Scenario Library", "Custom Scenarios", "Simulation Sessions", "Exercise Results"],
      ],
      ["Security Scenarios", ["Password Leak", "Data Breach", "Ransomware", "Cyberattack"]],
      ["Infrastructure Scenarios", ["Network Outage", "Cloud Failure", "Application Failure"]],
      ["Business Continuity", ["Disaster Recovery", "Continuity Planning", "Recovery Exercises"]],
      ["Team Coordination", ["Breakout Rooms", "Team Assignments", "Emergency Communications"]],
      ["Incident Evidence", ["Attachments", "Timeline", "Decisions", "Action Items"]],
      ["Post-Incident Review", ["After-Action Reports", "Lessons Learned", "Improvement Plans"]],
    ],
  ],
  [
    "AI Model & Provider Management",
    "Manage AI providers, model availability, configuration, governance, and usage.",
    "everything",
    [
      ["AI Provider Dashboard", ["Provider Status", "Model Availability"]],
      ["Provider Directory", ["Approved Providers", "Provider Connections"]],
      ["Model Registry", ["Available Models", "Model Versions"]],
      ["Configuration", ["Model Settings", "Routing", "Fallback Policies"]],
      ["Access & Security", ["Model Permissions", "Credential References", "Usage Policies"]],
      ["Monitoring", ["Performance", "Latency", "Errors"]],
      ["Cost Management", ["Usage", "Budgets", "Cost Reports"]],
      ["AI Governance", ["Safety Rules", "Evaluation", "Model Approval"]],
    ],
  ],
  [
    "Global Reporting & Analytics",
    "Enterprise-wide reporting, measurement, dashboards, and business intelligence.",
    "everything",
    [
      ["Analytics Dashboard", ["Global Overview", "Executive Metrics"]],
      ["Business Analytics", ["Revenue", "Expenses", "Growth"]],
      ["Financial Analytics", ["Quarterly Results", "Annual Results", "Forecasts"]],
      ["Workforce Analytics", ["Headcount", "Hiring", "Retention", "Training"]],
      ["Operational Analytics", ["Service Desk", "Network Operations", "Security Operations"]],
      ["Platform Analytics", ["Application Usage", "Platform Health", "System Performance"]],
      ["Custom Reporting", ["Report Builder", "Saved Reports", "Scheduled Reports"]],
      ["Data Visualization", ["Charts", "Dashboards", "Exported Reports"]],
    ],
  ],
];

export const NAV: NavSection[] = MENU.map(([title, summary, tone, groups], i) => ({
  number: String(i + 1).padStart(2, "0"),
  title,
  slug: slugify(title),
  summary,
  tone,
  groups: groups.map(([g, pages]) => ({
    title: g,
    slug: slugify(g),
    pages: pages.map((page) => ({ title: page, slug: slugify(page) })),
  })),
}));

export function findSection(slug: string) {
  return NAV.find((section) => section.slug === slug);
}

export function findPage(sectionSlug: string, groupSlug: string, pageSlug: string) {
  const section = NAV.find((item) => item.slug === sectionSlug);
  const group = section?.groups.find((item) => item.slug === groupSlug);
  const page = group?.pages.find((item) => item.slug === pageSlug);
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
