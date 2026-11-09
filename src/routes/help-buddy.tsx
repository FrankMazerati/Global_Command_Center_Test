import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BookMarked,
  BookOpen,
  ClipboardCheck,
  Contact,
  FileStack,
  FolderPlus,
  ListChecks,
  MessagesSquare,
  NotebookPen,
  Paperclip,
  Plug,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  SquarePen,
  Star,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { Chip, WorkspaceShell } from "@/components/command/ui";
import { FolderTabs, type FolderTabDefinition } from "@/components/command/helpbuddy/FolderTabs";
import { ConversationTab } from "@/components/command/helpbuddy/ConversationTab";
import { ActiveMission } from "@/components/command/helpbuddy/ActiveMission";
import {
  ChecklistsTab,
  ContactsTab,
  PlaybooksTab,
  TasksTab,
} from "@/components/command/helpbuddy/WorkTabs";
import {
  AttachmentsTab,
  KnowledgeTab,
  NotesTab,
} from "@/components/command/helpbuddy/PersonalTabs";
import {
  ApprovalsTab,
  RecognitionTab,
  SignaturesTab,
} from "@/components/command/helpbuddy/DecisionTabs";
import {
  ActivityTab,
  AddModulesTab,
  ConnectorTab,
  TicketTrailTab,
} from "@/components/command/helpbuddy/ContextTabs";
import { ModuleTab } from "@/components/command/helpbuddy/ModuleTabs";
import { useCommandState } from "@/lib/domain/store";
import { activeMissions, incomingMissions } from "@/lib/domain/selectors";

export const Route = createFileRoute("/help-buddy")({
  head: () => ({
    meta: [
      { title: "Help Buddy — Maximus Optimus Command Center" },
      {
        name: "description",
        content:
          "The intelligent assistant and personal work companion: conversation, checklists, knowledge, approvals, tasks and recognition in one workspace.",
      },
    ],
  }),
  component: HelpBuddyPage,
});

function HelpBuddyPage() {
  const state = useCommandState();
  const [active, setActive] = useState("conversation");
  const [missionCollapsed, setMissionCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerHeight < 840,
  );
  const [missionId, setMissionId] = useState<string | null>(null);
  const userId = state.activeUserId;
  const user = state.users.find((item) => item.id === userId);
  const character =
    state.characters.find((item) => item.id === state.activeCharacterId) ?? state.characters[0];

  const pendingApprovals = state.approvals.filter(
    (approval) => approval.status === "pending" || approval.status === "escalated",
  ).length;
  const awaitingSignatures = state.signatures.filter(
    (signature) => signature.status === "awaiting_signature",
  ).length;
  const openTasks = state.tasks.filter((task) => task.status !== "done").length;
  const incompleteChecklists = state.checklists.filter((checklist) =>
    checklist.items.some((item) => !item.done),
  ).length;
  const savedKnowledge = state.knowledge.filter((article) => article.savedAt !== null).length;
  const attentionConnectors = state.connectors.filter(
    (connector) => connector.status === "attention",
  ).length;
  const workItems = [...incomingMissions(state, userId), ...activeMissions(state, userId)].length;
  const moduleTabs = state.modules.filter((module) => module.inHelpBuddy);

  const tabs: FolderTabDefinition[] = [
    { id: "conversation", label: "Conversation", icon: MessagesSquare },
    { id: "checklists", label: "Checklists", icon: ListChecks, count: incompleteChecklists },
    { id: "knowledge", label: "Knowledge Base", icon: BookOpen, count: savedKnowledge },
    { id: "approvals", label: "Approvals", icon: ShieldCheck, count: pendingApprovals },
    {
      id: "attachments",
      label: "Attachments",
      icon: Paperclip,
      count: state.documentActions.length,
    },
    { id: "notes", label: "Notes", icon: NotebookPen, count: state.notes.length },
    { id: "recognition", label: "Recognition Ledger", icon: Trophy },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "connectors", label: "Connectors", icon: Plug, count: attentionConnectors },
    { id: "signatures", label: "Signatures", icon: SquarePen, count: awaitingSignatures },
    { id: "ticket-trail", label: "Ticket Trail", icon: RouteIcon, count: workItems },
    { id: "playbooks", label: "Playbooks", icon: BookMarked, count: state.playbooks.length },
    { id: "tasks", label: "Tasks", icon: ClipboardCheck, count: openTasks },
    { id: "contacts", label: "Contacts", icon: Contact },
    { id: "add-modules", label: "+ Add Modules", icon: FolderPlus, count: moduleTabs.length },
  ];

  const allTabs = [
    ...tabs,
    ...moduleTabs.map((module) => ({
      id: `module-${module.id}`,
      label: module.name,
      icon: Sparkles,
      hint: `Live ${module.name} data`,
    })),
  ];

  const tabContent = (() => {
    switch (active) {
      case "conversation":
        return (
          <ConversationTab
            onOpenTab={setActive}
            missionId={missionId}
            onMissionChange={setMissionId}
          />
        );
      case "checklists":
        return <ChecklistsTab />;
      case "knowledge":
        return <KnowledgeTab />;
      case "approvals":
        return <ApprovalsTab />;
      case "attachments":
        return <AttachmentsTab />;
      case "notes":
        return <NotesTab />;
      case "recognition":
        return <RecognitionTab />;
      case "activity":
        return <ActivityTab />;
      case "connectors":
        return <ConnectorTab />;
      case "signatures":
        return <SignaturesTab />;
      case "ticket-trail":
        return <TicketTrailTab />;
      case "playbooks":
        return <PlaybooksTab />;
      case "tasks":
        return <TasksTab />;
      case "contacts":
        return <ContactsTab />;
      case "add-modules":
        return <AddModulesTab onOpenTab={(tab) => setActive(tab)} />;
      default: {
        const moduleId = active.replace("module-", "");
        return <ModuleTab moduleId={moduleId} />;
      }
    }
  })();

  return (
    <WorkspaceShell
      eyebrow="HELP BUDDY · INTELLIGENT ASSISTANT"
      title="Help Buddy workspace"
      subtitle="Conversation, personal tools and the real records behind your work — one persistent workspace."
      moduleLinks
      actions={
        <>
          <Chip tone="accent" icon={Sparkles}>
            {character?.name ?? "Help Buddy"} ·{" "}
            {user?.role === "technician" ? "Technician permissions" : (user?.role ?? "user")}
          </Chip>
          <Chip tone="info" icon={FileStack}>
            {state.documentActions.length} document actions
          </Chip>
          <Chip tone="success" icon={Star}>
            {state.ledger.reduce((sum, entry) => sum + entry.stars, 0)} stars
          </Chip>
        </>
      }
    >
      <ActiveMission
        missionId={missionId}
        onMissionChange={setMissionId}
        onOpenTab={setActive}
        collapsed={missionCollapsed}
        onToggleCollapsed={() => setMissionCollapsed((value) => !value)}
      />
      <div className="mx-body" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
        <FolderTabs tabs={allTabs} active={active} onChange={setActive}>
          {tabContent}
        </FolderTabs>
      </div>
    </WorkspaceShell>
  );
}
