import { createFileRoute } from "@tanstack/react-router";
import { CommandCenterHome } from "@/components/command/CommandCenterHome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IntelliStack Systems Presents | Maximus Optimus Global Command Center" },
      {
        name: "description",
        content: "Maximus Optimus Global Command Center by IntelliStack Systems.",
      },
      { property: "og:title", content: "Maximus Optimus Global Command Center" },
      {
        property: "og:description",
        content: "See everything locally. Connect everything globally. Powered by intelligence.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CommandCenterHome,
});
