import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ClientOnly,
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useNavigate,
  useRouter,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell as LovableAppShell } from "@/components/shell/AppShell";
import { DemoProvider } from "@/components/command/DemoProvider";
import { CommandProvider } from "@/lib/domain/store";
import { getSupabaseClient } from "@/lib/supabase";
import { canUseLegacyWorkspace, isPortalId, verifyPortalMembership } from "@/lib/portal-access";
import { WorkContextProvider } from "@/lib/work-context";
import { Toaster } from "sonner";

const PageZoom = lazy(() => import("@/components/command/PageZoom"));

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href={import.meta.env.BASE_URL}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Maximus Optimus — IntelliStack Systems" },
      { name: "description", content: "IntelliStack Systems Global Command Center." },
      { name: "author", content: "IntelliStack Systems" },
      { property: "og:title", content: "Maximus Optimus — IntelliStack Systems" },
      { property: "og:description", content: "IntelliStack Systems Global Command Center." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Exo+2:wght@300;400;500;600&display=swap",
      },
      { rel: "icon", href: `${import.meta.env.BASE_URL}favicon.ico`, type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const legacyRoute = pathname === "/lovable-dashboard" || pathname.startsWith("/m/");
  const [legacyAuthorized, setLegacyAuthorized] = useState(false);

  useEffect(() => {
    if (!legacyRoute) {
      setLegacyAuthorized(false);
      return;
    }

    let active = true;
    const client = getSupabaseClient();
    if (!client) {
      navigate({ to: "/login", replace: true });
      return () => {
        active = false;
      };
    }
    const authenticatedClient: NonNullable<typeof client> = client;

    async function verifySession() {
      const { data } = await authenticatedClient.auth.getSession();
      if (!active) return;
      const portal = window.sessionStorage.getItem("mo:requested-environment");
      if (!data.session || !isPortalId(portal) || !canUseLegacyWorkspace(portal)) {
        if (data.session) await authenticatedClient.auth.signOut();
        window.sessionStorage.removeItem("mo:requested-environment");
        if (active) navigate({ to: "/login", replace: true });
        return;
      }

      const access = await verifyPortalMembership(
        authenticatedClient,
        data.session.user.id,
        portal,
      );
      if (!active) return;
      if (!access.allowed) {
        await authenticatedClient.auth.signOut();
        window.sessionStorage.removeItem("mo:requested-environment");
        if (active) navigate({ to: "/login", replace: true });
        return;
      }
      setLegacyAuthorized(true);
    }

    void verifySession().catch(async () => {
      await authenticatedClient.auth.signOut();
      window.sessionStorage.removeItem("mo:requested-environment");
      if (active) navigate({ to: "/login", replace: true });
    });

    return () => {
      active = false;
    };
  }, [legacyRoute, navigate]);

  const routedPage = legacyRoute ? (
    legacyAuthorized ? (
      <LovableAppShell>
        <Outlet />
      </LovableAppShell>
    ) : (
      <div className="grid min-h-dvh place-items-center bg-transparent text-sm text-sky-100">
        <div className="flex items-center gap-3 rounded-xl border border-sky-200/20 bg-white/10 px-5 py-3 backdrop-blur-xl">
          <span className="size-2 animate-pulse rounded-full bg-sky-300" />
          Verifying secure command session…
        </div>
      </div>
    )
  ) : (
    <Outlet />
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DemoProvider>
        <CommandProvider>
          <WorkContextProvider>
            <ClientOnly fallback={<Outlet />}>
              <Suspense fallback={<Outlet />}>
                <PageZoom>{routedPage}</PageZoom>
              </Suspense>
            </ClientOnly>
            <Toaster
              position="bottom-right"
              theme="light"
              richColors
              closeButton
              toastOptions={{ style: { fontSize: "12px" } }}
            />
          </WorkContextProvider>
        </CommandProvider>
      </DemoProvider>
    </QueryClientProvider>
  );
}
