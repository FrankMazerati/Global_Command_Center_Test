import { Link, createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Maximus Optimus Global Command Center" },
      { name: "description", content: "Sign in to the IntelliStack Systems Maximus Optimus Global Command Center." },
      { property: "og:title", content: "Sign in · Maximus Optimus" },
      { property: "og:description", content: "Secure sign-in for IntelliStack Systems and business organizations." },
    ],
  }),
  component: LoginPage,
});

const PROVIDERS = ["Google Workspace", "Microsoft 365 / Entra ID", "Apple", "GitHub"];
const BUSINESS_PATHS = ["Employee", "Contractor", "Employer", "Business user"];
const FOOTER = ["Home", "About", "Contact", "Partners", "Careers", "Looking for Work", "Terms", "Cookie Policy", "Acceptable Use", "Privacy", "How Information Is Handled"];

function LoginPage() {
  const [kind, setKind] = useState("intellistack");
  const [show, setShow] = useState(false);
  const [path, setPath] = useState(BUSINESS_PATHS[0]);

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-float sm:p-8">
          <div className="mb-6 text-center">
            <div className="text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">IntelliStack Systems Presents</div>
            <h1 className="font-display text-3xl font-black text-brand-gradient">Maximus Optimus</h1>
            <div className="font-display text-xs tracking-[0.3em] text-secondary-foreground">GLOBAL COMMAND CENTER</div>
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-tenant"><ShieldCheck className="size-4" /> Secure, Trusted, and Compliant</div>
          </div>

          <Tabs value={kind} onValueChange={setKind} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="intellistack">IntelliStack</TabsTrigger>
              <TabsTrigger value="business">Business / Organization</TabsTrigger>
            </TabsList>
          </Tabs>

          {kind === "business" && (
            <div className="mb-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Sign in as">
              {BUSINESS_PATHS.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={path === p}
                  onClick={() => setPath(p)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${path === p ? "border-contractor bg-contractor/10 text-contractor" : "hover:bg-accent"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              toast.info("Sign-in activates once the backend is connected. No account was checked.");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" required className="pr-10" />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox id="remember" /> Remember me
            </label>
            <Button type="submit" className="w-full">Sign in</Button>
          </form>

          <div className="mt-5">
            <div className="mb-2 text-center text-xs text-muted-foreground">Provider sign-in (not yet configured)</div>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((p) => (
                <Button key={p} variant="outline" size="sm" disabled className="text-xs">{p}</Button>
              ))}
            </div>
          </div>
          <div className="mt-5 text-center">
            <Link to="/" className="text-xs text-primary hover:underline">Back to dashboard</Link>
          </div>
        </div>
      </main>
      <footer className="border-t bg-card/60 px-4 py-3 text-center text-[11px] text-muted-foreground">
        <div className="mb-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
          {FOOTER.map((f) => <span key={f}>{f}</span>)}
        </div>
        Designed and Developed by IntelliStack Systems
      </footer>
    </div>
  );
}
