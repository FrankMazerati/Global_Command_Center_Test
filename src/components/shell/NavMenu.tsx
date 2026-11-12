import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  CircleHelp,
  GripVertical,
  Home,
  LayoutGrid,
  LogOut,
  Settings2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NAV, toneVar } from "@/lib/nav";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { SECTION_ICONS } from "./section-icons";

const ORDER_STORAGE_PREFIX = "mo:workspace-navigation-order:";
const SETTINGS_DESTINATION = {
  section: "intellistack-configuration-center",
  group: "platform-configuration",
  page: "global-settings",
};
const HELP_DESTINATION = {
  section: "intellibase",
  group: "getting-started",
  page: "welcome",
};

type NavMenuProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onLogout: () => void;
};

function savedOrder(userId: string) {
  try {
    const saved = window.localStorage.getItem(`${ORDER_STORAGE_PREFIX}${userId}`);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return NAV.map((section) => section.slug);
    const allowed = new Set(NAV.map((section) => section.slug));
    const validSaved = parsed.filter(
      (slug): slug is string => typeof slug === "string" && allowed.has(slug),
    );
    return [
      ...validSaved,
      ...NAV.map((section) => section.slug).filter((slug) => !validSaved.includes(slug)),
    ];
  } catch {
    return NAV.map((section) => section.slug);
  }
}

export function NavMenu({ open, onOpenChange, onLogout }: NavMenuProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [, , curSection, curGroup] = pathname.split("/");
  const [openSection, setOpenSection] = useState<string | null>(curSection ?? null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [sectionOrder, setSectionOrder] = useState(() => NAV.map((section) => section.slug));
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void getSupabaseClient()
      ?.auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        const userId = data.session?.user.id ?? null;
        setProfileId(userId);
        if (userId) setSectionOrder(savedOrder(userId));
      });
    setOpenSection(curSection ?? null);
    setOpenGroup(curSection && curGroup ? `${curSection}:${curGroup}` : null);
    return () => {
      active = false;
    };
  }, [open, curSection, curGroup]);

  const sections = useMemo(() => {
    const bySlug = new Map(NAV.map((section) => [section.slug, section]));
    return sectionOrder.map((slug) => bySlug.get(slug)).filter((section) => section !== undefined);
  }, [sectionOrder]);

  const persistOrder = useCallback(
    (next: string[]) => {
      if (!profileId) return;
      try {
        window.localStorage.setItem(`${ORDER_STORAGE_PREFIX}${profileId}`, JSON.stringify(next));
      } catch {
        // Navigation remains usable when browser storage is unavailable.
      }
    },
    [profileId],
  );

  const reorder = useCallback(
    (sectionSlug: string, targetSlug: string) => {
      if (sectionSlug === targetSlug) return;
      const next = [...sectionOrder];
      const from = next.indexOf(sectionSlug);
      const to = next.indexOf(targetSlug);
      if (from < 0 || to < 0) return;
      next.splice(from, 1);
      next.splice(to, 0, sectionSlug);
      setSectionOrder(next);
      persistOrder(next);
    },
    [persistOrder, sectionOrder],
  );

  const moveSection = (sectionSlug: string, offset: -1 | 1) => {
    const index = sectionOrder.indexOf(sectionSlug);
    const target = sectionOrder[index + offset];
    if (target) reorder(sectionSlug, target);
  };

  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="glass-strong holo-nav-sheet flex h-dvh w-[92vw] max-w-sm flex-col gap-0 border-sky-400/25 p-0 text-slate-100"
      >
        <SheetHeader className="shrink-0 border-b border-sky-400/20 bg-[#071326]/80 px-5 py-4 text-left">
          <SheetTitle className="font-display text-base tracking-wide">Navigation</SheetTitle>
          <SheetDescription className="text-xs">
            30 workspaces · select a workspace, category, then page
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <nav aria-label="Main" className="p-3">
            <Link
              to="/"
              onClick={close}
              className={cn(
                "holo-control mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent",
                pathname === "/" && "bg-accent text-accent-foreground",
              )}
            >
              <Home className="size-4 text-primary" /> Command Center
            </Link>
            <ol aria-label="Workspaces" className="list-none space-y-1 p-0">
              {sections.map((section, index) => {
                const Icon = SECTION_ICONS[section.slug] ?? LayoutGrid;
                const expanded = openSection === section.slug;
                const isCurrent = curSection === section.slug;
                return (
                  <li
                    key={section.slug}
                    draggable={Boolean(profileId)}
                    onDragStart={(event) => {
                      setDraggedSection(section.slug);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", section.slug);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const source = draggedSection ?? event.dataTransfer.getData("text/plain");
                      if (source) reorder(source, section.slug);
                      setDraggedSection(null);
                    }}
                    onDragEnd={() => setDraggedSection(null)}
                    className={cn(draggedSection === section.slug && "opacity-60")}
                  >
                    <div
                      className={cn(
                        "holo-control flex min-h-10 items-center gap-1 rounded-lg px-1.5 transition-colors hover:bg-accent",
                        isCurrent && "bg-accent/70",
                      )}
                    >
                      <GripVertical
                        aria-hidden="true"
                        className="size-3.5 shrink-0 cursor-grab text-muted-foreground"
                      />
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={`workspace-${section.slug}`}
                        onClick={() => {
                          setOpenSection(expanded ? null : section.slug);
                          setOpenGroup(
                            expanded ? null : `${section.slug}:${section.groups[0]?.slug ?? ""}`,
                          );
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
                      >
                        <span
                          className="grid size-7 shrink-0 place-items-center rounded-md text-primary-foreground"
                          style={{ background: toneVar[section.tone] }}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="mr-1.5 font-display text-[9px] text-muted-foreground">
                            {section.number}
                          </span>
                          {section.title}
                        </span>
                        <ChevronRight
                          className={cn(
                            "size-3.5 shrink-0 text-muted-foreground transition-transform",
                            expanded && "rotate-90",
                          )}
                        />
                      </button>
                      <div className="flex shrink-0 items-center">
                        <button
                          type="button"
                          aria-label={`Move ${section.title} up`}
                          title={`Move ${section.title} up`}
                          disabled={!profileId || index === 0}
                          onClick={() => moveSection(section.slug, -1)}
                          className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowUp className="size-3" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${section.title} down`}
                          title={`Move ${section.title} down`}
                          disabled={!profileId || index === sections.length - 1}
                          onClick={() => moveSection(section.slug, 1)}
                          className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowDown className="size-3" />
                        </button>
                      </div>
                    </div>
                    {expanded && (
                      <ul
                        id={`workspace-${section.slug}`}
                        className="mb-1 ml-7 mt-1 space-y-0.5 border-l border-sky-300/20 pl-2"
                      >
                        <li>
                          <Link
                            to="/m/$section"
                            params={{ section: section.slug }}
                            onClick={close}
                            className="block rounded-md px-2 py-1.5 text-xs font-medium text-primary hover:bg-accent"
                          >
                            Workspace overview
                          </Link>
                        </li>
                        {section.groups.map((group) => {
                          const groupKey = `${section.slug}:${group.slug}`;
                          const groupExpanded = openGroup === groupKey;
                          return (
                            <li key={group.slug}>
                              <button
                                type="button"
                                aria-expanded={groupExpanded}
                                aria-controls={`category-${section.slug}-${group.slug}`}
                                onClick={() => setOpenGroup(groupExpanded ? null : groupKey)}
                                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
                              >
                                <ChevronRight
                                  className={cn(
                                    "size-3 shrink-0 text-muted-foreground transition-transform",
                                    groupExpanded && "rotate-90",
                                  )}
                                />
                                <span className="min-w-0 flex-1">{group.title}</span>
                                <span className="text-[9px] text-muted-foreground">
                                  {group.pages.length}
                                </span>
                              </button>
                              {groupExpanded && (
                                <ul
                                  id={`category-${section.slug}-${group.slug}`}
                                  className="ml-3 space-y-0.5 border-l border-sky-300/15 py-0.5 pl-2"
                                >
                                  {group.pages.map((page) => {
                                    const href = `/m/${section.slug}/${group.slug}/${page.slug}`;
                                    const active = pathname === href;
                                    return (
                                      <li key={page.slug}>
                                        <Link
                                          to="/m/$section/$group/$page"
                                          params={{
                                            section: section.slug,
                                            group: group.slug,
                                            page: page.slug,
                                          }}
                                          onClick={close}
                                          aria-current={active ? "page" : undefined}
                                          className={cn(
                                            "block rounded-md px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground",
                                            active && "bg-primary/10 font-semibold text-primary",
                                          )}
                                        >
                                          {page.title}
                                        </Link>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </ScrollArea>
        <div className="shrink-0 border-t border-sky-400/20 bg-[#071326]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Support & account
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <Link
              to="/m/$section/$group/$page"
              params={SETTINGS_DESTINATION}
              onClick={close}
              className="flex min-h-10 items-center justify-center gap-1 rounded-md border border-sky-300/15 px-2 text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
            >
              <Settings2 className="size-3.5" /> Settings
            </Link>
            <Link
              to="/m/$section/$group/$page"
              params={HELP_DESTINATION}
              onClick={close}
              className="flex min-h-10 items-center justify-center gap-1 rounded-md border border-sky-300/15 px-2 text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
            >
              <CircleHelp className="size-3.5" /> Help Center
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="flex min-h-10 items-center justify-center gap-1 rounded-md border border-red-300/20 px-2 text-xs text-red-200 hover:bg-red-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70"
            >
              <LogOut className="size-3.5" /> Logout
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
