import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Check,
  Eye,
  EyeOff,
  Globe2,
  Headphones,
  Mail,
  Phone,
  ShieldCheck,
  Users,
  UserRound,
  LockKeyhole,
  type LucideIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Secure sign in · Maximus Optimus" },
      {
        name: "description",
        content: "IntelliStack Systems Global Command Center secure sign-in.",
      },
    ],
  }),
  component: LoginPage,
});

type LoginEnvironment = "employee" | "business" | "tenant";
const environments = [
  {
    id: "employee" as const,
    label: "IntelliStack Employee / Contractor",
    detail: "Blue · Corporate access",
    icon: UserRound,
  },
  {
    id: "business" as const,
    label: "Business / Employer",
    detail: "Purple · Organization access",
    icon: Building2,
  },
  {
    id: "tenant" as const,
    label: "Tenant",
    detail: "Green · Tenant-specific access",
    icon: Users,
  },
];
type OAuthProvider = "google" | "azure" | "github" | "apple";
const providers: Array<{
  label: string;
  provider?: OAuthProvider;
  note?: string;
}> = [
  { label: "Google Workspace", provider: "google" },
  { label: "Microsoft 365", provider: "azure" },
  { label: "Microsoft Entra ID", provider: "azure" },
  { label: "AWS", note: "AWS IAM / SSO connection required" },
  { label: "GitHub", provider: "github" },
  { label: "Apple", provider: "apple" },
];
const directoryProviders = [
  "Okta",
  "Auth0",
  "Ping Identity",
  "OneLogin",
  "SAML Enterprise SSO",
  "OIDC Enterprise SSO",
];
const securityFeatures: Array<[LucideIcon, string, string]> = [
  [Globe2, "Global Infrastructure", "Worldwide, high-availability."],
  [ShieldCheck, "Enterprise Security", "Advanced threat protection."],
  [Check, "Compliance Ready", "SOC 2, ISO 27001, GDPR."],
  [Headphones, "24/7 Support", "Always here when you need us."],
];

function LoginPage() {
  const navigate = useNavigate();
  const [environment, setEnvironment] = useState<LoginEnvironment>("employee");
  const [identifier, setIdentifier] = useState("");
  const [phoneMode, setPhoneMode] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [directoryProvider, setDirectoryProvider] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!identifier.trim()) {
      setMessage(
        phoneMode
          ? "Enter your phone number to continue."
          : "Enter your email address to continue.",
      );
      return;
    }
    if (phoneMode) {
      setMessage(
        "Phone sign-in is ready for the connected identity provider. Use email sign-in for this test build.",
      );
      return;
    }
    const supabase = getSupabaseClient(remember);
    if (!supabase) {
      setMessage(
        "Secure sign-in is not configured. Add the Supabase project URL and publishable key to the deployment environment.",
      );
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: identifier.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    sessionStorage.setItem("mo:requested-environment", environment);
    toast.success("Identity verified. Opening your command center.");
    navigate({ to: "/", replace: true });
  }

  async function resetPassword() {
    if (!identifier.includes("@")) {
      setMessage("Enter your registered email address first so we can send a secure reset link.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage("Password recovery becomes available after Supabase is configured.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(identifier.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    setMessage(
      error ? error.message : "If the account exists, a password-reset link has been sent.",
    );
  }

  async function startConnector(provider: OAuthProvider | undefined, label: string, note?: string) {
    setMessage("");
    if (!provider) {
      setMessage(
        `${label} is shown as an enterprise connector. ${note ?? "Configure it in Supabase Authentication before using it."}`,
      );
      return;
    }
    const supabase = getSupabaseClient(remember);
    if (!supabase) {
      setMessage(
        "Secure sign-in is not configured. Add the Supabase project URL and publishable key to the deployment environment.",
      );
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
        ...(provider === "azure" ? { queryParams: { prompt: "select_account" } } : {}),
      },
    });
    setBusy(false);
    if (error) setMessage(error.message);
  }

  return (
    <main className="login-screen">
      <div className="login-hero">
        <div className="login-brand-line">
          <div className="login-brand">
            <img src="/assets/intellistack-shield.jpg" alt="IntelliStack Systems" />
            <span>
              INTELLISTACK
              <br />
              <b>SYSTEMS</b>
              <small>SECURE · TRUSTED · COMPLIANT</small>
            </span>
          </div>
          <div className="login-tagline">
            See Everything. Connect Everything. <b>Work Smarter.</b>
          </div>
        </div>
        <div className="login-hero-copy">
          <h1>
            <span>MAXIMUS</span> OPTIMUS
          </h1>
          <strong>GLOBAL OPERATIONS CENTER</strong>
          <p>One World. One System. One Intelligent Network.</p>
        </div>
        <div className="login-hero-glow" />
      </div>
      <div className="login-layout">
        <section className="login-card">
          <div className="login-card-heading">
            <small>SELECT YOUR LOGIN ENVIRONMENT</small>
            <p>Choose the access path for a secure, verified login experience.</p>
          </div>
          <div className="login-environments">
            {environments.map(({ id, label, detail, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={environment === id ? `selected ${id}` : ""}
                onClick={() => setEnvironment(id)}
                aria-pressed={environment === id}
              >
                <Icon size={19} />
                <span>
                  <b>{label}</b>
                  <small>{detail}</small>
                </span>
                {environment === id && <Check size={15} />}
              </button>
            ))}
          </div>
          <div className="login-card-grid">
            <form onSubmit={signIn} className="login-form">
              <div className="login-card-heading compact">
                <small>SIGN IN WITH YOUR VERIFIED PROVIDER</small>
                <p>Use your IntelliStack identity to access Global Command Center.</p>
              </div>
              <div className="login-toggle">
                <button
                  type="button"
                  className={!phoneMode ? "selected" : ""}
                  onClick={() => setPhoneMode(false)}
                >
                  <Mail size={13} /> Email
                </button>
                <button
                  type="button"
                  className={phoneMode ? "selected" : ""}
                  onClick={() => setPhoneMode(true)}
                >
                  <Phone size={13} /> Phone Number
                </button>
              </div>
              <label>
                <span>{phoneMode ? "Phone number" : "Email address"}</span>
                <div className="login-input-wrap">
                  <Mail size={14} />
                  <input
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    type={phoneMode ? "tel" : "email"}
                    placeholder={phoneMode ? "+1 (555) 000-0000" : "name@company.com"}
                    autoComplete="username"
                    required
                  />
                </div>
              </label>
              <label>
                <span>Password</span>
                <div className="login-input-wrap">
                  <LockKeyhole size={14} />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </label>
              <div className="login-form-options">
                <label className="login-check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  <span /> Remember me
                </label>
                <button type="button" onClick={resetPassword}>
                  Forgot password?
                </button>
              </div>
              {message && (
                <p className="login-message" role="alert">
                  {message}
                </p>
              )}
              <button className="login-submit" disabled={busy} type="submit">
                <ShieldCheck size={15} />
                {busy ? "Verifying identity…" : "Sign In"}
              </button>
              <div className="login-help-links">
                <span>Something else?</span>
                <button
                  type="button"
                  onClick={() =>
                    setMessage(
                      "Use another sign-in method through your organization administrator.",
                    )
                  }
                >
                  Use another sign-in method
                </button>
              </div>
            </form>
            <div className="login-providers">
              <div className="login-card-heading compact">
                <small>VERIFIED IDENTITY PROVIDERS</small>
                <p>Sign in with your existing organizational account.</p>
              </div>
              <div className="provider-grid">
                {providers.map(({ label, provider, note }) => (
                  <button
                    type="button"
                    key={label}
                    disabled={busy}
                    onClick={() => void startConnector(provider, label, note)}
                  >
                    <span className="provider-mark">
                      {label === "GitHub" ? "◉" : label === "Apple" ? "●" : label.slice(0, 1)}
                    </span>
                    {label}
                  </button>
                ))}
              </div>
              <label className="provider-more">
                <span>⠿</span>
                <select
                  value={directoryProvider}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDirectoryProvider(value);
                    if (value) {
                      setMessage(
                        `${value} is selected from the 100+ provider directory. Complete its Supabase SSO connection to enable sign-in.`,
                      );
                    }
                  }}
                >
                  <option value="">Other identity providers (100+)</option>
                  {directoryProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
                <small>Search and select from additional connected providers</small>
              </label>
            </div>
          </div>
        </section>
        <aside className="login-security">
          <div className="security-title">
            <ShieldCheck size={23} />
            <div>
              <b>Secure Access</b>
              <span>Your data, your organization, your priority.</span>
            </div>
          </div>
          {securityFeatures.map(([Icon, title, detail]) => (
            <div className="security-row" key={String(title)}>
              <Icon size={20} />
              <span>
                <b>{String(title)}</b>
                <small>{String(detail)}</small>
              </span>
            </div>
          ))}
          <div className="security-bottom">
            <Globe2 size={22} />
            <b>
              Think Beyond Locally.
              <br />
              Connect Everything Globally.
              <br />
              <span>Powered by Intelligence.</span>
            </b>
          </div>
        </aside>
      </div>
      <footer className="login-footer">
        <div className="login-brand mini">
          <img src="/assets/intellistack-shield.jpg" alt="" />
          <span>
            INTELLISTACK
            <br />
            <b>SYSTEMS</b>
            <small>SECURE · TRUSTED · COMPLIANT</small>
          </span>
        </div>
        <div>
          <b>About Us</b>
          <span>Our Story · Leadership · Careers · News &amp; Media</span>
        </div>
        <div>
          <b>Products &amp; Services</b>
          <span>Platform Overview · Solutions · Integrations · Pricing</span>
        </div>
        <div>
          <b>Resources</b>
          <span>Help Center · Documentation · System Status</span>
        </div>
        <div>
          <b>Legal &amp; Policies</b>
          <span>Privacy · Terms · Accessibility</span>
        </div>
        <div className="login-footer-status">
          <span>
            <i /> Global Operations
          </span>
          <small>Worldwide · 24/7</small>
        </div>
      </footer>
      <div className="login-copyright">
        © 2026 IntelliStack Systems. All rights reserved.{" "}
        <span>Maximus Optimus Command Center v2.0.0</span>
      </div>
    </main>
  );
}
