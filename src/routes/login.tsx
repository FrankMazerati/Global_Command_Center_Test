import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase";
import {
  canEnterCommandCenter,
  isPortalId,
  type PortalId,
  verifyPortalMembership,
} from "@/lib/portal-access";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Secure access · Maximus Optimus" },
      {
        name: "description",
        content: "Choose the assigned Maximus Optimus access portal and sign in securely.",
      },
    ],
  }),
  component: LoginPage,
});

type PortalCopy = {
  id: PortalId;
  code: string;
  name: string;
  category: string;
  audience: string;
  accent: string;
  slogan: string;
  formTitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  showPasswordLabel: string;
  hidePasswordLabel: string;
  forgotPassword: string;
  submitLabel: string;
  accessNote: string;
  previewNote: string;
  workspaceTitle: string;
  rememberLabel: string;
  accessRequest: string;
  supportLabel: string;
};

const PORTALS: readonly PortalCopy[] = [
  {
    id: "intellistack",
    code: "IS",
    name: "IntelliStack Systems",
    category: "Corporate access",
    audience: "IntelliStack employees and authorized platform administrators.",
    accent: "#2788ff",
    slogan: "One world. One system. One intelligence. Optimus.",
    formTitle: "Sign in to IntelliStack",
    emailLabel: "Corporate email",
    emailPlaceholder: "name@intellistack.com",
    passwordLabel: "Corporate password",
    passwordPlaceholder: "Enter your corporate password",
    showPasswordLabel: "Show corporate password",
    hidePasswordLabel: "Hide corporate password",
    forgotPassword: "Forgot corporate password?",
    submitLabel: "Secure IntelliStack sign in",
    accessNote: "For IntelliStack employees and authorized platform administrators.",
    previewNote: "The IntelliStack account opens the Maximus Optimus Command Center.",
    workspaceTitle: "Global Command Center",
    rememberLabel: "Remember my IntelliStack sign-in",
    accessRequest: "Request IntelliStack access from your platform administrator.",
    supportLabel: "Need IntelliStack help? Contact your platform administrator.",
  },
  {
    id: "intellistaff",
    code: "ST",
    name: "IntelliStaff",
    category: "Staff member",
    audience:
      "For IntelliStaff operators managing job postings, job seekers, companies, and matching.",
    accent: "#a855f7",
    slogan: "Support every teammate. Empower every team. Optimus.",
    formTitle: "Sign in to IntelliStaff",
    emailLabel: "Staff email",
    emailPlaceholder: "you@company.com",
    passwordLabel: "Staff password",
    passwordPlaceholder: "Enter your IntelliStaff password",
    showPasswordLabel: "Show IntelliStaff password",
    hidePasswordLabel: "Hide IntelliStaff password",
    forgotPassword: "Forgot your staff password?",
    submitLabel: "Secure staff sign in",
    accessNote:
      "Staff operators manage workforce operations; they do not sign in as job seekers or employers.",
    previewNote:
      "IntelliStaff operators will manage job postings, job seekers, companies, and candidate matching. Those workforce management screens are not part of this static preview yet.",
    workspaceTitle: "Workforce Operations Portal",
    rememberLabel: "Remember my IntelliStaff sign-in",
    accessRequest: "Request an IntelliStaff operator account.",
    supportLabel: "Need staff portal help? Contact the IntelliStaff administrator.",
  },
  {
    id: "intelliwork",
    code: "IW",
    name: "IntelliWork",
    category: "Find work",
    audience: "For people looking for work, managing a profile, or exploring opportunities.",
    accent: "#a855f7",
    slogan: "Find meaningful work. Move forward with confidence. Optimus.",
    formTitle: "Sign in to IntelliWork",
    emailLabel: "Job-seeker email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "IntelliWork password",
    passwordPlaceholder: "Enter your IntelliWork password",
    showPasswordLabel: "Show IntelliWork password",
    hidePasswordLabel: "Hide IntelliWork password",
    forgotPassword: "Forgot your IntelliWork password?",
    submitLabel: "Continue to IntelliWork",
    accessNote: "Job-seeker accounts cannot enter IntelliStaff or IntelliHire.",
    previewNote:
      "IntelliWork is the separate entry point for people seeking work. Candidate profile and application tools are not part of this static preview yet.",
    workspaceTitle: "Job Seeker Portal",
    rememberLabel: "Remember my IntelliWork sign-in",
    accessRequest: "Request an IntelliWork job-seeker account.",
    supportLabel: "Need job-seeker support? Contact IntelliWork help.",
  },
  {
    id: "intellihire",
    code: "IH",
    name: "IntelliHire",
    category: "Hire talent",
    audience: "For employers, recruiters, and hiring teams managing opportunities.",
    accent: "#a855f7",
    slogan: "Build stronger teams with the right talent. Optimus.",
    formTitle: "Sign in to IntelliHire",
    emailLabel: "Employer or recruiter email",
    emailPlaceholder: "recruiter@company.com",
    passwordLabel: "IntelliHire password",
    passwordPlaceholder: "Enter your IntelliHire password",
    showPasswordLabel: "Show IntelliHire password",
    hidePasswordLabel: "Hide IntelliHire password",
    forgotPassword: "Forgot your IntelliHire password?",
    submitLabel: "Continue to IntelliHire",
    accessNote: "Employer accounts cannot enter IntelliStaff or IntelliWork.",
    previewNote:
      "IntelliHire is the separate entry point for employers and companies. Employer and hiring tools are not part of this static preview yet.",
    workspaceTitle: "Employer and Hiring Portal",
    rememberLabel: "Remember my IntelliHire sign-in",
    accessRequest: "Request an IntelliHire employer account.",
    supportLabel: "Need employer support? Contact your IntelliHire administrator.",
  },
  {
    id: "tenant",
    code: "OR",
    name: "Tenant / Organization",
    category: "Organization access",
    audience: "For customer organizations, tenant administrators, and authorized employees.",
    accent: "#16b98a",
    slogan: "Your organization. Your people. One secure system. Optimus.",
    formTitle: "Sign in to your organization",
    emailLabel: "Organization email",
    emailPlaceholder: "you@organization.com",
    passwordLabel: "Organization password",
    passwordPlaceholder: "Enter your organization password",
    showPasswordLabel: "Show organization password",
    hidePasswordLabel: "Hide organization password",
    forgotPassword: "Forgot your organization password?",
    submitLabel: "Secure organization sign in",
    accessNote: "Use the organization account assigned by your administrator.",
    previewNote:
      "Tenant access remains separate from the workforce and owner portals; organization-specific modules are not configured in this preview.",
    workspaceTitle: "Organization Access Portal",
    rememberLabel: "Remember my organization sign-in",
    accessRequest: "Request an invitation from your organization administrator.",
    supportLabel: "Need organization help? Contact your administrator.",
  },
];

const DEFAULT_PORTAL: PortalCopy = PORTALS[0]!;

function LoginPage() {
  const navigate = useNavigate();
  const [portalId, setPortalId] = useState<PortalId>("intellistack");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [verifiedPortal, setVerifiedPortal] = useState<PortalId | null>(null);
  const portal = PORTALS.find((item) => item.id === portalId) ?? DEFAULT_PORTAL;
  const clientReady = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY),
  );

  useEffect(() => {
    const requestedPortal = new URLSearchParams(window.location.search).get("portal");
    if (isPortalId(requestedPortal)) setPortalId(requestedPortal);
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const email = identifier.trim();
    if (!email.includes("@")) {
      setMessage(`Enter the email address assigned to your ${portal.name} account.`);
      return;
    }

    const supabase = getSupabaseClient(remember);
    if (!supabase) {
      setMessage("Secure sign-in is unavailable. Contact your administrator.");
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.user) {
        setMessage(error?.message ?? "Sign-in could not be completed.");
        return;
      }

      const access = await verifyPortalMembership(supabase, data.user.id, portalId);
      if (!access.allowed) {
        await supabase.auth.signOut();
        window.sessionStorage.removeItem("mo:requested-environment");
        setMessage(
          access.reason === "unavailable"
            ? "Portal authorization could not be verified. Access is denied until your administrator configures your portal assignment."
            : `This account is not assigned to ${portal.name}. Choose the portal assigned to you or contact your administrator.`,
        );
        return;
      }

      window.sessionStorage.setItem("mo:requested-environment", portalId);
      toast.success(`${portal.name} identity verified. Welcome to Optimus.`);
      if (canEnterCommandCenter(portalId)) navigate({ to: "/" });
      else setVerifiedPortal(portalId);
    } catch {
      setMessage("Sign-in could not be verified. Please try again or contact your administrator.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setMessage("");
    const email = identifier.trim();
    if (!email.includes("@")) {
      setMessage(
        `Enter your ${portal.emailLabel.toLowerCase()} first to request a secure reset link.`,
      );
      return;
    }
    const supabase = getSupabaseClient(remember);
    if (!supabase) {
      setMessage("Password recovery is unavailable until secure sign-in is configured.");
      return;
    }
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}login?portal=${portalId}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setMessage(
      error
        ? error.message
        : `If the ${portal.name} account exists, a secure password-reset link has been sent.`,
    );
  }

  async function signOutVerifiedPortal() {
    try {
      await getSupabaseClient()?.auth.signOut();
    } finally {
      window.sessionStorage.removeItem("mo:requested-environment");
      setVerifiedPortal(null);
      setPassword("");
    }
  }

  if (verifiedPortal) {
    const verifiedPortalDetails =
      PORTALS.find((item) => item.id === verifiedPortal) ?? DEFAULT_PORTAL;
    return (
      <main className="grid min-h-dvh place-items-center bg-[#061426] px-4 py-8 text-slate-100">
        <section
          className="w-full max-w-xl rounded-3xl border bg-slate-950/70 p-7 text-center shadow-2xl"
          style={{ borderColor: `${verifiedPortalDetails.accent}88` }}
        >
          <div
            className="mx-auto grid size-14 place-items-center rounded-2xl border text-sm font-black"
            style={{
              color: verifiedPortalDetails.accent,
              borderColor: `${verifiedPortalDetails.accent}88`,
              backgroundColor: `${verifiedPortalDetails.accent}20`,
            }}
          >
            {verifiedPortalDetails.code}
          </div>
          <p
            className="mt-5 text-[10px] font-bold uppercase tracking-[.2em]"
            style={{ color: verifiedPortalDetails.accent }}
          >
            Portal identity verified
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">
            Welcome to {verifiedPortalDetails.name}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Your account is assigned only to {verifiedPortalDetails.name}. This entry point does not
            grant access to another workforce portal or to the IntelliStack Command Center.{" "}
            {verifiedPortalDetails.previewNote}
          </p>
          <p className="mt-4 text-xs font-semibold text-slate-400">
            {verifiedPortalDetails.slogan}
          </p>
          <button
            type="button"
            onClick={signOutVerifiedPortal}
            className="mt-6 h-11 rounded-xl px-5 text-sm font-bold text-slate-950"
            style={{ backgroundColor: verifiedPortalDetails.accent }}
          >
            Sign out of {verifiedPortalDetails.name}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#061426] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_5%,rgba(18,107,191,.25),transparent_42%),radial-gradient(ellipse_at_90%_80%,rgba(67,42,140,.19),transparent_45%)]" />
      <div className="relative mx-auto max-w-6xl">
        <header className="mb-7 border-b border-sky-100/15 pb-5">
          <div className="mb-5 flex items-center gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-sky-200/25 bg-sky-300/10 text-sm font-black text-sky-200">
              IS
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.24em] text-sky-100">
                IntelliStack Systems
              </p>
              <p className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-slate-300">
                <ShieldCheck className="size-3.5 text-emerald-300" /> Secure · Trusted · Compliant
              </p>
            </div>
          </div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.13em] text-slate-300 sm:text-xs">
            See everything locally. Connect everything globally. Powered by Optimus.
          </p>
          <h1 className="font-display text-3xl font-black uppercase tracking-[.06em] sm:text-5xl">
            <span className="text-violet-400">Maximus</span> Optimus
          </h1>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[.24em] text-slate-300 sm:text-sm">
            {portal.workspaceTitle}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[.1em] text-slate-400 sm:text-sm">
            {portal.slogan}
          </p>
        </header>

        <section className="rounded-3xl border border-sky-100/15 bg-slate-950/50 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">
                Secure access gateway
              </p>
              <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                Select your login environment
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-300">
                Each portal is separate. Your account can sign in only to the portal assigned to it.
              </p>
            </div>
            <span className="rounded-full border border-slate-400/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">
              5 protected portals
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PORTALS.map((item, index) => {
              const selected = portalId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPortalId(item.id);
                    setMessage("");
                  }}
                  aria-pressed={selected}
                  className={`relative flex min-h-36 flex-col items-start rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${selected ? "bg-white/[.08] shadow-lg" : "border-slate-200/15 bg-slate-900/55 hover:bg-white/[.05]"}`}
                  style={{ borderColor: selected ? item.accent : undefined }}
                >
                  <span className="flex w-full items-center justify-between">
                    <span
                      className="grid size-9 place-items-center rounded-lg border text-xs font-black"
                      style={{
                        color: item.accent,
                        borderColor: `${item.accent}88`,
                        backgroundColor: `${item.accent}20`,
                      }}
                    >
                      {item.code}
                    </span>
                    <span className="text-[10px] font-bold tracking-[.16em] text-slate-500">
                      0{index + 1}
                    </span>
                  </span>
                  <span className="mt-3 text-sm font-bold" style={{ color: item.accent }}>
                    {item.name}
                  </span>
                  <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">
                    {item.category}
                  </span>
                  <span className="mt-2 text-xs leading-5 text-slate-300">{item.audience}</span>
                </button>
              );
            })}
          </div>

          <div className="my-6 border-t border-slate-200/15" />

          <div className="grid gap-5 lg:grid-cols-[minmax(260px,.8fr)_minmax(0,1.2fr)]">
            <section
              className="rounded-2xl border bg-slate-900/70 p-5"
              style={{ borderColor: `${portal.accent}88` }}
              aria-labelledby="portal-heading"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[.18em]"
                    style={{ color: portal.accent }}
                  >
                    Verified account access
                  </p>
                  <h3 id="portal-heading" className="mt-2 text-xl font-bold text-white">
                    {portal.formTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-5 text-slate-300">{portal.accessNote}</p>
                </div>
                <span
                  className="shrink-0 rounded-lg border px-2 py-1 text-[9px] font-bold uppercase tracking-[.1em]"
                  style={{ color: portal.accent, borderColor: `${portal.accent}88` }}
                >
                  {portal.category}
                </span>
              </div>

              <form className="mt-5 space-y-4" onSubmit={signIn}>
                <div className="space-y-1.5">
                  <label htmlFor="identity" className="text-xs font-semibold text-slate-200">
                    {portal.emailLabel}
                  </label>
                  <input
                    id="identity"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    autoComplete="username"
                    type="email"
                    required
                    placeholder={portal.emailPlaceholder}
                    className="h-12 w-full rounded-xl border border-slate-300/20 bg-slate-100 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-500 focus:ring-2"
                    style={{ borderColor: `${portal.accent}66`, accentColor: portal.accent }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-semibold text-slate-200">
                    {portal.passwordLabel}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder={portal.passwordPlaceholder}
                      autoComplete="current-password"
                      required
                      className="h-12 w-full rounded-xl border border-slate-300/20 bg-slate-100 px-4 pr-12 text-sm text-slate-950 outline-none transition focus:ring-2"
                      style={{ borderColor: `${portal.accent}66` }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={
                        showPassword ? portal.hidePasswordLabel : portal.showPasswordLabel
                      }
                      className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-600"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="size-4"
                      style={{ accentColor: portal.accent }}
                    />
                    {portal.rememberLabel}
                  </label>
                  <button
                    type="button"
                    onClick={resetPassword}
                    className="font-semibold hover:underline"
                    style={{ color: portal.accent }}
                  >
                    {portal.forgotPassword}
                  </button>
                </div>

                {message && (
                  <p
                    role="alert"
                    className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100"
                  >
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="h-12 w-full rounded-xl px-4 text-sm font-bold text-slate-950 shadow-lg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
                  style={{ backgroundColor: portal.accent }}
                >
                  {busy ? "Verifying portal access…" : portal.submitLabel}
                </button>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>
                  New here?{" "}
                  <span className="font-semibold text-slate-200">{portal.accessRequest}</span>
                </span>
                <span>{portal.supportLabel}</span>
              </div>
              <p className="mt-3 text-[10px] leading-4 text-slate-500">
                Portal choice is not an authorization. Your account must have a matching
                administrator-assigned portal membership.
              </p>
            </section>

            <aside className="rounded-2xl border border-slate-200/15 bg-slate-900/50 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">
                Identity providers for {portal.name}
              </p>
              <h3 className="mt-2 text-lg font-bold text-white">
                Sign in with your {portal.name} account
              </h3>
              <p className="mt-1 text-sm leading-5 text-slate-300">
                The selected portal is checked against the account’s assigned membership after
                password verification.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {["Google Workspace", "Microsoft Entra ID", "GitHub", "Apple"].map((provider) => (
                  <div
                    key={provider}
                    className="flex min-h-16 items-center justify-center rounded-xl border border-slate-200/15 bg-slate-800/70 px-3 text-center text-xs font-semibold text-slate-300"
                  >
                    {provider}
                  </div>
                ))}
                <div className="col-span-2 rounded-xl border border-dashed border-slate-300/20 px-3 py-2 text-[11px] leading-5 text-slate-400">
                  External identity providers are informational in this test build. Password sign-in
                  remains subject to the portal membership check.
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-slate-200/10 bg-black/15 p-3 text-xs leading-5 text-slate-300">
                {clientReady
                  ? "Supabase credentials are detected. Portal membership must also be configured for sign-in to succeed."
                  : "Supabase credentials and an administrator-assigned portal membership are required for real account sign-in."}
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Secure access", "Your portal assignment protects your account."],
            ["Separate identities", "Staff, job seekers, and employers stay in distinct portals."],
            ["One standard", portal.slogan],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-xl border border-slate-200/10 bg-slate-950/40 p-4">
              <p className="text-sm font-bold text-white">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
            </div>
          ))}
        </section>

        <footer className="mt-6 text-center text-[10px] text-slate-500">
          © 2026 IntelliStack Systems · Maximus Optimus
        </footer>
      </div>
    </main>
  );
}
