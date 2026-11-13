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
  { id: "IntelliStaff", detail: "Workforce, people operations & staffing" },
  { id: "IntelliHire", detail: "Recruiting, applicants & talent acquisition" },
  { id: "IntelliWork", detail: "Business workflows, tasks & collaboration" },
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
              <small>PRESENTS</small>
            </span>
          </div>
          <div className="login-tagline">
            See Everything <i>Locally</i>. Connect Everything <i>Globally</i>.
            <br />
            Powered by <i>Intelligence</i>.
          </div>
        </div>
        <div className="login-hero-copy">
          <h1>
            <span>MAXIMUS</span> <em>OPTIMUS</em>
          </h1>
          <strong>GLOBAL OPERATIONS CENTER</strong>
          <p className="login-world-line">
            One <i>World</i>. One <i>System</i>. One Intelligent <i>Network</i>.
          </p>
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
          {environment === "business" && (
            <div className="login-business-products" aria-label="Business and employer products">
              {businessProducts.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  className={businessProduct === product.id ? "selected" : ""}
                  aria-pressed={businessProduct === product.id}
                  onClick={() => setBusinessProduct(product.id)}
                >
                  <b>{product.id}</b>
                  <small>{product.detail}</small>
                  {businessProduct === product.id && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
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
                  onClick={() => {
                    setPhoneMode(false);
                    setPhoneOtpSent(false);
                    setPhoneOtp("");
                  }}
                >
                  <Mail size={13} /> Email
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
                  <Phone size={13} /> Phone Number
                </button>
              </div>
              <label>
                <span>{phoneMode ? "Phone number" : "Email address"}</span>
                <div className="login-input-wrap">
                  {phoneMode ? <Phone size={14} /> : <Mail size={14} />}
                  <input
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    type={phoneMode ? "tel" : "email"}
                    placeholder={phoneMode ? "+1 (555) 000-0000" : "name@company.com"}
                    autoComplete={phoneMode ? "tel" : "username"}
                    required
                  />
                </div>
              </label>
              {!phoneMode ? (
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
              ) : phoneOtpSent ? (
                <label>
                  <span>SMS verification code</span>
                  <div className="login-input-wrap">
                    <ShieldCheck size={14} />
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
                  <button type="button" onClick={resetPassword}>
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
              <button className="login-submit" disabled={busy} type="submit">
                <ShieldCheck size={15} />
                {busy
                  ? "Verifying identity…"
                  : phoneMode
                    ? phoneOtpSent
                      ? "Verify Code & Sign In"
                      : "Send Secure Code"
                    : "Sign In"}
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
                      ) : label === "AWS" ? (
                        <b className="provider-aws">aws</b>
                      ) : label === "GitHub" ? (
                        <Github size={17} />
                      ) : (
                        <Apple size={17} />
                      )}
                    </span>
                    {label}
                  </button>
                ))}
              </div>
              <div className="provider-more">
                <label htmlFor="provider-directory-search">Other identity providers</label>
                <input
                  id="provider-directory-search"
                  value={providerSearch}
                  onChange={(event) => setProviderSearch(event.target.value)}
                  placeholder="Search SSO providers and protocols…"
                  autoComplete="off"
                />
                <small>
                  Popular providers are listed first. Selection does not imply a live connection.
                </small>
                <div
                  className="provider-directory-list"
                  role="listbox"
                  aria-label="Additional identity providers"
                >
                  {directoryProviders
                    .filter((provider) =>
                      provider.toLowerCase().includes(providerSearch.toLowerCase()),
                    )
                    .map((provider) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={directoryProvider === provider}
                        className={directoryProvider === provider ? "selected" : ""}
                        key={provider}
                        onClick={() => {
                          setDirectoryProvider(provider);
                          setMessage(
                            `${provider} selected. An administrator must configure and verify this connection before it can be used to sign in.`,
                          );
                        }}
                      >
                        {provider}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        <aside className="login-security">
          <div className="security-title">
            <ShieldCheck size={23} />
            <div>
              <b>Global Infrastructure</b>
              <span>Enterprise Security · Compliance Ready</span>
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
            <b>One connected command environment for your people, systems and operations.</b>
          </div>
        </aside>
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
