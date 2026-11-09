// Editable homepage configuration — change messages and catalogs here without touching the layout.

export const MODULE_MAX = 10;
export const MODULE_ROW = 5;

export type DayPart = "morning" | "afternoon" | "evening";
export const greetingMessages: Record<DayPart, { title: string; message: string }> = {
  morning: { title: "Good morning", message: "Good morning. Your workday is ready." },
  afternoon: {
    title: "Good afternoon",
    message: "Good afternoon. Here’s what needs your attention.",
  },
  evening: { title: "Good evening", message: "Good evening. Let’s close out the day." },
};
export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

export const clampCount = (n: number) => Math.max(1, Math.min(MODULE_MAX, n));

export const clockCatalog = [
  { id: "ny", label: "New York", tz: "America/New_York" },
  { id: "chi", label: "Chicago", tz: "America/Chicago" },
  { id: "la", label: "Los Angeles", tz: "America/Los_Angeles" },
  { id: "lon", label: "London", tz: "Europe/London" },
  { id: "par", label: "Paris", tz: "Europe/Paris" },
  { id: "dxb", label: "Dubai", tz: "Asia/Dubai" },
  { id: "mum", label: "Mumbai", tz: "Asia/Kolkata" },
  { id: "sgp", label: "Singapore", tz: "Asia/Singapore" },
  { id: "tok", label: "Tokyo", tz: "Asia/Tokyo" },
  { id: "syd", label: "Sydney", tz: "Australia/Sydney" },
  { id: "sao", label: "São Paulo", tz: "America/Sao_Paulo" },
  { id: "jnb", label: "Johannesburg", tz: "Africa/Johannesburg" },
];

export const newsCatalog = [
  { id: "n1", label: "AI News", detail: "AI-driven insights accelerate global edge" },
  { id: "n2", label: "Network", detail: "Quantum network achieves 99.9% uptime" },
  { id: "n3", label: "Security", detail: "Zero-day patch deployed across edge" },
  { id: "n4", label: "Markets", detail: "Global markets rally on tech innovation" },
  { id: "n5", label: "Energy", detail: "Data center hits renewable milestone" },
  { id: "n6", label: "Compliance", detail: "New review models streamline audits" },
  { id: "n7", label: "Help Desk", detail: "Self-service adoption hits 87%" },
  { id: "n8", label: "BioTech", detail: "Breakthrough in diagnostics tech" },
  { id: "n9", label: "AR/VR", detail: "Remote collaboration boosts output" },
  { id: "n10", label: "Product", detail: "Platform v2.0 rollout complete" },
  { id: "n11", label: "Chicago", detail: "Business center expansion approved" },
];

export const marketCatalog = [
  { id: "m1", label: "S&P 500", detail: "5,312.40", change: "+0.62%" },
  { id: "m2", label: "Dow Jones", detail: "39,118.86", change: "+0.41%" },
  { id: "m3", label: "NASDAQ", detail: "18,412.75", change: "+0.87%" },
  { id: "m4", label: "FTSE 100", detail: "8,164.12", change: "-0.12%" },
  { id: "m5", label: "Nikkei 225", detail: "38,814.56", change: "+0.33%" },
  { id: "m6", label: "DAX", detail: "18,235.45", change: "+0.21%" },
  { id: "m7", label: "Hang Seng", detail: "17,718.61", change: "-0.48%" },
  { id: "m8", label: "Russell 2000", detail: "2,047.69", change: "+0.95%" },
  { id: "m9", label: "VIX", detail: "12.44", change: "-2.10%" },
  { id: "m10", label: "10Y Treasury", detail: "4.28%", change: "+0.03%" },
  { id: "m11", label: "Euro Stoxx", detail: "4,894.02", change: "+0.18%" },
];

export const tickerCatalog = [
  { id: "t1", label: "AAPL", detail: "214.42", change: "+1.24%" },
  { id: "t2", label: "MSFT", detail: "415.23", change: "+0.76%" },
  { id: "t3", label: "NVDA", detail: "1,208.88", change: "+2.31%" },
  { id: "t4", label: "GOOGL", detail: "176.45", change: "+0.58%" },
  { id: "t5", label: "AMZN", detail: "184.70", change: "-0.22%" },
  { id: "t6", label: "BTC", detail: "67,841.19", change: "+2.15%" },
  { id: "t7", label: "ETH", detail: "3,412.95", change: "+1.84%" },
  { id: "t8", label: "GOLD", detail: "2,354.30", change: "+0.45%" },
  { id: "t9", label: "TSLA", detail: "177.29", change: "-1.04%" },
  { id: "t10", label: "META", detail: "471.18", change: "+0.92%" },
  { id: "t11", label: "OIL", detail: "78.36", change: "-0.31%" },
];

export const quickPickCatalog = [
  { id: "q1", label: "IntelliDesk", detail: "Service requests", slug: "intellidesk" },
  { id: "q2", label: "People", detail: "Workforce", slug: "people-workforce" },
  { id: "q3", label: "Roles", detail: "User & role admin", slug: "user-role-administration" },
  { id: "q4", label: "Directory", detail: "Active Directory", slug: "new-active-directory" },
  { id: "q5", label: "Marketplace", detail: "Apps & spend", slug: "intellimarketplace" },
  { id: "q6", label: "Assets", detail: "Resources", slug: "assets-resources" },
  { id: "q7", label: "Security", detail: "Operations", slug: "security-operations" },
  { id: "q8", label: "Calendar", detail: "Productivity", slug: "business-productivity" },
  { id: "q9", label: "Integrations", detail: "Connectors", slug: "integrations-connectors" },
  { id: "q10", label: "Business", detail: "My business center", slug: "my-business-center" },
  { id: "q11", label: "Automation", detail: "IntelliSync", slug: "automation-intelligence" },
];

export const workSections = [
  {
    title: "Today's Priority Work",
    items: ["Approve Q4 access review", "Finalize vendor contract", "Review security posture"],
  },
  {
    title: "Open Tickets",
    items: ["#4821 VPN outage — Floor 42", "#4817 Laptop replacement", "#4809 License request"],
  },
  { title: "Tasks Due Today", items: ["Submit budget forecast", "Update onboarding checklist"] },
  { title: "Overdue Tasks", items: ["Policy acknowledgement (2 days)", "Expense report (1 day)"] },
  {
    title: "Pending Approvals",
    items: ["3 access requests", "2 purchase orders", "1 role change"],
  },
  {
    title: "Meetings",
    items: ["10:00 Leadership sync", "1:30 Vendor review", "4:00 1:1 Angela Brooks"],
  },
  {
    title: "Messages",
    items: ["Marcus Hill: Board deck ready?", "Renee Alvarez: Offer letter signed"],
  },
  { title: "Follow-Ups", items: ["Ping finance on PO #2231", "Confirm SSO cutover date"] },
  { title: "Recent Activity", items: ["Role 'Auditor' updated", "12 users synced from AD"] },
  { title: "Work From Previous Days", items: ["Draft DR plan (Mon)", "Asset audit notes (Tue)"] },
  { title: "Escalations", items: ["P1: Payroll integration failing"] },
  { title: "System Alerts", items: ["Certificate expires in 6 days", "Backup job delayed"] },
  { title: "Assigned Work", items: ["Migrate legacy groups", "Review MFA exceptions"] },
  {
    title: "Upcoming Work",
    items: ["Quarterly compliance audit (Nov 14)", "Holiday coverage plan"],
  },
];

export const helpBuddySections: {
  stage: "Today" | "Recent Days" | "Upcoming";
  title: string;
  items: string[];
}[] = [
  {
    stage: "Today",
    title: "What do I need to do?",
    items: ["3 priority items", "2 meetings before noon", "Approve access review first"],
  },
  {
    stage: "Today",
    title: "Prioritize Today's Tasks",
    items: ["1. Payroll escalation", "2. Access approvals", "3. Budget forecast"],
  },
  {
    stage: "Today",
    title: "Suggested Next Actions",
    items: ["Reply to Marcus Hill", "Close ticket #4817"],
  },
  {
    stage: "Today",
    title: "Daily Workload",
    items: ["14 items assigned • 5 done", "Estimated 4.5 hrs remaining"],
  },
  {
    stage: "Today",
    title: "Important Notifications",
    items: ["Certificate expiring soon", "New policy published"],
  },
  {
    stage: "Recent Days",
    title: "What is overdue?",
    items: ["Policy acknowledgement", "Expense report"],
  },
  {
    stage: "Recent Days",
    title: "Catch Up on Unfinished Work",
    items: ["DR plan draft — 60% done", "Asset audit notes"],
  },
  { stage: "Recent Days", title: "Blocked Work", items: ["SSO cutover — waiting on vendor"] },
  {
    stage: "Recent Days",
    title: "Follow-Up Reminders",
    items: ["Finance PO #2231", "HR offer confirmation"],
  },
  {
    stage: "Recent Days",
    title: "Open Issues",
    items: ["Backup job delayed", "2 failed sync jobs"],
  },
  {
    stage: "Recent Days",
    title: "Work Summary",
    items: ["Last 3 days: 31 items closed", "Avg. response 1.8 hrs"],
  },
  {
    stage: "Upcoming",
    title: "What can I handle next?",
    items: ["Review MFA exceptions (20 min)", "Update onboarding checklist"],
  },
  {
    stage: "Upcoming",
    title: "What is coming up?",
    items: ["Compliance audit Nov 14", "Holiday coverage plan"],
  },
  {
    stage: "Upcoming",
    title: "Recent Activity",
    items: ["12 users synced", "Role 'Auditor' updated"],
  },
];
