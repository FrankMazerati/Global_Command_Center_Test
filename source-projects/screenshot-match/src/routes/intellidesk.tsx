import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Headset, LayoutDashboard, Ticket, ShieldCheck, Users, BookMarked, BookOpen, Zap,
  Plus, UserPlus, ArrowUpCircle, RefreshCw, FileBarChart, Inbox, AlertTriangle, Activity, Gauge,
} from "lucide-react";
import { GlassCard, ModuleHeader, ModuleTabs, ProgressBar, StatTile, StatusDot } from "@/components/glass/glass";

export const Route = createFileRoute("/intellidesk")({
  head: () => ({
    meta: [
      { title: "IntelliDesk — IT Service Operations | IntelliStack" },
      { name: "description", content: "Intelligent IT service operations and support management." },
      { property: "og:title", content: "IntelliDesk — IT Service Operations" },
      { property: "og:description", content: "Intelligent IT service operations and support management." },
    ],
  }),
  component: IntelliDesk,
});

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "sla", label: "SLA", icon: ShieldCheck },
  { id: "teams", label: "Teams", icon: Users },
  { id: "catalog", label: "Service Catalog", icon: BookMarked },
  { id: "kb", label: "Knowledge Base", icon: BookOpen },
];
const actions = [
  { label: "New Ticket", icon: Plus }, { label: "Assign Ticket", icon: UserPlus },
  { label: "Escalate", icon: ArrowUpCircle }, { label: "Knowledge Base", icon: BookOpen },
  { label: "Run Automation", icon: RefreshCw }, { label: "View Reports", icon: FileBarChart },
];
const workload = [["L1 Support", 78, "28 agents"], ["L2 Support", 65, "19 agents"], ["L3 Engineering", 52, "14 agents"], ["Network Ops", 71, "11 agents"], ["Security Ops", 63, "9 agents"]] as const;
const queue = [["Access Requests", 98], ["Hardware Requests", 74], ["Software Installs", 62], ["Account Changes", 48], ["Other Requests", 30]] as const;
const incidents = [["P1 Critical", 8, "danger"], ["P2 High", 23, "warning"], ["P3 Medium", 56, "info"], ["P4 Low", 112, "success"]] as const;
const activity = ["#INC-9842 — Marcus Johnson", "#SR-4810 — IT Support", "#INC-9839 — WS-D1047", "#SR-4805 — Finance Portal", "Automation resolved 24 tickets"];

function IntelliDesk() {
  const [tab, setTab] = useState("dashboard");
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <ModuleHeader icon={Headset} title="IntelliDesk" subtitle="Intelligent IT Service Operations & Support Management" />
      <ModuleTabs tabs={tabs} active={tab} onChange={setTab} />
      <p className="text-xs text-muted-foreground">Sample figures shown — live ticket data connects with the directory step.</p>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <GlassCard title="Service Desk Overview" icon={Gauge}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatTile value="847" label="Active Tickets" delta="12%" />
              <StatTile value="98.7%" label="SLA Compliance" delta="2.1%" />
              <StatTile value="312" label="Service Requests" delta="8%" />
              <StatTile value="23" label="Priority Incidents" delta="5%" up={false} />
            </div>
          </GlassCard>
          <div className="grid gap-4 md:grid-cols-2">
            <GlassCard title="Quick Actions" icon={Zap}>
              <div className="grid grid-cols-3 gap-2">
                {actions.map((a) => (
                  <button key={a.label} className="glass flex flex-col items-center gap-1 rounded-lg p-2 text-center text-xs hover:glow-env">
                    <a.icon className="h-5 w-5 text-env" />{a.label}
                  </button>
                ))}
              </div>
            </GlassCard>
            <GlassCard title="Support Teams Workload" icon={Users}>
              <div className="flex flex-col gap-3">
                {workload.map(([n, v, a]) => (
                  <div key={n}>
                    <div className="mb-1 flex justify-between text-xs"><span>{n}</span><span className="text-muted-foreground">{a} • {v}%</span></div>
                    <ProgressBar value={v} />
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <GlassCard title="Service Requests Queue" icon={Inbox} action={<span className="font-display text-xl font-bold">312</span>}>
            <ul className="flex flex-col gap-2 text-sm">
              {queue.map(([n, v]) => <li key={n} className="flex justify-between"><span>{n}</span><span className="font-semibold">{v}</span></li>)}
            </ul>
          </GlassCard>
          <GlassCard title="Priority Incidents" icon={AlertTriangle}>
            <ul className="flex flex-col gap-2 text-sm">
              {incidents.map(([n, v, t]) => <li key={n} className="flex items-center gap-2"><StatusDot tone={t} /><span className="flex-1">{n}</span><span className="font-semibold">{v}</span></li>)}
            </ul>
          </GlassCard>
          <GlassCard title="Recent Ticket Activity" icon={Activity}>
            <ul className="flex flex-col gap-2 text-xs">
              {activity.map((a) => <li key={a} className="flex items-center gap-2"><StatusDot tone="info" /><span className="truncate">{a}</span></li>)}
            </ul>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
