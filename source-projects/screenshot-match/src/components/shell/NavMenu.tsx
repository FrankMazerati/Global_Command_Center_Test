import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, GripVertical } from "lucide-react";
import { NAV, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const ORDER_KEY = "is-nav-order";

function hrefOf(item: NavItem) {
  return item.to ?? `/m/${item.id}`;
}

function NavLink({ item, collapsed, onNavigate, depth = 0 }: { item: NavItem; collapsed: boolean; onNavigate?: (() => void) | undefined; depth?: number }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = path === hrefOf(item);
  const cls = cn(
    "flex min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
    depth > 0 && !collapsed && "pl-9",
    active ? "glow-env bg-env-soft font-semibold" : "text-foreground/85 hover:bg-env-soft",
  );
  const inner = (
    <>
      <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-env-glow" : "text-env")} />
      {!collapsed && <span className="truncate">{item.title}</span>}
    </>
  );
  return item.to ? (
    <Link to={item.to} onClick={onNavigate} className={cls} title={item.title}>{inner}</Link>
  ) : (
    <Link to="/m/$slug" params={{ slug: item.id }} onClick={onNavigate} className={cls} title={item.title}>{inner}</Link>
  );
}

/** Expandable, collapsible, drag-reorderable navigation tree. */
export function NavMenu({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: (() => void) | undefined }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [order, setOrder] = useState<string[]>(NAV.map((n) => n.id));
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ORDER_KEY) ?? "null") as string[] | null;
      if (saved && NAV.every((n) => saved.includes(n.id))) setOrder(saved);
    } catch { /* ignore */ }
  }, []);

  const items = order.map((id) => NAV.find((n) => n.id === id)!).filter(Boolean);

  const drop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = order.filter((id) => id !== dragId);
    next.splice(next.indexOf(targetId), 0, dragId);
    setOrder(next);
    localStorage.setItem(ORDER_KEY, JSON.stringify(next));
    setDragId(null);
  };

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const containsActive = item.children?.some((c) => hrefOf(c) === path);
        const isOpen = open[item.id] ?? !!containsActive;
        return (
          <div
            key={item.id}
            draggable={!collapsed}
            onDragStart={() => setDragId(item.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(item.id)}
            className={cn("group relative", dragId === item.id && "opacity-50")}
          >
            {!collapsed && (
              <GripVertical className="absolute -left-1 top-2.5 h-4 w-4 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-60" />
            )}
            {item.children ? (
              <>
                <button
                  onClick={() => setOpen((o) => ({ ...o, [item.id]: !isOpen }))}
                  aria-expanded={isOpen}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground/85 transition hover:bg-env-soft",
                    containsActive && "text-foreground",
                  )}
                  title={item.title}
                >
                  <item.icon className="h-4 w-4 shrink-0 text-env" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate text-left">{item.title}</span>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 transition", isOpen && "rotate-180")} />
                    </>
                  )}
                </button>
                {isOpen && (
                  <div className="mt-1 flex flex-col gap-1">
                    {item.children.map((c) => (
                      <NavLink key={c.id} item={c} collapsed={collapsed} onNavigate={onNavigate} depth={1} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <NavLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
