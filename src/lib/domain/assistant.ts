import type { CharacterState, CommandState, MessageReference, Mission } from "./types";
import {
  activeUser,
  completionBlockers,
  incomingMissions,
  missionProgress,
  recognitionSummary,
  workQueue,
} from "./selectors";
import { PENDING_REASON_LABEL, STATUS_LABEL } from "./format";

export interface AssistantReply {
  text: string;
  state: CharacterState;
  references: MessageReference[];
  grounded: boolean;
}

export interface AssistantContext {
  missionId: string | null;
}

const ref = {
  mission: (mission: Mission): MessageReference => ({
    type: "mission",
    id: mission.id,
    label: `${mission.number} · ${mission.title}`,
  }),
  knowledge: (id: string, label: string): MessageReference => ({ type: "knowledge", id, label }),
  checklist: (id: string, label: string): MessageReference => ({ type: "checklist", id, label }),
  task: (id: string, label: string): MessageReference => ({ type: "task", id, label }),
  approval: (id: string, label: string): MessageReference => ({ type: "approval", id, label }),
  document: (id: string, label: string): MessageReference => ({ type: "document", id, label }),
};

function findMission(state: CommandState, text: string): Mission | undefined {
  const match = /(inc|sr)-\d{3,}/i.exec(text);
  if (match)
    return state.missions.find(
      (mission) => mission.number.toLowerCase() === match[0].toLowerCase(),
    );
  return undefined;
}

function searchKnowledge(state: CommandState, text: string) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 3 &&
        ![
          "what",
          "should",
          "before",
          "about",
          "there",
          "their",
          "this",
          "that",
          "with",
          "have",
          "from",
        ].includes(word),
    );
  if (words.length === 0) return [];
  return state.knowledge
    .map((article) => {
      const haystack =
        `${article.title} ${article.summary} ${article.tags.join(" ")} ${article.body.join(" ")}`.toLowerCase();
      const score = words.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0);
      return { article, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((row) => row.article);
}

function nextOpenCheckpoint(mission: Mission) {
  return mission.checkpoints.find(
    (checkpoint) => checkpoint.state === "not_started" || checkpoint.state === "in_progress",
  );
}

export function replyTo(
  state: CommandState,
  input: string,
  context: AssistantContext,
): AssistantReply {
  const text = input.trim();
  const lower = text.toLowerCase();
  const user = activeUser(state);
  const mission =
    findMission(state, text) ??
    (context.missionId ? state.missions.find((item) => item.id === context.missionId) : undefined);

  if (!text) {
    return {
      text: "Ask me about a mission, a procedure, your open work, or where a document lives. I only answer from records you can already see.",
      state: "idle",
      references: [],
      grounded: true,
    };
  }

  if (/^(hi|hey|hello|good (morning|afternoon|evening))\b/.test(lower)) {
    const queue = workQueue(state, user.id);
    const incoming = incomingMissions(state, user.id);
    const first = incoming[0];
    return {
      text: `Hello ${user.name.split(" ")[0]}. You have ${queue.filter((item) => item.section === "new").length} new mission${queue.filter((item) => item.section === "new").length === 1 ? "" : "s"} to review and ${queue.filter((item) => item.section === "tasks").length} open tasks.${first ? ` The newest is ${first.number}, ${first.priority}, due within ${Math.max(0, Math.round((new Date(first.slaDueAt).getTime() - Date.now()) / 3_600_000))} hours. Nothing has been accepted automatically.` : ""}`,
      state: "speaking",
      references: first ? [ref.mission(first)] : [],
      grounded: true,
    };
  }

  if (mission && /(status|where|progress|summary|summarize|brief)/.test(lower)) {
    const progress = missionProgress(mission);
    const pending = mission.pending
      ? ` It is waiting on ${PENDING_REASON_LABEL[mission.pending.reason]?.toLowerCase() ?? "a dependency"}.`
      : "";
    return {
      text: `${mission.number} is "${STATUS_LABEL[mission.status]}" — ${mission.title}. ${progress.done} of ${progress.total} checkpoints have a recorded outcome, and the SLA window closes ${new Date(mission.slaDueAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.${pending}`,
      state: "responding",
      references: [ref.mission(mission)],
      grounded: true,
    };
  }

  if (mission && /(capture|first|start|begin|checkpoint|next step|what should i do)/.test(lower)) {
    const checkpoint = nextOpenCheckpoint(mission);
    if (!checkpoint) {
      return {
        text: `Every checkpoint on ${mission.number} already has an outcome. The next step is recording the resolution and verification, then completing the mission.`,
        state: "success",
        references: [ref.mission(mission)],
        grounded: true,
      };
    }
    return {
      text: `Start with "${checkpoint.title}". ${checkpoint.why} Expected result: ${checkpoint.expectedResult} Record what actually happened before moving on — I will not mark it complete for you.`,
      state: "working",
      references: [ref.mission(mission)],
      grounded: true,
    };
  }

  if (mission && /(escalat)/.test(lower)) {
    const block = completionBlockers(mission);
    return {
      text: `Escalation on ${mission.number} keeps the full history with the ticket, so the receiving team continues rather than restarts. Record the reason, the expertise required and the receiving team. Before escalating, note what is still unresolved: ${block.length > 0 ? block.map((item) => item.message).join(" ") : "no blocking items remain."}`,
      state: "concerned",
      references: [ref.mission(mission)],
      grounded: true,
    };
  }

  if (mission && /(resolv|clos|complet|finish)/.test(lower)) {
    const blockers = completionBlockers(mission);
    if (blockers.length === 0) {
      return {
        text: `The evidence requirements for ${mission.number} are satisfied. You can complete the mission and then close the ticket under the configured workflow. I will record both events separately with your identity and a timestamp.`,
        state: "success",
        references: [ref.mission(mission)],
        grounded: true,
      };
    }
    return {
      text: `${mission.number} cannot be completed yet: ${blockers.map((blocker) => blocker.message).join(" ")}`,
      state: "concerned",
      references: [ref.mission(mission)],
      grounded: true,
    };
  }

  if (/(knowledge|article|procedure|how do i|guide|runbook)/.test(lower)) {
    const matches = searchKnowledge(state, text);
    if (matches.length === 0) {
      return {
        text: "I did not find an article in your authorized knowledge base for that. I can search again with different words, or you can open the mission and record the finding so it becomes reusable knowledge.",
        state: "concerned",
        references: [],
        grounded: false,
      };
    }
    const top = matches[0]!;
    return {
      text: `${top.title} — ${top.summary} First step: ${top.body[0] ?? ""}`,
      state: "responding",
      references: matches.map((article) => ref.knowledge(article.id, article.title)),
      grounded: true,
    };
  }

  if (/(priorit|today|what should i (do|work on)|my work|overdue|queue)/.test(lower)) {
    const queue = workQueue(state, user.id);
    const overdue = queue.filter((item) => item.overdue);
    const top = queue
      .filter((item) => item.section === "new" || item.section === "accepted")
      .slice(0, 3);
    const parts: string[] = [];
    if (top.length > 0)
      parts.push(
        `Priority order: ${top.map((item, index) => `${index + 1}. ${item.title} (${item.statusLabel}${item.priority ? `, ${item.priority}` : ""})`).join("; ")}.`,
      );
    if (overdue.length > 0)
      parts.push(
        `${overdue.length} item${overdue.length === 1 ? " is" : "s are"} already past the deadline: ${overdue.map((item) => item.title).join(", ")}.`,
      );
    if (parts.length === 0) parts.push("Your queue is clear. Nothing is waiting on you right now.");
    return {
      text: parts.join(" "),
      state: "thinking",
      references: top
        .filter((item) => item.missionId)
        .map((item) => ({ type: "mission" as const, id: item.missionId!, label: item.title })),
      grounded: true,
    };
  }

  if (/(recogni|star|xp|level|badge)/.test(lower)) {
    const summary = recognitionSummary(state, user.id);
    return {
      text: `You have ${summary.stars} stars and ${summary.xp} XP at level ${summary.level} (${summary.levelName}). ${summary.nextLevelName ? `${summary.xpToNext} XP to ${summary.nextLevelName}.` : "You are at the highest configured level."} ${summary.badges.length} badge${summary.badges.length === 1 ? "" : "s"} recorded. Stars come from checkpoints with a recorded result, not from a closed ticket.`,
      state: "success",
      references: [],
      grounded: true,
    };
  }

  if (/(checklist)/.test(lower)) {
    const checklist = state.checklists.find((item) => item.items.some((entry) => !entry.done));
    if (!checklist) {
      return {
        text: "Every checklist is complete. Nothing is outstanding there.",
        state: "success",
        references: [],
        grounded: true,
      };
    }
    const remaining = checklist.items.filter((item) => !item.done);
    return {
      text: `${checklist.title} has ${remaining.length} item${remaining.length === 1 ? "" : "s"} left. Next: ${remaining[0]?.text ?? ""}`,
      state: "responding",
      references: [ref.checklist(checklist.id, checklist.title)],
      grounded: true,
    };
  }

  const knowledge = searchKnowledge(state, text);
  if (knowledge.length > 0) {
    const top = knowledge[0]!;
    return {
      text: `Closest match in your knowledge base: ${top.title}. ${top.summary}`,
      state: "responding",
      references: knowledge.map((article) => ref.knowledge(article.id, article.title)),
      grounded: true,
    };
  }

  return {
    text: "I do not have a record in your workspace that answers that, and I will not invent one. I can search the knowledge base, summarise a mission you own, or show what is waiting in your queue.",
    state: "concerned",
    references: [],
    grounded: false,
  };
}

/** Character state that reflects what the assistant is actually doing. */
export function stateForActivity(
  activity: "idle" | "typing" | "thinking" | "speaking" | "working" | "error",
): CharacterState {
  switch (activity) {
    case "typing":
      return "listening";
    case "thinking":
      return "thinking";
    case "speaking":
      return "speaking";
    case "working":
      return "working";
    case "error":
      return "concerned";
    default:
      return "idle";
  }
}
