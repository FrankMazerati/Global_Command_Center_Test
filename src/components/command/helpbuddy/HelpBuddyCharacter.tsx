import buddyArt from "@/assets/help-buddy-character.png";
import type { CharacterProfile, CharacterState } from "@/lib/domain/types";

const STATE_LABEL: Record<CharacterState, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  working: "Working",
  responding: "Responding",
  success: "Complete",
  concerned: "Needs care",
  escalation: "Escalation",
};

const PRESET_STYLE: Record<CharacterProfile["avatarPreset"], { hue: string; initials: string }> = {
  noah: { hue: "linear-gradient(160deg,#cfe6fb,#8fc0ea)", initials: "N" },
  ava: { hue: "linear-gradient(160deg,#f6e6f4,#d3b3d8)", initials: "A" },
  marcus: { hue: "linear-gradient(160deg,#dff2e4,#9BC9A9)", initials: "M" },
  priya: { hue: "linear-gradient(160deg,#e6e2fb,#b3aae6)", initials: "P" },
  sofia: { hue: "linear-gradient(160deg,#fdeedd,#e5c29b)", initials: "S" },
};

/**
 * The character reflects what the assistant is doing right now. The state is driven by real
 * activity (listening while dictating, working while a request is processed, concerned when no
 * grounded answer exists), never by a random animation.
 */
export function HelpBuddyCharacter({
  character,
  state,
  detail,
}: {
  character: CharacterProfile;
  state: CharacterState;
  detail?: string;
}) {
  const preset = PRESET_STYLE[character.avatarPreset];
  const usesArt = character.avatarPreset === "noah";
  return (
    <div className="mx-character" data-state={state} aria-live="polite">
      <div className="mx-character-stage">
        <div className="mx-character-halo" aria-hidden="true" />
        <div
          className="mx-character-figure"
          style={{ background: usesArt ? undefined : preset.hue }}
        >
          {usesArt ? (
            <img src={buddyArt} alt={`${character.name}, your Help Buddy`} />
          ) : (
            <span className="mx-character-avatar" aria-hidden="true">
              {preset.initials}
            </span>
          )}
        </div>
        <span className="mx-character-badge">
          <i className="mx-dot" aria-hidden="true" />
          {STATE_LABEL[state]}
        </span>
      </div>
      <div className="mx-character-name">
        <strong>{character.name.toUpperCase()}</strong>
        <span>{detail ?? character.roleLabel}</span>
      </div>
      <div
        className="mx-wave"
        data-active={state === "speaking" || state === "listening" || state === "responding"}
        aria-hidden="true"
      >
        <i /> <i /> <i /> <i /> <i />
      </div>
    </div>
  );
}
