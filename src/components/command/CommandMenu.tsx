import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GripVertical,
  Home,
  Lock,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useCommandState } from "@/lib/domain/store";
import { Chip } from "@/components/command/ui";
import {
  allDestinations,
  canRoleSee,
  findDestination,
  MENU_ORDER_KEY,
  orderedSections,
  searchDestinations,
  type MenuSection,
  type Role,
} from "@/lib/menu-spec";

const PINNED = [
  { to: "/", label: "Command Center" },
  { to: "/help-buddy", label: "Help Buddy" },
  { to: "/mission-control", label: "Mission Control" },
  { to: "/connectors", label: "Connectors" },
  { to: "/intellisync", label: "IntelliSync" },
  { to: "/character-studio", label: "Character Studio" },
];

function readOrder(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MENU_ORDER_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function CommandMenu({ active, onClose }: { active?: string; onClose: () => void }) {
  const state = useCommandState();
  const role = state.users.find((user) => user.id === state.activeUserId)?.role as Role | undefined;
  const activeDestination = active ? findDestination(active) : undefined;

  const [order, setOrder] = useState<string[]>(readOrder);
  const [expanded, setExpanded] = useState<string>(
    activeDestination?.sectionId ?? "command-center",
  );
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    searchRef.current?.focus();
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MENU_ORDER_KEY, JSON.stringify(order));
    } catch {
      /* storage is optional */
    }
  }, [order]);

  const sections = useMemo(() => orderedSections(order), [order]);
  const results = useMemo(() => searchDestinations(query), [query]);
  const visibleCount = sections.filter((section) => canRoleSee(section, role)).length;
  const hiddenCount = sections.length - visibleCount;

  const moveSection = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setOrder((current) => {
      const base = current.length > 0 ? [...current] : sections.map((section) => section.id);
      const from = base.indexOf(sourceId);
      const to = base.indexOf(targetId);
      if (from === -1 || to === -1) return base;
      base.splice(to, 0, base.splice(from, 1)[0] as string);
      return base;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <nav aria-label="Command menu" className="mx-menu scroll-blue">
        <header className="mx-menu-head">
          <div>
            <span className="mx-menu-eyebrow">IntelliStack Systems</span>
            <strong>Command Menu</strong>
          </div>
          <button type="button" className="mx-menu-close" aria-label="Close menu" onClick={onClose}>
            <X aria-hidden />
          </button>
        </header>

        <div className="mx-menu-search">
          <Search aria-hidden />
          <input
            ref={searchRef}
            aria-label="Search the command menu"
            placeholder="Search destinations, apps, records…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="mx-menu-scroll">
          {query ? (
            <div className="mx-menu-results">
              <div className="mx-menu-label">{results.length} destinations</div>
              {results.map((destination) => (
                <Link
                  key={destination.slug}
                  to="/section/$slug"
                  params={{ slug: destination.slug }}
                  className="mx-menu-result"
                  onClick={onClose}
                >
                  <span>{destination.label}</span>
                  <small>
                    {destination.sectionTitle} · {destination.groupName}
                  </small>
                </Link>
              ))}
              {results.length === 0 ? (
                <p className="mx-menu-empty">Nothing matches that search.</p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mx-menu-pinned">
                {PINNED.map((item) => (
                  <Link key={item.to} to={item.to} className="mx-menu-pin" onClick={onClose}>
                    {item.to === "/" ? <Home aria-hidden /> : <Sparkles aria-hidden />}
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mx-menu-label">
                {visibleCount} native sections accessible · {allDestinations.length} destinations
              </div>

              {sections
                .filter((section) => !section.external)
                .map((section) => (
                  <MenuSectionRow
                    key={section.id}
                    section={section}
                    role={role}
                    expanded={expanded === section.id}
                    activeSlug={active}
                    dragging={dragging === section.id}
                    onToggle={() => setExpanded(expanded === section.id ? "" : section.id)}
                    onDragStart={() => setDragging(section.id)}
                    onDragEnd={() => setDragging(null)}
                    onDrop={() => {
                      if (dragging) moveSection(dragging, section.id);
                      setDragging(null);
                    }}
                    onClose={onClose}
                    draggable
                  />
                ))}

              <div className="mx-menu-external">
                <div className="mx-menu-external-head">
                  <ExternalLink aria-hidden />
                  <div>
                    <strong>External Connectors</strong>
                    <small>Third-party applications — not IntelliStack products</small>
                  </div>
                </div>
                {sections
                  .filter((section) => section.external)
                  .map((section) => (
                    <MenuSectionRow
                      key={section.id}
                      section={{ ...section, title: "Authorize third-party apps" }}
                      role={role}
                      expanded={expanded === section.id}
                      activeSlug={active}
                      dragging={false}
                      onToggle={() => setExpanded(expanded === section.id ? "" : section.id)}
                      onDragStart={() => undefined}
                      onDragEnd={() => undefined}
                      onDrop={() => undefined}
                      onClose={onClose}
                    />
                  ))}
              </div>
            </>
          )}
        </div>

        <footer className="mx-menu-foot">
          <span>{`Signed in as ${state.users.find((user) => user.id === state.activeUserId)?.name ?? "guest"} · ${role ?? "no role"}`}</span>
          {hiddenCount > 0 ? (
            <span>
              <Lock aria-hidden /> {hiddenCount} section{hiddenCount === 1 ? "" : "s"} require a
              higher role
            </span>
          ) : null}
        </footer>
      </nav>
      <button type="button" className="mx-menu-scrim" aria-label="Dismiss menu" onClick={onClose} />
    </div>
  );
}

function MenuSectionRow({
  section,
  role,
  expanded,
  activeSlug,
  dragging,
  onToggle,
  onDragStart,
  onDragEnd,
  onDrop,
  onClose,
  draggable,
}: {
  section: MenuSection;
  role: Role | undefined;
  expanded: boolean;
  activeSlug: string | undefined;
  dragging: boolean;
  onToggle: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onClose: () => void;
  draggable?: boolean;
}) {
  const permitted = canRoleSee(section, role);
  const count = section.groups.reduce((sum, group) => sum + group.destinations.length, 0);
  const containsActive = section.groups.some((group) =>
    group.destinations.some((destination) => destination.slug === activeSlug),
  );

  return (
    <div
      className={`mx-menu-section${section.external ? " is-external" : ""}${containsActive ? " is-active" : ""}${
        dragging ? " is-dragging" : ""
      }`}
      onDragOver={(event) => {
        if (draggable) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <div className="mx-menu-section-head">
        {draggable ? (
          <span
            className="mx-menu-grip"
            draggable
            role="button"
            tabIndex={-1}
            aria-label={`Reorder ${section.title}`}
            title="Drag to reorder"
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <GripVertical aria-hidden />
          </span>
        ) : null}
        <button
          type="button"
          className="mx-menu-section-toggle"
          aria-expanded={expanded}
          onClick={() => permitted && onToggle()}
          disabled={!permitted}
        >
          <span className="mx-menu-number">
            {section.external ? <ExternalLink aria-hidden /> : section.number}
          </span>
          <span className="mx-menu-section-text">
            <strong>{section.title}</strong>
            <small>{`${count} destinations`}</small>
          </span>
          {permitted ? null : (
            <Chip tone="neutral">
              <Lock aria-hidden /> Restricted
            </Chip>
          )}
          {expanded ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
        </button>
      </div>

      {expanded && permitted ? (
        <div className="mx-menu-section-body">
          <p className="mx-menu-section-desc">{section.description}</p>
          {section.groups.map((group) => (
            <div className="mx-menu-group" key={group.id}>
              <div className="mx-menu-group-name">{group.name}</div>
              <div className="mx-menu-links">
                {group.destinations.map((destination) => (
                  <Link
                    key={destination.slug}
                    to="/section/$slug"
                    params={{ slug: destination.slug }}
                    className={`mx-menu-link${destination.slug === activeSlug ? " is-active" : ""}`}
                    onClick={onClose}
                  >
                    {destination.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
