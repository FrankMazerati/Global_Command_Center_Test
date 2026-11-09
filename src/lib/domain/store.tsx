import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { CommandState } from "./types";
import type { CommandAction } from "./reducer";
import { reduce } from "./reducer";
import { createSeedState } from "./seed";
import { activeUser } from "./selectors";

const STORAGE_KEY = "maximus.command.center.state.v1";
const SCHEMA_VERSION = 1;

interface DispatchResult {
  ok: boolean;
  message: string | null;
}

interface StoreValue {
  state: CommandState;
  dispatch: (action: CommandAction) => DispatchResult;
  hydrated: boolean;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function readStoredState(): CommandState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { schemaVersion?: number; state?: CommandState };
    if (
      !parsed.state ||
      parsed.schemaVersion !== SCHEMA_VERSION ||
      parsed.state.schemaVersion !== SCHEMA_VERSION
    )
      return null;
    return parsed.state;
  } catch {
    return null;
  }
}

export function CommandProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CommandState>(() => createSeedState());
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const stored = readStoredState();
    if (stored) {
      setState(stored);
      stateRef.current = stored;
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            schemaVersion: SCHEMA_VERSION,
            savedAt: new Date().toISOString(),
            state,
          }),
        );
      } catch {
        // Storage can be unavailable (private mode, quota). The in-memory session still works.
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [state, hydrated]);

  const dispatch = useCallback((action: CommandAction): DispatchResult => {
    const result = reduce(stateRef.current, action);
    if (result.error) return { ok: false, message: result.error };
    if (result.state !== stateRef.current) {
      stateRef.current = result.state;
      setState(result.state);
    }
    return { ok: true, message: null };
  }, []);

  const reset = useCallback(() => {
    const fresh = createSeedState();
    stateRef.current = fresh;
    setState(fresh);
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, hydrated, reset }),
    [state, dispatch, hydrated, reset],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useCommandStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("CommandProvider is missing from the component tree.");
  return value;
}

export function useCommandState(): CommandState {
  return useCommandStore().state;
}

export function useActiveUser() {
  const state = useCommandState();
  return activeUser(state);
}

/**
 * Wraps dispatch with honest feedback: failures surface the reducer's reason, and a success
 * message only appears when the state actually changed.
 */
export function useAction() {
  const { dispatch } = useCommandStore();
  return useCallback(
    (action: CommandAction, options?: { success?: string; silent?: boolean }): DispatchResult => {
      const result = dispatch(action);
      if (!result.ok && result.message) {
        toast.error(result.message);
      } else if (result.ok && options?.success && !options.silent) {
        toast.success(options.success);
      }
      return result;
    },
    [dispatch],
  );
}

/** Persisted form draft so switching Help Buddy tabs cannot discard unsaved work. */
export function useDraft(key: string, initial = "") {
  const { state, dispatch } = useCommandStore();
  const value = state.drafts[key];
  const setValue = useCallback(
    (next: string) => {
      dispatch({ type: "draft.set", key, value: next });
    },
    [dispatch, key],
  );
  return [value ?? initial, setValue] as const;
}
