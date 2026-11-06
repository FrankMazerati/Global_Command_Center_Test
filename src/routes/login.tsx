import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Secure sign in · Maximus Optimus" }, { name: "description", content: "IntelliStack Systems Global Command Center secure sign-in." }] }),
  component: LoginPage,
});

type Environment = "intellistack" | "tenant" | "intellistaff";
const STAFF_SPACES = ["IntelliStaff", "IntelliHire", "IntelliWork"] as const;

function LoginPage() {
  const navigate = useNavigate();
  const [environment, setEnvironment] = useState<Environment>("intellistack");
  const [staffSpace, setStaffSpace] = useState<(typeof STAFF_SPACES)[number]>("IntelliStaff");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const theme = environment === "tenant" ? "tenant" : environment === "intellistaff" ? "contractor" : "primary";
  const clientReady = Boolean(import.meta.env.VITE_SUPABASE_URL && (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY));

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!identifier.includes("@")) {
      setMessage("Global User ID sign-in requires the directory-to-email identity mapping. Enter your registered email address for this test build.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage("Secure sign-in is not configured yet. The Supabase project URL and publishable/anon key must be added to the deployment environment. No bypass is available.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: identifier.trim(), password });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    // The selected environment is a requested destination only; authorization is determined by server-side membership and RLS.
    sessionStorage.setItem("mo:requested-environment", environment === "intellistaff" ? staffSpace : environment);
    toast.success("Identity verified. Opening your command center.");
    navigate({ to: "/" });
  }

  async function resetPassword() {
    const supabase = getSupabaseClient();
    if (!supabase) { setMessage("Password recovery becomes available after Supabase is configured."); return; }
    if (!identifier.includes("@")) { setMessage("Enter your registered email address first so we can send a secure reset link."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(identifier.trim(), { redirectTo: window.location.origin + "/login" });
    setMessage(error ? error.message : "If the account exists, a password-reset link has been sent.");
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-page px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(65,157,220,.20),transparent_55%),radial-gradient(ellipse_at_90%_90%,rgba(110,95,210,.14),transparent_50%)]" />
      <section className="relative w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-float backdrop-blur-2xl sm:p-9">
        <header className="mb-7 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[.28em] text-muted-foreground">IntelliStack Systems Presents</div>
          <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-brand-gradient sm:text-4xl">Maximus Optimus</h1>
          <div className="mt-1 font-display text-[11px] font-semibold tracking-[.3em] text-secondary-foreground">GLOBAL COMMAND CENTER</div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[.12em] text-foreground">ONE WORLD. ONE SYSTEM. ONE INTELLIGENT NETWORK.</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">See Everything Locally. Connect Everything Globally. Powered by Intelligence.</p>
          <div className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold tracking-[.2em] text-foreground"><ShieldCheck className="size-4 text-primary" /> SECURED • TRUSTED • COMPLIANT</div>
        </header>

        <div className="mb-5">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select your login environment</p>
          <div className="grid grid-cols-3 gap-2">
            {([{id:"intellistack",label:"IntelliStack Systems",color:"primary"},{id:"tenant",label:"Tenant / Organization",color:"tenant"},{id:"intellistaff",label:"IntelliStaff",color:"contractor"}] as const).map(item => (
              <button key={item.id} type="button" onClick={() => setEnvironment(item.id)} aria-pressed={environment===item.id}
                className={`min-h-16 rounded-xl border px-2 py-3 text-xs font-semibold transition ${environment===item.id ? "border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/30" : "border-border bg-white/55 text-muted-foreground hover:bg-white"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {environment === "intellistaff" && <div className="mb-5 rounded-xl border border-contractor/30 bg-contractor/5 p-3">
          <p className="mb-2 text-center text-[11px] font-semibold text-contractor">Choose your IntelliStaff workspace</p>
          <div className="grid grid-cols-3 gap-2">{STAFF_SPACES.map(space => <button type="button" key={space} onClick={() => setStaffSpace(space)} aria-pressed={staffSpace===space} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${staffSpace===space ? "border-contractor bg-contractor/15 text-contractor" : "border-border bg-white/70"}`}>{space}</button>)}</div>
        </div>}

        <form className="space-y-4" onSubmit={signIn}>
          <div className="space-y-1.5">
            <label htmlFor="identity" className="text-xs font-semibold">Email address or Global User ID</label>
            <input id="identity" value={identifier} onChange={e=>setIdentifier(e.target.value)} autoComplete="username" required placeholder="name@company.com" className="h-12 w-full rounded-xl border border-input bg-white/80 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold">Password</label>
            <div className="relative">
              <input id="password" value={password} onChange={e=>setPassword(e.target.value)} type={showPassword?"text":"password"} autoComplete="current-password" required className="h-12 w-full rounded-xl border border-input bg-white/80 px-4 pr-12 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
              <button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground">{showPassword?<EyeOff className="size-4"/>:<Eye className="size-4"/>}</button>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="size-4 accent-primary"/> Remember me</label>
            <button type="button" onClick={resetPassword} className="font-semibold text-primary hover:underline">Forgot password?</button>
          </div>
          {message && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">{message}</p>}
          <button type="submit" disabled={busy} className="h-12 w-full rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-md transition hover:brightness-105 disabled:opacity-60">{busy?"Verifying identity…":"Secure Sign In"}</button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-[11px] text-muted-foreground">{clientReady ? "Supabase credentials detected in this build environment." : "Supabase connection required before real accounts can sign in."}</p>
          <p className="mt-3 text-xs text-muted-foreground">New here? <span className="font-semibold text-primary">Request access from your organization administrator.</span></p>
          <p className="mt-4 text-[10px] text-muted-foreground">Identity verification is shared; workspace access is controlled by assigned roles and organization membership.</p>
        </div>
      </section>
      <footer className="absolute bottom-3 left-0 right-0 text-center text-[11px] text-muted-foreground">© 2026 IntelliStack Systems</footer>
    </main>
  );
}
