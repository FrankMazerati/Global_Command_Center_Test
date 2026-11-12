import { useEffect, useMemo, useState } from "react";
import { Check, Palette, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase";

type Character = {
  character_id: string; display_name: string; presentation_style: string;
  representation_tags: string[]; visual_description: string;
  default_personality_key: string; default_outfit_key: string; default_background_key: string;
  availability_tier: string; allows_personal_name: boolean;
};
type Feature = { id: string; feature_group: string; option_key: string; label: string; description: string; status: string; sort_order: number };
type Wardrobe = { id: string; item_key: string; item_type: string; name: string; description: string; color_options: unknown; availability_tier: string; status: string; sort_order: number };
type AvatarConfig = { character_id: string; display_name: string | null; feature_selections: Record<string, unknown>; locale: string; renderer_mode: string; is_default: boolean; version: number };

const groupLabels: Record<string, string> = {
  age_appearance: "Age appearance", face_shape: "Face shape", facial_hair: "Facial hair",
  gender_presentation: "Gender presentation", hair_texture: "Hair texture",
  hairstyle: "Hairstyle", heritage_region: "Heritage & regional styling", language: "Language",
  skin_tone: "Skin tone",
};

export function ChatBuddyAvatarStudio() {
  const supabase = getSupabaseClient();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [wardrobe, setWardrobe] = useState<Wardrobe[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selections, setSelections] = useState<Record<string, unknown>>({});
  const [configId, setConfigId] = useState<string | null>(null);
  const [version, setVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    async function load() {
      if (!supabase) { setError("The secure database connection is unavailable."); setLoading(false); return; }
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) throw new Error("Sign in to personalize Chat Buddy.");
        const [charactersResult, featuresResult, wardrobeResult, configResult] = await Promise.all([
          supabase.from("assistant_character_profiles").select("character_id,display_name,presentation_style,representation_tags,visual_description,default_personality_key,default_outfit_key,default_background_key,availability_tier,allows_personal_name").eq("status","active").order("sort_order"),
          supabase.from("assistant_avatar_feature_options").select("id,feature_group,option_key,label,description,status,sort_order").eq("status","active").order("sort_order"),
          supabase.from("assistant_wardrobe_catalog").select("id,item_key,item_type,name,description,color_options,availability_tier,status,sort_order").eq("status","active").order("sort_order"),
          supabase.from("assistant_user_avatar_configs").select("id,character_id,display_name,feature_selections,locale,renderer_mode,is_default,version").eq("profile_id",auth.user.id).eq("config_key","default").maybeSingle(),
        ]);
        if (charactersResult.error) throw charactersResult.error;
        if (featuresResult.error) throw featuresResult.error;
        if (wardrobeResult.error) throw wardrobeResult.error;
        if (configResult.error) throw configResult.error;
        if (!live) return;
        const chars = (charactersResult.data ?? []) as Character[];
        const config = configResult.data as (AvatarConfig & { id: string }) | null;
        setCharacters(chars);
        setFeatures((featuresResult.data ?? []) as Feature[]);
        setWardrobe((wardrobeResult.data ?? []) as Wardrobe[]);
        setSelectedCharacter(config?.character_id ?? chars[0]?.character_id ?? "");
        setDisplayName(config?.display_name ?? "");
        setSelections(config?.feature_selections ?? {});
        setConfigId(config?.id ?? null);
        setVersion(config?.version ?? 1);
      } catch (cause) {
        if (live) setError(cause instanceof Error ? cause.message : "Chat Buddy Studio could not be loaded.");
      } finally {
        if (live) setLoading(false);
      }
    }
    void load();
    return () => { live = false; };
  }, [supabase]);

  const activeCharacter = characters.find((character) => character.character_id === selectedCharacter);
  const featureGroups = useMemo(() => [...new Set(features.map((feature) => feature.feature_group))], [features]);
  const wardrobeGroups = useMemo(() => [...new Set(wardrobe.map((item) => item.item_type))], [wardrobe]);
  const updateSelection = (key: string, value: unknown) => setSelections((current) => ({ ...current, [key]: value }));

  async function saveConfiguration() {
    if (!supabase || !activeCharacter) return;
    setSaving(true);
    setError(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in again to save your Chat Buddy settings.");
      const payload = {
        profile_id: auth.user.id,
        config_key: "default",
        character_id: activeCharacter.character_id,
        display_name: activeCharacter.allows_personal_name ? displayName.trim().slice(0, 60) || null : null,
        feature_selections: selections,
        locale: String(selections.language ?? "en-US"),
        renderer_mode: "static",
        is_default: true,
        version: version + 1,
        updated_at: new Date().toISOString(),
      };
      const result = configId
        ? await supabase.from("assistant_user_avatar_configs").update(payload).eq("id", configId).select("id,version").single()
        : await supabase.from("assistant_user_avatar_configs").upsert(payload, { onConflict: "profile_id,config_key" }).select("id,version").single();
      if (result.error) throw result.error;
      setConfigId(result.data.id);
      setVersion(result.data.version);
      toast.success("Your Chat Buddy appearance has been saved.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Your appearance could not be saved.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">Loading your character studio…</section>;
  return <div className="space-y-4">
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-6" /></span>
        <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Chat Buddy Studio</p><h2 className="text-xl font-semibold">Your assistant, your style</h2><p className="text-sm text-muted-foreground">Choose a character and personalize the available appearance and language settings.</p></div>
      </div>
      <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Your selections are saved to your own profile. Character and wardrobe availability may depend on your organization's plan. Voice rendering and animated character assets are not enabled by this static preview.</p>
    </section>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2"><Palette className="size-5 text-primary" /><h3 className="font-semibold">Character library <span className="text-xs font-normal text-muted-foreground">({characters.length} available)</span></h3></div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {characters.map((character) => <button key={character.character_id} type="button" onClick={() => setSelectedCharacter(character.character_id)} className={`rounded-lg border p-3 text-left transition-colors ${selectedCharacter === character.character_id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/60"}`}>
          <span className="flex items-center justify-between gap-2"><b className="text-sm">{character.display_name}</b>{selectedCharacter === character.character_id && <Check className="size-4 text-primary" />}</span>
          <span className="mt-1 block text-xs capitalize text-muted-foreground">{character.presentation_style.replaceAll("_"," ")} · {character.availability_tier}</span>
          <span className="mt-2 block text-xs leading-relaxed">{character.visual_description}</span>
          <span className="mt-2 flex flex-wrap gap-1">{character.representation_tags.slice(0,4).map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{tag}</span>)}</span>
        </button>)}
      </div>
      {activeCharacter?.allows_personal_name && <div className="mt-4 max-w-md space-y-1"><label className="text-xs font-medium" htmlFor="chat-buddy-display-name">Personal display name</label><Input id="chat-buddy-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} placeholder="Give your assistant a name" /></div>}
    </section>
    <section className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 font-semibold">Appearance and communication</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {featureGroups.map((group) => <div key={group} className="space-y-1"><label className="text-xs font-medium">{groupLabels[group] ?? group.replaceAll("_"," ")}</label><select value={String(selections[group] ?? "")} onChange={(event) => updateSelection(group,event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Use character default</option>{features.filter((feature) => feature.feature_group === group).map((feature) => <option key={feature.id} value={feature.option_key}>{feature.label}</option>)}</select></div>)}
        {wardrobeGroups.map((group) => <div key={group} className="space-y-1"><label className="text-xs font-medium capitalize">{group.replaceAll("_"," ")}</label><select value={String(selections[`wardrobe:${group}`] ?? "")} onChange={(event) => updateSelection(`wardrobe:${group}`,event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Use character default</option>{wardrobe.filter((item) => item.item_type === group).map((item) => <option key={item.id} value={item.item_key}>{item.name}</option>)}</select></div>)}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{features.length} appearance/language options · {wardrobe.length} wardrobe items</p><Button type="button" onClick={() => void saveConfiguration()} disabled={saving || !activeCharacter}><Save className="mr-2 size-4" />{saving ? "Saving…" : "Save my Chat Buddy"}</Button></div>
    </section>
  </div>;
}
