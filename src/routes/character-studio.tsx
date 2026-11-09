import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Palette,
  RotateCcw,
  Save,
  Sparkles,
  UserRound,
  Volume2,
} from "lucide-react";
import { Chip, Field, Note, Panel, WorkspaceShell } from "@/components/command/ui";
import { HelpBuddyCharacter } from "@/components/command/helpbuddy/HelpBuddyCharacter";
import { useAction, useCommandState } from "@/lib/domain/store";
import type { CharacterProfile, CharacterState } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/domain/format";

export const Route = createFileRoute("/character-studio")({
  head: () => ({
    meta: [
      { title: "Character Creator Studio — Maximus Optimus" },
      {
        name: "description",
        content:
          "Compose Help Buddy's identity, appearance, voice, personality and operating behaviour, with an immediate live preview.",
      },
    ],
  }),
  component: CharacterStudioPage,
});

const AVATARS: { id: CharacterProfile["avatarPreset"]; label: string }[] = [
  { id: "noah", label: "Noah" },
  { id: "ava", label: "Ava" },
  { id: "marcus", label: "Marcus" },
  { id: "priya", label: "Priya" },
  { id: "sofia", label: "Sofia" },
];

const OUTFITS: { id: CharacterProfile["outfit"]; label: string }[] = [
  { id: "blue-hoodie", label: "Blue hoodie" },
  { id: "navy-blazer", label: "Navy blazer" },
  { id: "green-polo", label: "Green polo" },
  { id: "grey-suit", label: "Grey suit" },
];

const VOICES = [
  "Warm baritone",
  "Bright alto",
  "Steady tenor",
  "Calm mezzo",
  "Clear soprano",
  "Low contralto",
];
const ACCENTS = ["US Midwest", "US Neutral", "British RP", "Australian", "Canadian", "Irish"];
const PERSONALITIES = ["Encouraging", "Analytical", "Direct", "Patient", "Curious"];
const STYLES = ["Concise", "Explanatory", "Socratic", "Checklist-first"];
const ROLES = [
  "IT Support Technician",
  "Service Desk Lead",
  "Field Engineer",
  "Operations Manager",
  "Solution Architect",
];
const ENVIRONMENTS = [
  "Help desk",
  "Field operations",
  "Executive office",
  "Engineering lab",
  "Remote home office",
];
const PREVIEW_STATES: CharacterState[] = [
  "idle",
  "listening",
  "thinking",
  "working",
  "success",
  "concerned",
];

const DEFAULTS: Partial<CharacterProfile> = {
  name: "Noah",
  roleLabel: "Intelligent assistant",
  avatarPreset: "noah",
  outfit: "blue-hoodie",
  voice: "Warm baritone",
  accent: "US Midwest",
  personality: "Encouraging",
  speakingStyle: "Concise",
  energy: 70,
  humor: 30,
  terminology: "plain",
  proactivity: "assisted",
  confirmationThreshold: "external",
  rolePreset: "IT Support Technician",
  environmentPreset: "Help desk",
};

function CharacterStudioPage() {
  const state = useCommandState();
  const act = useAction();
  const character =
    state.characters.find((item) => item.id === state.activeCharacterId) ?? state.characters[0];
  const [preview, setPreview] = useState<CharacterState>("idle");

  if (!character) return null;

  const update = (patch: Partial<CharacterProfile>, label: string) => {
    act(
      { type: "character.update", characterId: character.id, patch },
      { success: `${label} saved.` },
    );
  };

  const value = <K extends keyof CharacterProfile>(key: K): CharacterProfile[K] =>
    (character[key] ?? DEFAULTS[key]) as CharacterProfile[K];

  return (
    <WorkspaceShell
      eyebrow="HELP BUDDY · CHARACTER CREATOR STUDIO"
      title="Character Creator Studio"
      subtitle="Shape who your assistant is, how it looks, sounds and behaves — the conversation picks the change up immediately."
      moduleLinks
      actions={
        <>
          <Chip tone="accent" icon={Sparkles}>
            Active · {character.name}
          </Chip>
          <Chip tone="neutral">Updated {formatDateTime(character.updatedAt)}</Chip>
          <Link to="/help-buddy" className="mx-btn mx-btn--sm">
            Open Help Buddy <ArrowUpRight style={{ width: 9, height: 9 }} />
          </Link>
        </>
      }
    >
      <div className="mx-body mx-body--triple">
        <div className="mx-col">
          <Panel title="Live preview" icon={UserRound} note="Noah preset uses the avatar artwork">
            <HelpBuddyCharacter
              character={character}
              state={preview}
              detail={character.roleLabel}
            />
            <div className="mx-btn-row" style={{ justifyContent: "center", gap: 3 }}>
              {PREVIEW_STATES.map((item) => (
                <button
                  key={item}
                  className={`mx-btn mx-btn--sm${preview === item ? " mx-btn--primary" : ""}`}
                  onClick={() => setPreview(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <Note>
              Preview states are the same states the assistant uses while it listens, thinks, works
              and reports a result.
            </Note>
          </Panel>

          <Panel
            title="Characters"
            icon={Palette}
            note={`${state.characters.length} in the library`}
          >
            {state.characters.map((item) => (
              <button
                key={item.id}
                className={`mx-row${item.id === character.id ? " is-selected" : ""}`}
                style={{
                  gridTemplateColumns: "minmax(0,1fr) auto",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onClick={() =>
                  act(
                    { type: "character.select", characterId: item.id },
                    { success: `${item.name} is now active.` },
                  )
                }
              >
                <span>
                  <span className="mx-row-title">{item.name}</span>
                  <span className="mx-row-meta">
                    {item.personality} · {item.voice}
                  </span>
                </span>
                {item.id === character.id ? (
                  <Check style={{ width: 12, height: 12, color: "#1b8355" }} />
                ) : null}
              </button>
            ))}
          </Panel>
        </div>

        <div className="mx-col mx-scroll" style={{ paddingRight: 2 }}>
          <Panel title="Identity" icon={UserRound}>
            <div className="mx-form-grid">
              <Field label="Name">
                <input
                  className="mx-input"
                  value={character.name}
                  onChange={(event) => update({ name: event.target.value }, "Name")}
                />
              </Field>
              <Field label="Role label">
                <input
                  className="mx-input"
                  value={character.roleLabel}
                  onChange={(event) => update({ roleLabel: event.target.value }, "Role label")}
                />
              </Field>
              <Field label="Avatar preset">
                <select
                  className="mx-select"
                  value={character.avatarPreset}
                  onChange={(event) =>
                    update(
                      { avatarPreset: event.target.value as CharacterProfile["avatarPreset"] },
                      "Avatar",
                    )
                  }
                >
                  {AVATARS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Outfit">
                <select
                  className="mx-select"
                  value={character.outfit}
                  onChange={(event) =>
                    update({ outfit: event.target.value as CharacterProfile["outfit"] }, "Outfit")
                  }
                >
                  {OUTFITS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Panel>

          <Panel title="Voice and delivery" icon={Volume2}>
            <div className="mx-form-grid">
              <Field label="Voice">
                <select
                  className="mx-select"
                  value={character.voice}
                  onChange={(event) => update({ voice: event.target.value }, "Voice")}
                >
                  {VOICES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Accent">
                <select
                  className="mx-select"
                  value={character.accent}
                  onChange={(event) => update({ accent: event.target.value }, "Accent")}
                >
                  {ACCENTS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Speaking style">
                <select
                  className="mx-select"
                  value={character.speakingStyle}
                  onChange={(event) =>
                    update({ speakingStyle: event.target.value }, "Speaking style")
                  }
                >
                  {STYLES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Personality">
                <select
                  className="mx-select"
                  value={character.personality}
                  onChange={(event) => update({ personality: event.target.value }, "Personality")}
                >
                  {PERSONALITIES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Panel>

          <Panel
            title="Operating behaviour"
            icon={Sparkles}
            note="These settings change how replies are produced"
          >
            <div className="mx-form-grid">
              <Field label={`Energy · ${value("energy")}%`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={value("energy")}
                  onChange={(event) => update({ energy: Number(event.target.value) }, "Energy")}
                  aria-label="Energy"
                />
              </Field>
              <Field label={`Humour · ${value("humor")}%`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={value("humor")}
                  onChange={(event) => update({ humor: Number(event.target.value) }, "Humour")}
                  aria-label="Humour"
                />
              </Field>
              <Field label="Terminology">
                <select
                  className="mx-select"
                  value={value("terminology")}
                  onChange={(event) =>
                    update(
                      { terminology: event.target.value as "plain" | "technical" | "executive" },
                      "Terminology",
                    )
                  }
                >
                  <option value="plain">Plain language</option>
                  <option value="technical">Technical</option>
                  <option value="executive">Executive summary</option>
                </select>
              </Field>
              <Field label="Proactivity">
                <select
                  className="mx-select"
                  value={value("proactivity")}
                  onChange={(event) =>
                    update(
                      { proactivity: event.target.value as "reactive" | "assisted" | "proactive" },
                      "Proactivity",
                    )
                  }
                >
                  <option value="reactive">Answer when asked</option>
                  <option value="assisted">Suggest next steps</option>
                  <option value="proactive">Surface work unprompted</option>
                </select>
              </Field>
              <Field
                label="Confirmation threshold"
                hint="When the assistant must ask before acting"
              >
                <select
                  className="mx-select"
                  value={value("confirmationThreshold")}
                  onChange={(event) =>
                    update(
                      {
                        confirmationThreshold: event.target.value as
                          "always" | "external" | "never",
                      },
                      "Confirmation threshold",
                    )
                  }
                >
                  <option value="always">Always confirm</option>
                  <option value="external">Confirm external side effects</option>
                  <option value="never">Never confirm</option>
                </select>
              </Field>
            </div>
            <Note tone="warning">
              Proactivity and confirmation threshold are recorded preferences. The assistant still
              cannot perform an action without an authorized record — preferences never bypass
              permissions.
            </Note>
          </Panel>

          <Panel title="Role and environment presets" icon={Palette}>
            <div className="mx-form-grid">
              <Field label="Business role">
                <select
                  className="mx-select"
                  value={value("rolePreset")}
                  onChange={(event) =>
                    update(
                      { rolePreset: event.target.value, roleLabel: event.target.value },
                      "Role preset",
                    )
                  }
                >
                  {ROLES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Environment">
                <select
                  className="mx-select"
                  value={value("environmentPreset")}
                  onChange={(event) =>
                    update({ environmentPreset: event.target.value }, "Environment preset")
                  }
                >
                  {ENVIRONMENTS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mx-btn-row">
              <button
                className="mx-btn"
                onClick={() =>
                  act(
                    { type: "character.update", characterId: character.id, patch: DEFAULTS },
                    { success: "Character reset to the studio defaults." },
                  )
                }
              >
                <RotateCcw /> Reset to defaults
              </button>
              <span className="mx-tiny mx-muted" style={{ marginLeft: "auto" }}>
                <Save style={{ width: 10, height: 10, verticalAlign: "-1px" }} /> Every change is
                saved immediately and recorded in Activity.
              </span>
            </div>
          </Panel>
        </div>

        <aside className="mx-col">
          <Panel title="Applies to" icon={Sparkles}>
            <dl className="mx-kv">
              <dt>Assistant</dt>
              <dd>{character.name}</dd>
              <dt>Voice</dt>
              <dd>
                {character.voice} · {character.accent}
              </dd>
              <dt>Style</dt>
              <dd>
                {character.speakingStyle} · {character.personality}
              </dd>
              <dt>Role</dt>
              <dd>{value("rolePreset")}</dd>
              <dt>Environment</dt>
              <dd>{value("environmentPreset")}</dd>
            </dl>
            <Note>
              These settings are read directly by Help Buddy. There is no second copy of the
              character configuration.
            </Note>
          </Panel>
          <Panel title="Where the character appears" icon={UserRound}>
            <ul
              style={{
                margin: 0,
                paddingLeft: 14,
                fontSize: 9.5,
                lineHeight: 1.6,
                color: "#3c5f80",
              }}
            >
              <li>Help Buddy conversation and its interaction states</li>
              <li>The dashboard assistant card</li>
              <li>Mission Control assistance suggestions</li>
              <li>Voice playback in the conversation composer</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </WorkspaceShell>
  );
}
