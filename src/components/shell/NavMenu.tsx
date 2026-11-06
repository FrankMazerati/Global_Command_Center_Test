import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home, LayoutGrid } from "lucide-react";
import { useEffect, useState } from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NAV, toneVar } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { SECTION_ICONS } from "./section-icons";

export function NavMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [, , curSection, curGroup] = pathname.split("/");
  const [openSection, setOpenSection] = useState<string | null>(curSection ?? null);
  const [openGroup, setOpenGroup] = useState<string | null>(curGroup ?? null);

  useEffect(() => {
    if (open) {
      setOpenSection(curSection ?? null);
      setOpenGroup(curGroup ?? null);
    }
  }, [open, curSection, curGroup]);

  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="glass-strong holo-nav-sheet w-[92vw] max-w-sm gap-0 border-sky-400/25 p-0 text-slate-100">
        <SheetHeader className="border-b border-sky-400/20 bg-[#071326]/80 px-5 py-4 text-left">
          <SheetTitle className="font-display text-base tracking-wide">Navigation</SheetTitle>
          <SheetDescription className="text-xs">Nine primary areas · Maximus Optimus Global Command Center</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100dvh-80px)]">
          <nav aria-label="Main" className="p-3">
            <Link
              to="/"
              onClick={close}
              className={cn(
                "holo-control mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent",
                pathname === "/" && "bg-accent text-accent-foreground",
              )}
            >
              <Home className="size-4 text-primary" /> Dashboard
            </Link>
            <ul className="space-y-1">
              {NAV.map((section) => {
                const Icon = SECTION_ICONS[section.slug] ?? LayoutGrid;
                const expanded = openSection === section.slug;
                const isCurrent = curSection === section.slug;
                return (
                  <li key={section.slug}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpenSection(expanded ? null : section.slug)}
                      className={cn(
                        "holo-control flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-accent",
                        isCurrent && "bg-accent/70",
                      )}
                    >
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-md text-primary-foreground"
                        style={{ background: toneVar[section.tone] }}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="flex-1">
                        <span className="mr-1.5 font-display text-[10px] text-muted-foreground">{section.number}</span>
                        {section.title}
                      </span>
                      <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-90")} />
                    </button>
                    {expanded && (
                      <ul className="mb-2 ml-7 mt-1 space-y-0.5 border-l pl-3">
                        <li>
                          <Link
                            to="/m/$section"
                            params={{ section: section.slug }}
                            onClick={close}
                            className="block rounded-md px-2 py-1.5 text-xs font-medium text-primary hover:bg-accent"
                          >
                            Section overview
                          </Link>
                        </li>
                        {section.groups.map((group) => {
                          const gOpen = openGroup === group.slug && expanded;
                          return (
                            <li key={group.slug}>
                              <button
                                type="button"
                                aria-expanded={gOpen}
                                onClick={() => setOpenGroup(gOpen ? null : group.slug)}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-accent"
                              >
                                <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", gOpen && "rotate-90")} />
                                <span className="flex-1">{group.title}</span>
                                <span className="text-[10px] text-muted-foreground">{group.pages.length}</span>
                              </button>
                              {gOpen && (
                                <ul className="ml-4 space-y-0.5 py-1">
                                  {group.pages.map((page) => {
                                    const href = `/m/${section.slug}/${group.slug}/${page.slug}`;
                                    const active = pathname === href;
                                    return (
                                      <li key={page.slug}>
                                        <Link
                                          to="/m/$section/$group/$page"
                                          params={{ section: section.slug, group: group.slug, page: page.slug }}
                                          onClick={close}
                                          aria-current={active ? "page" : undefined}
                                          className={cn(
                                            "block rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground",
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
            </ul>
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
