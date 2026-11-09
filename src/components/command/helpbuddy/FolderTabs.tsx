import type { ComponentType, ReactNode } from "react";

export interface FolderTabDefinition {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  count?: number;
  hint?: string;
}

/**
 * Compact folder-tab strip: five tabs per row at desktop width, never a horizontal scroller.
 * The active tab is drawn as an open folder joined to the workspace below it.
 */
export function FolderTabs({
  tabs,
  active,
  onChange,
  children,
  footer,
}: {
  tabs: FolderTabDefinition[];
  active: string;
  onChange: (id: string) => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-folder">
      <div className="mx-folder-strip" role="tablist" aria-label="Help Buddy modules">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`hb-panel-${tab.id}`}
              className={`mx-folder-tab${isActive ? " is-active" : ""}`}
              onClick={() => onChange(tab.id)}
              title={tab.hint ?? tab.label}
            >
              <Icon />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{tab.label}</span>
              {typeof tab.count === "number" && tab.count > 0 ? (
                <span className="mx-folder-count">{tab.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mx-folder-panel" role="tabpanel" id={`hb-panel-${active}`}>
        {children}
      </div>
      {footer}
    </div>
  );
}
