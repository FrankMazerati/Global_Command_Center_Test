import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Apple,
  Github,
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
import { NAV } from "@/lib/nav";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex,nofollow" },
      { title: "Secure sign in · Maximus Optimus" },
      {
        name: "description",
        content: "IntelliStack Systems Global Command Center secure sign-in.",
      },
    ],
  }),
  component: LoginPage,
});

function navHrefForPage(title: string) {
  for (const section of NAV) {
    for (const group of section.groups) {
      const page = group.pages.find((candidate) => candidate.title === title);
      if (page) return `/m/${section.slug}/${group.slug}/${page.slug}`;
    }
  }
  return "/login";
}

type LoginEnvironment = "employee" | "business" | "tenant";
interface EnvironmentDef {
  id: LoginEnvironment;
  badge: string;
  number: string;
  label: string;
  detail: string;
  description: string;
  color: "blue" | "purple" | "green";
  icon: LucideIcon;
}

const environments: EnvironmentDef[] = [
  {
    id: "employee",
    badge: "IS",
    number: "01",
    label: "IntelliStack Systems",
    detail: "Blue · Corporate access",
    description: "For IntelliStack employees and authorized platform administrators.",
    color: "blue",
    icon: UserRound,
  },
  {
    id: "business",
    badge: "IS",
    number: "02",
    label: "IntelliStaff",
    detail: "Purple · Workforce services",
    description: "Choose IntelliWork or IntelliHire to continue.",
    color: "purple",
    icon: Building2,
  },
  {
    id: "tenant",
    badge: "ORG",
    number: "03",
    label: "Tenant / Organization",
    detail: "Green · Tenant-specific access",
    description: "For customer organizations, administrators and authorized employees.",
    color: "green",
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
  "Microsoft Entra ID",
  "Google Workspace",
  "Auth0",
  "Ping Identity",
  "OneLogin",
  "AWS IAM Identity Center",
  "JumpCloud",
  "Duo SSO",
  "CyberArk Identity",
  "IBM Security Verify",
  "Oracle Cloud Identity",
  "ForgeRock",
  "Keycloak",
  "Cisco Identity Services",
  "RSA SecurID",
  "SecureAuth",
  "SailPoint Identity Security",
  "WorkOS",
  "Descope",
  "Clerk",
  "Salesforce Identity",
  "VMware Workspace ONE",
  "Rippling",
  "miniOrange",
  "SAML 2.0 Enterprise",
  "OpenID Connect (OIDC)",
  "LDAP / Active Directory Federation",
  "Custom SAML Identity Provider",
  "Custom OIDC Identity Provider",
];
const securityFeatures: Array<[LucideIcon, string, string]> = [
  [ShieldCheck, "Enterprise Security", "Identity-first access and protection."],
  [Check, "Compliance Ready", "Designed for accountable enterprise operations."],
];

const businessProducts = [
  { id: "IntelliWork", label: "IntelliWork", detail: "Collaborate, manage work, and connect with opportunities." },
  { id: "IntelliHire", label: "IntelliHire", detail: "Recruit, post opportunities, find talent, and onboard." },
];

const loginQuickLinks = [
  {
    label: "24/7 Support",
    detail: "Service desk and assistance",
    href: "/m/intellidesk-command-center/service-desk-dashboard/open-tickets",
  },
  {
    label: "IntelliBase",
    detail: "Knowledge base, learning and documentation",
    href: "/m/intellibase/knowledge-dashboard/featured-knowledge",
  },
  {
    label: "Security & Compliance",
    detail: "Security operations and governance",
    href: "/m/soc-security-operations-center/soc-dashboard/security-posture",
  },
  {
    label: "Global Infrastructure",
    detail: "Network, systems and infrastructure operations",
    href: "/m/network-operations-center/noc-dashboard/network-health",
  },
  { label: "Platform Overview", detail: "Explore the IntelliStack platform", href: "/p/products" },
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
  const [providerSearch, setProviderSearch] = useState("");
  const [businessProduct, setBusinessProduct] = useState("IntelliStaff");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");

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
    const supabase = getSupabaseClient(remember);
    if (!supabase) {
      setMessage(
        "Secure sign-in is not configured. Add the Supabase project URL and publishable key to the deployment environment.",
      );
      return;
    }
    setBusy(true);
    if (phoneMode) {
      if (!phoneOtpSent) {
        const { error } = await supabase.auth.signInWithOtp({ phone: identifier.trim() });
        setBusy(false);
        if (error) {
          setMessage(error.message);
          return;
        }
        setPhoneOtpSent(true);
        setMessage(
          "A verification code was sent if this phone number is registered and SMS sign-in is enabled.",
        );
        return;
      }
      if (!phoneOtp.trim()) {
        setBusy(false);
        setMessage("Enter the verification code sent to your phone.");
        return;
      }
      const { error } = await supabase.auth.verifyOtp({
        phone: identifier.trim(),
        token: phoneOtp.trim(),
        type: "sms",
      });
      setBusy(false);
      if (error) {
        setMessage(error.message);
        return;
      }
    } else {
      if (!password) {
        setBusy(false);
        setMessage("Enter your password to continue.");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: identifier.trim(),
        password,
      });
      setBusy(false);
      if (error) {
        setMessage(error.message);
        return;
      }
    }
    sessionStorage.setItem("mo:requested-environment", environment);
    if (environment === "business")
      sessionStorage.setItem("mo:requested-business-product", businessProduct);
    toast.success("Identity verified. Opening your command center.");
    navigate({ to: "/", replace: true });
  }

  async function sendMagicLink() {
    setMessage("");
    if (!identifier.includes("@")) {
      setMessage("Enter your registered email address first to receive a sign-in link.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage("Secure sign-in is not configured. Add the Supabase project URL and publishable key.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: identifier.trim(),
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
    } else {
      toast.success("Secure sign-in link sent to your email.");
      setMessage("A one-click magic sign-in link has been sent to your email.");
    }
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
          <div className="login-brand login-brand-present">
            <img src="/assets/intellistack-shield.jpg" alt="IntelliStack Systems shield" />
            <span>
              <b>INTELLISTACK SYSTEMS</b>
              <small>SECURED · TRUSTED · COMPLIANT</small>
            </span>
          </div>
          <div className="login-tagline">
            SEE EVERYTHING <i>LOCALLY</i>. CONNECT EVERYTHING <i>GLOBALLY</i>. POWERED BY <i>INTELLIGENCE</i>.
          </div>
        </div>

        <div className="login-hero-main-row">
          <div className="login-hero-copy">
            <h1 className="login-hero-title">
              <span className={`hero-highlight hero-${environment}`}>MAXIMUS</span> <em>OPTIMUS</em>
            </h1>
            <strong className="login-hero-subtitle">GLOBAL COMMAND CENTER</strong>
            <p className="login-world-line">
              ONE <i className="word-blue">WORLD</i>. ONE <i className="word-purple">SYSTEM</i>. ONE INTELLIGENT <i className="word-green">NETWORK</i>.
            </p>
          </div>

          <div className="login-hero-telemetry" aria-hidden="true">
            <div className="login-radar-box">
              <div className="login-radar-grid" />
              <div className="login-radar-sweep" />
              <div className="login-radar-center" />
            </div>
            <div className="login-telemetry-metrics">
              <div className="login-telemetry-item">
                <span className="telemetry-bullet bullet-blue" />
                <span className="telemetry-label">Malware</span>
                <span className="telemetry-val">0</span>
              </div>
              <div className="login-telemetry-item">
                <span className="telemetry-bullet bullet-cyan" />
                <span className="telemetry-label">Suspicious Activity</span>
                <span className="telemetry-val">2</span>
              </div>
              <div className="login-telemetry-item">
                <span className="telemetry-bullet bullet-purple" />
                <span className="telemetry-label">Blocked</span>
                <span className="telemetry-val">14</span>
              </div>
              <div className="login-telemetry-item">
                <span className="telemetry-bullet bullet-green" />
                <span className="telemetry-label">Investigating</span>
                <span className="telemetry-val">1</span>
              </div>
            </div>
            <div className="login-telemetry-footer">
              <span className="telemetry-ai-tag">AI ASSISTANT</span>
              <span>Latency <b>14ms</b></span>
              <span>Traffic <b>2.0 Gbps</b></span>
            </div>
          </div>
        </div>
        <div className="login-hero-glow" />
      </div>

      <div className="login-layout">
        <section className={`login-card env-${environment}`}>
          <div className="login-card-heading">
            <small className="login-gateway-tag">SECURE ACCESS GATEWAY</small>
            <h2>Select Your Login Environment</h2>
            <p>Choose your access type. Each option provides a secure, verified login experience.</p>
          </div>

          <div className="login-environments-stack" role="radiogroup" aria-label="Select login environment">
            {environments.map((env) => {
              const isSelected = environment === env.id;
              return (
                <div
                  key={env.id}
                  className={`login-env-card login-env-${env.color} ${isSelected ? "selected" : ""}`}
                  onClick={() => setEnvironment(env.id)}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setEnvironment(env.id);
                    }
                  }}
                >
                  <div className="login-env-header">
                    <span className={`login-env-badge badge-${env.color}`}>{env.badge}</span>
                    <span className="login-env-number">{env.number}</span>
                  </div>
                  <div className="login-env-content">
                    <h3 className="login-env-title">{env.label}</h3>
                    <span className={`login-env-detail detail-${env.color}`}>{env.detail}</span>
                    <p className="login-env-desc">{env.description}</p>
                  </div>

                  {env.id === "business" && isSelected && (
                    <div
                      className="login-business-subgrid"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {businessProducts.map((p) => {
                        const isSubSelected = businessProduct === p.id;
                        return (
                          <button
                            type="button"
                            key={p.id}
                            className={`login-subproduct-card ${isSubSelected ? "selected" : ""}`}
                            onClick={() => setBusinessProduct(p.id)}
                            aria-pressed={isSubSelected}
                          >
                            <span className="subproduct-title">{p.label}</span>
                            <span className="subproduct-desc">{p.detail}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="login-card-grid">
            <form onSubmit={signIn} className="login-form">
              <div className="login-form-header">
                <div className="login-form-tags">
                  <small className="login-access-tag">VERIFIED ACCOUNT ACCESS</small>
                  <span className={`login-env-indicator tag-${environment}`}>
                    {environment === "employee"
                      ? "INTELLISTACK SYSTEMS"
                      : environment === "business"
                        ? `INTELLISTAFF (${businessProduct.toUpperCase()})`
                        : "TENANT / ORGANIZATION"}
                  </span>
                </div>
                <h3>
                  {environment === "employee"
                    ? "Sign in to IntelliStack Systems"
                    : environment === "business"
                      ? `Sign in to ${businessProduct}`
                      : "Sign in to your organization"}
                </h3>
                <p>
                  {environment === "employee"
                    ? "Use your authorized IntelliStack corporate or contractor credentials."
                    : environment === "business"
                      ? `Use your registered business or employer credentials to access ${businessProduct}.`
                      : "Use the account provided by your tenant or organization administrator."}
                </p>
              </div>

              <div className="login-toggle">
                <button
                  type="button"
                  className={!phoneMode ? "selected" : ""}
                  onClick={() => {
                    setPhoneMode(false);
                    setPhoneOtpSent(false);
                    setPhoneOtp("");
                  }}
                >
                  <Mail size={13} /> EMAIL
                </button>
                <button
                  type="button"
                  className={phoneMode ? "selected" : ""}
                  onClick={() => {
                    setPhoneMode(true);
                    setPhoneOtpSent(false);
                    setPhoneOtp("");
                  }}
                >
                  <Phone size={13} /> PHONE NUMBER
                </button>
              </div>

              <label>
                <span>{phoneMode ? "Phone number" : "Email address"}</span>
                <div className="login-input-wrap">
                  {phoneMode ? <Phone size={15} /> : <Mail size={15} />}
                  <input
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    type={phoneMode ? "tel" : "email"}
                    placeholder={phoneMode ? "+1 (555) 000-0000" : "you@company.com"}
                    autoComplete={phoneMode ? "tel" : "username"}
                    required
                  />
                </div>
              </label>

              {!phoneMode ? (
                <label>
                  <span>Password</span>
                  <div className="login-input-wrap">
                    <LockKeyhole size={15} />
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
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </label>
              ) : phoneOtpSent ? (
                <label>
                  <span>SMS verification code</span>
                  <div className="login-input-wrap">
                    <ShieldCheck size={15} />
                    <input
                      value={phoneOtp}
                      onChange={(event) => setPhoneOtp(event.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="Enter your verification code"
                      required
                    />
                  </div>
                </label>
              ) : (
                <p className="login-phone-note">We’ll send a one-time verification code by SMS.</p>
              )}

              <div className="login-form-options">
                <label className="login-check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  <span /> Remember me
                </label>
                {!phoneMode ? (
                  <button type="button" onClick={resetPassword} className="login-forgot-btn">
                    Forgot password?
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneOtpSent(false);
                      setPhoneOtp("");
                      setMessage("Enter your phone number and request a new verification code.");
                    }}
                    className="login-forgot-btn"
                  >
                    Resend / change number
                  </button>
                )}
              </div>

              {message && (
                <p className="login-message" role="alert">
                  {message}
                </p>
              )}

              <button className={`login-submit btn-${environment}`} disabled={busy} type="submit">
                <ShieldCheck size={16} />
                {busy
                  ? "Verifying identity…"
                  : phoneMode
                    ? phoneOtpSent
                      ? "Verify Code & Sign In"
                      : "Send Secure Code"
                    : "Sign in securely"}
              </button>

              <div className="login-subaction-area">
                <p className="login-subaction-note">Use your registered account or request access below.</p>
                <button
                  type="button"
                  onClick={sendMagicLink}
                  disabled={busy}
                  className="login-secondary-btn"
                >
                  Quick Login · Email me a secure sign-in link
                </button>
              </div>

              <div className="login-bottom-links">
                <button
                  type="button"
                  className="login-link-btn"
                  onClick={() => setMessage("New account registration is provisioned by your organization administrator.")}
                >
                  New here? <b>Sign up</b>
                </button>
                <a href={navHrefForPage("Knowledge Search")}>
                  Need Help / Support?
                </a>
              </div>
            </form>

            <div className="login-providers">
              <div className="login-card-heading compact">
                <small>VERIFIED IDENTITY PROVIDERS</small>
                <h3>Sign in with your organization account</h3>
                <p>Provider access depends on the authentication methods enabled for this Supabase project.</p>
              </div>

              <div className="provider-grid">
                {providers.slice(0, 4).map(({ label, provider, note }) => (
                  <button
                    type="button"
                    key={label}
                    disabled={busy}
                    onClick={() => void startConnector(provider, label, note)}
                    className="provider-card"
                  >
                    <span
                      className={`provider-mark provider-${label.toLowerCase().replaceAll(" ", "-")}`}
                    >
                      {label === "Google Workspace" ? (
                        <b className="provider-google">G</b>
                      ) : label === "Microsoft 365" || label === "Microsoft Entra ID" ? (
                        <span className="provider-microsoft">
                          <i />
                          <i />
                          <i />
                          <i />
                        </span>
                      ) : label === "GitHub" ? (
                        <Github size={17} />
                      ) : (
                        <Apple size={17} />
                      )}
                    </span>
                    <span className="provider-label">{label === "Microsoft 365" ? "Microsoft Entra ID / 365" : label}</span>
                  </button>
                ))}
              </div>

              <div className="provider-unconfigured-row">
                <div className="provider-unconfigured-btn">
                  <span className="provider-mark-dim"><b className="provider-aws">AWS</b></span>
                  <span>AWS · Not configured</span>
                </div>
                <div className="provider-unconfigured-btn">
                  <span className="provider-mark-dim">+</span>
                  <span>Other providers · Not configured</span>
                </div>
              </div>
              <p className="provider-disclaimer">Unavailable providers are clearly marked and cannot be selected.</p>
            </div>
          </div>

          <div className="login-bottom-features">
            <div className="login-feature-card">
              <div className="feature-icon-wrap icon-green">
                <ShieldCheck size={22} />
              </div>
              <div className="feature-text">
                <b>Secure Access</b>
                <p>Your data, your organization, your privacy.</p>
              </div>
            </div>
            <div className="login-feature-card">
              <div className="feature-icon-wrap icon-green">
                <Globe2 size={22} />
              </div>
              <div className="feature-text">
                <b>Global Infrastructure</b>
                <p>Connected operations across regions and teams.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <nav className="login-quick-links" aria-label="Command Center quick links">
        {loginQuickLinks.map((link) => (
          <a key={link.label} href={link.href}>
            <b>{link.label}</b>
            <small>{link.detail}</small>
          </a>
        ))}
      </nav>
      <footer className="login-footer">
        <div className="login-brand mini">
          <img src="/assets/intellistack-shield.jpg" alt="" />
          <span>
            INTELLISTACK
            <br />
            <b>SYSTEMS</b>
            <small>SECURED · TRUSTED · COMPLIANT</small>
          </span>
          <p>Think beyond locally, connect everything globally, powered by intelligence.</p>
        </div>
        <div className="login-footer-group">
          <b>Company</b>
          <a href={navHrefForPage("Company Profile")}>Company Profile</a>
          <a href={navHrefForPage("Business Performance")}>Business Performance</a>
          <a href={navHrefForPage("Business Health")}>Business Health</a>
          <a href={navHrefForPage("Contact Information")}>Contact Information</a>
        </div>
        <div className="login-footer-group">
          <b>Platform</b>
          <a href={navHrefForPage("Platform Overview")}>Platform Overview</a>
          <a href={navHrefForPage("System Status")}>System Status</a>
          <a href={navHrefForPage("Global Settings")}>Global Settings</a>
          <a href={navHrefForPage("Application Configuration")}>Applications</a>
        </div>
        <div className="login-footer-group">
          <b>Resources</b>
          <a href={navHrefForPage("Learning Paths")}>Learning Paths</a>
          <a href={navHrefForPage("Application Documentation")}>Documentation</a>
          <a href={navHrefForPage("Troubleshooting")}>Troubleshooting</a>
          <a href={navHrefForPage("Common Issues")}>Common Issues</a>
        </div>
        <div className="login-footer-group">
          <b>Support</b>
          <a href={navHrefForPage("Knowledge Search")}>Help Center</a>
          <a href={navHrefForPage("Open Tickets")}>Open Tickets</a>
          <a href={navHrefForPage("Related Tickets")}>Related Tickets</a>
          <a href={navHrefForPage("Technical Procedures")}>Technical Procedures</a>
        </div>
        <div className="login-footer-group">
          <b>Legal &amp; Trust</b>
          <a href={navHrefForPage("Compliance Assessments")}>Compliance</a>
          <a href={navHrefForPage("Compliance Findings")}>Compliance Findings</a>
          <a href={navHrefForPage("Control Evidence")}>Control Evidence</a>
          <a href={navHrefForPage("Incident Reports")}>Incident Reports</a>
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
