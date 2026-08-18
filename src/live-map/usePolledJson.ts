import { useEffect, useState } from "react";

export type PolledJson<T> =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly data: T };

/**
 * Fetches `url` and keeps it fresh on an interval.
 *
 * A refresh never drops back to `loading`: the previous payload stays on screen
 * so a poll does not blank the view. Pointing the hook at a different resource is
 * a remount — give the consumer a `key` — which is why there is no reset here.
 *
 * A background tab keeps its last payload and stops asking for a new one. That
 * check reads `document.visibilityState` at the moment it matters rather than
 * subscribing to it: nothing renders differently when the tab loses focus, so
 * holding it as state would re-render the whole view to change a value only this
 * effect ever looks at.
 */
export const usePolledJson = <T>(
  url: string,
  intervalMs: number,
  parse: (payload: unknown) => T
): PolledJson<T> => {
  const [state, setState] = useState<PolledJson<T>>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    // Guards every write below: a response landing after teardown belongs to a
    // url that is no longer current, and writing it would resurrect stale data.
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setState({
            status: "error",
            message: `${url} responded ${String(response.status)}`,
          });
          return;
        }
        const data = parse(await response.json());
        if (!cancelled) {
          setState({ status: "ready", data });
        }
      } catch (error: unknown) {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "request failed",
        });
      }
    };

    const loadIfVisible = (): void => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    loadIfVisible();
    const timer = setInterval(loadIfVisible, intervalMs);
    // Coming back to the foreground should not wait out the rest of the period.
    document.addEventListener("visibilitychange", loadIfVisible);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", loadIfVisible);
    };
  }, [url, intervalMs, parse]);

  return state;
};
