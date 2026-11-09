import { useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Menu, ShieldCheck } from "lucide-react";
import { CommandMenu } from "./CommandMenu";
import commandBg from "@/assets/command-center-bg.jpg";
import shieldAsset from "@/assets/intellistack-shield.jpg.asset.json";

export type Tone = "danger" | "warning" | "info" | "success" | "neutral" | "accent";

export function Chip({
  children,
  tone = "neutral",
  icon: Icon,
  title,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ComponentType<{ className?: string }> | undefined;
  title?: string | undefined;
}) {
  return (
    <span className={`mx-chip mx-chip--${tone}`} title={title}>
      {Icon ? <Icon /> : <span className="mx-dot" />}
      {children}
    </span>
  );
}

export function Panel({
  title,
  icon: Icon,
  note,
  actions,
  children,
  className = "",
  bodyClassName = "",
  scroll = false,
  style,
}: {
  title?: string;
  icon?: ComponentType<{ className?: string }>;
  note?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  scroll?: boolean;
  style?: CSSProperties;
}) {
  return (
    <section className={`mx-panel ${className}`} style={style}>
      {(title || actions) && (
        <div className="mx-panel-head">
          <div>
            {title && (
              <span className="mx-panel-title">
                {Icon ? <Icon /> : null}
                {title}
              </span>
            )}
            {note ? <span className="mx-panel-note">{note}</span> : null}
          </div>
          {actions ? <div className="mx-btn-row">{actions}</div> : null}
        </div>
      )}
      <div className={`mx-panel-body ${scroll ? "mx-scroll" : ""} ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}

export function Kpi({
  value,
  label,
  tone,
}: {
  value: ReactNode;
  label: string;
  tone?: "danger" | "warning" | "success";
}) {
  return (
    <div className={`mx-kpi${tone ? ` mx-kpi--${tone}` : ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function Progress({ value, tone }: { value: number; tone?: "success" | "warning" }) {
  return (
    <div
      className={`mx-progress${tone ? ` mx-progress--${tone}` : ""}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Empty({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mx-empty">
      {Icon ? <Icon /> : <ShieldCheck />}
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string | undefined;
}) {
  return (
    <label className="mx-field">
      <span className="mx-label">{label}</span>
      {children}
      {hint ? <span className="mx-tiny mx-muted">{hint}</span> : null}
    </label>
  );
}

export function Note({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warning" | "danger" | "success";
}) {
  return <div className={`mx-note${tone === "info" ? "" : ` mx-note--${tone}`}`}>{children}</div>;
}

export function WorkspaceShell({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  moduleLinks,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
  moduleLinks?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const modules = [
    { label: "Help Buddy", to: "/help-buddy" },
    { label: "Mission Control", to: "/mission-control" },
    { label: "Connectors", to: "/connectors" },
    { label: "IntelliSync", to: "/intellisync" },
    { label: "Character Studio", to: "/character-studio" },
  ] as const;

  return (
    <div
      className="mx-page"
      style={{
        backgroundImage: `linear-gradient(115deg, rgba(247, 251, 255, 0.97), rgba(240, 247, 254, 0.94)), url(${commandBg})`,
      }}
    >
      {menuOpen ? <CommandMenu onClose={() => setMenuOpen(false)} /> : null}
      <header className="mx-topbar">
        <div className="mx-topbar-main">
          <button
            type="button"
            className="mx-menu-trigger"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu aria-hidden />
          </button>
          <Link to="/" className="mx-back" aria-label="Return to the Command Center">
            <ArrowLeft style={{ width: 12, height: 12 }} /> Command Center
          </Link>
          <img
            src={shieldAsset.url}
            alt=""
            style={{ width: 30, height: 34, objectFit: "contain" }}
          />
          <div className="mx-heading">
            <div className="mx-eyebrow">{eyebrow}</div>
            <h1 className="mx-title">{title}</h1>
            <p className="mx-sub">{subtitle}</p>
          </div>
        </div>
        <div className="mx-topbar-actions">
          {moduleLinks
            ? modules.map((item) => (
                <Link key={item.to} to={item.to} className="mx-btn mx-btn--sm">
                  {item.label}
                </Link>
              ))
            : null}
          {actions}
        </div>
      </header>
      {children}
    </div>
  );
}

export function formatRelative(iso: string): string {
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(diff) < 60) return rtf.format(diff, "minute");
  const hours = Math.round(diff / 60);
  if (Math.abs(hours) < 36) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}
