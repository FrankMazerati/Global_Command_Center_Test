import { History, Route as RouteIcon } from "lucide-react";
import type { Mission } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/domain/format";
import { Chip, Panel } from "@/components/command/ui";
import { EVENT_LABEL, EVENT_TONE } from "./missionMeta";

/**
 * The trail is the record. Every row here comes from `mission.trail`; no event is synthesised
 * and no stage is collapsed into another.
 */
export function TicketTrail({ mission }: { mission: Mission }) {
  const events = [...mission.trail].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, maxHeight: 188 }}>
      <Panel
        title="Ticket trail"
        icon={RouteIcon}
        note={`${mission.number} · ${events.length} recorded events · chronological`}
        scroll
        bodyClassName="mx-scroll"
        actions={<Chip tone="neutral">Never edited</Chip>}
      >
        {events.length === 0 ? (
          <span className="mx-tiny mx-muted">No trail events recorded for this mission.</span>
        ) : (
          <div className="mx-timeline">
            {events.map((event) => (
              <div key={event.id} className="mx-timeline-item" data-tone={EVENT_TONE[event.type]}>
                <div className="mx-inline" style={{ gap: 5 }}>
                  <Chip tone={EVENT_TONE[event.type]}>{EVENT_LABEL[event.type]}</Chip>
                  <span className="mx-timeline-summary">{event.summary}</span>
                </div>
                <div className="mx-timeline-detail" style={{ overflowWrap: "anywhere" }}>
                  {event.detail}
                </div>
                <div className="mx-timeline-meta">
                  <History style={{ width: 9, height: 9, verticalAlign: "-1px", marginRight: 3 }} />
                  {event.actorName} · {formatDateTime(event.at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
