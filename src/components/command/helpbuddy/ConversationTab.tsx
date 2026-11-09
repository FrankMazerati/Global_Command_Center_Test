import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileText,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  Send,
  ShieldQuestion,
  Sparkles,
  SquareArrowOutUpRight,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { CharacterState, Message, Mission } from "@/lib/domain/types";
import { useAction, useCommandState, useDraft } from "@/lib/domain/store";
import { activeMissions, activeUser, incomingMissions } from "@/lib/domain/selectors";
import { formatTime } from "@/lib/domain/format";
import { HelpBuddyCharacter } from "./HelpBuddyCharacter";
import { Chip, Empty, Note } from "@/components/command/ui";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const ctor = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = ctor.SpeechRecognition ?? ctor.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = false;
  return recognition;
}

const QUICK_PROMPTS = [
  "What is waiting on me today?",
  "What should I capture first on INC-9842?",
  "Which procedure covers a stuck tunnel?",
  "How close am I to the next level?",
];

export function ConversationTab({
  onOpenTab,
  missionId: controlledMissionId,
  onMissionChange,
}: {
  onOpenTab: (tab: string) => void;
  missionId?: string | null;
  onMissionChange?: (missionId: string) => void;
}) {
  const state = useCommandState();
  const user = activeUser(state);
  const dispatch = useAction();
  const character =
    state.characters.find((item) => item.id === state.activeCharacterId) ?? state.characters[0]!;
  const conversation =
    state.conversations.find((item) => item.id === state.activeConversationId) ??
    state.conversations[0];

  const [localMissionId, setLocalMissionId] = useState<string>("");
  const missionId = controlledMissionId ?? localMissionId;
  const setMissionId = onMissionChange ?? setLocalMissionId;
  const [busy, setBusy] = useState<"idle" | "thinking" | "speaking">("idle");
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [draft, setDraft] = useDraft("helpbuddy.composer", "");
  const logRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const timers = useRef<number[]>([]);

  const contextMissions = useMemo<Mission[]>(() => {
    const rows = [...activeMissions(state, user.id), ...incomingMissions(state, user.id)];
    return rows
      .filter((mission, index) => rows.findIndex((item) => item.id === mission.id) === index)
      .slice(0, 6);
  }, [state, user.id]);

  const activeMission = contextMissions.find((mission) => mission.id === missionId) ?? null;

  useEffect(() => {
    if (!missionId && contextMissions[0]) setMissionId(contextMissions[0].id);
  }, [contextMissions, missionId, setMissionId]);

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [conversation?.messages.length, busy]);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    };
  }, []);

  function schedule(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    timers.current.push(timer);
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function send() {
    const text = draft.trim();
    if (!text || busy !== "idle") return;
    setBusy("thinking");
    const contextMission = activeMission?.id ?? null;
    schedule(() => {
      const result = dispatch(
        { type: "conversation.send", text, missionId: contextMission },
        { silent: true },
      );
      if (!result.ok) {
        setBusy("idle");
        return;
      }
      setDraft("");
      setBusy("speaking");
      if (speakReplies) {
        const latest = state.conversations.find((item) => item.id === state.activeConversationId);
        const lastAssistant = [...(latest?.messages ?? [])]
          .reverse()
          .find((message) => message.role === "assistant");
        if (lastAssistant) speak(lastAssistant.text);
      }
      schedule(() => setBusy("idle"), 1600);
    }, 650);
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = getRecognition();
    if (!recognition) {
      setVoiceError(
        "This browser does not expose speech recognition. Typing still works, and the composer keeps your draft.",
      );
      return;
    }
    setVoiceError(null);
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length })
        .map((_, index) => event.results[index]?.[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) setDraft(`${draft}${draft ? " " : ""}${transcript}`);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setVoiceError("Voice input stopped. Check microphone permission for this page.");
    };
    try {
      recognition.start();
      setListening(true);
    } catch {
      setVoiceError("Voice input could not start in this browser.");
    }
  }

  const characterState: CharacterState =
    busy === "thinking"
      ? "thinking"
      : busy === "speaking"
        ? "speaking"
        : listening
          ? "listening"
          : "idle";
  const messages = conversation?.messages ?? [];

  return (
    <div className="mx-split-row mx-split-row--chat" style={{ flex: 1, minHeight: 0 }}>
      <div className="mx-col" style={{ minHeight: 0 }}>
        <HelpBuddyCharacter
          character={character}
          state={characterState}
          detail={activeMission ? `Working on ${activeMission.number}` : character.roleLabel}
        />
        <div className="mx-panel mx-hide-narrow" style={{ gap: 6 }}>
          <div className="mx-panel-head" style={{ marginBottom: 0 }}>
            <div>
              <span className="mx-panel-title">
                <Sparkles /> Context
              </span>
            </div>
            <Link to="/character-studio" className="mx-btn mx-btn--sm mx-btn--ghost">
              Studio
            </Link>
          </div>
          <div className="mx-field">
            <span className="mx-label">Current mission context</span>
            <select
              className="mx-select"
              value={missionId}
              onChange={(event) => setMissionId(event.target.value)}
              aria-label="Mission context"
            >
              <option value="">No mission context</option>
              {contextMissions.map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.number} · {mission.title.slice(0, 42)}
                </option>
              ))}
            </select>
          </div>
          {activeMission ? (
            <div className="mx-kv">
              <dt>Status</dt>
              <dd>{activeMission.status.replace(/_/g, " ")}</dd>
              <dt>Priority</dt>
              <dd>{activeMission.priority}</dd>
              <dt>Checkpoints</dt>
              <dd>
                {
                  activeMission.checkpoints.filter((checkpoint) => checkpoint.state === "completed")
                    .length
                }{" "}
                of {activeMission.checkpoints.length} recorded
              </dd>
            </div>
          ) : (
            <Note>Select a mission and the assistant answers with that briefing in view.</Note>
          )}
          <div className="mx-divider" />
          <div className="mx-tiny mx-muted">
            Signed in as {user.name} · {user.title}. Help Buddy respects the permissions of this
            identity.
          </div>
        </div>
        <div className="mx-panel mx-hide-narrow" style={{ gap: 5 }}>
          <span className="mx-label">Start a question</span>
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              className="mx-row"
              style={{ gridTemplateColumns: "minmax(0,1fr)", textAlign: "left", cursor: "pointer" }}
              onClick={() => setDraft(prompt)}
            >
              <span className="mx-row-desc" style={{ margin: 0 }}>
                {prompt}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-panel" style={{ padding: 8, minHeight: 0 }}>
        <div className="mx-panel-head">
          <div>
            <span className="mx-panel-title">
              <ShieldQuestion /> Conversation
            </span>
            <span className="mx-panel-note">{conversation?.title ?? "No conversation"}</span>
          </div>
          <div className="mx-btn-row">
            <button
              className="mx-btn mx-btn--sm"
              onClick={() => dispatch({ type: "conversation.new" })}
            >
              <Plus /> New
            </button>
            <select
              className="mx-select"
              style={{ width: "auto", maxWidth: 150 }}
              value={state.activeConversationId}
              onChange={(event) =>
                dispatch({ type: "conversation.select", conversationId: event.target.value })
              }
              aria-label="Conversation history"
            >
              {state.conversations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title.slice(0, 34)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mx-chat" style={{ flex: 1, minHeight: 0 }}>
          <div className="mx-chat-log" ref={logRef} aria-live="polite">
            {messages.length === 0 ? (
              <Empty
                title="No messages yet"
                description="Ask about a mission, a procedure, your queue or the recognition ledger."
                icon={Sparkles}
              />
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}
            {busy === "thinking" ? (
              <div className="mx-msg">
                <div
                  className="mx-msg-bubble"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <span className="mx-dot" style={{ color: "#6a58b3" }} /> Checking records you can
                  access…
                </div>
              </div>
            ) : null}
          </div>

          {voiceError ? (
            <div className="mx-note mx-note--warning">
              <AlertTriangle
                style={{ width: 11, height: 11, marginRight: 4, verticalAlign: "-1px" }}
              />
              {voiceError}
            </div>
          ) : null}

          <div className="mx-composer">
            <div className="mx-composer-row">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder={listening ? "Listening…" : "Ask Help Buddy about your work…"}
                aria-label="Message Help Buddy"
              />
              <button
                className="mx-send"
                onClick={send}
                disabled={!draft.trim() || busy !== "idle"}
                aria-label="Send message"
              >
                <Send style={{ width: 13, height: 13 }} />
              </button>
            </div>
            <div className="mx-composer-tools">
              <button
                className="mx-icon-btn"
                onClick={() => onOpenTab("attachments")}
                aria-label="Attach a document"
                title="Attach from connected sources"
              >
                <Paperclip />
              </button>
              <button
                className={`mx-icon-btn${listening ? " is-on" : ""}`}
                onClick={toggleMic}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
                title="Voice input"
              >
                {listening ? <MicOff /> : <Mic />}
              </button>
              <button
                className={`mx-icon-btn${speakReplies ? " is-on" : ""}`}
                onClick={() => {
                  const next = !speakReplies;
                  setSpeakReplies(next);
                  if (!next && typeof window !== "undefined" && "speechSynthesis" in window)
                    window.speechSynthesis.cancel();
                }}
                aria-label={speakReplies ? "Disable spoken replies" : "Enable spoken replies"}
                title="Spoken replies"
              >
                {speakReplies ? <Volume2 /> : <VolumeX />}
              </button>
              <span className="mx-tiny mx-muted" style={{ marginLeft: "auto" }}>
                {draft.length} chars · draft saved
              </span>
              <button className="mx-btn mx-btn--sm" onClick={() => onOpenTab("ticket-trail")}>
                <SquareArrowOutUpRight /> Ticket trail
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`mx-msg${isUser ? " mx-msg--user" : ""}`}>
      <div className="mx-msg-bubble">{message.text}</div>
      {message.references.length > 0 ? (
        <div className="mx-msg-refs">
          {message.references.map((reference) => (
            <span className="mx-msg-ref" key={`${reference.type}-${reference.id}`}>
              {reference.type === "knowledge" ? (
                <BookOpen style={{ width: 9, height: 9 }} />
              ) : (
                <FileText style={{ width: 9, height: 9 }} />
              )}
              {reference.label}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mx-msg-meta">
        <span>{isUser ? "You" : "Help Buddy"}</span>
        <span>·</span>
        <span>{formatTime(message.at)}</span>
        {!message.grounded ? (
          <Chip tone="warning" icon={AlertTriangle}>
            No grounded source
          </Chip>
        ) : (
          <Chip tone="success" icon={CheckCircle2}>
            Grounded
          </Chip>
        )}
      </div>
    </div>
  );
}
