import {
  Boxes,
  Cable,
  Database,
  Fingerprint,
  GitBranch,
  Scale,
  Send,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import type { CommandState } from "@/lib/domain/types";
import { Chip, Note, Panel, Progress, type Tone } from "@/components/command/ui";
import {
  adapterStatuses,
  buildEngineRegistry,
  engineSummary,
  type Engine,
  type ServiceState,
} from "@/lib/intellisync/registry";

const STATE_TONE: Record<ServiceState, Tone> = {
  operational: "success",
  attention: "warning",
  not_configured: "neutral",
  empty: "neutral",
};

const STATE_LABEL: Record<ServiceState, string> = {
  operational: "Operational",
  attention: "Attention",
  not_configured: "Not configured",
  empty: "No records",
};

const ICONS = {
  identity: Fingerprint,
  assets: Boxes,
  workflow: Workflow,
  communications: Send,
  events: GitBranch,
  governance: Scale,
};

export function EnginePanel({ state }: { state: CommandState }) {
  const engines = buildEngineRegistry(state);
  const adapters = adapterStatuses(state);
  const summary = engineSummary(engines);
  const total = summary.operational + summary.attention + summary.empty + summary.not_configured;
  const healthy =
    total === 0 ? 0 : Math.round(((summary.operational + summary.empty) / total) * 100);

  return (
    <>
      <Panel
        title="Six engines, one backbone"
        icon={Database}
        note={`${summary.operational} operational · ${summary.not_configured} awaiting configuration`}
      >
        <div className="mx-inline" style={{ justifyContent: "space-between", gap: 8 }}>
          <span className="mx-label">Backbone readiness</span>
          <span className="mx-tiny mx-muted">
            {healthy}% of services have their records or their provider configured
          </span>
        </div>
        <Progress value={healthy} tone={healthy > 60 ? "success" : "warning"} />
        <div className="mx-engine-grid">
          {engines.map((engine) => (
            <EngineCard key={engine.id} engine={engine} />
          ))}
        </div>
        <Note tone="info">
          A service is only marked operational when the records behind it exist. Directory, mail,
          calendar and device adapters stay “not configured” until credentials are supplied —
          nothing here simulates a successful external operation.
        </Note>
      </Panel>

      <Panel
        title="Provider adapters"
        icon={Cable}
        note={`${adapters.length} integration interfaces`}
      >
        <div className="mx-adapter-list">
          {adapters.map((adapter) => (
            <div className="mx-adapter-row" key={adapter.id}>
              <div className="mx-adapter-main">
                <strong>{adapter.provider}</strong>
                <span className="mx-tiny mx-muted">{adapter.capability}</span>
                <span className="mx-tiny">{adapter.detail}</span>
              </div>
              <Chip tone={STATE_TONE[adapter.state]}>{STATE_LABEL[adapter.state]}</Chip>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function EngineCard({ engine }: { engine: Engine }) {
  const Icon = ICONS[engine.icon];
  const operational = engine.services.filter((service) => service.state === "operational").length;
  return (
    <article className="mx-engine-card">
      <header>
        <Icon aria-hidden />
        <div>
          <strong>{engine.name}</strong>
          <span className="mx-tiny mx-muted">{engine.purpose}</span>
        </div>
        <Chip
          tone={
            operational === engine.services.length
              ? "success"
              : operational > 0
                ? "warning"
                : "neutral"
          }
        >
          {operational}/{engine.services.length}
        </Chip>
      </header>
      <ul>
        {engine.services.map((service) => (
          <li key={service.id}>
            <span className={`mx-service-dot is-${service.state}`} aria-hidden />
            <div>
              <span className="mx-service-name">{service.name}</span>
              <span className="mx-tiny mx-muted">{service.evidence}</span>
            </div>
            <Chip tone={STATE_TONE[service.state]}>{STATE_LABEL[service.state]}</Chip>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function ArchitectureStandard() {
  const layers = [
    {
      title: "Layer 1 · Command Center",
      body: "The single user-facing environment: dashboard, Help Buddy, Mission Control, connectors, studio and modules.",
      icon: ShieldCheck,
    },
    {
      title: "Layer 2 · IntelliSync",
      body: "Connectivity, orchestration, identity resolution, notifications and integration health for every module.",
      icon: GitBranch,
    },
    {
      title: "Layer 3 · Six engines",
      body: "Identity, assets, workflow, communications, events and governance — each with explicit services and state.",
      icon: Boxes,
    },
    {
      title: "Layer 4 · Shared data",
      body: "One record per person, device, ticket, mission, approval, document and audit event, with stable identifiers.",
      icon: Database,
    },
    {
      title: "Layer 5 · External systems",
      body: "Directory, mail, calendar, MDM and monitoring reach the platform through provider adapters only.",
      icon: Cable,
    },
    {
      title: "Layer 6 · Experience",
      body: "Consistent components and design tokens on top of the same services — no isolated pages.",
      icon: Workflow,
    },
  ];

  return (
    <Panel
      title="Architecture standard"
      icon={Scale}
      note="One platform · one connected intelligence"
    >
      <div className="mx-layer-list">
        {layers.map((layer) => (
          <div className="mx-layer-row" key={layer.title}>
            <layer.icon aria-hidden />
            <div>
              <strong>{layer.title}</strong>
              <span className="mx-tiny mx-muted">{layer.body}</span>
            </div>
          </div>
        ))}
      </div>
      <Note tone="warning">
        Directory writes, email delivery, calendar invitations and MDM actions require real provider
        credentials. Until a provider is configured the interface reports the outstanding
        requirement instead of a success state. The target schema and policies live in{" "}
        <code>supabase/schema.sql</code>; the standard is documented in{" "}
        <code>docs/INTELLISYNC.md</code>.
      </Note>
    </Panel>
  );
}
