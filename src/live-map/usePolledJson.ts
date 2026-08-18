import { useEffect, useState } from "react";

export type PolledJson<T> =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly data: T };

/**
 * Fetches `url` and keeps it fresh on an interval. A refresh never returns to
 * `loading`, so a poll does not blank the view; point the hook at another
 * resource by remounting it with a `key`.
 */
export const usePolledJson = <T>(
  url: string,
  intervalMs: number,
  schema: { readonly parse: (payload: unknown) => T }
): PolledJson<T> => {
  const [state, setState] = useState<PolledJson<T>>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    // A response can land after teardown, when its url is no longer current.
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
        const data = schema.parse(await response.json());
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
    // Returning to the foreground refreshes without waiting out the period.
    document.addEventListener("visibilitychange", loadIfVisible);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", loadIfVisible);
    };
  }, [url, intervalMs, schema]);

  return state;
};
