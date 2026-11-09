import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceShell } from "@/components/command/ui";
import { ConnectorCatalog } from "@/components/command/connectors/ConnectorCatalog";

interface ConnectorSearch {
  doc?: string;
}

export const Route = createFileRoute("/connectors")({
  validateSearch: (search: Record<string, unknown>): ConnectorSearch => {
    const doc = search["doc"];
    return typeof doc === "string" ? { doc } : {};
  },
  head: () => ({
    meta: [
      { title: "Platform Connectors — Maximus Optimus Command Center" },
      {
        name: "description",
        content:
          "Bring external applications and documents into the Command Center: connect a provider, verify its health, browse its files and link originals or import copies into real work.",
      },
      { property: "og:title", content: "Platform Connectors — Maximus Optimus" },
      {
        property: "og:description",
        content:
          "Connected, syncing, attention and available connectors with an honest IntelliSync trail.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ConnectorsPage,
});

function ConnectorsPage() {
  const { doc } = Route.useSearch();
  return (
    <WorkspaceShell
      eyebrow="MAXIMUS OPTIMUS · PLATFORM CONNECTORS"
      title="Platform Connectors"
      subtitle="Bring external applications and documents into the Command Center. Every connection, synchronization and document action is recorded in state."
      moduleLinks
    >
      <ConnectorCatalog initialDocumentId={doc} />
    </WorkspaceShell>
  );
}
