import { useNavigate } from "@tanstack/react-router";
import { Fingerprint } from "lucide-react";
import { useEffect, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ALL_DESTINATIONS } from "@/lib/nav";
import { useWork } from "@/lib/work-context";

// Global search across every destination, plus Global ID Search (user, company, tenant, org, ticket IDs).
const ID_PATTERN = /^(guid|gcid|tid|oid|tkt|inc|dev)[-_ ]?\w+/i;

export function GlobalSearch() {
  const { searchOpen, setSearchOpen, setActiveTicketId } = useWork();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, setSearchOpen]);

  const isId = ID_PATTERN.test(q.trim());
  const isTicket = /^(tkt|inc)/i.test(q.trim());

  return (
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
      <CommandInput
        value={q}
        onValueChange={setQ}
        placeholder="Search pages, or enter an ID (GUID-, GCID-, TID-, OID-, TKT-)…"
      />
      <CommandList>
        <CommandEmpty>No matching destination.</CommandEmpty>
        {isId && (
          <CommandGroup heading="Global ID Search">
            <CommandItem disabled value={`id-${q}`} className="items-start">
              <Fingerprint className="mt-0.5 size-4 text-contractor" />
              <div>
                <div className="font-medium">{q.trim().toUpperCase()}</div>
                <div className="text-xs text-muted-foreground">
                  ID lookup runs against the directory once the backend is connected.
                </div>
              </div>
            </CommandItem>
            {isTicket && (
              <CommandItem
                value={`set-ticket-${q}`}
                onSelect={() => {
                  setActiveTicketId(q.trim().toUpperCase());
                  setSearchOpen(false);
                  navigate({
                    to: "/m/$section/$group/$page",
                    params: {
                      section: "command-center",
                      group: "ticket-management",
                      page: "active-ticket-workspace",
                    },
                  });
                }}
              >
                Open {q.trim().toUpperCase()} as the active ticket
              </CommandItem>
            )}
          </CommandGroup>
        )}
        <CommandGroup heading="Destinations">
          {ALL_DESTINATIONS.map(({ section, group, page }) => (
            <CommandItem
              key={`${section.slug}/${group.slug}/${page.slug}`}
              value={`${page.title} ${group.title} ${section.title}`}
              onSelect={() => {
                setSearchOpen(false);
                navigate({
                  to: "/m/$section/$group/$page",
                  params: { section: section.slug, group: group.slug, page: page.slug },
                });
              }}
            >
              <div className="flex flex-col">
                <span>{page.title}</span>
                <span className="text-xs text-muted-foreground">
                  {section.title} › {group.title}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
