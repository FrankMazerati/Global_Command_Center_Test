import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/** Environment drives accent color sync. "tenant" is reserved (deferred). */
export type Environment = "intellistack" | "workforce";
export const ENVIRONMENTS: { id: Environment; label: string }[] = [
  { id: "intellistack", label: "IntelliStack Systems" },
  { id: "workforce", label: "Workforce / IntelliStaff" },
];

const Ctx = createContext<{ env: Environment; setEnv: (e: Environment) => void }>({
  env: "intellistack",
  setEnv: () => {},
});

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [env, setEnv] = useState<Environment>("intellistack");
  useEffect(() => {
    const saved = localStorage.getItem("is-env") as Environment | null;
    if (saved === "workforce" || saved === "intellistack") setEnv(saved);
  }, []);
  useEffect(() => {
    document.documentElement.dataset["env"] = env;
    localStorage.setItem("is-env", env);
  }, [env]);
  return <Ctx.Provider value={{ env, setEnv }}>{children}</Ctx.Provider>;
}

export const useEnvironment = () => useContext(Ctx);
