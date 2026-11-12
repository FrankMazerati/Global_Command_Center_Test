import { useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Globe2,
  Layers3,
  LockKeyhole,
  MapPin,
  MessageSquare,
  Network,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

import { getSupabaseClient } from "@/lib/supabase";

type PriceRow = {
  package_key: string;
  price_key: string;
  monthly_company_price: number | string | null;
  monthly_location_price: number | string | null;
  pricing_unit_label: string;
  management_scope: string;
  status: string;
  approval_status: string;
};

type EntitlementRow = {
  plan_key: string;
  entitlement_key: string;
  description: string;
  is_included: boolean;
  is_optional_addon: boolean;
  release_state: string;
};

const PLAN_DEFINITIONS = [
  {
    key: "essential",
    name: "Essential",
    price: "$799",
    unit: "per activated location / month",
    scope: "One location",
    management: "Local Operations Manager",
    description: "A complete connected business workspace for one operating location.",
    icon: MapPin,
    features: [
      "Core employee workspace and directory",
      "Basic Chat Buddy and Bring the Work to You",
      "IntelliChat core messaging",
      "Help Desk, tickets, and SLA workflows",
      "Core IntelliSphere productivity suite",
      "Role-based permissions and audit history",
      "Standard approvals and manual privileged-access requests",
    ],
  },
  {
    key: "professional",
    name: "Professional",
    price: "$1,499",
    unit: "per activated location / month",
    scope: "Multiple locations",
    management: "Regional Operations Manager",
    description: "Advanced intelligence and coordination across activated company locations.",
    icon: Network,
    features: [
      "Everything in Essential",
      "Multi-location and regional management",
      "Cross-location ticket coordination",
      "Advanced Chat Buddy and workflow automation",
      "Avatar wardrobe and scheduled outfits",
      "Cross-location analytics and comparisons",
      "Expanded integrations and collaboration",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "From $3,500",
    unit: "per organization / month · negotiated coverage",
    scope: "Enterprise-wide",
    management: "Global Operations Center",
    description: "The complete enterprise environment with contracted company and location coverage.",
    icon: Globe2,
    features: [
      "Everything in Professional",
      "Global Operations Center and enterprise hierarchy",
      "Subsidiary, region, and location oversight",
      "Global identity and centralized governance",
      "Advanced IntelliAccess JIT orchestration",
      "Advanced Maximus and Optimus orchestration",
      "Enterprise reporting, policy, and automation",
    ],
  },
] as const;

const STATUS_LABELS: Record<string, string> = {
  not_certified: "Not yet release-certified",
  planned: "Planned",
  in_development: "In development",
  available: "Available",
  integration_required: "Integration required",
  retired: "Retired",
};

export function SubscriptionPlansWorkspace({ title }: { title: string }) {
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [schemaReady, setSchemaReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setCatalogMessage("Supabase is not configured. Showing the approved commercial specification only.");
      setLoading(false);
      return () => {
        live = false;
      };
    }

    Promise.all([
      supabase
        .from("marketplace_price_versions")
        .select("package_key,price_key,monthly_company_price,monthly_location_price,pricing_unit_label,management_scope,status,approval_status")
        .in("package_key", ["essential", "professional", "enterprise"])
        .order("version_number", { ascending: false }),
      supabase
        .from("marketplace_plan_entitlement_catalog")
        .select("plan_key,entitlement_key,description,is_included,is_optional_addon,release_state")
        .in("plan_key", ["essential", "professional", "enterprise"]),
    ]).then(([priceResult, entitlementResult]) => {
      if (!live) return;
      if (priceResult.error || entitlementResult.error) {
        setCatalogMessage(
          "The three-plan pricing migration is staged on the feature branch but has not been applied to this database. These are proposed list prices, not active checkout offers.",
        );
      } else {
        setSchemaReady(true);
        setPrices((priceResult.data ?? []) as PriceRow[]);
        setEntitlements((entitlementResult.data ?? []) as EntitlementRow[]);
        setCatalogMessage(
          "Pricing and feature entitlements are loaded from the marketplace catalog. Checkout remains disabled until pricing approval and release certification are complete.",
        );
      }
      setLoading(false);
    });

    return () => {
      live = false;
    };
  }, []);

  const activePrice = (planKey: string) =>
    prices.find((price) => price.package_key === planKey && price.status === "active" && price.approval_status === "approved")
      ?? prices.find((price) => price.package_key === planKey);

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-sky-400/25 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 text-white shadow-xl sm:p-7">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
          <ShieldCheck className="size-4" />
          IntelliStack commercial architecture
        </div>
        <h2 className="mt-3 text-2xl font-bold sm:text-3xl">{title || "Three plans. One connected platform."}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Every plan provides a coherent business operating environment. Higher tiers add automation,
          customization, security orchestration, and broader organizational management—not basic security.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1.5">Make the Security Process Smarter.</span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">Location-based licensing</span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">Enterprise-wide contracts</span>
        </div>
      </div>

      {catalogMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <LockKeyhole className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Commercial configuration status</p>
            <p className="mt-1 text-muted-foreground">{catalogMessage}</p>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Checking the marketplace pricing and entitlement catalog…</p>}

      <div className="grid gap-4 xl:grid-cols-3">
        {PLAN_DEFINITIONS.map((plan) => {
          const Icon = plan.icon;
          const price = activePrice(plan.key);
          const amount =
            price?.monthly_location_price != null
              ? `$${Number(price.monthly_location_price).toLocaleString("en-US")}`
              : price?.monthly_company_price != null
                ? `$${Number(price.monthly_company_price).toLocaleString("en-US")}`
                : plan.price;
          const planFeatures = entitlements.filter((item) => item.plan_key === plan.key && item.is_included);
          const featureList = planFeatures.length
            ? planFeatures.map((item) => ({
                key: item.entitlement_key,
                label: item.description,
                state: STATUS_LABELS[item.release_state] ?? item.release_state,
              }))
            : plan.features.map((feature) => ({ key: feature, label: feature, state: "Specification" }));

          return (
            <article key={plan.key} className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="size-6" /></div>
                <span className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {plan.scope}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-bold">{plan.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-4">
                <p className="text-3xl font-bold tracking-tight">{amount}</p>
                <p className="mt-1 text-xs text-muted-foreground">{price?.pricing_unit_label ?? plan.unit}</p>
              </div>
              <div className="mt-4 rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Management software</p>
                <p className="mt-1 text-sm font-semibold">{plan.management}</p>
              </div>
              <div className="mt-5 flex-1 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Included capabilities</p>
                {featureList.map((feature) => (
                  <div key={feature.key} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span>{feature.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t pt-4 text-xs text-muted-foreground">
                {price
                  ? `Price status: ${price.status} / ${price.approval_status}.`
                  : "Price shown from the approved commercial specification; marketplace price row is not yet available."}
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 font-semibold"><Building2 className="size-5 text-primary" /> Local Operations</div>
          <p className="mt-2 text-sm text-muted-foreground">Manage one activated location's workforce, service desk, devices, approvals, and daily operations.</p>
        </div>
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 font-semibold"><Layers3 className="size-5 text-primary" /> Regional Operations</div>
          <p className="mt-2 text-sm text-muted-foreground">Coordinate contracted locations with regional assignments, cross-location workflows, and authorized comparisons.</p>
        </div>
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 font-semibold"><Globe2 className="size-5 text-primary" /> Global Operations</div>
          <p className="mt-2 text-sm text-muted-foreground">Oversee the contracted enterprise hierarchy, subsidiaries, locations, governance, and consolidated performance.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-center gap-2 font-semibold"><Sparkles className="size-5 text-primary" /> Important licensing distinction</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Subscription entitlements determine which management capabilities the company has purchased.
          The employee's role and scoped permissions determine what that employee may access or change.
          Both checks are required. Fundamental authentication, tenant isolation, role-based security,
          and audit history are not paywalled.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><MessageSquare className="size-3.5" /> Connected collaboration</span>
          <span className="inline-flex items-center gap-1.5"><Workflow className="size-3.5" /> Governed workflows</span>
          <span className="inline-flex items-center gap-1.5"><BarChart3 className="size-3.5" /> Scope-aware analytics</span>
          <span className="inline-flex items-center gap-1.5"><Network className="size-3.5" /> Organizational hierarchy</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {schemaReady ? "Live marketplace catalog connected." : "Commercial specification preview only. No purchase, checkout, or entitlement activation is available from this screen."}
      </p>
    </section>
  );
}
